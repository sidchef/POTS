import api from './axios.js';

export const getMyAllocations = () => api.get('/tsp-tm/my-allocations');
export const getAllocationById = (id) => api.get(`/tsp-tm/allocations/${id}`);
export const addMilestone = (allocationId, data) => api.post(`/tsp-tm/allocations/${allocationId}/milestones`, data);
export const toggleMilestone = (milestoneId) => api.patch(`/tsp-tm/milestones/${milestoneId}/toggle`);
export const logProgress = (allocationId, data) => api.post(`/tsp-tm/allocations/${allocationId}/progress`, data);
export const completeAllocation = (allocationId) => api.patch(`/tsp-tm/allocations/${allocationId}/complete`);

