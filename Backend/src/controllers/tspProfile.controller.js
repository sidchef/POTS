import * as tspProfileService from "../services/tspProfile.service.js";

export const getAllProfiles = async (req, res, next) => {
  try {
    const data = await tspProfileService.getAllProfiles();
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

export const getProfileByUserId = async (req, res, next) => {
  try {
    const data = await tspProfileService.getProfileByUserId(req.params.userId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

export const updateProfile = async (req, res, next) => {
  try {
    const data = await tspProfileService.updateProfile(req.params.userId, req.body);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

export const getMembersBySkill = async (req, res, next) => {
  try {
    const data = await tspProfileService.getMembersBySkill(req.query.skill);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};
