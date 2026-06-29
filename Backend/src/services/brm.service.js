import prisma from "../config/prisma.js";
import ApiError from "../utils/ApiError.js";
import { logAction } from "./audit.service.js";
import { notifyMany, createNotification, getUsersByRole } from "./notification.service.js";
import {
  sendBrmSubmittedEmail,
  sendBrmRejectedEmail,
  sendBrmApprovedEmail,
} from "./email.service.js";



// ─── CREATE BRM (PL only — DRAFT status) ──────────────────────────────────────
export const createBrm = async ({ userId, brmNumber, teamName, category, title, description, priority }) => {
  if (!brmNumber || !title || !teamName || !category) {
    throw new ApiError(400, "BRM Number, Title, TeamName and Category are required");
  }
  // Check if BRM number already exists
  const existingBrm = await prisma.brm.findUnique({ where: { brmNumber } });
  if (existingBrm) {
    throw new ApiError(400, `A BRM with the number ${brmNumber} already exists.`);
  }
  const brm = await prisma.brm.create({
    data: {
      brmNumber,
      TeamName: teamName,
      Category: category,
      title,
      description: description || null,
      priority: priority || null,
      currentStatus: "DRAFT",
      createdById: userId,
      currentPlId: userId,
    },
  });
  await logAction({
    userId,
    action: "BRM_CREATED",
    entityType: "BRM",
    entityId: brm.id,
    newValue: { brmNumber, title, teamName, category, status: "DRAFT" },
  });
  return brm;
};

// ─── UPDATE BRM (only allowed in DRAFT) ───────────────────────────────────────
export const updateBrm = async ({ brmId, userId, updates }) => {
  const brm = await prisma.brm.findUnique({ where: { id: brmId } });
  if (!brm) throw new ApiError(404, "BRM not found");
  if (brm.currentPlId !== userId) throw new ApiError(403, "You are not the PL of this BRM");
  if (brm.currentStatus !== "DRAFT") throw new ApiError(400, `BRM cannot be edited in status: ${brm.currentStatus}`);

  const updated = await prisma.brm.update({
    where: { id: brmId },
    data: {
      title:       updates.title       ?? brm.title,
      description: updates.description ?? brm.description,
      priority:    updates.priority    ?? brm.priority,
      TeamName:    updates.teamName    ?? brm.TeamName,
      Category:    updates.category    ?? brm.Category,
    },
  });

  await logAction({
    userId,
    action: "BRM_UPDATED",
    entityType: "BRM",
    entityId: brmId,
    oldValue: { title: brm.title, description: brm.description, priority: brm.priority },
    newValue: updates,
  });

  return updated;
};

