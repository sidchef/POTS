import api from './axios.js';

export const createBrm = (data) => api.post('/brms', data);
export const updateBrm = (id, data) => api.put(`/brms/${id}`, data);
export const submitBrm = (id) => api.post(`/brms/${id}/submit`);
export const listBrms = (params) => api.get('/brms', { params });
export const getBrm = (id) => api.get(`/brms/${id}`);
export const approveBrm = (id, data) => api.post(`/brms/${id}/approve`, data);
export const rejectBrm = (id, data) => api.post(`/brms/${id}/reject`, data);
export const getMyPendingApprovals = () => api.get('/brms/my-pending-approvals');

// Phase 2 additions
export const assignBrmToTm = (id, data) => api.post(`/brms/${id}/assign-tm`, data);
export const submitUserStories = (id) => api.post(`/brms/${id}/submit-stories`);
export const assignBrmToTspTl = (id, data) => api.post(`/brms/${id}/assign-tsp-tl`, data);

