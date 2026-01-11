import axios from "axios";

import { getStoredToken, clearAuth } from "../utils/authStorage";
import API_BASE_URL from "../config";

const API = axios.create({
  baseURL: API_BASE_URL,
});

API.interceptors.request.use((req) => {
  const token = getStoredToken();
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

API.interceptors.response.use(
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

export default API;
