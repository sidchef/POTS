//takes requests ,calls ,services and sends response

import * as authService from "../services/auth.service.js";
import ApiResponse from "../utils/ApiResponse.js";

// POST /api/auth/register
export const register = async (req, res, next) => {
  try {
    const { employeeId, firstName, lastName, email, password, roleNames } = req.body;

    if (!employeeId || !firstName || !lastName || !email || !password) {
      const { default: ApiError } = await import("../utils/ApiError.js");
      throw new ApiError(400, "All fields are required: employeeId, firstName, lastName, email, password");
    }

    const user = await authService.register({ employeeId, firstName, lastName, email, password, roleNames });

    res.status(201).json(new ApiResponse(201, user, "User registered successfully"));
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/login
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      const { default: ApiError } = await import("../utils/ApiError.js");
      throw new ApiError(400, "Email and password are required");
    }

    const result = await authService.login({ email, password });

    res.status(200).json(new ApiResponse(200, result, "Login successful"));
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/change-password
export const changePassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      const { default: ApiError } = await import("../utils/ApiError.js");
      throw new ApiError(400, "Old password and new password are required");
    }

    const result = await authService.changePassword({
      userId: req.user.id,
      oldPassword,
      newPassword,
    });

    res.status(200).json(new ApiResponse(200, result, "Password changed"));
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/me
export const getMe = async (req, res, next) => {
  try {
    const profile = await authService.getMyProfile(req.user.id);
    res.status(200).json(new ApiResponse(200, profile, "Profile fetched"));
  } catch (err) {
    next(err);
  }
};
