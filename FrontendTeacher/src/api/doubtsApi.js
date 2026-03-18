import axios from "axios";
import API_BASE_URL from "../config";

export const getDoubts = async (classId) => {
  const res = await axios.get(`${API_BASE_URL}/doubts/${classId}`);
  return res.data;
};

export const createDoubt = async (payload) => {
  const res = await axios.post(`${API_BASE_URL}/doubts`, payload);
  return res.data;
};
