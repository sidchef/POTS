import prisma from "../config/prisma.js";
import ApiError from "../utils/ApiError.js";
import { logAction } from "./audit.service.js";
import { notifyMany, createNotification, getUsersByRole } from "./notification.service.js";
import { emailQueue, slaQueue } from "../config/queue.js";




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
  if (brm.currentStatus !== "DRAFT" && brm.currentStatus !== "REJECTED") {
    throw new ApiError(400, `BRM cannot be edited in status: ${brm.currentStatus}`);
  }

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


    return { cycle, newCycleNumber, dueDate };
  });

  // Calculate milliseconds until SLA expires
  const delayMs = result.dueDate.getTime() - Date.now();
  // Schedule the background job to check the BRM when the SLA time runs out!
  if (delayMs > 0) {
    await slaQueue.add('check-brm-sla', { 
      brmId, 
      cycleId: result.cycle.id 
    }, { 
      delay: delayMs 
    });
  }

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

  await emailQueue.add('send-email', {
  type: 'sendBrmSubmittedEmail',
  payload: {
    approvers: allApproverUsers,
    brmNumber: brm.brmNumber,
    brmTitle: brm.title,
    teamName: brm.TeamName,
    priority: brm.priority,
    dueDate: result.dueDate,
    submittedByName: `${pl.firstName} ${pl.lastName}`
  }
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
      history: {
        orderBy: { createdAt: "desc" },
        include: { changedBy: { select: { firstName: true, lastName: true } } }, // ⬅️ for "by name" in history
      },
      userStory: {                           // ⬅️ THIS was missing
        orderBy: { createdAt: "asc" },
        include: {
          createdBy: { select: { id: true, firstName: true, lastName: true } },
        }
      },
      architectureDocs: {
        orderBy: { version: "desc" },
        include: { uploadedBy: { select: { firstName: true, lastName: true } } },
      },

      technologyRequirements: {
        orderBy: { createdAt: "asc" },
        include: { submittedBy: { select: { firstName: true, lastName: true } } }
      },



    },
  });

  if (!brm) throw new ApiError(404, "BRM not found");
  return brm;
};

