// FrontendTeacher/src/App.jsx
import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import ProtectedRoute from "./components/ProtectedRoute";
import PublicRoute from "./components/PublicRoute";
import Loader from "./components/Loader";

// Lazy loaded components
const Dashboard = lazy(() => import("./Pages/Dashboard"));
const ClassDetail = lazy(() => import("./Pages/ClassDetail"));
const TestResultsViewer = lazy(() => import("./Pages/TestResultsViewer"));
const StudentTestResult = lazy(() => import("./Pages/StudentTestResult"));
const QuizResultsViewer = lazy(() => import("./Pages/QuizResultsViewer"));
const StudentQuizResult = lazy(() => import("./Pages/StudentQuizResult"));
const AssignmentResultsViewer = lazy(() => import("./Pages/AssignmentResultsViewer"));
const StudentAssignmentResult = lazy(() => import("./Pages/StudentAssignmentResult"));
const ProfilePage = lazy(() => import("./Pages/ProfilePage"));
const Login = lazy(() => import("./Pages/Login"));
const ForgotPassword = lazy(() => import("./Pages/ForgotPassword"));
const Signup = lazy(() => import("./Pages/Signup"));
const NotesPage = lazy(() => import("./Pages/NotesPage"));
const QuizzesPage = lazy(() => import("./components/QuizzesPage"));
const TestPapersPage = lazy(() => import("./components/TestPapersPage"));
const AssignmentsPage = lazy(() => import("./components/AssignmentsPage"));
const StudentsPage = lazy(() => import("./Pages/StudentsPage"));
const DoubtsPage = lazy(() => import("./Pages/DoubtsPage"));
const LiveClassroom = lazy(() => import("./Pages/LiveClassroom"));
const Announcement = lazy(() => import("./Pages/Announcement"));
const CalendarPage = lazy(() => import("./Pages/CalendarPage"));
const SettingsPage = lazy(() => import("./Pages/SettingsPage"));
const TeacherFeedbackPage = lazy(() => import("./Pages/TeacherFeedbackPage"));

export default function App() {
  return (
    <Suspense fallback={<Loader />}>
      <Routes>
        {/* Public Routes */}
        <Route
          path="/login"
          element={
            <PublicRoute currentRole="teacher">
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/signup"
          element={
            <PublicRoute currentRole="teacher">
              <Signup />
            </PublicRoute>
          }
        />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Protected Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute requiredRole="teacher">
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/class/:classId/feedback"
          element={
            <ProtectedRoute requiredRole="teacher">
              <TeacherFeedbackPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute requiredRole="teacher">
              <ProfilePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/settings"
          element={
            <ProtectedRoute requiredRole="teacher">
              <SettingsPage />
            </ProtectedRoute>
          }
        />

        {/* Full Screen Routes for Announcement and Calendar */}
        <Route
          path="/class/:classId/announcement"
          element={
            <ProtectedRoute requiredRole="teacher">
              <Announcement />
            </ProtectedRoute>
          }
        />

        <Route
          path="/class/:classId/calendar"
          element={
            <ProtectedRoute requiredRole="teacher">
              <CalendarPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/class/:classId"
          element={
            <ProtectedRoute requiredRole="teacher">
              <ClassDetail />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="notes" replace />} />
          <Route path="live-classroom" element={<LiveClassroom />} />
          <Route path="notes" element={<NotesPage />} />
          <Route path="quizzes" element={<QuizzesPage />} />
          <Route path="test-papers" element={<TestPapersPage />} />
          <Route path="assignments" element={<AssignmentsPage />} />
          <Route path="students" element={<StudentsPage />} />
          <Route path="doubts" element={<DoubtsPage />} />
        </Route>

        {/* Test Results Routes */}
        <Route
          path="/class/:classId/test-papers/results/:testId"
          element={
            <ProtectedRoute requiredRole="teacher">
              <TestResultsViewer />
            </ProtectedRoute>
          }
        />

        <Route
          path="/class/:classId/test-papers/results/:testId/student/:studentId"
          element={
            <ProtectedRoute requiredRole="teacher">
              <StudentTestResult />
            </ProtectedRoute>
          }
        />

        {/* Quiz Results Routes */}
        <Route
          path="/class/:classId/quizzes/results/:quizId"
          element={
            <ProtectedRoute requiredRole="teacher">
              <QuizResultsViewer />
            </ProtectedRoute>
          }
        />

        <Route
          path="/class/:classId/quizzes/results/:quizId/student/:studentId"
          element={
            <ProtectedRoute requiredRole="teacher">
              <StudentQuizResult />
            </ProtectedRoute>
          }
        />

        {/* Assignment Results Routes */}
        <Route
          path="/class/:classId/assignments/results/:assignmentId"
          element={
            <ProtectedRoute requiredRole="teacher">
              <AssignmentResultsViewer />
            </ProtectedRoute>
          }
        />

        <Route
          path="/class/:classId/assignments/results/:assignmentId/student/:studentId"
          element={
            <ProtectedRoute requiredRole="teacher">
              <StudentAssignmentResult />
            </ProtectedRoute>
          }
        />

        {/* Redirect unknown routes */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
