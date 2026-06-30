import prisma from "../config/prisma.js";
import ApiError from "../utils/ApiError.js";
import { logAction } from "./audit.service.js";
import { createNotification, notifyMany, getUsersByRole } from "./notification.service.js";
import { emailQueue } from "../config/queue.js";



// ─── PROCESS VOTE (APPROVE or REJECT) ─────────────────────────────────────────
export const processVote = async ({ brmId, approverId, decision, comments, ipAddress }) => {
  if (!["APPROVED", "REJECTED"].includes(decision)) {
    throw new ApiError(400, "Decision must be APPROVED or REJECTED");
  }

  // Get BRM
  const brm = await prisma.brm.findUnique({
    where: { id: brmId },
    include: { currentPl: true },
  });
  if (!brm) throw new ApiError(404, "BRM not found");
  if (brm.currentStatus !== "SUBMITTED") {
    throw new ApiError(400, `BRM is not in SUBMITTED status. Current status: ${brm.currentStatus}`);
  }

  // Get active approval cycle
  const activeCycle = await prisma.brmApprovalCycle.findFirst({
    where: { brmId, status: "IN_PROGRESS" },
    include: { approvals: true },
  });
  if (!activeCycle) throw new ApiError(404, "No active approval cycle found for this BRM");

  // Find the approver's PENDING record in this cycle
  const myApprovalRecord = activeCycle.approvals.find(
    (a) => a.approverId === approverId && a.status === "PENDING"
  );
  if (!myApprovalRecord) {
    // Check if they already voted
    const alreadyVoted = activeCycle.approvals.find((a) => a.approverId === approverId);
    if (alreadyVoted) {
      throw new ApiError(409, `You have already submitted your decision (${alreadyVoted.status}) for this cycle`);
    }
    throw new ApiError(403, "You are not assigned as an approver for this BRM");
  }

  const now = new Date();

  // ─── UPDATE the PENDING record ─────────────────────────────────────────────
  await prisma.brmApproval.update({
    where: { id: myApprovalRecord.id },
    data: {
      status: decision,
      comments: comments || null,
      approvedAt: now,
    },
  });

  // Update ApprovalAssignment respondedAt
  await prisma.approvalAssignment.updateMany({
    where: { brmId, approverId },
    data: { respondedAt: now },
  });

  // ─── REJECTION PATH ────────────────────────────────────────────────────────
  if (decision === "REJECTED") {
    await prisma.$transaction(async (tx) => {
      // Close the approval cycle
      await tx.brmApprovalCycle.update({
        where: { id: activeCycle.id },
        data: { status: "REJECTED", completedAt: now },
      });

      // Update BRM status → REJECTED
      await tx.brm.update({
        where: { id: brmId },
        data: { currentStatus: "REJECTED" },
      });

      // Insert BRM history
      await tx.brmHistory.create({
        data: {
          brmId,
          oldStatus: "SUBMITTED",
          newStatus: "REJECTED",
          remarks: comments || "Rejected by committee member",
          changedById: approverId,
        },
      });

      // Close SLA tracking
      await tx.slaTracking.updateMany({
        where: { entityType: "BRM", entityId: brmId, completedDate: null },
        data: { completedDate: now },
      });
    });

    // Notify PL
    await createNotification({
      userId: brm.currentPlId,
      title: "BRM Rejected",
      message: `Your BRM ${brm.brmNumber} — "${brm.title}" has been REJECTED. Reason: ${comments || "No reason provided"}. Please review and resubmit.`,
    });

    await emailQueue.add('send-email',{
        type:'sendBrmRejectedEmail',
        payload:{
            plEmail: brm.currentPl.email,
      plName: `${brm.currentPl.firstName} ${brm.currentPl.lastName}`,
      brmNumber: brm.brmNumber,
      brmTitle: brm.title,
      rejectedBy: myApprovalRecord.approverRole.replace(/_/g, " "),
      reason: comments,

        }
    })

    await logAction({
      userId: approverId,
      action: "BRM_REJECTED",
      entityType: "BRM",
      entityId: brmId,
      newValue: { decision, comments, cycle: activeCycle.cycleNumber },
      ipAddress,
    });

    return {
      result: "REJECTED",
      message: "BRM has been rejected. PL has been notified to correct and resubmit.",
    };
  }

  // ─── APPROVAL PATH ─────────────────────────────────────────────────────────
  // Refresh approvals list to check current state
  const refreshedApprovals = await prisma.brmApproval.findMany({
    where: { approvalCycleId: activeCycle.id },
  });

  const allApproved = refreshedApprovals.every((a) => a.status === "APPROVED");
  const pendingCount = refreshedApprovals.filter((a) => a.status === "PENDING").length;

  if (allApproved) {
    // All approvers approved → FULLY APPROVED
    await prisma.$transaction(async (tx) => {
      await tx.brmApprovalCycle.update({
        where: { id: activeCycle.id },
        data: { status: "APPROVED", completedAt: now },
      });

      await tx.brm.update({
        where: { id: brmId },
        data: { currentStatus: "APPROVED" },
      });

      await tx.brmHistory.create({
        data: {
          brmId,
          oldStatus: "SUBMITTED",
          newStatus: "APPROVED",
          remarks: "Approved by all committee members (HF + HT)",
          changedById: approverId,
        },
      });

      await tx.slaTracking.updateMany({
        where: { entityType: "BRM", entityId: brmId, completedDate: null },
        data: { completedDate: now },
      });
    });

    // Notify PL
    await createNotification({
      userId: brm.currentPlId,
      title: "BRM Fully Approved!",
      message: `Your BRM ${brm.brmNumber} — "${brm.title}" has been APPROVED by all committee members. You can now assign team members.`,
    });

    await emailQueue.add('send-email',{
        type:'sendBrmApprovedEmail',
        payload:{
            plEmail: brm.currentPl.email,
      plName: `${brm.currentPl.firstName} ${brm.currentPl.lastName}`,
      brmNumber: brm.brmNumber,
      brmTitle: brm.title,
      teamName: brm.TeamName,
            
        }
    })



    // Notify all Team Members (TM)
    const tmUsers = await getUsersByRole("TEAM_MEMBER");
    if (tmUsers.length > 0) {
      await notifyMany(
        tmUsers.map((u) => u.id),
        "New BRM Approved",
        `BRM ${brm.brmNumber} — "${brm.title}" has been approved and may require team member assignment.`
      );
    }

    await logAction({
      userId: approverId,
      action: "BRM_APPROVED",
      entityType: "BRM",
      entityId: brmId,
      newValue: { decision: "APPROVED", cycle: activeCycle.cycleNumber },
      ipAddress,
    });

    return {
      result: "APPROVED",
      message: "BRM fully approved! PL and Team Members have been notified.",
    };
  }

  // Still waiting for other approver(s)
  await logAction({
    userId: approverId,
    action: "BRM_PARTIAL_APPROVAL",
    entityType: "BRM",
    entityId: brmId,
    newValue: { decision: "APPROVED", cycle: activeCycle.cycleNumber, pendingCount },
    ipAddress,
  });

  return {
    result: "PARTIAL",
    message: `Your approval recorded. Waiting for ${pendingCount} more approver(s) to respond.`,
    pendingApprovers: pendingCount,
  };
};

// ─── GET PENDING APPROVALS for an approver ─────────────────────────────────────
export const getMyPendingApprovals = async (approverId) => {
  const pendingApprovals = await prisma.brmApproval.findMany({
     where: { 
      approverId, 
      status: "PENDING",
      brm: { currentStatus: "SUBMITTED" } // <--- Add this filter!
    },
    include: {
      brm: {
        select: {
          id: true, brmNumber: true, title: true, TeamName: true, Category: true,
          currentStatus: true, submittedAt: true,
          currentPl: { select: { firstName: true, lastName: true, employeeId: true } },
        },
      },
      cycle: { select: { cycleNumber: true, startedAt: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return pendingApprovals;
};
