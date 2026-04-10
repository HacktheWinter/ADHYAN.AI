import axios from "axios";
import API_BASE_URL from "../config";

const BASE = `${API_BASE_URL}/physical-test-submission`;

// ══════════════════════════════════════════════════════════════════════════════
// New Answer Key + Checking Flow
// ══════════════════════════════════════════════════════════════════════════════

// Step 1: Extract answer key from question card PDF
export const extractAnswerKeyFromPDF = async (classId, testTitle, totalMarks, questionCardFile) => {
  const formData = new FormData();
  formData.append("classId", classId);
  formData.append("testTitle", testTitle);
  formData.append("totalMarks", totalMarks);
  formData.append("questionCard", questionCardFile);
  const res = await axios.post(`${BASE}/extract-answer-key`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 120000, // 2 min for extraction
  });
  return res.data;
};

// Step 2: Confirm the reviewed/edited answer key
export const confirmAnswerKeyAPI = async (data) => {
  const res = await axios.post(`${BASE}/confirm-answer-key`, data);
  return res.data;
};

// Step 3: Upload student papers (after answer key confirmed)
export const uploadStudentPapersAPI = async (classId, testTitle, totalMarks, questionCardFileId, questionCardFileName, questions, studentFiles, studentMappings) => {
  const formData = new FormData();
  formData.append("classId", classId);
  formData.append("testTitle", testTitle);
  formData.append("totalMarks", totalMarks);
  formData.append("questionCardFileId", questionCardFileId);
  formData.append("questionCardFileName", questionCardFileName);
  formData.append("questions", JSON.stringify(questions));
  formData.append("studentMappings", JSON.stringify(studentMappings));
  studentFiles.forEach(file => formData.append("papers", file));
  const res = await axios.post(`${BASE}/upload-student-papers`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

// Step 4: Start async AI checking (returns immediately)
export const startBulkCheck = async (classId, sessionId, testTitle) => {
  const res = await axios.post(`${BASE}/check-bulk/${classId}`, { sessionId, testTitle });
  return res.data;
};

// Stop checking
export const stopBulkCheck = async (sessionId) => {
  const res = await axios.post(`${BASE}/stop-checking/${sessionId}`);
  return res.data;
};

// Get check status (fallback if socket disconnects)
export const getCheckStatusAPI = async (sessionId) => {
  const res = await axios.get(`${BASE}/check-status/${sessionId}`);
  return res.data;
};

// ══════════════════════════════════════════════════════════════════════════════
// Legacy Flow (linked to digital test paper)
// ══════════════════════════════════════════════════════════════════════════════

export const uploadBulkPhysicalPapers = async (testPaperId, files, studentMappings) => {
  const formData = new FormData();
  formData.append("testPaperId", testPaperId);
  formData.append("studentMappings", JSON.stringify(studentMappings));
  files.forEach(file => formData.append("papers", file));
  const res = await axios.post(`${BASE}/upload-bulk`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

export const checkPhysicalPapersWithAI = async (testPaperId) => {
  const res = await axios.post(`${BASE}/check-with-ai/${testPaperId}`);
  return res.data;
};

export const getPhysicalSubmissions = async (testPaperId) => {
  const res = await axios.get(`${BASE}/list/${testPaperId}`);
  return res.data;
};

// ══════════════════════════════════════════════════════════════════════════════
// Legacy question-card flow
// ══════════════════════════════════════════════════════════════════════════════

export const uploadWithQuestionCard = async (classId, testTitle, totalMarks, questionCardFile, studentFiles, studentMappings) => {
  const formData = new FormData();
  formData.append("classId", classId);
  formData.append("testTitle", testTitle);
  formData.append("totalMarks", totalMarks);
  formData.append("studentMappings", JSON.stringify(studentMappings));
  formData.append("questionCard", questionCardFile);
  studentFiles.forEach(file => formData.append("papers", file));
  const res = await axios.post(`${BASE}/upload-with-question-card`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

export const getPhysicalSubmissionsByClass = async (classId) => {
  const res = await axios.get(`${BASE}/list-by-class/${classId}`);
  return res.data;
};

// ══════════════════════════════════════════════════════════════════════════════
// Common
// ══════════════════════════════════════════════════════════════════════════════

export const getPhysicalSubmissionById = async (submissionId) => {
  const res = await axios.get(`${BASE}/submission/${submissionId}`);
  return res.data;
};

export const getPhysicalSubmissionPDFUrl = (submissionId) => {
  return `${BASE}/pdf/${submissionId}`;
};

export const deletePhysicalSubmission = async (submissionId) => {
  const res = await axios.delete(`${BASE}/${submissionId}`);
  return res.data;
};

export const updatePhysicalMarksManually = async (submissionId, answers) => {
  const res = await axios.put(`${BASE}/update-marks/${submissionId}`, { answers });
  return res.data;
};
