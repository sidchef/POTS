import api from './axios.js';

export const getMyQaTasks = () => api.get('/brms/qa/my-tasks');
export const getQaScenarios = (allocationId) => api.get(`/brms/allocations/${allocationId}/qa-scenarios`);
export const addQaTestScenario = (allocationId, data) => api.post(`/brms/allocations/${allocationId}/qa-scenarios`, data);
export const uploadQaEvidence = (scenarioId, formData) => api.post(`/brms/qa-scenarios/${scenarioId}/evidence`, formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
export const approveQaTesting = (allocationId) => api.patch(`/brms/allocations/${allocationId}/qa-complete`);


