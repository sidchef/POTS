import api from './axios.js';

export const createUserStory = (data) => api.post('/user-stories', data);
export const getUserStoriesByBrm = (brmId) => api.get(`/user-stories/brm/${brmId}`);
export const updateUserStory = (id, data) => api.put(`/user-stories/${id}`, data);
export const deleteUserStory = (id) => api.delete(`/user-stories/${id}`);
