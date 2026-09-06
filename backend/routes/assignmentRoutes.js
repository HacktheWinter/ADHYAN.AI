import express from 'express';
import { authMiddleware, authorizeRoles } from "../middleware/authMiddleware.js";
import {
  createAssignmentManually,
  generateAssignmentWithAI,
  getAssignment,
  getAssignmentsByClassroom,
  updateAssignment,
  publishAssignment,
  deleteAssignment,
  getActiveAssignmentsForStudent
} from '../controllers/assignmentController.js';

const router = express.Router();

// Manual creation route
router.post('/create-manual', authMiddleware, authorizeRoles("teacher"), createAssignmentManually);

// Generate assignment with AI
router.post('/generate-ai', authMiddleware, authorizeRoles("teacher"), generateAssignmentWithAI);

// Get assignment by ID
router.get('/:assignmentId', authMiddleware, getAssignment);

// Get assignments by classroom
router.get('/classroom/:classroomId', authMiddleware, getAssignmentsByClassroom);

// Get active assignments for students
router.get('/active/classroom/:classroomId', authMiddleware, getActiveAssignmentsForStudent);

// Update assignment
router.put('/:assignmentId', authMiddleware, authorizeRoles("teacher"), updateAssignment);

// Publish assignment
router.put('/:assignmentId/publish', authMiddleware, authorizeRoles("teacher"), publishAssignment);

// Delete assignment
router.delete('/:assignmentId', authMiddleware, authorizeRoles("teacher"), deleteAssignment);

export default router;
