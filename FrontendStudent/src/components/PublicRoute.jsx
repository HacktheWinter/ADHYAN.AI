// FrontendStudent/src/components/PublicRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";
import { clearAuth, getStoredUser } from "../utils/authStorage";

export default function PublicRoute({ children, currentRole }) {
  const user = getStoredUser();

  if (!user) {
    return children;
  }

  if (user.role === currentRole) {
    return <Navigate to="/" replace />;
  }

  clearAuth();
  return <Navigate to="/login" replace />;
}