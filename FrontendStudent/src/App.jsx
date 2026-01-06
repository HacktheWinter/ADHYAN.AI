// FrontendStudent/src/App.jsx
import React, { useState } from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";

import StudentNavbar from "./components/StudentNavbar";
import NoteCraftsDashboard from "./Pages/NoteCraftsDashboard";
import CourseDetailPage from "./Pages/CourseDetailPage";
import StudentNotesPage from "./Pages/StudentNotesPage";
import ProfilePage from "./Pages/ProfilePage";
import Login from "./Pages/Login";
import ForgotPassword from './Pages/ForgotPassword';
import Signup from "./Pages/Signup";

import ProtectedRoute from "./components/ProtectedRoute";
import PublicRoute from "./components/PublicRoute";

// Import existing tab components
import Quiz from "./Pages/Quiz";
import TestPapers from "./Pages/TestPapers";
import Assignments from "./Pages/Assignments"; 
import DoubtPage from "./Pages/DoubtPage";
import StudentAnnouncement from "./Pages/StudentAnnouncement";
import StudentCalendarPage from "./Pages/StudentCalendarPage";
import SettingsPage from "./Pages/SettingsPage";

function StudentLayout() {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <>
      <StudentNavbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />
      <Outlet context={{ searchQuery, setSearchQuery }} />
    </>
  );
}

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/login"
        element={
          <PublicRoute currentRole="student">
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/signup"
        element={
          <PublicRoute currentRole="student">
            <Signup />
          </PublicRoute>
        }
      />
      <Route 
        path="/forgot-password" 
        element={<ForgotPassword />} 
      />

      {/* Profile route without navbar */}
      <Route
        path="/profile"
        element={
          <ProtectedRoute requiredRole="student">
            <ProfilePage />
          </ProtectedRoute>
        }
      />

      {/* Settings route without navbar */}
      <Route
        path="/settings"
        element={
          <ProtectedRoute requiredRole="student">
            <SettingsPage />
          </ProtectedRoute>
        }
      />

      {/* Protected student routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute requiredRole="student">
            <StudentLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<NoteCraftsDashboard />} />
        
        {/* Course Detail with Nested Routes */}
        <Route path="course/:id" element={<CourseDetailPage />}>
          {/* Default redirect to notes */}
          <Route index element={<Navigate to="notes" replace />} />
          
          {/* Tab Routes */}
          <Route path="notes" element={<StudentNotesPage />} />
          <Route path="quiz" element={<Quiz />} />
          <Route path="assignment" element={<Assignments />} />
          <Route path="test" element={<TestPapers />} />
          <Route path="doubt" element={<DoubtPage />} />
        </Route>

        {/* Standalone Course Announcement Route (with navbar) */}
        <Route path="course/:id/announcement" element={<StudentAnnouncement />} />
      </Route>

      {/* Calendar Route (Fullscreen - No Navbar) */}
      <Route
        path="/course/:id/calendar"
        element={
          <ProtectedRoute requiredRole="student">
            <StudentCalendarPage />
          </ProtectedRoute>
        }
      />

      {/* Redirect any unknown route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}