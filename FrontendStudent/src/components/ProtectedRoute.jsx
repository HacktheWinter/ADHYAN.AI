// FrontendStudent/src/components/ProtectedRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";
import { clearAuth, getStoredUser } from "../utils/authStorage";
import { PRINCIPAL_FRONTEND_URL, TEACHER_FRONTEND_URL } from "../config";

export default function ProtectedRoute({ children, requiredRole }) {
  const user = getStoredUser();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!requiredRole || !user.role) {
    return children;
  }

  if (user.role === requiredRole) {
    return children;
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
