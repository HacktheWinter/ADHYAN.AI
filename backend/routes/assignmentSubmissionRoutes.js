import express from 'express';
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
router.post('/submit', submitAssignment);

// Submit PDF assignment
router.post('/submit-pdf', submitAssignmentPDF);

// Get submission PDF
router.get('/pdf/:submissionId', getSubmissionPDF);

// Check assignment with AI (BATCH PROCESSING)
router.post('/check-with-ai/:assignmentId', checkAssignmentWithAI_Batch);

// Publish results to students
router.post('/publish-results/:assignmentId', publishResults);

// Get single submission by ID (for teacher individual view)
router.get('/submission/:submissionId', getSubmissionById);

// Get student's result
router.get('/result/:assignmentId/:studentId', getAssignmentResult);

// Check if submitted
router.get('/check/:assignmentId/:studentId', checkSubmission);

// Get all submissions for assignment (Teacher)
router.get('/assignment/:assignmentId', getAssignmentSubmissions);

// Update marks manually (Teacher override)
router.put('/update-marks/:submissionId', updateMarksManually);

export default router;