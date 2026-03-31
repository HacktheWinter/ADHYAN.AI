// Backend/routes/testSubmissionRoutes.js
import express from "express";
import { authMiddleware, authorizeRoles } from "../middleware/authMiddleware.js";
import {
  submitTest,
  checkTestWithAI,
  getTestResult,
  checkSubmission,
  getTestSubmissions,
  updateMarksManually,
  getSubmissionById,
  publishResults,
} from "../controllers/testSubmissionController.js";

const router = express.Router();

// Submit test
router.post("/submit", authMiddleware, authorizeRoles("student"), submitTest);

// Check test with AI (BATCH PROCESSING)
router.post(
  "/check-with-ai/:testPaperId",
  authMiddleware,
  authorizeRoles("teacher"),
  checkTestWithAI
);

// NEW: Publish results to students
router.post(
  "/publish-results/:testPaperId",
  authMiddleware,
  authorizeRoles("teacher"),
  publishResults
);

// NEW: Get single submission by ID (for teacher individual view)
router.get(
  "/submission/:submissionId",
  authMiddleware,
  authorizeRoles("teacher"),
  getSubmissionById
);

// Get student's result
router.get(
  "/result/:testPaperId/:studentId",
  authMiddleware,
  authorizeRoles("student"),
  getTestResult
);

// Check if submitted
router.get(
  "/check/:testPaperId/:studentId",
  authMiddleware,
  authorizeRoles("student"),
  checkSubmission
);

// Get all submissions for test (Teacher)
router.get(
  "/test/:testPaperId",
  authMiddleware,
  authorizeRoles("teacher"),
  getTestSubmissions
);

// Update marks manually (Teacher override)
router.put(
  "/update-marks/:submissionId",
  authMiddleware,
  authorizeRoles("teacher"),
  updateMarksManually
);

export default router;
