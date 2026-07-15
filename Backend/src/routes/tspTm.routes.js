import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import {
  getMyAllocations,
  getAllocationById,
  addMilestone,
  toggleMilestone,
  logProgress,
  completeAllocation
} from "../controllers/tspTm.controller.js";

const router = express.Router();
router.use(authenticate);

router.get("/my-allocations", getMyAllocations);
router.get("/allocations/:id", getAllocationById);
router.post("/allocations/:id/milestones", addMilestone);
router.patch("/milestones/:milestoneId/toggle", toggleMilestone);
router.post("/allocations/:id/progress", logProgress);
router.patch("/allocations/:id/complete", completeAllocation);

export default router;
