import axios from "axios";

export const getDoubts = async (classId) => {
  const res = await axios.get(`http://localhost:5000/api/doubts/${classId}`);
  return res.data;
};

export const createDoubt = async (payload) => {
  const res = await axios.post("http://localhost:5000/api/doubts", payload);
  return res.data;
};
