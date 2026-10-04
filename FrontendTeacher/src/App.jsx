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
const Dashboard = lazy(() => import("./Pages/Dashboard"));
const ClassDetail = lazy(() => import("./Pages/ClassDetail"));
const TestResultsViewer = lazy(() => import("./Pages/TestResultsViewer"));
const StudentTestResult = lazy(() => import("./Pages/StudentTestResult"));
const QuizResultsViewer = lazy(() => import("./Pages/QuizResultsViewer"));
const ClassDashboard = lazy(() => import("./Pages/ClassDashboard"));
const StudentQuizResult = lazy(() => import("./Pages/StudentQuizResult"));
const AssignmentResultsViewer = lazy(() => import("./Pages/AssignmentResultsViewer"));
const StudentAssignmentResult = lazy(() => import("./Pages/StudentAssignmentResult"));
const ProfilePage = lazy(() => import("./Pages/ProfilePage"));
const Login = lazy(() => import("./Pages/Login"));
const ForgotPassword = lazy(() => import("./Pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./Pages/ResetPassword"));
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
const AttendancePage = lazy(() => import("./Pages/AttendancePage"));
const PhysicalTestUploadPage = lazy(() => import("./Pages/PhysicalTestUploadPage"));
const PhysicalTestResultsPage = lazy(() => import("./Pages/PhysicalTestResultsPage"));
const PhysicalTestStudentResult = lazy(() => import("./Pages/PhysicalTestStudentResult"));
const SeminarAttendancePage = lazy(() => import("./Pages/SeminarAttendancePage"));
const CodingRoundPage = lazy(() => import("./components/CodingRoundPage"));
const CodingSubmissionsViewer = lazy(() => import("./Pages/CodingSubmissionsViewer"));
const StreamPage = lazy(() => import("./Pages/StreamPage"));
const ClassworkPage = lazy(() => import("./Pages/ClassworkPage"));


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
