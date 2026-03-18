// Backend/routes/quizRoutes.js
import express from "express";
import { authMiddleware, authorizeRoles } from "../middleware/authMiddleware.js";
import {
  generateQuizWithAI,
  generateQuizFromTopicsAPI,
  getQuiz,
  getQuizzesByClassroom,
  updateQuiz,
  deleteQuiz,
  publishQuizWithTiming,
  getActiveQuizzesForStudent,
} from "../controllers/quizController.js";

const router = express.Router();

// AI Generation route from notes
router.post("/generate-ai", authMiddleware, authorizeRoles("teacher"), generateQuizWithAI);

// NEW - AI Generation route from topics (no notes required)
router.post(
  "/generate-from-topics",
  authMiddleware,
  authorizeRoles("teacher"),
  generateQuizFromTopicsAPI
);

// Get quiz by ID
router.get("/:quizId", getQuiz);

// Get quizzes by classroom
router.get("/classroom/:classroomId", getQuizzesByClassroom);

// Get active quizzes for students (must be before /:quizId to avoid route conflict)
router.get("/active/classroom/:classroomId", getActiveQuizzesForStudent);

// Publish quiz with timing
router.put("/:quizId/publish", authMiddleware, authorizeRoles("teacher"), publishQuizWithTiming);

// Update quiz
router.put("/:quizId", authMiddleware, authorizeRoles("teacher"), updateQuiz);

// Delete quiz
router.delete("/:quizId", authMiddleware, authorizeRoles("teacher"), deleteQuiz);

export default router;
