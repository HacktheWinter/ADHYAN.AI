// FrontendStudent/src/api/codingAssessmentApi.js
import axios from "axios";
import API_BASE_URL from "../config";

const BASE_URL = API_BASE_URL;

// Get active coding assessments for a classroom
export const getActiveCodingAssessments = async (classroomId) => {
  const res = await axios.get(
    `${BASE_URL}/coding-assessment/active/classroom/${classroomId}`
  );
  return res.data;
};

// Get coding assessment by ID
export const getCodingAssessmentById = async (assessmentId) => {
  const res = await axios.get(
    `${BASE_URL}/coding-assessment/${assessmentId}`
  );
  return res.data;
};

// Start coding round
export const startCodingRound = async (assessmentId) => {
  const res = await axios.post(
    `${BASE_URL}/coding-assessment/${assessmentId}/start`
  );
  return res.data;
};

// Save coding progress
export const saveCodingProgress = async (submissionId, data) => {
  const res = await axios.put(
    `${BASE_URL}/coding-assessment/submission/${submissionId}/save`,
    data
  );
  return res.data;
};

// Submit coding round
export const submitCodingRound = async (submissionId, data) => {
  const res = await axios.post(
    `${BASE_URL}/coding-assessment/submission/${submissionId}/submit`,
    data
  );
  return res.data;
};

// Check if student has submitted
export const checkCodingSubmission = async (assessmentId, studentId) => {
  const res = await axios.get(
    `${BASE_URL}/coding-assessment/check/${assessmentId}/${studentId}`
  );
  return res.data;
};
