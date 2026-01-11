import axios from "axios";
import API_BASE_URL_CONFIG from "../config";

const API_BASE_URL = `${API_BASE_URL_CONFIG}/doubts`;

export const getDoubts = async (classId) => {
  try {
    const res = await axios.get(`${API_BASE_URL}/${classId}`);
    return res.data;
  } catch (error) {
    console.error("Error fetching doubts:", error);
    throw error;
  }
};

export const createDoubt = async (payload) => {
  try {
    const res = await axios.post(API_BASE_URL, payload);
    return res.data;
  } catch (error) {
    console.error("Error creating doubt:", error);
    throw error;
  }
};

export const addReply = async (doubtId, payload) => {
  try {
    const res = await axios.post(`${API_BASE_URL}/${doubtId}/replies`, payload);
    return res.data;
  } catch (error) {
    console.error("Error adding reply:", error);
    throw error;
  }
};
