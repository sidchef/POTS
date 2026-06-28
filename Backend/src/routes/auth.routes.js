import { Router } from "express";
import { register, login, changePassword, getMe } from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

// Public routes
router.post("/register", register);
router.post("/login", login);

// Protected routes (need valid JWT)
router.post("/change-password", authenticate, changePassword);
router.get("/me", authenticate, getMe);

export default router;
