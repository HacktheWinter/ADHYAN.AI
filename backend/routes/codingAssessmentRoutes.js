import express from "express";
import multer from "multer";
import {
  authMiddleware,
  authorizeRoles,
} from "../middleware/authMiddleware.js";
import {
  createCodingAssessment,
  getCodingAssessmentsByClassroom,
  getCodingAssessment,
  updateCodingAssessment,
  deleteCodingAssessment,
  publishCodingAssessment,
  getCodingSubmissions,
  gradeCodingSubmission,
  getCodingSubmissionDetail,
  uploadReferenceImage,
  getActiveCodingAssessments,
  startCodingRound,
  saveCodingProgress,
  submitCodingRound,
  checkCodingSubmission,
  generateCodingAgent,
  checkCodingAgent,
} from "../controllers/codingAssessmentController.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// ==================== STATIC/SPECIFIC ROUTES FIRST ====================
// (Must be above /:assessmentId to prevent param capture)

// Create coding assessment (teacher)
router.post(
  "/create",
  authMiddleware,
  authorizeRoles("teacher"),
  createCodingAssessment
);

// Agent to generate coding questions (teacher)
router.post(
  "/generate-agent",
  authMiddleware,
  authorizeRoles("teacher"),
  generateCodingAgent
);

// Agent to check a coding submission
router.post(
  "/check-agent/:submissionId",
  authMiddleware,
  authorizeRoles("teacher"),
  checkCodingAgent
);

// Upload reference image (teacher)
router.post(
  "/upload-image",
  authMiddleware,
  authorizeRoles("teacher"),
  upload.single("image"),
  uploadReferenceImage
);

// Get all coding assessments for a classroom (teacher)
router.get(
  "/classroom/:classroomId",
  authMiddleware,
  getCodingAssessmentsByClassroom
);

// Get active coding assessments for students
router.get(
  "/active/classroom/:classroomId",
  authMiddleware,
  getActiveCodingAssessments
);

// Get single submission detail
router.get(
  "/submission/:submissionId",
  authMiddleware,
  getCodingSubmissionDetail
);

router.put("/submission/:submissionId/grade", authMiddleware, authorizeRoles("teacher"), gradeCodingSubmission);

// Save progress (student)
router.put(
  "/submission/:submissionId/save",
  authMiddleware,
  authorizeRoles("student"),
  saveCodingProgress
);

// Submit coding round (student)
router.post(
  "/submission/:submissionId/submit",
  authMiddleware,
  authorizeRoles("student"),
  submitCodingRound
);

// Check if student has submitted
router.get(
  "/check/:assessmentId/:studentId",
  authMiddleware,
  checkCodingSubmission
);

// ==================== PARAMETERIZED ROUTES ====================

// Get single coding assessment
router.get("/:assessmentId", authMiddleware, getCodingAssessment);

// Update coding assessment (teacher)
router.put(
  "/:assessmentId",
  authMiddleware,
  authorizeRoles("teacher"),
  updateCodingAssessment
);

// Delete coding assessment (teacher)
router.delete(
  "/:assessmentId",
  authMiddleware,
  authorizeRoles("teacher"),
  deleteCodingAssessment
);

// Publish/unpublish coding assessment (teacher)
router.put(
  "/:assessmentId/publish",
  authMiddleware,
  authorizeRoles("teacher"),
  publishCodingAssessment
);

// Get submissions for an assessment (teacher view)
router.get(
  "/:assessmentId/submissions",
  authMiddleware,
  authorizeRoles("teacher"),
  getCodingSubmissions
);

// Start a coding round (student)
router.post(
  "/:assessmentId/start",
  authMiddleware,
  authorizeRoles("student"),
  startCodingRound
);

export default router;
