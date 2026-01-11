// FrontendTeacher/src/App.jsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Dashboard from "./Pages/Dashboard";
import ClassDetail from "./Pages/ClassDetail";
import TestResultsViewer from "./Pages/TestResultsViewer";
import StudentTestResult from "./Pages/StudentTestResult";
import QuizResultsViewer from "./Pages/QuizResultsViewer";
import StudentQuizResult from "./Pages/StudentQuizResult";
import AssignmentResultsViewer from "./Pages/AssignmentResultsViewer";
import StudentAssignmentResult from "./Pages/StudentAssignmentResult";
import ProfilePage from "./Pages/ProfilePage";
import Login from "./Pages/Login";
import ForgotPassword from "./Pages/ForgotPassword";
import Signup from "./Pages/Signup";

import NotesPage from "./Pages/NotesPage";
import QuizzesPage from "./components/QuizzesPage";
import TestPapersPage from "./components/TestPapersPage";
import AssignmentsPage from "./components/AssignmentsPage";
import StudentsPage from "./Pages/StudentsPage";
import DoubtsPage from "./Pages/DoubtsPage";

import LiveClassroom from "./Pages/LiveClassroom";

import Announcement from "./Pages/Announcement";
import CalendarPage from "./Pages/CalendarPage";
import SettingsPage from "./Pages/SettingsPage";

import ProtectedRoute from "./components/ProtectedRoute";
import PublicRoute from "./components/PublicRoute";
import TeacherFeedbackPage from "./Pages/TeacherFeedbackPage";

export default function App() {
  return (
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
  );
}