import axios from "axios";
import API_BASE_URL from "../config";

const BASE = `${API_BASE_URL}/physical-test-submission`;

// ── Legacy flow (digital test paper) ─────────────────────────────────────────
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

// ── New question-card flow ────────────────────────────────────────────────────
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

// ── Common ────────────────────────────────────────────────────────────────────
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
