import axios from "axios";
import API_BASE_URL from "../config";

const API = axios.create({
  baseURL: `${API_BASE_URL}/quiz`,
});

// Quiz APIs
export const generateQuiz = (noteId) => API.post("/generate", { noteId });
export const getQuiz = (noteId) => API.get(`/${noteId}`);
export const getAllQuizzes = () => API.get("/");
export const updateQuiz = (quizId, data) => API.put(`/${quizId}`, data);
export const deleteQuiz = (quizId) => API.delete(`/${quizId}`);

export default API;