// ─── LIST BRMs (role-filtered) ─────────────────────────────────────────────────
export const listBrms = async ({ userId, roles, status, priority, page = 1, limit = 10 }) => {
  const skip = (page - 1) * limit;
  const where = {};

  if (status) {
  if (status.includes(',')) {
    where.currentStatus = { in: status.split(',') };
  } else {
    where.currentStatus = status;
  }
}
  if (priority) where.priority = priority;

  // PLs only see their own BRMs
  const isOnlyPL = roles.includes("PRODUCT_LEAD") &&
    !roles.includes("HEAD_FUNCTIONAL") &&
    !roles.includes("HEAD_TECHNOLOGY") &&
    !roles.includes("SUPER_ADMIN");

  if (isOnlyPL) where.currentPlId = userId;

  // TMs only see BRMs assigned to them
  const isOnlyTM = roles.includes("TEAM_MEMBER") &&
    !roles.includes("PRODUCT_LEAD") &&
    !roles.includes("HEAD_FUNCTIONAL") &&
    !roles.includes("HEAD_TECHNOLOGY") &&
    !roles.includes("SUPER_ADMIN");

  if (isOnlyTM) {
    where.brmAssignments = {
      some: { assignedToId: userId }
    };
  }

   // TSP TLs only see BRMs assigned to them for Architecture
  const isOnlyTspTl = roles.includes("TSP_TEAM_LEAD") &&
    !roles.includes("PRODUCT_LEAD") &&
    !roles.includes("HEAD_FUNCTIONAL") &&
    !roles.includes("HEAD_TECHNOLOGY") &&
    !roles.includes("SUPER_ADMIN");
  if (isOnlyTspTl) {
    where.brmAssignments = {
      some: { assignedToId: userId, assignmentType: "TSP_TL" }
    };
  }

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

// ─── ASSIGN BRM TO TM (Phase 2) ────────────────────────────────────────────────
export const assignBrmToTm = async (brmId, tmId, plId) => {
  const brm = await prisma.brm.findUnique({ where: { id: brmId } });
  if (!brm) throw new ApiError(404, "BRM not found");
  if (brm.currentStatus !== "APPROVED") {
    throw new ApiError(400, "Only APPROVED BRMs can be assigned for User Story Creation");
  }

  // Ensure TM user exists and has TEAM_MEMBER role
  const tmUser = await prisma.user.findFirst({
    where: {
      id: tmId,
      roles: { some: { role: { name: "TEAM_MEMBER" } } }
    }
  });
  if (!tmUser) throw new ApiError(400, "Assigned user must be an active TEAM_MEMBER");

  await prisma.$transaction(async (tx) => {
    // 1. Update BRM Status
    await tx.brm.update({
      where: { id: brmId },
      data: { currentStatus: "USER_STORY_CREATION" },
    });

    // 2. Add history
    await tx.brmHistory.create({
      data: {
        brmId,
        oldStatus: brm.currentStatus,
        newStatus: "USER_STORY_CREATION",
        remarks: `PL assigned BRM to TM (${tmUser.firstName} ${tmUser.lastName})`,
        changedById: plId,
      },
    });

    // 3. Create BrmAssignment
    // Clear any previous TM assignments if they exist
    await tx.brmAssignment.updateMany({
      where: { brmId, assignmentType: "TM", isCurrent: true },
      data: { isCurrent: false, status: "REASSIGNED", completedAt: new Date() }
    });

    await tx.brmAssignment.create({
      data: {
        brmId,
        assignmentType: "TM",
        assignedById: plId,
        assignedToId: tmId,
        status: "ASSIGNED",
      }
    });
  });

  // Notify TM
  await createNotification({
    userId: tmId,
    title: "New BRM Assigned",
    message: `You have been assigned to BRM ${brm.brmNumber} for User Story Creation.`
  });

  return { message: "BRM assigned successfully to TM" };
};

// ─── SUBMIT USER STORIES (Phase 2 ) ──────────────────────────────────
export const submitUserStories = async (brmId, tmId) => {
  const brm = await prisma.brm.findUnique({ where: { id: brmId } });
  if (!brm) throw new ApiError(404, "BRM not found");
  if (brm.currentStatus !== "USER_STORY_CREATION") {
    throw new ApiError(400, "BRM is not in User Story Creation phase");
  }

  const storiesCount = await prisma.userStory.count({ where: { brmId } });
  if (storiesCount === 0) {
    throw new ApiError(400, "You must create at least one user story before submitting.");
  }

  await prisma.$transaction(async (tx) => {
    // 1. Update BRM Status
    await tx.brm.update({
      where: { id: brmId },
      data: { currentStatus: "USER_STORIES_CREATED" },
    });

    // 2. Mark TM assignment as completed
    await tx.brmAssignment.updateMany({
      where: { brmId, assignmentType: "TM", assignedToId: tmId, isCurrent: true },
      data: { status: "COMPLETED", completedAt: new Date(), isCurrent: false }
    });

    // 3. Add History
    await tx.brmHistory.create({
      data: {
        brmId,
        oldStatus: "USER_STORY_CREATION",
        newStatus: "USER_STORIES_CREATED",
        remarks: `TM created ${storiesCount} user stories and submitted them.`,
        changedById: tmId,
      },
    });
  });

  // Notify the PL
  await createNotification({
    userId: brm.currentPlId,
    title: "User Stories Submitted",
    message: `User stories for BRM ${brm.brmNumber} have been submitted by the TM.`
  });

  return { message: "User stories submitted successfully." };
};


// ─── ASSIGN TSP TL FOR ARCHITECTURE (Phase 2) ─────────────────────────────────
export const assignBrmToTspTl = async (brmId, plId, tspTlId) => {
  const brm = await prisma.brm.findUnique({ where: { id: brmId } });
  
  if (!brm) throw new ApiError(404, "BRM not found");
  if (brm.currentPlId !== plId) throw new ApiError(403, "You are not the PL for this BRM");
  
  // Can only assign TSP TL if user stories are created
  if (brm.currentStatus !== "USER_STORIES_CREATED") {
    throw new ApiError(400, "Can only assign TSP TL after user stories are created");
  }

  await prisma.$transaction(async (tx) => {
    // 1. Move to Architecture Phase
    await tx.brm.update({
      where: { id: brmId },
      data: { currentStatus: "ARCHITECTURE_CREATION" }
    });

    // 2. Track history
    await tx.brmHistory.create({
      data: {
        brmId,
        oldStatus: "USER_STORIES_CREATED",
        newStatus: "ARCHITECTURE_CREATION",
        remarks: "Assigned to TSP TL for Architecture Design",
        changedById: plId
      }
    });

    // 3. Clear previous TSP_TL assignments
    await tx.brmAssignment.updateMany({
      where: { brmId, assignmentType: "TSP_TL", isCurrent: true },
      data: { isCurrent: false, status: "REASSIGNED", completedAt: new Date() }
    });

    // 4. Create new assignment
    await tx.brmAssignment.create({
      data: {
        brmId,
        assignmentType: "TSP_TL",
        assignedById: plId,
        assignedToId: tspTlId,
        status: "ASSIGNED",
      }
    });
  });

  // Notify TSP TL
  await createNotification({
    userId: tspTlId,
    title: "New Architecture Assignment",
    message: `You have been assigned as TSP TL for BRM ${brm.brmNumber} to design the architecture.`
  });

  return { message: "BRM assigned successfully to TSP TL" };
};



export const submitArchitecture = async (brmId, tspTlId, file) => {
  const brm = await prisma.brm.findUnique({ where: { id: brmId } });
  
  if (!brm) throw new ApiError(404, "BRM not found");
  if (brm.currentStatus !== "ARCHITECTURE_CREATION" && brm.currentStatus !== "ARCHITECTURE_SUBMITTED") {
    throw new ApiError(400, "BRM is not in the architecture creation phase");
  }
  if (!file) throw new ApiError(400, "Architecture document is required");

  // Calculate new version
  const existingDocsCount = await prisma.architectureDocument.count({ where: { brmId } });
  const version = existingDocsCount + 1;

  await prisma.$transaction(async (tx) => {
    // 1. Save document record
    await tx.architectureDocument.create({
      data: {
        brmId,
        fileName: file.originalname,
        fileUrl: `/uploads/architecture/${file.filename}`,
        version,
        uploadedById: tspTlId
      }
    });

    // 2. Update BRM Status
    await tx.brm.update({
      where: { id: brmId },
      data: { currentStatus: "ARCHITECTURE_SUBMITTED" }
    });

    // 3. Track history
    await tx.brmHistory.create({
      data: {
        brmId,
        oldStatus: "ARCHITECTURE_CREATION",
        newStatus: "ARCHITECTURE_SUBMITTED",
        remarks: `Architecture document uploaded (v${version})`,
        changedById: tspTlId
      }
    });
  });

  return { message: "Architecture submitted successfully", version };
};

export const approveArchitecture = async (brmId, plId) => {
  const brm = await prisma.brm.findUnique({ 
    where: { id: brmId },
    include: { brmAssignments: true } 
  });
  
  if (!brm) throw new ApiError(404, "BRM not found");
  if (brm.currentPlId !== plId) throw new ApiError(403, "You are not the PL of this BRM");
  if (brm.currentStatus !== "ARCHITECTURE_SUBMITTED") {
    throw new ApiError(400, "BRM must be in ARCHITECTURE_SUBMITTED status to approve architecture");
  }

  await prisma.$transaction(async (tx) => {
    // 1. Update Status
    await tx.brm.update({
      where: { id: brmId },
      data: { currentStatus: "READY_FOR_DEVELOPMENT" }
    });

    // 2. Track History
    await tx.brmHistory.create({
      data: {
        brmId,
        oldStatus: "ARCHITECTURE_SUBMITTED",
        newStatus: "READY_FOR_DEVELOPMENT",
        remarks: "Architecture approved by Product Lead. Ready for Dev Phase.",
        changedById: plId
      }
    });
  });

  // 3. Notify the TSP TL
  const tspTlAssignment = brm.brmAssignments.find(a => a.assignmentType === "TSP_TL" && a.isCurrent);
  if (tspTlAssignment) {
    await createNotification({
      userId: tspTlAssignment.assignedToId,
      title: "Architecture Approved",
      message: `The PL has approved the architecture for BRM ${brm.brmNumber}. You can now begin Resource Allocation.`
    });
  }

  return { message: "Architecture approved successfully" };
};



export const addTechnologyRequirement = async (brmId, tspTlId, requirement) => {
  const brm = await prisma.brm.findUnique({ where: { id: brmId } });
  if (!brm) throw new ApiError(404, "BRM not found");
  if (brm.currentStatus !== "READY_FOR_DEVELOPMENT") {
    throw new ApiError(400, "BRM is not in READY_FOR_DEVELOPMENT status");
  }

  const newReq = await prisma.technologyRequirement.create({
    data: {
      brmId,
      technologyName: requirement.technologyName,
      resourceCount: parseInt(requirement.resourceCount, 10),
      allocationType: requirement.allocationType,
      submittedById: tspTlId
    }
  });
  return newReq;
};

export const finalizeTechnologyRequirements = async (brmId, tspTlId) => {
  const brm = await prisma.brm.findUnique({ 
    where: { id: brmId },
    include: { technologyRequirements: true }
  });
  
  if (!brm) throw new ApiError(404, "BRM not found");
  if (brm.currentStatus !== "READY_FOR_DEVELOPMENT") {
    throw new ApiError(400, "BRM is not in READY_FOR_DEVELOPMENT status");
  }
  if (brm.technologyRequirements.length === 0) {
    throw new ApiError(400, "Cannot submit. Please add at least one technology requirement first.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.brm.update({
      where: { id: brmId },
      data: { currentStatus: "READY_FOR_TASK_ALLOCATION" }
    });

    await tx.brmHistory.create({
      data: {
        brmId,
        oldStatus: "READY_FOR_DEVELOPMENT",
        newStatus: "READY_FOR_TASK_ALLOCATION",
        remarks: `TSP TL finalized ${brm.technologyRequirements.length} technology requirement(s)`,
        changedById: tspTlId
      }
    });
  });

  return { message: "Technology requirements finalized successfully." };
};




