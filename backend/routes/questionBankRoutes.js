import express from "express";
import { authMiddleware, authorizeRoles } from "../middleware/authMiddleware.js";
import { generateQuestionBank, getQuestionBank } from "../controllers/questionBankController.js";

const router = express.Router();

// Generate question bank
router.post("/generate", authMiddleware, authorizeRoles("teacher"), generateQuestionBank);

// Get question bank by noteId
router.get("/:noteId", authMiddleware, authorizeRoles("teacher"), getQuestionBank);

export default router;
