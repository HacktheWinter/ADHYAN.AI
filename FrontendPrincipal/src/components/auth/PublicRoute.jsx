import { Navigate } from "react-router-dom";
import { getStoredUser } from "../../utils/authStorage";
import {
  PRINCIPAL_FRONTEND_URL,
  STUDENT_FRONTEND_URL,
  TEACHER_FRONTEND_URL,
} from "../../config";

const resolveTarget = (role) => {
  if (role === "teacher") return TEACHER_FRONTEND_URL;
  if (role === "student") return STUDENT_FRONTEND_URL;
  if (role === "principal") return PRINCIPAL_FRONTEND_URL;
  return "/login";
};

export default function PublicRoute({ children }) {
  const user = getStoredUser();

  if (!user) {
    return children;
  }

  const target = resolveTarget(user.role);
  const targetUrl = new URL(target, window.location.origin);

  if (targetUrl.origin !== window.location.origin) {
    window.location.replace(targetUrl.toString());
    return null;
  }

  return <Navigate to="/" replace />;
}
