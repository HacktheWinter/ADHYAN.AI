// FrontendStudent/src/api/assignmentApi.js
import axios from "axios";
import API_BASE_URL from "../config";

const BASE_URL = API_BASE_URL;

// Get active assignments for classroom
export const getActiveAssignments = async (classroomId) => {
  const res = await axios.get(
    `${BASE_URL}/assignment/active/classroom/${classroomId}`
  );
  return res.data;
};

// Get assignment by ID
export const getAssignmentById = async (assignmentId) => {
  const res = await axios.get(`${BASE_URL}/assignment/${assignmentId}`);
  return res.data;
};

// Submit assignment
export const submitAssignment = async (assignmentId, studentId, answers) => {
  const res = await axios.post(`${BASE_URL}/assignment-submission/submit`, {
    assignmentId,
    studentId,
    answers,
  });
  return res.data;
};

// Submit PDF assignment
export const submitAssignmentPDF = async (assignmentId, studentId, pdfFile) => {
  const formData = new FormData();
  formData.append("assignmentId", assignmentId);
  formData.append("studentId", studentId);
  formData.append("assignmentPdf", pdfFile);

  const res = await axios.post(`${BASE_URL}/assignment-submission/submit-pdf`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return res.data;
};

// Check if student submitted
export const checkSubmission = async (assignmentId, studentId) => {
  const res = await axios.get(
    `${BASE_URL}/assignment-submission/check/${assignmentId}/${studentId}`
  );
  return res.data;
};

// Get assignment result
export const getAssignmentResult = async (assignmentId, studentId) => {
  const res = await axios.get(
    `${BASE_URL}/assignment-submission/result/${assignmentId}/${studentId}`
  );
  return res.data;
};
