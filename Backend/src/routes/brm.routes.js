import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.middleware.js";
import {
  createBrm, updateBrm, submitBrm, getBrmById,
  listBrms, approveBrm, rejectBrm, getMyPendingApprovals,
} from "../controllers/brm.controller.js";

const router = Router();

router.use(authenticate);

// PL routes
router.post("/", authorize("CREATE_BRM"), createBrm);
router.put("/:id", authorize("CREATE_BRM"), updateBrm);
router.post("/:id/submit", authorize("CREATE_BRM"), submitBrm);

// Viewing routes
router.get("/my-pending-approvals", authorize("COMMITTEE_REVIEW"), getMyPendingApprovals);
router.get("/", authorize("BRM_DASHBOARD"), listBrms);
router.get("/:id", authorize("BRM_DETAILS"), getBrmById);

// Approval routes — HF and HT only
router.post("/:id/approve", authorize("COMMITTEE_REVIEW"), approveBrm);
router.post("/:id/reject", authorize("COMMITTEE_REVIEW"), rejectBrm);

export default router;
