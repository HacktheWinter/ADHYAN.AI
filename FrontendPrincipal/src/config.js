const API_BASE_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:5000/api"
    : "https://adhyanai-backend.onrender.com/api";

export const LANDING_PAGE_URL =
  import.meta.env.VITE_LANDING_PAGE_URL || "https://adhyan-ai.onrender.com/";

export const PRINCIPAL_FRONTEND_URL =
  window.location.hostname === "localhost"
    ? window.location.origin
    : "https://adhyanai-principal.onrender.com";

export const TEACHER_FRONTEND_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:5174"
    : "https://adhyanai-teacher.onrender.com";

export const STUDENT_FRONTEND_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:5173"
    : "https://adhyanai-student.onrender.com";

export default API_BASE_URL;
