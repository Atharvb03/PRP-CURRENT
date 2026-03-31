import axios from 'axios';

const api = axios.create();

// Attach JWT token to every request automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// On 401/403 — token invalid/expired or access denied — clear storage and redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Only redirect to login if it's an authentication error (401)
      // For 403, let the component handle it (might be permission issue, not auth)
      if (error.response?.status === 401) {
        console.error('Authentication failed - redirecting to login');
        localStorage.removeItem('token');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userName');
        localStorage.removeItem('uploads');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
