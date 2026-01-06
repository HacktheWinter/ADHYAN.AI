// src/routes/ProtectedRoute.jsx
import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { clearAuth, getStoredUser } from "../utils/authStorage";

export default function ProtectedRoute({ children, requiredRole }) {
  const user = getStoredUser();
  const [redirecting, setRedirecting] = useState(false);

  const shouldRedirect = requiredRole && user?.role && user.role !== requiredRole;
  const target = shouldRedirect
    ? user.role === "teacher"
      ? import.meta.env.VITE_TEACHER_URL || "http://localhost:5174"
      : import.meta.env.VITE_STUDENT_URL || "http://localhost:5173"
    : null;

  useEffect(() => {
    if (!shouldRedirect || !target) return;

    try {
      const targetOrigin = new URL(target).origin;
      if (window.location.origin !== targetOrigin) {
        clearAuth();
        setRedirecting(true);
        window.location.replace(target);
      }
    } catch {
      clearAuth();
      setRedirecting(true);
      window.location.replace(target);
    }
  }, [shouldRedirect, target]);

  // If no user -> redirect to /login
  if (!user) return <Navigate to="/login" replace />;

  // ONLY check role if requiredRole is provided AND user has a role
  if (shouldRedirect) {
    if (redirecting) return null;
    return <Navigate to="/login" replace />;
  }

  // If user.role is missing, allow access on this app (prevents incorrect cross-redirect)
  return children;
}