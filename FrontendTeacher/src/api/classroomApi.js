// FrontendTeacher/src/api/classroomApi.js
import api from "./axios";
import API_BASE_URL from "../config";

// Create new classroom
export const createClassroom = async (payload) => {
  try {
    const response = await api.post("/classroom/create", payload);
    return response.data;
  } catch (error) {
    console.error("Error creating classroom:", error);
    throw error;
  }
};

// Join classroom
export const joinClassroom = async (studentId, classCode) => {
  try {
    const response = await api.post("/classroom/join", { studentId, classCode });
    return response.data;
  } catch (error) {
    console.error("Error joining classroom:", error);
    throw error;
  }
};

// Get classrooms for teacher/student
export const getClassrooms = async (userId, role) => {
  try {
    const response = await api.get("/classroom", { params: { userId, role } });
    return response.data.classrooms;
  } catch (error) {
    console.error("Error fetching classrooms:", error);
    throw error;
  }
};

// Get single classroom details with populated students
export const getClassroomDetails = async (classId) => {
  try {
    const response = await api.get(
      `${API_BASE_URL}/classroom/${classId}`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching classroom details:", error);
    throw error;
  }
};

// Update classroom
export const updateClassroom = async (classId, payload) => {
  try {
    const response = await api.put(`/classroom/${classId}`, payload);
    return response.data;
  } catch (error) {
    console.error("Error updating classroom:", error);
    throw error;
  }
};

// Delete classroom
export const deleteClassroom = async (classId, teacherId) => {
  try {
    const response = await api.delete(`/classroom/${classId}`, {
      data: { teacherId },
    });
    return response.data;
  } catch (error) {
    console.error("Error deleting classroom:", error);
    throw error;
  }
};
