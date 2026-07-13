import express from "express";
import { authenticate, authorize } from "../middleware/auth.middleware.js";
import {
  getAllProfiles,
  getProfileByUserId,
  updateProfile,
  getMembersBySkill
} from "../controllers/tspProfile.controller.js";

const router = express.Router();

router.use(authenticate);

// GET /api/tsp-profiles/by-skill?skill=React
router.get("/by-skill", authorize("SUBMIT_ARCHITECTURE"), getMembersBySkill);

// GET /api/tsp-profiles
router.get("/", authorize("SUBMIT_ARCHITECTURE"), getAllProfiles);

// GET /api/tsp-profiles/:userId
router.get("/:userId", authorize("SUBMIT_ARCHITECTURE"), getProfileByUserId);

// PUT /api/tsp-profiles/:userId
router.put("/:userId", updateProfile);

export default router;
