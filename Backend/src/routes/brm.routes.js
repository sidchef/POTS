import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.middleware.js";
import {
  createBrm, updateBrm, submitBrm, getBrmById,
  listBrms, approveBrm, rejectBrm, getMyPendingApprovals,
  assignBrmToTm, submitUserStories, assignBrmToTspTl, submitArchitecture, approveArchitecture,addTechnologyRequirement, finalizeTechnologyRequirements,
  allocateTask,getBrmAllocations,completeAllocation , getMyAssignedTasks, getQaMembers, assignTaskToQa, getMyQaTasks,
  addQaTestScenario, getQaScenarios, addQaEvidence,approveQaTesting// Added new functions here
} from "../controllers/brm.controller.js";
import prisma from "../config/prisma.js";
import { uploadArchitecture, uploadEvidence } from "../middleware/upload.middleware.js";



const router = Router();

router.use(authenticate);

// PL routes
router.post("/", authorize("CREATE_BRM"), createBrm);
router.put("/:id", authorize("CREATE_BRM"), updateBrm);
router.post("/:id/submit", authorize("CREATE_BRM"), submitBrm);

// Viewing routes
// Get users by role (for assignment dropdowns)
router.get("/users/by-role", authorize("CREATE_BRM"), async (req, res, next) => {
  try {
    const { role } = req.query;
    if (!role) return res.status(400).json({ message: "role query param required" });
    const users = await prisma.user.findMany({
      where: { isActive: true, roles: { some: { role: { name: role } } } },
      select: { id: true, firstName: true, lastName: true, employeeId: true, email: true },
      orderBy: { firstName: "asc" }
    });
    res.status(200).json({ success: true, data: users });
  } catch (err) { next(err); }
});
router.get("/allocations/assigned-by-me", authorize("SUBMIT_ARCHITECTURE"), getMyAssignedTasks);

router.get("/my-pending-approvals", authorize("COMMITTEE_REVIEW"), getMyPendingApprovals);
router.get("/", authorize("BRM_DASHBOARD"), listBrms);
//QA Allocation
router.get("/qa-members", getQaMembers);
router.post("/allocations/assign-qa", assignTaskToQa);
router.get("/qa/my-tasks", getMyQaTasks);


router.get("/:id", authorize("BRM_DETAILS"), getBrmById);

// Approval routes — HF and HT only
router.post("/:id/approve", authorize("COMMITTEE_REVIEW"), approveBrm);
router.post("/:id/reject", authorize("COMMITTEE_REVIEW"), rejectBrm);

// Phase 2: User Story Assignment & Submission
router.post("/:id/assign-tm", authorize("CREATE_BRM"), assignBrmToTm); 
router.post("/:id/submit-stories", authorize("TASK_BOARD"), submitUserStories); 
router.post("/:id/assign-tsp-tl", authorize("CREATE_BRM"), assignBrmToTspTl);

// Architecture Submission and Approval
router.post("/:id/submit-architecture", authorize("SUBMIT_ARCHITECTURE"), uploadArchitecture.single('document'), submitArchitecture);
router.post("/:id/approve-architecture", authorize("CREATE_BRM"), approveArchitecture);

//Technology submission
router.post("/:id/technology-requirements/add", authorize("SUBMIT_ARCHITECTURE"), addTechnologyRequirement);
router.post("/:id/technology-requirements/submit", authorize("SUBMIT_ARCHITECTURE"), finalizeTechnologyRequirements);


//Task Allocation
router.post("/:id/allocate-task", authenticate, authorize("SUBMIT_ARCHITECTURE"), allocateTask);
router.get("/:id/allocations", authenticate, getBrmAllocations);
router.patch("/:id/allocations/:allocationId/complete", authenticate, authorize("SUBMIT_ARCHITECTURE"), completeAllocation);

// QA Test Scenarios & Evidence
router.post("/allocations/:allocationId/qa-scenarios", authenticate, addQaTestScenario);
router.get("/allocations/:allocationId/qa-scenarios", authenticate, getQaScenarios);
router.post("/qa-scenarios/:scenarioId/evidence", authenticate, uploadEvidence.single('document'), addQaEvidence);


// TL Approves QA
router.patch("/allocations/:allocationId/qa-complete", authenticate, authorize("SUBMIT_ARCHITECTURE"), approveQaTesting);











export default router;
