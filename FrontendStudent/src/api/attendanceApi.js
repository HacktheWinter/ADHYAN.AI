import API from "./axios";

export const getMyAttendanceSummary = async (classId) => {
  const response = await API.get(`/attendance/summary/${classId}/me`, {
    params: { _ts: Date.now() },
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
  return response.data;
};
