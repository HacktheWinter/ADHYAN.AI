import api from "./axios";

export const registerPrincipal = async (payload) => {
  const response = await api.post("/principal/register", payload);
  return response.data;
};

export const loginPrincipal = async (payload) => {
  const response = await api.post("/principal/login", payload);
  return response.data;
};

export const logoutPrincipal = async () => {
  const response = await api.post("/principal/logout");
  return response.data;
};

export const getDashboard = async () => {
  const response = await api.get("/principal/dashboard");
  return response.data;
};

export const getTeachers = async () => {
  const response = await api.get("/principal/teachers");
  return response.data;
};

export const getTeacherDetail = async (teacherId) => {
  const response = await api.get(`/principal/teachers/${teacherId}`);
  return response.data;
};

export const getClasses = async () => {
  const response = await api.get("/principal/classes");
  return response.data;
};

export const getClassDetail = async (classId) => {
  const response = await api.get(`/principal/classes/${classId}`);
  return response.data;
};

export const getActivityFeed = async (params = {}) => {
  const response = await api.get("/principal/activity", { params });
  return response.data;
};
