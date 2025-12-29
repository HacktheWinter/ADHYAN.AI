import express from "express";
import { generateQuestionBank, getQuestionBank } from "../controllers/questionBankController.js";

const router = express.Router();

// Generate question bank
router.post("/generate", generateQuestionBank);

// Get question bank by noteId
router.get("/:noteId", getQuestionBank);

export default router;
