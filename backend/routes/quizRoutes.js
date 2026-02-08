// Backend/routes/quizRoutes.js
import express from "express";
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
router.post("/generate-ai", generateQuizWithAI);

// NEW - AI Generation route from topics (no notes required)
router.post("/generate-from-topics", generateQuizFromTopicsAPI);

// Get quiz by ID
router.get("/:quizId", getQuiz);

// Get quizzes by classroom
router.get("/classroom/:classroomId", getQuizzesByClassroom);

// Get active quizzes for students (must be before /:quizId to avoid route conflict)
router.get("/active/classroom/:classroomId", getActiveQuizzesForStudent);

// Publish quiz with timing
router.put("/:quizId/publish", publishQuizWithTiming);

// Update quiz
router.put("/:quizId", updateQuiz);

// Delete quiz
router.delete("/:quizId", deleteQuiz);

export default router;