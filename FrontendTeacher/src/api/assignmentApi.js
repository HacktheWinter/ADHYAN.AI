import axios from "axios";
import API_BASE_URL from "../config";

const BASE_URL = API_BASE_URL;

// Generate assignment with AI
export const generateAssignmentWithAI = async (noteIds, classroomId) => {
  const res = await axios.post(`${BASE_URL}/assignment/generate-ai`, {
    noteIds,
    classroomId,
  });
  return res.data;
};

// Get assignments by classroom
export const getAssignmentsByClassroom = async (classroomId) => {
  const res = await axios.get(
    `${BASE_URL}/assignment/classroom/${classroomId}`
  );
  return res.data;
};

// Get assignment by ID
export const getAssignmentById = async (assignmentId) => {
  const res = await axios.get(`${BASE_URL}/assignment/${assignmentId}`);
  return res.data;
};

// Update assignment
export const updateAssignment = async (assignmentId, data) => {
  const res = await axios.put(`${BASE_URL}/assignment/${assignmentId}`, data);
  return res.data;
};

// Publish assignment
export const publishAssignment = async (assignmentId, dueDate) => {
  const res = await axios.put(
    `${BASE_URL}/assignment/${assignmentId}/publish`,
    { dueDate }
  );
  return res.data;
};

// Delete assignment
export const deleteAssignment = async (assignmentId) => {
  const res = await axios.delete(`${BASE_URL}/assignment/${assignmentId}`);
  return res.data;
};

// Get submissions for assignment
export const getAssignmentSubmissions = async (assignmentId) => {
  const res = await axios.get(
    `${BASE_URL}/assignment-submission/assignment/${assignmentId}`
  );
  return res.data;
};

// Check assignment with AI
export const checkAssignmentWithAI = async (assignmentId) => {
  const res = await axios.post(
    `${BASE_URL}/assignment-submission/check-with-ai/${assignmentId}`
  );
  return res.data;
};

// Publish results
export const publishResults = async (assignmentId) => {
  const res = await axios.post(
    `${BASE_URL}/assignment-submission/publish-results/${assignmentId}`
  );
  return res.data;
};

// Get single submission by ID
export const getSubmissionById = async (submissionId) => {
  const res = await axios.get(
    `${BASE_URL}/assignment-submission/submission/${submissionId}`
  );
  return res.data;
};

// Update marks manually
export const updateMarksManually = async (submissionId, answers) => {
  const res = await axios.put(
    `${BASE_URL}/assignment-submission/update-marks/${submissionId}`,
    {
      answers,
    }
  );
  return res.data;
};
