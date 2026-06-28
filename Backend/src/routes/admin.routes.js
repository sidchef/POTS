import { Router } from "express";
import { authenticate, authorizeRole } from "../middleware/auth.middleware.js";
import {
  getAllUsers,
  getUserById,
  createUser,
  changeUserRole,
  toggleUserStatus,
  resetUserPassword,
  getAllRoles,
} from "../controllers/admin.controller.js";

const router = Router();

// All admin routes require authentication + SUPER_ADMIN role
router.use(authenticate);
router.use(authorizeRole("SUPER_ADMIN"));

router.get("/users", getAllUsers);
router.get("/users/:id", getUserById);
router.post("/users", createUser);
router.patch("/users/:id/role", changeUserRole);
router.patch("/users/:id/status", toggleUserStatus);
router.post("/users/:id/reset-password", resetUserPassword);
router.get("/roles", getAllRoles);

export default router;
