import axios from "axios";
import { getStoredToken, clearAuth } from "../utils/authStorage";
import API_BASE_URL from "../config";


const api = axios.create({
  baseURL: API_BASE_URL,
});

// Automatically attach token to requests
api.interceptors.request.use(
  (config) => {
    const token = getStoredToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Optional: handle 401 globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error("Unauthorized! Session expired. Redirecting to login...");
      clearAuth();
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
