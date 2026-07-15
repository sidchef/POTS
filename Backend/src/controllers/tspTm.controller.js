import * as tspTmService from "../services/tspTm.service.js";

export const getMyAllocations = async (req, res, next) => {
  try {
    const data = await tspTmService.getMyAllocations(req.user.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

export const getAllocationById = async (req, res, next) => {
  try {
    const data = await tspTmService.getAllocationById(req.params.id, req.user.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

export const addMilestone = async (req, res, next) => {
  try {
    const data = await tspTmService.addMilestone(req.params.id, req.user.id, req.body);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
};

export const toggleMilestone = async (req, res, next) => {
  try {
    const data = await tspTmService.toggleMilestone(req.params.milestoneId, req.user.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

export const logProgress = async (req, res, next) => {
  try {
    const data = await tspTmService.logProgress(req.params.id, req.user.id, req.body);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
};

export const completeAllocation = async (req, res, next) => {
  try {
    const data = await tspTmService.completeAllocation(req.params.id, req.user.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};
