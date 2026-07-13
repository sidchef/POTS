// ALL SUPER ADMIN FUNCTION LOGIC



import prisma from "../config/prisma.js";
import bcrypt from "bcryptjs";
import ApiError from "../utils/ApiError.js";
import { logAction } from "./audit.service.js";
import { emailQueue } from "../config/queue.js";


// GET ALL USERS with their roles
export const getAllUsers = async ({ page = 1, limit = 10, search, roleFilter }) => {
  const skip = (page - 1) * limit;

  const where = {
    ...(search && {
      OR: [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { employeeId: { contains: search, mode: "insensitive" } },
      ],
    }),
    ...(roleFilter && {
      roles: { some: { role: { name: roleFilter } } },
    }),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        employeeId: true,
        firstName: true,
        lastName: true,
        email: true,
        isActive: true,
        createdAt: true,
        roles: {
          include: { role: { select: { id: true, name: true, description: true } } },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  // Flatten roles for easier frontend use
  const formatted = users.map((u) => ({
    ...u,
    roles: u.roles.map((ur) => ur.role),
  }));

  return {
    users: formatted,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
};

// GET SINGLE USER
export const getUserById = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      employeeId: true,
      firstName: true,
      lastName: true,
      email: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      roles: {
        include: { role: { select: { id: true, name: true, description: true } } },
      },
    },
  });

  if (!user) throw new ApiError(404, "User not found");

  return { ...user, roles: user.roles.map((ur) => ur.role) };
};


// CREATE USER (admin version — can assign any role)
export const createUser = async ({ employeeId, firstName, lastName, email, roleNames, adminId }) => {
  const existingEmail = await prisma.user.findUnique({ where: { email } });
  if (existingEmail) throw new ApiError(409, "A user with this email already exists");

  const existingEmp = await prisma.user.findUnique({ where: { employeeId } });
  if (existingEmp) throw new ApiError(409, "A user with this employee ID already exists");

   // Auto-generate an 8-character secure password (e.g. "a1b2c3D4!")
  const generatedPassword = Math.random().toString(36).slice(-6) + Math.random().toString(36).slice(-2).toUpperCase() + "!";
  
  const passwordHash = await bcrypt.hash(generatedPassword, 10);

  const user = await prisma.user.create({
    data: { employeeId, firstName, lastName, email, passwordHash },
  });



    // Assign roles
  if (roleNames && roleNames.length > 0) {
    for (const roleName of roleNames) {
      const role = await prisma.role.findUnique({ where: { name: roleName } });
      if (!role) throw new ApiError(400, `Role '${roleName}' does not exist`);
      await prisma.userRole.create({ data: { userId: user.id, roleId: role.id } });
    }
  }

  // Auto-create TspMemberProfile if user is a TSP_TM
  if (roleNames && roleNames.includes('TSP_TEAM_MEMBER')) {
    await prisma.tspMemberProfile.create({
      data: { userId: user.id, skills: [] }
    });
  }


  await logAction({
    userId: adminId,
    action: "USER_CREATED",
    entityType: "USER",
    entityId: user.id,
    newValue: { employeeId, email, roles: roleNames },
  });

  //Welcome Mail
  await emailQueue.add('send-email',{
    type: 'sendWelcomeEmail',
    payload:{
        toEmail: email,
    firstName,
    employeeId,
    role: roleNames?.join(", ") || "No role assigned",
    tempPassword: generatedPassword,

    }
  });

 

  return { id: user.id, employeeId, email, firstName, lastName };
};

// CHANGE USER ROLE (replace all roles with new ones)
export const changeUserRole = async ({ targetUserId, roleNames, adminId }) => {
  const user = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!user) throw new ApiError(404, "User not found");

  // Validate all roles exist
  const roles = [];
  for (const roleName of roleNames) {
    const role = await prisma.role.findUnique({ where: { name: roleName } });
    if (!role) throw new ApiError(400, `Role '${roleName}' does not exist`);
    roles.push(role);
  }

  // Get old roles for audit
  const oldRoles = await prisma.userRole.findMany({
    where: { userId: targetUserId },
    include: { role: true },
  });

  // Delete all existing roles
  await prisma.userRole.deleteMany({ where: { userId: targetUserId } });

  // Assign new roles
  for (const role of roles) {
    await prisma.userRole.create({ data: { userId: targetUserId, roleId: role.id } });
  }

  await logAction({
    userId: adminId,
    action: "USER_ROLE_CHANGED",
    entityType: "USER",
    entityId: targetUserId,
    oldValue: { roles: oldRoles.map((ur) => ur.role.name) },
    newValue: { roles: roleNames },
  });

  return { message: "Roles updated successfully" };
};

// ACTIVATE / DEACTIVATE USER
export const toggleUserStatus = async ({ targetUserId, isActive, adminId }) => {
  const user = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!user) throw new ApiError(404, "User not found");

  // Prevent admin from deactivating themselves
  if (targetUserId === adminId) throw new ApiError(400, "You cannot deactivate your own account");

  await prisma.user.update({
    where: { id: targetUserId },
    data: { isActive },
  });

  await logAction({
    userId: adminId,
    action: isActive ? "USER_ACTIVATED" : "USER_DEACTIVATED",
    entityType: "USER",
    entityId: targetUserId,
    newValue: { isActive },
  });

  return { message: `User ${isActive ? "activated" : "deactivated"} successfully` };
};

// RESET USER PASSWORD (admin sets a new password)
export const resetUserPassword = async ({ targetUserId, newPassword, adminId }) => {
  const user = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!user) throw new ApiError(404, "User not found");

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: targetUserId }, data: { passwordHash } });

  await logAction({
    userId: adminId,
    action: "USER_PASSWORD_RESET",
    entityType: "USER",
    entityId: targetUserId,
    newValue: { resetBy: adminId },
  });

  return { message: "Password reset successfully" };
};

// GET ALL ROLES (for role assignment dropdown)
export const getAllRoles = async () => {
  return await prisma.role.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, description: true },
  });
};
