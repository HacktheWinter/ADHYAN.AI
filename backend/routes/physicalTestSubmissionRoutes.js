import express from "express";
import { authMiddleware, authorizeRoles } from "../middleware/authMiddleware.js";
import {
  uploadBulkPhysicalPapers,
  checkPhysicalPapersWithAI,
  getPhysicalSubmissions,
  getPhysicalSubmissionById,
  getPhysicalSubmissionPDF,
  deletePhysicalSubmission,
  updatePhysicalMarksManually,
  uploadWithQuestionCard,
  getPhysicalSubmissionsByClass,
  // New endpoints
  extractAnswerKey,
  confirmAnswerKey,
  uploadStudentPapers,
  checkBulkByClass,
  stopChecking,
  getCheckStatus,
} from "../controllers/physicalTestSubmissionController.js";

const router = express.Router();

// ── New answer-key + checking flow ────────────────────────────────────────────
router.post("/extract-answer-key", authMiddleware, authorizeRoles("teacher"), extractAnswerKey);
router.post("/confirm-answer-key", authMiddleware, authorizeRoles("teacher"), confirmAnswerKey);
router.post("/upload-student-papers", authMiddleware, authorizeRoles("teacher"), uploadStudentPapers);
router.post("/check-bulk/:classId", authMiddleware, authorizeRoles("teacher"), checkBulkByClass);
router.post("/stop-checking/:sessionId", authMiddleware, authorizeRoles("teacher"), stopChecking);
router.get("/check-status/:sessionId", authMiddleware, authorizeRoles("teacher"), getCheckStatus);

// ── Legacy flow (linked to a digital test paper) ─────────────────────────────
router.post("/upload-bulk", authMiddleware, authorizeRoles("teacher"), uploadBulkPhysicalPapers);
router.post("/check-with-ai/:testPaperId", authMiddleware, authorizeRoles("teacher"), checkPhysicalPapersWithAI);
router.get("/list/:testPaperId", authMiddleware, authorizeRoles("teacher"), getPhysicalSubmissions);

// ── Question-card flow (legacy combined upload) ──────────────────────────────
router.post("/upload-with-question-card", authMiddleware, authorizeRoles("teacher"), uploadWithQuestionCard);
router.get("/list-by-class/:classId", authMiddleware, authorizeRoles("teacher"), getPhysicalSubmissionsByClass);

// ── Common routes ────────────────────────────────────────────────────────────
router.get("/submission/:submissionId", authMiddleware, authorizeRoles("teacher"), getPhysicalSubmissionById);
router.get("/pdf/:submissionId", getPhysicalSubmissionPDF);
router.delete("/:submissionId", authMiddleware, authorizeRoles("teacher"), deletePhysicalSubmission);
router.put("/update-marks/:submissionId", authMiddleware, authorizeRoles("teacher"), updatePhysicalMarksManually);

export default router;
