import prisma from "../config/prisma.js";
import ApiError from "../utils/ApiError.js";

// Get all TSP TM profiles with their user info
export const getAllProfiles = async () => {
  const profiles = await prisma.tspMemberProfile.findMany({
    include: {
      user: {
        select: { id: true, firstName: true, lastName: true, email: true, employeeId: true }
      },
      taskAllocations: {
        where: { status: 'ACTIVE' },
        include: {
          brm: { select: { brmNumber: true, title: true } }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return profiles.map(p => ({
    id: p.id,
    userId: p.userId,
    name: `${p.user.firstName} ${p.user.lastName}`,
    email: p.user.email,
    employeeId: p.user.employeeId,
    mobileNumber: p.mobileNumber,
    skills: p.skills,
    activeTaskCount: p.taskAllocations.length,
    activeTasks: p.taskAllocations.map(a => ({
      taskTitle: a.taskTitle,
      brmNumber: a.brm.brmNumber,
      brmTitle: a.brm.title,
      endDate: a.endDate
    }))
  }));
};

// Get profile by userId
export const getProfileByUserId = async (userId) => {
  const profile = await prisma.tspMemberProfile.findUnique({
    where: { userId },
    include: {
      user: {
        select: { id: true, firstName: true, lastName: true, email: true, employeeId: true }
      },
      taskAllocations: {
        where: { status: 'ACTIVE' },
        include: { brm: { select: { brmNumber: true, title: true } } }
      }
    }
  });

  if (!profile) throw new ApiError(404, "TSP Member Profile not found");

  return {
    id: profile.id,
    userId: profile.userId,
    name: `${profile.user.firstName} ${profile.user.lastName}`,
    email: profile.user.email,
    employeeId: profile.user.employeeId,
    mobileNumber: profile.mobileNumber,
    skills: profile.skills,
    activeTaskCount: profile.taskAllocations.length,
    activeTasks: profile.taskAllocations.map(a => ({
      taskTitle: a.taskTitle,
      brmNumber: a.brm.brmNumber,
      brmTitle: a.brm.title,
      endDate: a.endDate
    }))
  };
};

// Update skills and mobile number
export const updateProfile = async (userId, { mobileNumber, skills }) => {
  const profile = await prisma.tspMemberProfile.findUnique({ where: { userId } });
  if (!profile) throw new ApiError(404, "TSP Member Profile not found");

  const updated = await prisma.tspMemberProfile.update({
    where: { userId },
    data: {
      ...(mobileNumber !== undefined && { mobileNumber }),
      ...(skills !== undefined && { skills })
    }
  });

  return updated;
};

// Find members by skill (the core feature — for the allocation dropdown)
export const getMembersBySkill = async (skill) => {
  if (!skill) throw new ApiError(400, "skill query parameter is required");

  const profiles = await prisma.tspMemberProfile.findMany({
    where: {
      skills: { has: skill }
    },
    include: {
      user: {
        select: { id: true, firstName: true, lastName: true, email: true }
      },
      taskAllocations: {
        where: { status: 'ACTIVE' },
        include: { brm: { select: { brmNumber: true, title: true } } }
      }
    }
  });

  return profiles.map(p => ({
    id: p.id,
    userId: p.userId,
    name: `${p.user.firstName} ${p.user.lastName}`,
    email: p.user.email,
    mobileNumber: p.mobileNumber,
    activeTaskCount: p.taskAllocations.length,
    activeTasks: p.taskAllocations.map(a => ({
      taskTitle: a.taskTitle,
      brmNumber: a.brm.brmNumber,
      brmTitle: a.brm.title,
      endDate: a.endDate
    }))
  }));
};
