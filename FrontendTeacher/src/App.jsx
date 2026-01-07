// FrontendTeacher/src/App.jsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Dashboard from "./Pages/Dashboard";
import ClassDetail from "./Pages/ClassDetail";
import TestResultsViewer from "./Pages/TestResultsViewer";
import StudentTestResult from "./Pages/StudentTestResult";
import AssignmentResultsViewer from "./Pages/AssignmentResultsViewer";
import StudentAssignmentResult from "./Pages/StudentAssignmentResult";
import Login from "./Pages/Login";
import Signup from "./Pages/Signup";

import NotesPage from "./Pages/NotesPage";
import QuizzesPage from "./components/QuizzesPage";
import TestPapersPage from "./components/TestPapersPage";
import AssignmentsPage from "./components/AssignmentsPage";
import StudentsPage from "./Pages/StudentsPage";
import DoubtsPage from "./Pages/DoubtsPage";
import LiveClassroom from "./Pages/liveClassroom";

import ProtectedRoute from "./components/ProtectedRoute";
import PublicRoute from "./components/PublicRoute";

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

      {/* Protected Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute requiredRole="teacher">
            <Dashboard />
          </ProtectedRoute>
        }
      />

      {/* Class Detail Routes - Main Layout */}
      <Route
        path="/class/:classId"
        element={
          <ProtectedRoute requiredRole="teacher">
            <ClassDetail />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="notes" replace />} />
        <Route path="notes" element={<NotesPage />} />
        <Route path="quizzes" element={<QuizzesPage />} />
        <Route path="test-papers" element={<TestPapersPage />} />
        <Route path="assignments" element={<AssignmentsPage />} />
        <Route path="students" element={<StudentsPage />} />

        <Route path="doubts" element={<DoubtsPage />} />
        <Route path="live-classroom" element={<LiveClassroom />} />
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
