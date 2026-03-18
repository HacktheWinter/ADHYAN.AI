// FrontendStudent/src/App.jsx
import React, { useState, Suspense, lazy } from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";

import StudentNavbar from "./components/StudentNavbar";
import ProtectedRoute from "./components/ProtectedRoute";
import PublicRoute from "./components/PublicRoute";
import Loader from "./components/Loader";

// Lazy loaded components
const NoteCraftsDashboard = lazy(() => import("./Pages/NoteCraftsDashboard"));
const CourseDetailPage = lazy(() => import("./Pages/CourseDetailPage"));
const StudentAttendancePage = lazy(() => import("./Pages/StudentAttendancePage"));
const StudentNotesPage = lazy(() => import("./Pages/StudentNotesPage"));
const ProfilePage = lazy(() => import("./Pages/ProfilePage"));
const Login = lazy(() => import("./Pages/Login"));
const ForgotPassword = lazy(() => import('./Pages/ForgotPassword'));
const Signup = lazy(() => import("./Pages/Signup"));
const ClassesPage = lazy(() => import("./Pages/ClassesPage"));

// Import existing tab components
const Quiz = lazy(() => import("./Pages/Quiz"));
const TestPapers = lazy(() => import("./Pages/TestPapers"));
const Assignments = lazy(() => import("./Pages/Assignments")); 
const DoubtPage  = lazy(() => import("./Pages/DoubtPage"));
const StudentFeedbackPage = lazy(() => import("./Pages/StudentFeedbackPage"));
const StudentAnnouncement = lazy(() => import("./Pages/StudentAnnouncement"));
const StudentCalendarPage = lazy(() => import("./Pages/StudentCalendarPage"));
const SettingsPage = lazy(() => import("./Pages/SettingsPage"));



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
    <Suspense fallback={<Loader />}>
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

          <Route
      path="course/:id/feedback"
      element={<StudentFeedbackPage />}
    />


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
          
        <Route path="course/:id/attendance" element={<StudentAttendancePage />} />

        {/* Calendar Route (Fullscreen - No Navbar) */}
        <Route
          path="/course/:id/calendar"
          element={
            <ProtectedRoute requiredRole="student">
              <StudentCalendarPage />
            </ProtectedRoute>
          }
        />

        {/* Classes Route (Fullscreen - No Navbar) */}
        <Route
          path="/course/:id/classes"
          element={
            <ProtectedRoute requiredRole="student">
              <ClassesPage />
            </ProtectedRoute>
          }
        />

        {/* Redirect any unknown route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
