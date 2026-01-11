// src/routes/PublicRoute.jsx
import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { clearAuth, getStoredUser } from "../utils/authStorage";
import { STUDENT_FRONTEND_URL, TEACHER_FRONTEND_URL } from "../config";

export default function PublicRoute({ children, currentRole }) {
  const user = getStoredUser();
  const [redirecting, setRedirecting] = useState(false);

  const shouldRedirect = user && user.role !== currentRole;
  const target = shouldRedirect
    ? user.role === "teacher"
      ? TEACHER_FRONTEND_URL
      : STUDENT_FRONTEND_URL
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

  // If user not logged in -> allow access
  if (!user) return children;

  // If same role -> redirect to home
  if (user.role === currentRole) {
    return <Navigate to="/" replace />;
  }

  // Else if logged in with other role -> redirect to correct frontend
  if (redirecting) return null;

  return <Navigate to="/" replace />;
}