// ─── SUBMIT BRM ───────────────────────────────────────────────────────────────
export const submitBrm = async ({ brmId, userId, ipAddress }) => {
  const brm = await prisma.brm.findUnique({ where: { id: brmId } });
  if (!brm) throw new ApiError(404, "BRM not found");
  if (brm.currentPlId !== userId) throw new ApiError(403, "You are not the PL of this BRM");

  if (brm.currentStatus !== "DRAFT" && brm.currentStatus !== "REJECTED") {
    throw new ApiError(400, `BRM cannot be submitted from status: ${brm.currentStatus}`);
  }

  // Get HF and HT users
  const hfUsers = await getUsersByRole("HEAD_FUNCTIONAL");
  const htUsers = await getUsersByRole("HEAD_TECHNOLOGY");

  if (hfUsers.length === 0) throw new ApiError(500, "No active Head Functional user found. Cannot submit BRM.");
  if (htUsers.length === 0) throw new ApiError(500, "No active Head Technology user found. Cannot submit BRM.");

  const now = new Date();
  const dueDate = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48-hour SLA

  // Count existing cycles for cycle number
  const cycleCount = await prisma.brmApprovalCycle.count({ where: { brmId } });
  const newCycleNumber = cycleCount + 1;

  // ─── Use a transaction to ensure atomicity ─────────────────────────────────
  const result = await prisma.$transaction(async (tx) => {

    // 1. Update BRM status → SUBMITTED
    await tx.brm.update({
      where: { id: brmId },
      data: { currentStatus: "SUBMITTED", submittedAt: now },
    });

    // 2. Insert BRM history
    await tx.brmHistory.create({
      data: {
        brmId,
        oldStatus: brm.currentStatus,
        newStatus: "SUBMITTED",
        remarks: newCycleNumber === 1 ? "Initial submission by PL" : `Resubmission — Cycle ${newCycleNumber}`,
        changedById: userId,
      },
    });

    // 3. Create Approval Cycle
    const cycle = await tx.brmApprovalCycle.create({
      data: {
        brmId,
        cycleNumber: newCycleNumber,
        status: "IN_PROGRESS",
        startedAt: now,
      },
    });

    // 4. Create Approval Assignments (HF + HT)
    const allApprovers = [
      ...hfUsers.map((u) => ({ user: u, role: "HEAD_FUNCTIONAL" })),
      ...htUsers.map((u) => ({ user: u, role: "HEAD_TECHNOLOGY" })),
    ];

    for (const { user, role } of allApprovers) {
      await tx.approvalAssignment.create({
        data: {
          brmId,
          approverId: user.id,
          roleName: role,
          assignedAt: now,
          dueDate,
        },
      });
    }

    // 5. Pre-create BrmApproval records with PENDING status
    for (const { user, role } of allApprovers) {
      await tx.brmApproval.create({
        data: {
          brmId,
          approvalCycleId: cycle.id,
          approverId: user.id,
          approverRole: role,
          status: "PENDING",
        },
      });
    }

    // 6. Start SLA Tracking
    await tx.slaTracking.create({
      data: {
        slaType: "BRM_REVIEW",
        entityType: "BRM",
        entityId: brmId,
        startDate: now,
        dueDate,
      },
    });

    return { cycle, newCycleNumber, dueDate };
  });

  // 7. Send notifications (outside transaction — non-critical)
  const approverIds = [
    ...hfUsers.map((u) => u.id),
    ...htUsers.map((u) => u.id),
  ];

  await notifyMany(
    approverIds,
    `BRM Pending Your Approval`,
    `BRM ${brm.brmNumber} — "${brm.title}" has been submitted and requires your review. SLA: 48 hours (Due: ${result.dueDate.toLocaleDateString()}).`
  );

    // Also send emails to approvers
  const allApproverUsers = [...hfUsers, ...htUsers];
  const pl = await prisma.user.findUnique({ where: { id: userId }, select: { firstName: true, lastName: true } });

  await sendBrmSubmittedEmail({
    approvers: allApproverUsers,
    brmNumber: brm.brmNumber,
    brmTitle: brm.title,
    teamName: brm.TeamName,
    priority: brm.priority,
    dueDate: result.dueDate,
    submittedByName: `${pl.firstName} ${pl.lastName}`,
  });


  await createNotification({
    userId,
    title: "BRM Submitted Successfully",
    message: `Your BRM ${brm.brmNumber} has been submitted for approval (Cycle ${result.newCycleNumber}). HF & HT have been notified.`,
  });

  await logAction({
    userId,
    action: "BRM_SUBMITTED",
    entityType: "BRM",
    entityId: brmId,
    newValue: { status: "SUBMITTED", cycleNumber: result.newCycleNumber },
    ipAddress,
  });

  return {
    brmNumber: brm.brmNumber,
    status: "SUBMITTED",
    cycleNumber: result.newCycleNumber,
    dueDate: result.dueDate,
    approversNotified: approverIds.length,
  };
};

// ─── GET BRM BY ID ─────────────────────────────────────────────────────────────
export const getBrmById = async (brmId) => {
  const brm = await prisma.brm.findUnique({
    where: { id: brmId },
    include: {
      createdBy: { select: { id: true, firstName: true, lastName: true, employeeId: true } },
      currentPl:  { select: { id: true, firstName: true, lastName: true, employeeId: true } },
      approvalCycles: {
        orderBy: { cycleNumber: "desc" },
        include: {
          approvals: {
            include: {
              approver: { select: { id: true, firstName: true, lastName: true } },
            },
          },
        },
      },
      approvalAssignments: {
        include: { approver: { select: { id: true, firstName: true, lastName: true } } },
      },
      history: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!brm) throw new ApiError(404, "BRM not found");
  return brm;
};

// ─── LIST BRMs (role-filtered) ─────────────────────────────────────────────────
export const listBrms = async ({ userId, roles, status, priority, page = 1, limit = 10 }) => {
  const skip = (page - 1) * limit;
  const where = {};

  if (status)   where.currentStatus = status;
  if (priority) where.priority = priority;

  // PLs only see their own BRMs
  const isOnlyPL = roles.includes("PRODUCT_LEAD") &&
    !roles.includes("HEAD_FUNCTIONAL") &&
    !roles.includes("HEAD_TECHNOLOGY") &&
    !roles.includes("SUPER_ADMIN");

  if (isOnlyPL) where.currentPlId = userId;

  const [brms, total] = await Promise.all([
    prisma.brm.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        currentPl: { select: { firstName: true, lastName: true, employeeId: true } },
      },
    }),
    prisma.brm.count({ where }),
  ]);

  return {
    brms,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
};
