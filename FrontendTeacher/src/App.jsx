// FrontendTeacher/src/App.jsx
import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";

import ProtectedRoute from "./components/ProtectedRoute";
import PublicRoute from "./components/PublicRoute";
import Loader from "./components/Loader";
import Header from "./components/Header";

// Layout component to render navigation header only on mobile viewport for standalone pages
const MobileHeaderLayout = () => {
  return (
    <>
      <div className="sm:hidden sticky top-0 z-[100]">
        <Header />
      </div>
      <Outlet />
    </>
  );
};

// Lazy loaded components
const Dashboard = lazy(() => import("./pages/Dashboard"));
const ClassDetail = lazy(() => import("./pages/ClassDetail"));
const TestResultsViewer = lazy(() => import("./pages/TestResultsViewer"));
const StudentTestResult = lazy(() => import("./pages/StudentTestResult"));
const QuizResultsViewer = lazy(() => import("./pages/QuizResultsViewer"));
const ClassDashboard = lazy(() => import("./pages/ClassDashboard"));
const StudentQuizResult = lazy(() => import("./pages/StudentQuizResult"));
const AssignmentResultsViewer = lazy(() => import("./pages/AssignmentResultsViewer"));
const StudentAssignmentResult = lazy(() => import("./pages/StudentAssignmentResult"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const Login = lazy(() => import("./pages/Login"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Signup = lazy(() => import("./pages/Signup"));
const NotesPage = lazy(() => import("./pages/NotesPage"));
const QuizzesPage = lazy(() => import("./components/QuizzesPage"));
const TestPapersPage = lazy(() => import("./components/TestPapersPage"));
const AssignmentsPage = lazy(() => import("./components/AssignmentsPage"));
const StudentsPage = lazy(() => import("./pages/StudentsPage"));
const DoubtsPage = lazy(() => import("./pages/DoubtsPage"));
const LiveClassroom = lazy(() => import("./pages/LiveClassroom"));
const Announcement = lazy(() => import("./pages/Announcement"));
const CalendarPage = lazy(() => import("./pages/CalendarPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const TeacherFeedbackPage = lazy(() => import("./pages/TeacherFeedbackPage"));
const AttendancePage = lazy(() => import("./pages/AttendancePage"));
const PhysicalTestUploadPage = lazy(() => import("./pages/PhysicalTestUploadPage"));
const PhysicalTestResultsPage = lazy(() => import("./pages/PhysicalTestResultsPage"));
const PhysicalTestStudentResult = lazy(() => import("./pages/PhysicalTestStudentResult"));
const SeminarAttendancePage = lazy(() => import("./pages/SeminarAttendancePage"));
const CodingRoundPage = lazy(() => import("./components/CodingRoundPage"));
const CodingSubmissionsViewer = lazy(() => import("./pages/CodingSubmissionsViewer"));
const StreamPage = lazy(() => import("./pages/StreamPage"));
const ClassworkPage = lazy(() => import("./pages/ClassworkPage"));


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
        <Route path="/reset-password" element={<ResetPassword />} />

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

        <Route
          path="/seminar-attendance"
          element={
            <ProtectedRoute requiredRole="teacher">
              <SeminarAttendancePage />
            </ProtectedRoute>
          }
        />

        {/* Full Screen Routes for Announcement, Calendar and Attendance with Mobile Header Layout */}
        <Route element={<MobileHeaderLayout />}>
          <Route
            path="/class/:classId/announcement"
            element={
              <ProtectedRoute requiredRole="teacher">
                <Announcement />
              </ProtectedRoute>
            }
          />

          <Route
            path="/class/:classId/doubts"
            element={
              <ProtectedRoute requiredRole="teacher">
                <DoubtsPage />
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
            path="/class/:classId/attendance"
            element={
              <ProtectedRoute requiredRole="teacher">
                <AttendancePage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/class/:classId/attendance/:panel"
            element={
              <ProtectedRoute requiredRole="teacher">
                <AttendancePage />
              </ProtectedRoute>
            }
          />
        </Route>

        <Route
          path="/class/:classId"
          element={
            <ProtectedRoute requiredRole="teacher">
              <ClassDetail />
            </ProtectedRoute>
          }
        >

          <Route index element={<Navigate to="stream" replace />} />
          <Route path="stream" element={<StreamPage />} />
          <Route path="live-classroom" element={<LiveClassroom />} />
          <Route path="students" element={<StudentsPage />} />

          {/* Classwork wrapper with nested content type routes */}
          <Route path="classwork" element={<ClassworkPage />}>
            <Route path="notes" element={<NotesPage />} />
            <Route path="quizzes" element={<QuizzesPage />} />
            <Route path="coding-round" element={<CodingRoundPage />} />
            <Route path="test-papers" element={<TestPapersPage />} />
            <Route path="assignments" element={<AssignmentsPage />} />
          </Route>

          {/* Backward-compatible direct routes (old bookmarks still work) */}
          <Route path="notes" element={<Navigate to={`../classwork/notes`} replace />} />
          <Route path="quizzes" element={<Navigate to={`../classwork/quizzes`} replace />} />
          <Route path="coding-round" element={<Navigate to={`../classwork/coding-round`} replace />} />
          <Route path="test-papers" element={<Navigate to={`../classwork/test-papers`} replace />} />
          <Route path="assignments" element={<Navigate to={`../classwork/assignments`} replace />} />
        </Route>

        {/* Standalone results and dashboard views with Mobile Header Layout */}
        <Route element={<MobileHeaderLayout />}>
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

          <Route
            path="/class/:classId/test-papers/upload-physical"
            element={
              <ProtectedRoute requiredRole="teacher">
                <PhysicalTestUploadPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/class/:classId/test-papers/physical-results"
            element={
              <ProtectedRoute requiredRole="teacher">
                <PhysicalTestResultsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/class/:classId/test-papers/physical-results/:submissionId"
            element={
              <ProtectedRoute requiredRole="teacher">
                <PhysicalTestStudentResult />
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

          {/* Class Dashboard Route */}
          <Route
            path="/class/:classId/dashboard"
            element={
              <ProtectedRoute requiredRole="teacher">
                <ClassDashboard />
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
        </Route>

        {/* Coding Round Submissions Route */}
        <Route element={<MobileHeaderLayout />}>
          <Route
            path="/class/:classId/coding-round/submissions/:assessmentId"
            element={
              <ProtectedRoute requiredRole="teacher">
                <CodingSubmissionsViewer />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Redirect unknown routes */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
