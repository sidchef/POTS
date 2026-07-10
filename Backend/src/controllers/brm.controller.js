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


export const submitTechnologyRequirements = async (req, res, next) => {
  try {
    const { requirements } = req.body;
    if (!requirements || !Array.isArray(requirements) || requirements.length === 0) {
      return res.status(400).json(new ApiResponse(400, null, "Requirements array is mandatory"));
    }
    
    const result = await brmService.submitTechnologyRequirements(req.params.id, req.user.id, requirements);
    res.status(200).json(new ApiResponse(200, result, "Technology Requirements submitted"));
  } catch (err) { next(err); }
};


