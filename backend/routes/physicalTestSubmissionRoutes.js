import express from "express";
import { authMiddleware, authorizeRoles } from "../middleware/authMiddleware.js";
import {
  uploadBulkPhysicalPapers,
  checkPhysicalPapersWithAI,
  getPhysicalSubmissions,
  getPhysicalSubmissionById,
  getPhysicalSubmissionPDF,
  deletePhysicalSubmission,
  updatePhysicalMarksManually,
  uploadWithQuestionCard,
  getPhysicalSubmissionsByClass,
} from "../controllers/physicalTestSubmissionController.js";

const router = express.Router();

// Legacy flow (linked to a digital test paper)
router.post("/upload-bulk", authMiddleware, authorizeRoles("teacher"), uploadBulkPhysicalPapers);
router.post("/check-with-ai/:testPaperId", authMiddleware, authorizeRoles("teacher"), checkPhysicalPapersWithAI);
router.get("/list/:testPaperId", authMiddleware, authorizeRoles("teacher"), getPhysicalSubmissions);

// New question-card-based flow
router.post("/upload-with-question-card", authMiddleware, authorizeRoles("teacher"), uploadWithQuestionCard);
router.get("/list-by-class/:classId", authMiddleware, authorizeRoles("teacher"), getPhysicalSubmissionsByClass);

// Common routes
router.get("/submission/:submissionId", authMiddleware, authorizeRoles("teacher"), getPhysicalSubmissionById);
router.get("/pdf/:submissionId", getPhysicalSubmissionPDF);
router.delete("/:submissionId", authMiddleware, authorizeRoles("teacher"), deletePhysicalSubmission);
router.put("/update-marks/:submissionId", authMiddleware, authorizeRoles("teacher"), updatePhysicalMarksManually);

export default router;
