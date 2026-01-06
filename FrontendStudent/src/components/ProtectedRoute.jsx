// FrontendStudent/src/components/ProtectedRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";
import { clearAuth, getStoredUser } from "../utils/authStorage";

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

  clearAuth();
  return <Navigate to="/login" replace />;
}