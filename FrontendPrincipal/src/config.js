const API_BASE_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:5001/api"
    : "https://adhyanai.tech/api";

export const LANDING_PAGE_URL =
  import.meta.env.VITE_LANDING_PAGE_URL || "https://adhyanai.tech/";

export const PRINCIPAL_FRONTEND_URL =
  window.location.hostname === "localhost"
    ? window.location.origin
    : "https://principal.adhyanai.tech";

export const TEACHER_FRONTEND_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:5174"
    : "https://teacher.adhyanai.tech";

export const STUDENT_FRONTEND_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:5173"
    : "https://student.adhyanai.tech";

export default API_BASE_URL;
