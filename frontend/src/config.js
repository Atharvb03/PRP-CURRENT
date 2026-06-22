// Central API base URL: env override first, then sensible deploy/dev defaults.
export const API_BASE = import.meta.env.VITE_API_URL
  || (import.meta.env.PROD ? 'https://project-review-platform.onrender.com' : 'http://localhost:5000');
export const API = `${API_BASE}/api`;