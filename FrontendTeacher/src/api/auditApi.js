import api from "../api/axios";

/**
 * Audit API — Fetch face recognition audit logs and statistics.
 */

export const fetchAuditLogs = async (params = {}) => {
  const response = await api.get("/api/audit/logs", { params });
  return response.data;
};

export const fetchAuditLogById = async (id) => {
  const response = await api.get(`/api/audit/logs/${id}`);
  return response.data;
};

export const fetchAuditStats = async (days = 30) => {
  const response = await api.get("/api/audit/stats", { params: { days } });
  return response.data;
};
