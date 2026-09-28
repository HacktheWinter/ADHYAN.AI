// FrontendTeacher/src/api/codingAssessmentApi.js
import axios from "axios";
import API_BASE_URL from "../config";

const BASE_URL = API_BASE_URL;

// Create coding assessment
export const createCodingAssessment = async (data) => {
  const res = await axios.post(`${BASE_URL}/coding-assessment/create`, data);
  return res.data;
};

// Upload reference image
export const uploadReferenceImage = async (formData) => {
  const res = await axios.post(`${BASE_URL}/coding-assessment/upload-image`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return res.data;
};

// Get all coding assessments for a classroom
export const getCodingAssessmentsByClassroom = async (classroomId) => {
  const res = await axios.get(
    `${BASE_URL}/coding-assessment/classroom/${classroomId}`
  );
  return res.data;
};

// Get single coding assessment
export const getCodingAssessmentById = async (assessmentId) => {
  const res = await axios.get(
    `${BASE_URL}/coding-assessment/${assessmentId}`
  );
  return res.data;
};

// Update coding assessment
export const updateCodingAssessment = async (assessmentId, data) => {
  const res = await axios.put(
    `${BASE_URL}/coding-assessment/${assessmentId}`,
    data
  );
  return res.data;
};

// Delete coding assessment
export const deleteCodingAssessment = async (assessmentId) => {
  const res = await axios.delete(
    `${BASE_URL}/coding-assessment/${assessmentId}`
  );
  return res.data;
};

// Publish/unpublish coding assessment
export const publishCodingAssessment = async (assessmentId, data) => {
  const res = await axios.put(
    `${BASE_URL}/coding-assessment/${assessmentId}/publish`,
    data
  );
  return res.data;
};

// Get submissions for an assessment
export const getCodingSubmissions = async (assessmentId) => {
  const res = await axios.get(
    `${BASE_URL}/coding-assessment/${assessmentId}/submissions`
  );
  return res.data;
};

// Get single submission detail
export const getCodingSubmissionDetail = async (submissionId) => {
  const res = await axios.get(
    `${BASE_URL}/coding-assessment/submission/${submissionId}`
  );
  return res.data;
};

export const gradeCodingSubmission = async (submissionId, data) => {
  const res = await axios.put(`${BASE_URL}/coding-assessment/submission/${submissionId}/grade`, data);
  return res.data;
};
