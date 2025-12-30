// src/routes/PublicRoute.jsx
import React, { useEffect, useState } from "react";
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
  const [redirecting, setRedirecting] = useState(false);

  const shouldRedirect = user && user.role !== currentRole;
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
        localStorage.removeItem("user");
        setRedirecting(true);
        window.location.replace(target);
      }
    } catch {
      localStorage.removeItem("user");
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
