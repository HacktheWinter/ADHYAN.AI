import express from 'express';
import { authMiddleware, authorizeRoles } from "../middleware/authMiddleware.js";
import {
  generateTestPaperWithAI,
  getTestPaper,
  getTestPapersByClassroom,
  updateTestPaper,
  publishTestPaper,
  deleteTestPaper,
  getActiveTestPapersForStudent
} from '../controllers/testPaperController.js';

const router = express.Router();

// Generate test paper with AI
router.post('/generate-ai', authMiddleware, authorizeRoles("teacher"), generateTestPaperWithAI);

// Get test paper by ID
router.get('/:testId', getTestPaper);

// Get test papers by classroom
router.get('/classroom/:classroomId', getTestPapersByClassroom);

// Get active test papers for students
router.get('/active/classroom/:classroomId', getActiveTestPapersForStudent);

// Update test paper (edit answer keys)
router.put('/:testId', authMiddleware, authorizeRoles("teacher"), updateTestPaper);

// Publish test paper with timing
router.put('/:testId/publish', authMiddleware, authorizeRoles("teacher"), publishTestPaper);

// Delete test paper
router.delete('/:testId', authMiddleware, authorizeRoles("teacher"), deleteTestPaper);

export default router;
