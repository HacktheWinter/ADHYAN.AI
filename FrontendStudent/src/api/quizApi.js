import axios from "axios";
import API_BASE_URL from "../config";

const BASE_URL = API_BASE_URL;

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
export const submitQuiz = async (quizId, studentId, answers, proctorPhoto = null) => {
  const payload = {
    quizId,
    studentId,
    answers,
  };
  if (proctorPhoto) {
    payload.proctorPhoto = proctorPhoto;
  }
  const res = await axios.post(`${BASE_URL}/quiz-submission/submit`, payload);
  return res.data;
};

// Autosave quiz draft
export const autosaveQuiz = async (quizId, studentId, answers) => {
  const res = await axios.post(`${BASE_URL}/quiz-submission/autosave`, {
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

export const runCode = async (quizId, questionId, code, language, customInput) => {
  const res = await axios.post(`${BASE_URL}/quiz-submission/run-code`, {
    quizId,
    questionId,
    code,
    language,
    customInput,
  });
  return res.data;
};

// Upload webcam proctor snapshot to Cloudinary
export const uploadProctorSnapshot = async (base64Image, quizId = null, studentId = null) => {
  const res = await axios.post(`${BASE_URL}/proctor/upload-snapshot`, {
    image: base64Image,
    quizId,
    studentId,
  });
  return res.data;
};