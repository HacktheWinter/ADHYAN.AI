import axios from "axios";

const BASE_URL = "http://localhost:5000/api/announcement";

// Get all announcements for a classroom
export const getAnnouncements = async (classroomId) => {
    const res = await axios.get(`${BASE_URL}/${classroomId}`);
    return res.data;
};

// Get announcement file URL
export const getAnnouncementFileUrl = (fileId) => {
    return `${BASE_URL}/file/${fileId}`;
};
