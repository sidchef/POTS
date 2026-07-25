import * as brmService from "../services/brm.service.js";
import * as approvalService from "../services/approval.service.js";
import ApiResponse from "../utils/ApiResponse.js";
import ApiError from "../utils/ApiError.js";



// POST /api/brms
export const createBrm = async (req, res, next) => {
  try {
    const { brmNumber,teamName, category, title, description, priority } = req.body;
    if (!brmNumber||!title || !teamName || !category) {
      throw new ApiError(400, "brmNumber, title, teamName, and category are required");
    }
    const brm = await brmService.createBrm({
      userId: req.user.id, brmNumber, teamName, category, title, description, priority,
    });
    res.status(201).json(new ApiResponse(201, brm, "BRM created successfully"));
  } catch (err) { next(err); }
};

// PUT /api/brms/:id
export const updateBrm = async (req, res, next) => {
  try {
    const brm = await brmService.updateBrm({
      brmId: req.params.id, userId: req.user.id, updates: req.body,
    });
    res.status(200).json(new ApiResponse(200, brm, "BRM updated successfully"));
  } catch (err) { next(err); }
};

// POST /api/brms/:id/submit
export const submitBrm = async (req, res, next) => {
  try {
    const result = await brmService.submitBrm({
      brmId: req.params.id, userId: req.user.id, ipAddress: req.ip,
    });
    res.status(200).json(new ApiResponse(200, result, "BRM submitted for approval"));
  } catch (err) { next(err); }
};

// GET /api/brms/:id
export const getBrmById = async (req, res, next) => {
  try {
    const brm = await brmService.getBrmById(req.params.id);
    res.status(200).json(new ApiResponse(200, brm, "BRM fetched"));
  } catch (err) { next(err); }
};

// GET /api/brms
export const listBrms = async (req, res, next) => {
  try {
    const { status, priority, page, limit } = req.query;
    const result = await brmService.listBrms({
      userId: req.user.id,
      roles: req.user.roles,
      status, priority,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10,
    });
    res.status(200).json(new ApiResponse(200, result, "BRMs fetched"));
  } catch (err) { next(err); }
};

// POST /api/brms/:id/approve
export const approveBrm = async (req, res, next) => {
  try {
    const { comments } = req.body;
    const result = await approvalService.processVote({
      brmId: req.params.id,
      approverId: req.user.id,
      decision: "APPROVED",
      comments,
      ipAddress: req.ip,
    });
    res.status(200).json(new ApiResponse(200, result, result.message));
  } catch (err) { next(err); }
};

// POST /api/brms/:id/reject
export const rejectBrm = async (req, res, next) => {
  try {
    const { comments } = req.body;
    if (!comments) throw new ApiError(400, "Comments/reason is required when rejecting");
    const result = await approvalService.processVote({
      brmId: req.params.id,
      approverId: req.user.id,
      decision: "REJECTED",
      comments,
      ipAddress: req.ip,
    });
    res.status(200).json(new ApiResponse(200, result, result.message));
  } catch (err) { next(err); }
};

// GET /api/brms/my-pending-approvals
export const getMyPendingApprovals = async (req, res, next) => {
  try {
    const result = await approvalService.getMyPendingApprovals(req.user.id);
    res.status(200).json(new ApiResponse(200, result, "Pending approvals fetched"));
  } catch (err) { next(err); }
};

// POST /api/brms/:id/assign-tm
export const assignBrmToTm = async (req, res, next) => {
  try {
    const { tmId } = req.body;
    if (!tmId) throw new ApiError(400, "tmId is required");
    
    const result = await brmService.assignBrmToTm(req.params.id, tmId, req.user.id);
    res.status(200).json(new ApiResponse(200, result, "Assigned successfully"));
  } catch (err) { next(err); }
};

// POST /api/brms/:id/submit-stories
export const submitUserStories = async (req, res, next) => {
  try {
    const result = await brmService.submitUserStories(req.params.id, req.user.id);
    res.status(200).json(new ApiResponse(200, result, "Submitted successfully"));
  } catch (err) { next(err); }
};

