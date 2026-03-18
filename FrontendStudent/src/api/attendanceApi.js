import API from "./axios";

export const getMyAttendanceSummary = async (classId) => {
  const response = await API.get(`/attendance/summary/${classId}/me`);
  return response.data;
};
