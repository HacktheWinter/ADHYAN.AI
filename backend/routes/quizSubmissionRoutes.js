// Backend/routes/quizSubmissionRoutes.js
import express from 'express';
import { authMiddleware, authorizeRoles } from "../middleware/authMiddleware.js";
import {
  submitQuiz,
  getQuizResult,
  checkSubmission,
  getQuizSubmissions,
  getSubmissionById
} from '../controllers/quizSubmissionController.js';

const router = express.Router();

// Submit quiz
router.post('/submit', authMiddleware, authorizeRoles("student"), submitQuiz);

// Get student's result
router.get(
  '/result/:quizId/:studentId',
  authMiddleware,
  authorizeRoles("student"),
  getQuizResult
);

// Check if submitted
router.get(
  '/check/:quizId/:studentId',
  authMiddleware,
  authorizeRoles("student"),
  checkSubmission
);

// Get single submission by ID (Teacher)
router.get(
  '/submission/:submissionId',
  authMiddleware,
  authorizeRoles("teacher"),
  getSubmissionById
);

// Get all submissions for quiz (Teacher)
router.get(
  '/quiz/:quizId',
  authMiddleware,
  authorizeRoles("teacher"),
  getQuizSubmissions
);

export default router;
