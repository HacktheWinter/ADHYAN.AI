import axios from "axios";
import API_BASE_URL from "../config";
import { clearAuth, getStoredToken } from "../utils/authStorage";

const attachInterceptors = (client) => {
  if (client.__principalConfigured) return client;

  client.interceptors.request.use((config) => {
    const token = getStoredToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401 && getStoredToken()) {
        clearAuth();
        window.location.href = "/login";
      }
      return Promise.reject(error);
    }
  );

  client.__principalConfigured = true;
  return client;
};

attachInterceptors(axios);

const api = attachInterceptors(
  axios.create({
    baseURL: API_BASE_URL,
  })
);

export default api;
