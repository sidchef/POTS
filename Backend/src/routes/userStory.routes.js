import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.middleware.js";
import { createUserStory, getUserStoriesByBrm, updateUserStory, deleteUserStory } from "../controllers/userStory.controller.js";

const router = Router();
router.use(authenticate);

// Routes
router.post("/", authorize("TASK_BOARD"), createUserStory);
router.get("/brm/:brmId", authorize("BRM_DETAILS"), getUserStoriesByBrm);
router.put("/:id", authorize("TASK_BOARD"), updateUserStory);
router.delete("/:id", authorize("TASK_BOARD"), deleteUserStory);

export default router;
