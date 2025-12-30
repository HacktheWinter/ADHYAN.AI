// FrontendTeacher/src/api/notesApi.js
import axios from "axios";

const BASE_URL = "http://localhost:5000/api/notes";

// Fetch all notes (admin)
export const getAllNotes = async () => {
  const res = await axios.get(BASE_URL);
  return res.data;
};

// Fetch notes by classroom ID
export const getNotesByClassroom = async (classroomId) => {
  const res = await axios.get(`${BASE_URL}/classroom/${classroomId}`);
  return res.data;
};

// Upload new note
export const uploadNote = async (formData) => {
  const res = await axios.post(`${BASE_URL}/upload`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

// Get note file URL
export const getNoteFileUrl = (fileId) => {
  return `${BASE_URL}/file/${fileId}`;
};

// Delete note
export const deleteNote = async (noteId) => {
  const res = await axios.delete(`${BASE_URL}/${noteId}`);
  return res.data;
};
