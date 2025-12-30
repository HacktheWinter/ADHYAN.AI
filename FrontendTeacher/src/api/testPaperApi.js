// FrontendTeacher/src/api/testPaperApi.js (UPDATED)
import axios from "axios";

const BASE_URL = "http://localhost:5000/api";

// Generate test paper with AI
export const generateTestPaperWithAI = async (noteIds, classroomId) => {
  const res = await axios.post(`${BASE_URL}/test-paper/generate-ai`, {
    noteIds,
    classroomId,
  });
  return res.data;
};

// Get test papers by classroom
export const getTestPapersByClassroom = async (classroomId) => {
  const res = await axios.get(
    `${BASE_URL}/test-paper/classroom/${classroomId}`
  );
  return res.data;
};

// Get test paper by ID
export const getTestPaperById = async (testId) => {
  const res = await axios.get(`${BASE_URL}/test-paper/${testId}`);
  return res.data;
};

// Update test paper (edit answer keys)
export const updateTestPaper = async (testId, data) => {
  const res = await axios.put(`${BASE_URL}/test-paper/${testId}`, data);
  return res.data;
};

// Publish test paper
export const publishTestPaper = async (testId, timingData) => {
  const res = await axios.put(
    `${BASE_URL}/test-paper/${testId}/publish`,
    timingData
  );
  return res.data;
};

// Delete test paper
export const deleteTestPaper = async (testId) => {
  const res = await axios.delete(`${BASE_URL}/test-paper/${testId}`);
  return res.data;
};

// Get submissions for test paper
export const getTestSubmissions = async (testPaperId) => {
  const res = await axios.get(
    `${BASE_URL}/test-submission/test/${testPaperId}`
  );
  return res.data;
};

// Check test with AI (BATCH PROCESSING)
export const checkTestWithAI = async (testPaperId) => {
  const res = await axios.post(
    `${BASE_URL}/test-submission/check-with-ai/${testPaperId}`
  );
  return res.data;
};

// NEW: Publish results to students
export const publishResults = async (testPaperId) => {
  const res = await axios.post(
    `${BASE_URL}/test-submission/publish-results/${testPaperId}`
  );
  return res.data;
};

// Update marks manually
export const updateMarksManually = async (submissionId, answers) => {
  const res = await axios.put(
    `${BASE_URL}/test-submission/update-marks/${submissionId}`,
    {
      answers,
    }
  );
  return res.data;
};

// NEW: Get single submission by ID
export const getSubmissionById = async (submissionId) => {
  const res = await axios.get(
    `${BASE_URL}/test-submission/submission/${submissionId}`
  );
  return res.data;
};
