import express from 'express';
import { authMiddleware, authorizeRoles } from "../middleware/authMiddleware.js";
import {
  submitAssignment,
  checkAssignmentWithAI_Batch,
  getAssignmentResult,
  checkSubmission,
  getAssignmentSubmissions,
  updateMarksManually,
  getSubmissionById,
  publishResults,
  submitAssignmentPDF,
  getSubmissionPDF
} from '../controllers/assignmentSubmissionController.js';

const router = express.Router();

// Submit assignment
router.post('/submit', authMiddleware, authorizeRoles("student"), submitAssignment);

// Submit PDF assignment
router.post('/submit-pdf', authMiddleware, authorizeRoles("student"), submitAssignmentPDF);

// Get submission PDF
router.get('/pdf/:submissionId', authMiddleware, getSubmissionPDF);

// Check assignment with AI (BATCH PROCESSING)
router.post(
  '/check-with-ai/:assignmentId',
  authMiddleware,
  authorizeRoles("teacher"),
  checkAssignmentWithAI_Batch
);

// Publish results to students
router.post(
  '/publish-results/:assignmentId',
  authMiddleware,
  authorizeRoles("teacher"),
  publishResults
);

// Get single submission by ID (for teacher individual view)
router.get(
  '/submission/:submissionId',
  authMiddleware,
  authorizeRoles("teacher"),
  getSubmissionById
);

// Get student's result
router.get(
  '/result/:assignmentId/:studentId',
  authMiddleware,
  authorizeRoles("student"),
  getAssignmentResult
);

// Check if submitted
router.get(
  '/check/:assignmentId/:studentId',
  authMiddleware,
  authorizeRoles("student"),
  checkSubmission
);

// Get all submissions for assignment (Teacher)
router.get(
  '/assignment/:assignmentId',
  authMiddleware,
  authorizeRoles("teacher"),
  getAssignmentSubmissions
);

// Update marks manually (Teacher override)
router.put(
  '/update-marks/:submissionId',
  authMiddleware,
  authorizeRoles("teacher"),
  updateMarksManually
);

export default router;
