import axios from "axios";
import API_BASE_URL from "../config";

const BASE_URL = `${API_BASE_URL}/announcement`;

// Get all announcements for a classroom
export const getAnnouncements = async (classroomId) => {
    const res = await axios.get(`${BASE_URL}/${classroomId}`);
    return res.data;
};

// Get announcement file URL
export const getAnnouncementFileUrl = (fileId) => {
    return `${BASE_URL}/file/${fileId}`;
};
