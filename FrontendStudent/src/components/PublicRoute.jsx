// FrontendStudent/src/components/PublicRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";

const getUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
};

export default function PublicRoute({ children, currentRole }) {
  const user = getUser();

  if (!user) {
    return children;
  }

  if (user.role === currentRole) {
    return <Navigate to="/" replace />;
  }

  localStorage.removeItem("user");
  localStorage.removeItem("token");
  return <Navigate to="/login" replace />;
}