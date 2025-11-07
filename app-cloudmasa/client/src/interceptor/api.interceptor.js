// client/src/interceptor/api.interceptor.js
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://app.cloudmasa.com:3000/' // backend URL
  //withCredentials: true,            // send cookies for session auth
});

// ✅ Updated Request Interceptor
api.interceptors.request.use(
  (config) => {
    // Try to get token from localStorage.user.token
    const userStr = localStorage.getItem('user');
    let token = null;

    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        token = user.token; // <-- Get token from user object
      } catch (e) {
        console.warn('Failed to parse user from localStorage:', e);
      }
    }

    // If token exists, add Authorization header
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn('Unauthorized. Redirecting to login...');
      localStorage.removeItem('user'); // Clear user data
      window.location.href = '/'; // redirect to login
    }
    return Promise.reject(error);
  }
);

export default api;
