const API_BASE_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:5000/api"
    : "https://adhyanai-backend.onrender.com/api";

export const SOCKET_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://adhyanai-backend.onrender.com";

export const TEACHER_FRONTEND_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:5174"
    : "https://adhyanai-teacher.onrender.com";

export const STUDENT_FRONTEND_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:5173"
    : "https://adhyanai-student.onrender.com";

export default API_BASE_URL;
