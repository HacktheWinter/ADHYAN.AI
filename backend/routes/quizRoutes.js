// Backend/routes/quizRoutes.js
import express from "express";
import { authMiddleware, authorizeRoles } from "../middleware/authMiddleware.js";
import {
  createQuizManually,
  generateQuizWithAI,
  generateQuizFromTopicsAPI,
  generateQuestionsFromPrompt,
  getQuiz,
  getQuizzesByClassroom,
  updateQuiz,
  deleteQuiz,
  publishQuizWithTiming,
  getActiveQuizzesForStudent,
  publishQuizResults,
  extractExactQuestionsFromFile,
} from "../controllers/quizController.js";
import multer from "multer";

const uploadMemory = multer({ storage: multer.memoryStorage() });

const router = express.Router();

// Manual creation route
router.post("/create-manual", authMiddleware, authorizeRoles("teacher"), createQuizManually);

// AI Generation route from notes
router.post("/generate-ai", authMiddleware, authorizeRoles("teacher"), generateQuizWithAI);

// AI Exact Question Extraction from uploaded file (PDF/Word/Excel)
router.post(
  "/extract-exact",
  authMiddleware,
  authorizeRoles("teacher"),
  uploadMemory.single("file"),
  extractExactQuestionsFromFile
);

// NEW - AI Generation route from topics (no notes required)
router.post(
  "/generate-from-topics",
  authMiddleware,
  authorizeRoles("teacher"),
  generateQuizFromTopicsAPI
);

// Inline AI question generation (returns raw questions, no DB save)
router.post(
  "/generate-questions-from-prompt",
  authMiddleware,
  authorizeRoles("teacher"),
  generateQuestionsFromPrompt
);

// Get quiz by ID
router.get("/:quizId", getQuiz);

// Get quizzes by classroom
router.get("/classroom/:classroomId", getQuizzesByClassroom);

// Get active quizzes for students (must be before /:quizId to avoid route conflict)
router.get("/active/classroom/:classroomId", getActiveQuizzesForStudent);

// Publish quiz with timing
router.put("/:quizId/publish", authMiddleware, authorizeRoles("teacher"), publishQuizWithTiming);

// Publish quiz results to students
router.put("/:quizId/publish-results", authMiddleware, authorizeRoles("teacher"), publishQuizResults);

// Update quiz
router.put("/:quizId", authMiddleware, authorizeRoles("teacher"), updateQuiz);

// Delete quiz
router.delete("/:quizId", authMiddleware, authorizeRoles("teacher"), deleteQuiz);

export default router;
