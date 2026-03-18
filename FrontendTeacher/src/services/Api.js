import api from "../api/axios";

// Quiz APIs
export const generateQuiz = (noteId) => api.post("/quiz/generate", { noteId });
export const getQuiz = (noteId) => api.get(`/quiz/${noteId}`);
export const getAllQuizzes = () => api.get("/quiz");
export const updateQuiz = (quizId, data) => api.put(`/quiz/${quizId}`, data);
export const deleteQuiz = (quizId) => api.delete(`/quiz/${quizId}`);

export default api;