// POST /api/brms/:id/assign-tsp-tl
export const assignBrmToTspTl = async (req, res, next) => {
  try {
    const { tspTlId } = req.body;
    if (!tspTlId) throw new ApiError(400, "tspTlId is required");
    const result = await brmService.assignBrmToTspTl(req.params.id, req.user.id, tspTlId);
    res.status(200).json(new ApiResponse(200, result, "TSP TL assigned successfully"));
  } catch (err) { next(err); }
};



 export const submitArchitecture = async (req, res, next) => {
  try {
    const result = await brmService.submitArchitecture(req.params.id, req.user.id, req.file);
    res.status(200).json(new ApiResponse(200, result, "Architecture submitted successfully"));
  } catch (err) { next(err); }
};


export const approveArchitecture = async (req, res, next) => {
  try {
    const result = await brmService.approveArchitecture(req.params.id, req.user.id);
    res.status(200).json(new ApiResponse(200, result, "Architecture approved"));
  } catch (err) { next(err); }
};


export const addTechnologyRequirement = async (req, res, next) => {
  try {
    const { requirement } = req.body;
    if (!requirement || !requirement.technologyName) {
      return res.status(400).json(new ApiResponse(400, null, "Technology name is required"));
    }
    const result = await brmService.addTechnologyRequirement(req.params.id, req.user.id, requirement);
    res.status(201).json(new ApiResponse(201, result, "Technology Requirement added"));
  } catch (err) { next(err); }
};

export const finalizeTechnologyRequirements = async (req, res, next) => {
  try {
    const result = await brmService.finalizeTechnologyRequirements(req.params.id, req.user.id);
    res.status(200).json(new ApiResponse(200, result, "Technology Requirements finalized"));
  } catch (err) { next(err); }
};


export const allocateTask = async (req, res, next) => {
  try {
    const data = await brmService.allocateTask(req.params.id, req.user.id, req.body);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
};

export const getBrmAllocations = async (req, res, next) => {
  try {
    const data = await brmService.getBrmAllocations(req.params.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

export const completeAllocation = async (req, res, next) => {
  try {
    const data = await brmService.completeAllocation(req.params.allocationId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

export const getMyAssignedTasks = async (req, res, next) => {
  try {
    const data = await brmService.getMyAssignedTasks(req.user.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

export const getQaMembers = async (req, res, next) => {
  try {
    const data = await brmService.getQaMembers();
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

export const assignTaskToQa = async (req, res, next) => {
  try {
    const { brmId, taskTitle, qaMemberId } = req.body;
    await brmService.assignTaskToQa(brmId, taskTitle, qaMemberId);
    res.json({ success: true, message: 'Task successfully assigned to QA' });
  } catch (err) { next(err); }
};

export const getMyQaTasks = async (req, res, next) => {
  try {
    const data = await brmService.getMyQaTasks(req.user.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};


export const addQaTestScenario = async (req, res, next) => {
  try {
    const data = await brmService.addQaTestScenario(req.params.allocationId, req.user.id, req.body);
    res.status(201).json({ success: true, data, message: "Scenario added successfully" });
  } catch (err) { next(err); }
};

export const getQaScenarios = async (req, res, next) => {
  try {
    const data = await brmService.getQaScenarios(req.params.allocationId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

export const addQaEvidence = async (req, res, next) => {
  try {
    if (!req.file) throw new ApiError(400, "Evidence file is required");
    const data = await brmService.addQaEvidence(req.params.scenarioId, req.file, req.user.id);
    res.status(201).json({ success: true, data, message: "Evidence uploaded successfully" });
  } catch (err) { next(err); }
};


export const approveQaTesting = async (req, res, next) => {
  try {
    const data = await brmService.approveQaTesting(req.params.allocationId, req.user.id);
    res.status(200).json({ success: true, data, message: "Task marked as QA Completed" });
  } catch (err) { next(err); }
};


