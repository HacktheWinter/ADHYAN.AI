import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api",
});

// Automatically attach token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (!token) {
      console.warn("Unauthorized! Token might be missing or expired.");
    } else {
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
      console.error("Unauthorized! Check your token or login again.");
      // Optionally, redirect to login page
      // window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
