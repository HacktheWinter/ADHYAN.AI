// FrontendStudent/src/api/quizApi.js
import axios from "axios";

const BASE_URL = "http://localhost:5000/api";

// Get active quizzes for classroom
export const getActiveQuizzes = async (classroomId) => {
  const res = await axios.get(
    `${BASE_URL}/quiz/active/classroom/${classroomId}`
  );
  return res.data;
};

// Get quiz by ID
export const getQuizById = async (quizId) => {
  const res = await axios.get(`${BASE_URL}/quiz/${quizId}`);
  return res.data;
};

// Submit quiz
export const submitQuiz = async (quizId, studentId, answers) => {
  const res = await axios.post(`${BASE_URL}/quiz-submission/submit`, {
    quizId,
    studentId,
    answers,
  });
  return res.data;
};

// Check if student submitted
export const checkSubmission = async (quizId, studentId) => {
  const res = await axios.get(
    `${BASE_URL}/quiz-submission/check/${quizId}/${studentId}`
  );
  return res.data;
};

// Get quiz result
export const getQuizResult = async (quizId, studentId) => {
  const res = await axios.get(
    `${BASE_URL}/quiz-submission/result/${quizId}/${studentId}`
  );
  return res.data;
};
