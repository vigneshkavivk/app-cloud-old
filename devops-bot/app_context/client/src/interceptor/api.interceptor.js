// axiosConfig.ts
import axios from 'axios';
import { __API_URL__ } from '../config/env.config';

const api = axios.create({
  baseURL: `${__API_URL__}`
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
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
    // Optional: Handle errors globally
    if (error.response?.status === 401) {
      // Handle unauthorized
      console.warn('Unauthorized. Redirecting to login...');
    }
    return Promise.reject(error);
  }
);

export default api;
