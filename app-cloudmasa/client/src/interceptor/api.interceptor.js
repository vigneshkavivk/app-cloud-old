// client/src/interceptor/api.interceptor.js
import axios from 'axios';

const api = axios.create({
  // ✅ RELATIVE baseURL → uses same origin => Vite proxy handles /api
  baseURL: '/', 
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// ✅ Single, clean request interceptor for auth
api.interceptors.request.use(
  (config) => {
    // Try to get token from localStorage (support multiple formats)
    let token = localStorage.getItem('token');

    if (!token) {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          token = user.token || user.accessToken;
        } catch (e) {
          console.warn('Failed to parse user from localStorage:', e);
        }
      }
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      delete config.headers.Authorization;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ✅ Response interceptor for 401 handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn('⚠️ Unauthorized (401). Logging out...');
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      // Delay redirect to allow toast/notification
      setTimeout(() => {
        window.location.href = '/login';
      }, 1000);
    }
    return Promise.reject(error);
  }
);

export default api;
