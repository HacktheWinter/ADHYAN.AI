// FrontendTeacher/src/api/assessmentAnalyticsApi.js
import api from "./axios";

// Fetch all published assessments across teacher's classrooms
export const getTeacherAssessments = async (teacherId) => {
  try {
    const response = await api.get(
      `/assessment-analytics/assessments/${teacherId}`
    );
    return response.data.assessments;
  } catch (error) {
    console.error("Error fetching teacher assessments:", error);
    throw error;
  }
};

// Fetch detailed analytics for a specific assessment
export const getAssessmentAnalytics = async (type, assessmentId) => {
  try {
    const response = await api.get(
      `/assessment-analytics/${type}/${assessmentId}`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching assessment analytics:", error);
    throw error;
  }
};