// Task Allocation
export const allocateTask = async (brmId, tspTlId, { tspMemberId, skill, taskTitle, taskDescription, startDate, endDate }) => {
  const brm = await prisma.brm.findUnique({ where: { id: brmId } });
  if (!brm) throw new ApiError(404, "BRM not found");
  if (brm.currentStatus !== "READY_FOR_TASK_ALLOCATION") {
    throw new ApiError(400, "BRM is not in READY_FOR_TASK_ALLOCATION status");
  }

  const memberProfile = await prisma.tspMemberProfile.findUnique({ where: { id: tspMemberId } });
  if (!memberProfile) throw new ApiError(404, "TSP Member Profile not found");

  const allocation = await prisma.taskAllocation.create({
    data: {
      brmId,
      tspMemberId,
      skill,
      taskTitle,
      taskDescription,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      assignedById: tspTlId,
      status: 'ACTIVE'
    },
    include: {
      tspMember: {
        include: { user: { select: { firstName: true, lastName: true, email: true } } }
      }
    }
  });

  return allocation;
};

export const getBrmAllocations = async (brmId) => {
  const allocations = await prisma.taskAllocation.findMany({
    where: { brmId },
    include: {
      tspMember: {
        include: { user: { select: { firstName: true, lastName: true, email: true } } }
      },
      assignedBy: { select: { firstName: true, lastName: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  return allocations;
};

export const completeAllocation = async (allocationId) => {
  const allocation = await prisma.taskAllocation.findUnique({ where: { id: allocationId } });
  if (!allocation) throw new ApiError(404, "Allocation not found");

  return prisma.taskAllocation.update({
    where: { id: allocationId },
    data: { status: 'COMPLETED' }
  });
};
