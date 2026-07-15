import prisma from "../config/prisma.js";
import ApiError from "../utils/ApiError.js";

// Get all active task allocations for the logged-in TSP TM
export const getMyAllocations = async (userId) => {
  // First get the TspMemberProfile id for this user
  const profile = await prisma.tspMemberProfile.findUnique({ where: { userId } });
  if (!profile) throw new ApiError(404, "No TSP Member profile found for this user");

  const allocations = await prisma.taskAllocation.findMany({
    where: { tspMemberId: profile.id },
    include: {
      brm: { select: { id: true, brmNumber: true, title: true, TeamName: true, currentStatus: true, priority: true,Category: true,createdAt:true } },
      assignedBy: { select: { firstName: true, lastName: true } },
      milestones: { orderBy: { createdAt: 'asc' } },
      progressLogs: { orderBy: { createdAt: 'desc' }, take: 5 }
    },
    orderBy: { createdAt: 'desc' }
  });

  return allocations;
};

// Get a single allocation with full details
export const getAllocationById = async (allocationId, userId) => {
  const profile = await prisma.tspMemberProfile.findUnique({ where: { userId } });
  if (!profile) throw new ApiError(404, "No TSP Member profile found");

  const allocation = await prisma.taskAllocation.findUnique({
    where: { id: allocationId },
    include: {
      brm: { select: { id: true, brmNumber: true, title: true, TeamName: true, currentStatus: true, priority: true,Category: true, createdAt: true } },
      assignedBy: { select: { firstName: true, lastName: true } },
      milestones: { orderBy: { createdAt: 'asc' } },
      progressLogs: {
        orderBy: { createdAt: 'desc' },
        include: { loggedBy: { select: { firstName: true, lastName: true } } }
      }
    }
  });

  if (!allocation) throw new ApiError(404, "Allocation not found");
  if (allocation.tspMemberId !== profile.id) throw new ApiError(403, "Not your allocation");

  return allocation;
};

// Add a milestone to an allocation
export const addMilestone = async (allocationId, userId, { title, description, dueDate }) => {
  const profile = await prisma.tspMemberProfile.findUnique({ where: { userId } });
  if (!profile) throw new ApiError(404, "No TSP Member profile found");

  const allocation = await prisma.taskAllocation.findUnique({ where: { id: allocationId } });
  if (!allocation) throw new ApiError(404, "Allocation not found");
  if (allocation.tspMemberId !== profile.id) throw new ApiError(403, "Not your allocation");

  return prisma.taskAllocationMilestone.create({
    data: {
      allocationId,
      title,
      description,
      dueDate: dueDate ? new Date(dueDate) : null,
      status: 'PENDING'
    }
  });
};

// Toggle milestone status PENDING ↔ COMPLETED
export const toggleMilestone = async (milestoneId, userId) => {
  const profile = await prisma.tspMemberProfile.findUnique({ where: { userId } });
  if (!profile) throw new ApiError(404, "No TSP Member profile found");

  const milestone = await prisma.taskAllocationMilestone.findUnique({
    where: { id: milestoneId },
    include: { allocation: true }
  });
  if (!milestone) throw new ApiError(404, "Milestone not found");
  if (milestone.allocation.tspMemberId !== profile.id) throw new ApiError(403, "Not your milestone");

  return prisma.taskAllocationMilestone.update({
    where: { id: milestoneId },
    data: { status: milestone.status === 'PENDING' ? 'COMPLETED' : 'PENDING' }
  });
};

// Log progress on an allocation
export const logProgress = async (allocationId, userId, { progressPct, remarks }) => {
  const profile = await prisma.tspMemberProfile.findUnique({ where: { userId } });
  if (!profile) throw new ApiError(404, "No TSP Member profile found");

  const allocation = await prisma.taskAllocation.findUnique({ where: { id: allocationId } });
  if (!allocation) throw new ApiError(404, "Allocation not found");
  if (allocation.tspMemberId !== profile.id) throw new ApiError(403, "Not your allocation");
  if (progressPct < 0 || progressPct > 100) throw new ApiError(400, "Progress must be 0-100");

  return prisma.taskAllocationProgress.create({
    data: { allocationId, progressPct: parseInt(progressPct), remarks, loggedById: userId }
  });
};

// Complete task allocation
export const completeAllocation = async (allocationId, userId) => {
  const profile = await prisma.tspMemberProfile.findUnique({ where: { userId } });
  if (!profile) throw new ApiError(404, "No TSP Member profile found");

  const allocation = await prisma.taskAllocation.findUnique({ where: { id: allocationId } });
  if (!allocation) throw new ApiError(404, "Allocation not found");
  if (allocation.tspMemberId !== profile.id) throw new ApiError(403, "Not your allocation");

  return prisma.taskAllocation.update({
    where: { id: allocationId },
    data: { status: 'COMPLETED' }
  });
};

