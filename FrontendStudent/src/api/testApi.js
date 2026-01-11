// FrontendStudent/src/api/testApi.js
import axios from "axios";
import API_BASE_URL from "../config";

const BASE_URL = API_BASE_URL;

// Get active test papers for classroom
export const getActiveTestPapers = async (classroomId) => {
  const res = await axios.get(
    `${BASE_URL}/test-paper/active/classroom/${classroomId}`
  );
  return res.data;
};

// Get test paper by ID
export const getTestPaperById = async (testId) => {
  const res = await axios.get(`${BASE_URL}/test-paper/${testId}`);
  return res.data;
};

// Submit test
export const submitTest = async (testPaperId, studentId, answers) => {
  const res = await axios.post(`${BASE_URL}/test-submission/submit`, {
    testPaperId,
    studentId,
    answers,
  });
  return res.data;
};

// Check if student submitted
export const checkSubmission = async (testPaperId, studentId) => {
  const res = await axios.get(
    `${BASE_URL}/test-submission/check/${testPaperId}/${studentId}`
  );
  return res.data;
};

// Get test result
export const getTestResult = async (testPaperId, studentId) => {
  const res = await axios.get(
    `${BASE_URL}/test-submission/result/${testPaperId}/${studentId}`
  );
  return res.data;
};
