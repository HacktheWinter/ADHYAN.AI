import axios from "axios";

import { getStoredToken, clearAuth, getBrowserId } from "../utils/authStorage";
import API_BASE_URL from "../config";

const attachInterceptors = (client) => {
  if (client.__adhyanConfigured) return client;

  client.interceptors.request.use((req) => {
    const token = getStoredToken();
    if (token) {
      req.headers.Authorization = `Bearer ${token}`;
    }
    // Always attach browser ID for account-switching cooldown tracking
    req.headers["X-Browser-ID"] = getBrowserId();
    return req;
  });

  client.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401 && getStoredToken()) {
        console.error("Unauthorized! Session expired. Redirecting to login...");
        clearAuth();
        window.location.href = "/login";
      }
      return Promise.reject(error);
    }
  );

  client.__adhyanConfigured = true;
  return client;
};

attachInterceptors(axios);

const API = attachInterceptors(
  axios.create({
    baseURL: API_BASE_URL,
  })
);

export default API;
