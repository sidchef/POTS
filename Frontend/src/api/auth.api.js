import api from './axios.js';

export const changePassword = (data) => api.post('/auth/change-password', data);
