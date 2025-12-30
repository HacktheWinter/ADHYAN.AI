import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/api/quiz",
});

// Quiz APIs
export const generateQuiz = (noteId) => API.post("/generate", { noteId });
export const getQuiz = (noteId) => API.get(`/${noteId}`);
export const getAllQuizzes = () => API.get("/");
export const updateQuiz = (quizId, data) => API.put(`/${quizId}`, data);
export const deleteQuiz = (quizId) => API.delete(`/${quizId}`);

export default API;
