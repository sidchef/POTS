import api from './axios.js';

export const getAllTspProfiles = () => api.get('/tsp-profiles');
export const getTspProfileByUserId = (userId) => api.get(`/tsp-profiles/${userId}`);
export const updateTspProfile = (userId, data) => api.put(`/tsp-profiles/${userId}`, data);
export const getTspMembersBySkill = (skill) => api.get(`/tsp-profiles/by-skill?skill=${encodeURIComponent(skill)}`);
