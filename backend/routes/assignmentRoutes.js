import express from 'express';
import {
  generateAssignmentWithAI,
  getAssignment,
  getAssignmentsByClassroom,
  updateAssignment,
  publishAssignment,
  deleteAssignment,
  getActiveAssignmentsForStudent
} from '../controllers/assignmentController.js';

const router = express.Router();

// Generate assignment with AI
router.post('/generate-ai', generateAssignmentWithAI);

// Get assignment by ID
router.get('/:assignmentId', getAssignment);

// Get assignments by classroom
router.get('/classroom/:classroomId', getAssignmentsByClassroom);

// Get active assignments for students
router.get('/active/classroom/:classroomId', getActiveAssignmentsForStudent);

// Update assignment
router.put('/:assignmentId', updateAssignment);

// Publish assignment
router.put('/:assignmentId/publish', publishAssignment);

// Delete assignment
router.delete('/:assignmentId', deleteAssignment);

export default router;