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
const ResetPassword = lazy(() => import("./Pages/ResetPassword"));
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
const CodingRound = lazy(() => import("./Pages/CodingRound"));
const CodingRoundTakingPage = lazy(() => import("./Pages/CodingRoundTakingPage"));

// New pages
const StudentOverview = lazy(() => import("./Pages/StudentOverview"));
const StudentClasswork = lazy(() => import("./Pages/StudentClasswork"));

function StudentLayout() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  return (
    <>
      <StudentNavbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        isMobileSearchOpen={isMobileSearchOpen}
        onMobileSearchChange={setIsMobileSearchOpen}
      />
      <Outlet context={{ searchQuery, setSearchQuery, isMobileSearchOpen }} />
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
        <Route path="/reset-password" element={<ResetPassword />} />

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
            {/* Default redirect to stream */}
            <Route index element={<Navigate to="stream" replace />} />

            {/* New main tabs */}
            <Route path="stream" element={<StudentOverview />} />
            <Route path="classwork" element={<StudentClasswork />} />
            <Route path="doubt" element={<DoubtPage />} />

            {/* Keep old routes for backward compatibility (redirect to classwork) */}
            <Route path="notes" element={<Navigate to="../classwork?tab=notes" replace />} />
            <Route path="quiz" element={<Navigate to="../classwork?tab=quiz" replace />} />
            <Route path="coding-round" element={<Navigate to="../classwork?tab=coding-round" replace />} />
            <Route path="assignment" element={<Navigate to="../classwork?tab=assignment" replace />} />
            <Route path="test" element={<Navigate to="../classwork?tab=test" replace />} />
          </Route>

          {/* Standalone Course Announcement Route (with navbar) */}
          <Route path="course/:id/announcement" element={<StudentAnnouncement />} />
        </Route>
          
        <Route
          path="course/:id/attendance"
          element={
            <ProtectedRoute requiredRole="student">
              <StudentAttendancePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="course/:id/attendance/:panel"
          element={
            <ProtectedRoute requiredRole="student">
              <StudentAttendancePage />
            </ProtectedRoute>
          }
        />

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

        {/* Coding Round Exam (Fullscreen - No Navbar) */}
        <Route
          path="/coding-round/:classId/:assessmentId"
          element={
            <ProtectedRoute requiredRole="student">
              <CodingRoundTakingPage />
            </ProtectedRoute>
          }
        />

        {/* Redirect any unknown route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
