// Backend/routes/testSubmissionRoutes.js
import express from "express";
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
router.post("/submit", submitTest);

// Check test with AI (BATCH PROCESSING)
router.post("/check-with-ai/:testPaperId", checkTestWithAI);

// NEW: Publish results to students
router.post("/publish-results/:testPaperId", publishResults);

// NEW: Get single submission by ID (for teacher individual view)
router.get("/submission/:submissionId", getSubmissionById);

// Get student's result
router.get("/result/:testPaperId/:studentId", getTestResult);

// Check if submitted
router.get("/check/:testPaperId/:studentId", checkSubmission);

// Get all submissions for test (Teacher)
router.get("/test/:testPaperId", getTestSubmissions);

// Update marks manually (Teacher override)
router.put("/update-marks/:submissionId", updateMarksManually);

export default router;
