// FrontendTeacher/src/api/classroomApi.js
import axios from "axios";
import API_BASE_URL from "../config";

const API = axios.create({
  baseURL: `${API_BASE_URL}/classroom`,
});

// Create new classroom
export const createClassroom = async (payload) => {
  try {
    const response = await API.post("/create", payload);
    return response.data;
  } catch (error) {
    console.error("Error creating classroom:", error);
    throw error;
  }
};

// Join classroom
export const joinClassroom = async (studentId, classCode) => {
  try {
    const response = await API.post("/join", { studentId, classCode });
    return response.data;
  } catch (error) {
    console.error("Error joining classroom:", error);
    throw error;
  }
};

// Get classrooms for teacher/student
export const getClassrooms = async (userId, role) => {
  try {
    const response = await API.get("/", { params: { userId, role } });
    return response.data.classrooms;
  } catch (error) {
    console.error("Error fetching classrooms:", error);
    throw error;
  }
};

// Get single classroom details with populated students
export const getClassroomDetails = async (classId) => {
  try {
    const response = await axios.get(
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
    const response = await API.put(`/${classId}`, payload);
    return response.data;
  } catch (error) {
    console.error("Error updating classroom:", error);
    throw error;
  }
};

// Delete classroom
export const deleteClassroom = async (classId, teacherId) => {
  try {
    const response = await API.delete(`/${classId}`, {
      data: { teacherId },
    });
    return response.data;
  } catch (error) {
    console.error("Error deleting classroom:", error);
    throw error;
  }
};
