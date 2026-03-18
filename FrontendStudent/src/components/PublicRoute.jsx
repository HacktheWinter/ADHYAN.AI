// FrontendStudent/src/components/PublicRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";
import { clearAuth, getStoredUser } from "../utils/authStorage";
import { PRINCIPAL_FRONTEND_URL, TEACHER_FRONTEND_URL } from "../config";

export default function PublicRoute({ children, currentRole }) {
  const user = getStoredUser();

  if (!user) {
    return children;
  }

  if (user.role === currentRole) {
    return <Navigate to="/" replace />;
  }

  if (user.role === "teacher") {
    window.location.replace(TEACHER_FRONTEND_URL);
    return null;
  }

  if (user.role === "principal") {
    window.location.replace(PRINCIPAL_FRONTEND_URL);
    return null;
  }

  clearAuth();
  return <Navigate to="/login" replace />;
}
