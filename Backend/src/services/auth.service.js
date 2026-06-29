//this handles all the buisnnes logic for register .login ,passwaord change and jwt things

import prisma from "../config/prisma.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import ApiError from "../utils/ApiError.js";

// Helper — fetch user with their roles and permissions
const getUserWithPermissions = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      roles: {
        include: {
          role: {
            include: {
              rolePermissions: {
                include: { permission: true },
              },
            },
          },
        },
      },
      userPermissions: {
        include: { permission: true },
      },
    },
  });
  return user;
};

// Generate JWT token
const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

// REGISTER
export const register = async ({ employeeId, firstName, lastName, email, password, roleNames }) => {
  // Check if email already exists
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new ApiError(409, "A user with this email already exists");

  // Check if employeeId already exists
  const existingEmp = await prisma.user.findUnique({ where: { employeeId } });
  if (existingEmp) throw new ApiError(409, "A user with this employee ID already exists");

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);

  // Create user
  const user = await prisma.user.create({
    data: { employeeId, firstName, lastName, email, passwordHash },
  });

  // Assign roles
  if (roleNames && roleNames.length > 0) {
    for (const roleName of roleNames) {
      const role = await prisma.role.findUnique({ where: { name: roleName } });
      if (!role) throw new ApiError(400, `Role '${roleName}' does not exist`);

      await prisma.userRole.create({
        data: { userId: user.id, roleId: role.id },
      });
    }
  }

  return { id: user.id, employeeId: user.employeeId, email: user.email, firstName: user.firstName, lastName: user.lastName };
};

// LOGIN
export const login = async ({ email, password }) => {
  // Find user by email first
  const existingUser = await prisma.user.findUnique({ where: { email } });
  
  if (!existingUser) {
    throw new ApiError(401, "Invalid email or password");
  }
  // Now fetch full permissions safely
  const user = await getUserWithPermissions(existingUser.id);
  if (!user) throw new ApiError(401, "Invalid email or password");
  if (!user.isActive) throw new ApiError(403, "Your account has been deactivated");

  // Verify password
  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) throw new ApiError(401, "Invalid email or password");

  // Extract roles
  const roles = user.roles.map((ur) => ur.role.name);

  // Extract permissions (from roles + direct user permissions)
  const rolePermissions = user.roles.flatMap((ur) =>
    ur.role.rolePermissions.map((rp) => rp.permission.name)
  );
  const directPermissions = user.userPermissions.map((up) => up.permission.name);
  const permissions = [...new Set([...rolePermissions, ...directPermissions])];

  // Build JWT payload
  const tokenPayload = {
    userId: user.id,
    employeeId: user.employeeId,
    email: user.email,
    roles,
    permissions,
  };

  const token = generateToken(tokenPayload);

  return {
    token,
    user: {
      id: user.id,
      employeeId: user.employeeId,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      roles,
      permissions,
    },
  };
};

// CHANGE PASSWORD
export const changePassword = async ({ userId, oldPassword, newPassword }) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new ApiError(404, "User not found");

  const isMatch = await bcrypt.compare(oldPassword, user.passwordHash);
  if (!isMatch) throw new ApiError(401, "Old password is incorrect");

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

  return { message: "Password changed successfully" };
};

// GET MY PROFILE
export const getMyProfile = async (userId) => {
  const user = await getUserWithPermissions(userId);
  if (!user) throw new ApiError(404, "User not found");

  const roles = user.roles.map((ur) => ur.role.name);
  const permissions = [
    ...new Set([
      ...user.roles.flatMap((ur) => ur.role.rolePermissions.map((rp) => rp.permission.name)),
      ...user.userPermissions.map((up) => up.permission.name),
    ]),
  ];

  return {
    id: user.id,
    employeeId: user.employeeId,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    isActive: user.isActive,
    roles,
    permissions,
    createdAt: user.createdAt,
  };
};
