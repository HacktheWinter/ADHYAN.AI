import axios from "axios";
import API_BASE_URL from "../config";

const BASE_URL = `${API_BASE_URL}/announcement`;

// Create announcement (with optional file)
export const createAnnouncement = async (formData) => {
    const res = await axios.post(`${BASE_URL}/create`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
};

// Get all announcements for a classroom
export const getAnnouncements = async (classroomId) => {
    const res = await axios.get(`${BASE_URL}/${classroomId}`);
    return res.data;
};

// Delete announcement
export const deleteAnnouncement = async (id, teacherId) => {
    const res = await axios.delete(`${BASE_URL}/${id}`, {
        data: { teacherId }, // Pass teacherId in body for verification
    });
    return res.data;
};

// Get announcement file URL
export const getAnnouncementFileUrl = (fileId) => {
    return `${BASE_URL}/file/${fileId}`;
};
