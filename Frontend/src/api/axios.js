import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000, // 15 second timeout — fail fast in production
});

// ─── Request Interceptor ─────────────────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('pots_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor ────────────────────────────────────────────────────
api.interceptors.response.use(
  (response) => {
    // If backend says token is expiring soon, warn the user
    if (response.headers['x-token-expiring-soon']) {
      console.warn('[POTS] Session expiring soon. Please save your work.');
    }
    return response;
  },
  (error) => {
    if (!error.response) {
      // Network error or timeout
      error.message = 'Network error. Please check your connection.';
      return Promise.reject(error);
    }

    const { status } = error.response;

    if (status === 401) {
      localStorage.removeItem('pots_token');
      localStorage.removeItem('pots_user');
      // Only redirect if not already on login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    if (status === 403) {
      error.message = error.response.data?.message || 'You do not have permission to perform this action.';
    }

    if (status === 429) {
      error.message = 'Too many requests. Please slow down.';
    }

    if (status >= 500) {
      error.message = 'Server error. Please try again or contact support.';
    }

    return Promise.reject(error);
  }
);

export default api;
