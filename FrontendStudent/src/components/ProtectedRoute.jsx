// FrontendStudent/src/components/ProtectedRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";

const getUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
};

export default function ProtectedRoute({ children, requiredRole }) {
  const user = getUser();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!requiredRole || !user.role) {
    return children;
  }

  if (user.role === requiredRole) {
    return children;
  }

  localStorage.removeItem("user");
  localStorage.removeItem("token");
  return <Navigate to="/login" replace />;
}