import express from 'express';
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
router.post('/generate-ai', generateTestPaperWithAI);

// Get test paper by ID
router.get('/:testId', getTestPaper);

// Get test papers by classroom
router.get('/classroom/:classroomId', getTestPapersByClassroom);

// Get active test papers for students
router.get('/active/classroom/:classroomId', getActiveTestPapersForStudent);

// Update test paper (edit answer keys)
router.put('/:testId', updateTestPaper);

// Publish test paper with timing
router.put('/:testId/publish', publishTestPaper);

// Delete test paper
router.delete('/:testId', deleteTestPaper);

export default router;