import * as userStoryService from "../services/userStory.service.js";
import ApiResponse from "../utils/ApiResponse.js";

export const createUserStory = async (req, res, next) => {
  try {
    const result = await userStoryService.createUserStory({ ...req.body, createdById: req.user.id });
    res.status(201).json(new ApiResponse(201, result, "User story created"));
  } catch (err) { next(err); }
};

export const getUserStoriesByBrm = async (req, res, next) => {
  try {
    const result = await userStoryService.getUserStoriesByBrm(req.params.brmId);
    res.status(200).json(new ApiResponse(200, result, "User stories fetched"));
  } catch (err) { next(err); }
};

export const updateUserStory = async (req, res, next) => {
  try {
    const result = await userStoryService.updateUserStory(req.params.id, req.body, req.user.id);
    res.status(200).json(new ApiResponse(200, result, "User story updated"));
  } catch (err) { next(err); }
};

export const deleteUserStory = async (req, res, next) => {
  try {
    await userStoryService.deleteUserStory(req.params.id, req.user.id);
    res.status(200).json(new ApiResponse(200, null, "User story deleted"));
  } catch (err) { next(err); }
};
