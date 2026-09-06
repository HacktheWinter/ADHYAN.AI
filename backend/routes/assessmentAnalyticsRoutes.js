// Backend/routes/assessmentAnalyticsRoutes.js
import express from "express";
import {
  authMiddleware,
  authorizeRoles,
} from "../middleware/authMiddleware.js";
import {
  getTeacherAssessments,
  getAssessmentAnalytics,
} from "../controllers/assessmentAnalyticsController.js";

const router = express.Router();

// List all published assessments across teacher's classrooms
router.get(
  "/assessments/:teacherId",
  authMiddleware,
  authorizeRoles("teacher"),
  getTeacherAssessments
);

// Get detailed analytics for a specific assessment
router.get(
  "/:type/:assessmentId",
  authMiddleware,
  authorizeRoles("teacher"),
  getAssessmentAnalytics
);

export default router;
