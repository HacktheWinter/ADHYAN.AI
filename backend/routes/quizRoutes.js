// Backend/routes/quizRoutes.js
import express from "express";
import {
  generateQuizWithAI,
  getQuiz,
  getQuizzesByClassroom,
  updateQuiz,
  deleteQuiz,
  publishQuizWithTiming,
  getActiveQuizzesForStudent,
} from "../controllers/quizController.js";

const router = express.Router();

// AI Generation route
router.post("/generate-ai", generateQuizWithAI);

// Get quiz by ID
router.get("/:quizId", getQuiz);

// Get quizzes by classroom
router.get("/classroom/:classroomId", getQuizzesByClassroom);

// NEW - Get active quizzes for students (must be before /:quizId to avoid route conflict)
router.get("/active/classroom/:classroomId", getActiveQuizzesForStudent);

// NEW - Publish quiz with timing
router.put("/:quizId/publish", publishQuizWithTiming);

// Update quiz
router.put("/:quizId", updateQuiz);

// Delete quiz
router.delete("/:quizId", deleteQuiz);

export default router;
