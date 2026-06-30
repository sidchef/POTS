import * as adminService from "../services/admin.service.js";
import ApiResponse from "../utils/ApiResponse.js";
import ApiError from "../utils/ApiError.js";

// GET /api/admin/users
export const getAllUsers = async (req, res, next) => {
  try {
    const { page, limit, search, role } = req.query;
    const result = await adminService.getAllUsers({
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10,
      search,
      roleFilter: role,
    });
    res.status(200).json(new ApiResponse(200, result, "Users fetched"));
  } catch (err) { next(err); }
};

// GET /api/admin/users/:id
export const getUserById = async (req, res, next) => {
  try {
    const user = await adminService.getUserById(req.params.id);
    res.status(200).json(new ApiResponse(200, user, "User fetched"));
  } catch (err) { next(err); }
};

// POST /api/admin/users
export const createUser = async (req, res, next) => {
  try {
    const { employeeId, firstName, lastName, email, roleNames } = req.body; 
    if (!employeeId || !firstName || !lastName || !email) { 
      throw new ApiError(400, "All fields required: employeeId, firstName, lastName, email");
    }
    if (!roleNames || roleNames.length === 0) {
      throw new ApiError(400, "At least one role must be assigned");
    }
    const user = await adminService.createUser({
      employeeId, firstName, lastName, email, roleNames, 
      adminId: req.user.id,
    });
    res.status(201).json(new ApiResponse(201, user, "User created successfully. Credentials sent via email."));
  } catch (err) { next(err); }
};

// PATCH /api/admin/users/:id/role
export const changeUserRole = async (req, res, next) => {
  try {
    const { roleNames } = req.body;
    if (!roleNames || roleNames.length === 0) {
      throw new ApiError(400, "At least one role must be provided");
    }

    const result = await adminService.changeUserRole({
      targetUserId: req.params.id,
      roleNames,
      adminId: req.user.id,
    });
    res.status(200).json(new ApiResponse(200, result, "Role updated"));
  } catch (err) { next(err); }
};

// PATCH /api/admin/users/:id/status
export const toggleUserStatus = async (req, res, next) => {
  try {
    const { isActive } = req.body;
    if (typeof isActive !== "boolean") {
      throw new ApiError(400, "isActive must be true or false");
    }

    const result = await adminService.toggleUserStatus({
      targetUserId: req.params.id,
      isActive,
      adminId: req.user.id,
    });
    res.status(200).json(new ApiResponse(200, result, "User status updated"));
  } catch (err) { next(err); }
};

// POST /api/admin/users/:id/reset-password
export const resetUserPassword = async (req, res, next) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      throw new ApiError(400, "New password must be at least 6 characters");
    }

    const result = await adminService.resetUserPassword({
      targetUserId: req.params.id,
      newPassword,
      adminId: req.user.id,
    });
    res.status(200).json(new ApiResponse(200, result, "Password reset"));
  } catch (err) { next(err); }
};

// GET /api/admin/roles
export const getAllRoles = async (req, res, next) => {
  try {
    const roles = await adminService.getAllRoles();
    res.status(200).json(new ApiResponse(200, roles, "Roles fetched"));
  } catch (err) { next(err); }
};
