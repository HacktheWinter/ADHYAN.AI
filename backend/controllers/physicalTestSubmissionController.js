import multer from "multer";
import mongoose from "mongoose";
import PhysicalTestSubmission from "../models/PhysicalTestSubmission.js";
import CheckingSession from "../models/CheckingSession.js";
import TestPaper from "../models/TestPaper.js";
import User from "../models/User.js";
import { getBucket } from "../config/gridfs.js";
import { GoogleGenerativeAI } from "@google/generative-ai";

// ─────────────────────────────────────────────────────────────────────────────
// Multer configs
// ─────────────────────────────────────────────────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") cb(null, true);
    else cb(new Error("Only PDF files allowed"), false);
  },
});

const uploadQC = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") cb(null, true);
    else cb(new Error("Only PDF files allowed"), false);
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Gemini API key rotation
// ─────────────────────────────────────────────────────────────────────────────
const API_KEYS = [
  process.env.GEN_API_KEY_1,
  process.env.GEN_API_KEY_2,
  process.env.GEN_API_KEY_3,
].filter(Boolean);

let currentKeyIndex = 0;

const getModel = (useSystemInstruction = false, systemText = "") => {
  const apiKey = API_KEYS[currentKeyIndex];
  const genAI = new GoogleGenerativeAI(apiKey);
  const config = { model: "gemini-2.5-flash" };
  if (useSystemInstruction && systemText) {
    config.systemInstruction = systemText;
  }
  return genAI.getGenerativeModel(config);
};

const rotateApiKey = () => {
  currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
};

// ─────────────────────────────────────────────────────────────────────────────
// In-memory stop mechanism for checking sessions
// ─────────────────────────────────────────────────────────────────────────────
export const activeCheckingSessions = new Map(); // sessionId → 'active' | 'stop'

// ─────────────────────────────────────────────────────────────────────────────
// MASTER PROMPT — System instruction for Gemini evaluation
// ─────────────────────────────────────────────────────────────────────────────
const MASTER_EVALUATION_PROMPT = `SYSTEM INSTRUCTION — UNIVERSITY EXAM EVALUATOR

ROLE:
You are an expert, impartial university professor and examination evaluator.
You are checking a student's handwritten answer sheet against a structured rubric.
Your evaluation must be fair, consistent, and fully based on the rubric provided.
Never make assumptions beyond what the student has written.

RULE 1 — HANDWRITING LEGIBILITY:
Evaluate handwriting legibility for each answer independently.
If you cannot confidently read more than 70% of a specific answer:
  - Set needs_human_review to true for that question
  - Set marksAwarded to 0 as provisional marks
  - Set aiFeedback to "Handwriting unclear — requires manual review by teacher"
  - Set handwritingConfidence to estimated percentage readable (0-100)
  - Do NOT attempt to guess or hallucinate what the student wrote
  - Do NOT carry context from surrounding answers to fill gaps

RULE 2 — QUESTION NUMBER MATCHING:
If a student writes question numbers explicitly, use them directly.
If a student does NOT write the question number:
  - Match the semantic content of their answer to the most likely question in the rubric
  - If two questions have identical wording but different marks, use the LENGTH and DEPTH of
    the student's answer to determine which question they are answering
  - A brief answer maps to the lower-mark question
  - A detailed answer with examples and equations maps to the higher-mark question
  - If you cannot confidently match, set needs_human_review to true

RULE 3 — MANDATORY KEYWORD CHECKING:
For each answer, check whether the student used the mandatory_keywords from the rubric.
Keywords are case-insensitive. Accept spelling variations listed in acceptableVariations.
Each keyword present contributes proportionally to partial marks.
Never deduct marks for using synonyms not listed — give benefit of the doubt.
Report keywordsFound and keywordsMissed arrays.

RULE 4 — STEP-BY-STEP PARTIAL MARKING:
Award marks strictly following the marking_scheme breakdown in the rubric.
Example: if marking_scheme = { definition: 2, process: 5, equation: 3 }:
  - Check if student defined the concept → award up to 2 marks for that part
  - Check if student explained the process → award up to 5 marks for that part
  - Check if student wrote the equation → award up to 3 marks for that part
Never award more than the maximum for any individual component.
Do not deduct marks for grammar, spelling, or handwriting quality unless explicitly stated.
Report the full markingBreakdown with awarded/max/reason for each component.

RULE 5 — ZERO MARK CONDITIONS:
Strictly award 0 marks if the zero_mark_condition from the rubric is met.
Example conditions: core formula is wrong, answer is completely off-topic,
answer is blank, answer is plagiarized/copied from another question.

RULE 6 — OUTPUT FORMAT:
Return ONLY a valid JSON object. No markdown. No explanation text. No preamble.
The JSON must follow this exact structure:

{
  "submissionId": "<exact submissionId passed to you>",
  "studentName": "<student name passed to you>",
  "processingStatus": "completed",
  "checkedAnswers": [
    {
      "questionId": "<exact questionId from rubric>",
      "topicMatched": "<topic from rubric>",
      "studentAnswerPoints": "<bullet summary: • point1 • point2 • point3>",
      "keywordsFound": ["keyword1", "keyword2"],
      "keywordsMissed": ["keyword3"],
      "markingBreakdown": {
        "component_name": { "awarded": 2, "max": 2, "reason": "clearly defined" }
      },
      "marksAwarded": 7,
      "maxMarks": 10,
      "handwritingConfidence": 92,
      "needs_human_review": false,
      "aiFeedback": "Good definition and process explanation. Chemical equation was incomplete."
    }
  ]
}

If any error occurs during your evaluation, return:
{
  "submissionId": "<submissionId>",
  "processingStatus": "error",
  "errorType": "illegible|off_topic|mapping_failed|partial_read",
  "errorMessage": "<what went wrong>",
  "checkedAnswers": []
}`;

// ─────────────────────────────────────────────────────────────────────────────
// RUBRIC AUTO-GENERATION PROMPT — for question card extraction
// ─────────────────────────────────────────────────────────────────────────────
const RUBRIC_EXTRACTION_PROMPT = `You are an expert university exam paper analyzer.

Extract every question from this exam paper and generate a detailed marking rubric for each.

For each question you must determine:
1. The exact question text as printed
2. The marks allocated (look for numbers in brackets, circles, or at the end of questions)
3. The topic/subject area of the question
4. Mandatory keywords a student MUST use to get full marks — these are the technical terms,
   formulas, names, or concepts that are non-negotiable for this question
5. A step-by-step marking scheme — break the total marks into components
   (e.g. definition gets 2 marks, explanation gets 3 marks, example gets 2 marks)
6. Depth requirement — specify minimum words, points, or diagrams expected
7. Zero mark condition — what would make you award exactly 0 (blank, completely wrong concept,
   correct topic but entirely wrong facts)

Generate marking schemes appropriate to the mark allocation:
- 2 mark questions: typically 1 mark definition + 1 mark example, or 2 key points
- 5 mark questions: typically 1-2 marks definition + 2-3 marks explanation + 1 mark example
- 10 mark questions: 2 marks definition + 5 marks detailed explanation + 2 marks diagram/equation + 1 mark conclusion

Return ONLY this JSON structure, no markdown, no extra text:
{
  "questions": [
    {
      "questionId": "q1",
      "questionNumber": "1",
      "question": "<exact question text>",
      "marks": 5,
      "topic": "<inferred topic>",
      "answerKey": "<a clear model answer for display to teacher>",
      "rubric": {
        "mandatoryKeywords": ["keyword1", "keyword2", "keyword3"],
        "markingScheme": {
          "definition": 1,
          "explanation": 3,
          "example": 1
        },
        "depthRequired": "Minimum 3 sentences. Must include at least one real-world example.",
        "zeroMarkCondition": "0 marks if student defines a completely different concept",
        "acceptableVariations": ["alternate spelling", "abbreviation"],
        "partialMarkingAllowed": true
      }
    }
  ],
  "totalMarks": 50,
  "subject": "Computer Networks",
  "paperType": "mid-semester|end-semester|assignment"
}`;

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Read PDF from GridFS as base64
// ─────────────────────────────────────────────────────────────────────────────
const readPdfFromGridFS = (bucket, fileId) => {
  return new Promise((resolve, reject) => {
    const downloadStream = bucket.openDownloadStream(fileId);
    const chunks = [];
    downloadStream.on("data", chunk => chunks.push(chunk));
    downloadStream.on("end", () => resolve(Buffer.concat(chunks).toString("base64")));
    downloadStream.on("error", reject);
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Upload buffer to GridFS
// ─────────────────────────────────────────────────────────────────────────────
const uploadToGridFS = (bucket, buffer, filename) => {
  return new Promise((resolve, reject) => {
    const uploadStream = bucket.openUploadStream(filename, { contentType: "application/pdf" });
    uploadStream.end(buffer);
    uploadStream.on("finish", () => resolve(uploadStream.id));
    uploadStream.on("error", reject);
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Clean and parse Gemini JSON response
// ─────────────────────────────────────────────────────────────────────────────
const parseGeminiJSON = (responseText) => {
  let cleaned = responseText.trim().replace(/```json\n?/gi, "").replace(/```/g, "");
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace === -1) throw new Error("No JSON object found in response");
  cleaned = cleaned.substring(firstBrace, lastBrace !== -1 ? lastBrace + 1 : undefined);

  // Try direct parse first
  try {
    return JSON.parse(cleaned);
  } catch (directErr) {
    // JSON might be truncated (maxOutputTokens cut it off) — try to recover
    console.warn(`[AI CHECK] Direct JSON parse failed, attempting truncation recovery...`);
    console.warn(`[AI CHECK] Original error: ${directErr.message}`);

    // Strategy: close all open brackets/braces to make valid JSON
    let recovered = cleaned;
    let openBraces = 0;
    let openBrackets = 0;
    let inString = false;
    let escaped = false;

    for (let i = 0; i < recovered.length; i++) {
      const ch = recovered[i];
      if (escaped) { escaped = false; continue; }
      if (ch === '\\') { escaped = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (ch === '{') openBraces++;
      if (ch === '}') openBraces--;
      if (ch === '[') openBrackets++;
      if (ch === ']') openBrackets--;
    }

    // If we're inside a string, close it
    if (inString) recovered += '"';

    // Find last complete entry — trim back to last complete object in array
    // Look for the last valid closing pattern like }\n    ] or }, \n  {
    const lastCompleteObj = recovered.lastIndexOf('}');
    if (lastCompleteObj > 0) {
      // Check if we need to trim trailing partial content after last }
      const afterLast = recovered.substring(lastCompleteObj + 1).trim();
      if (afterLast && !afterLast.startsWith(']') && !afterLast.startsWith(',') && !afterLast.startsWith('}')) {
        recovered = recovered.substring(0, lastCompleteObj + 1);
        // Re-count after trim
        openBraces = 0; openBrackets = 0; inString = false; escaped = false;
        for (let i = 0; i < recovered.length; i++) {
          const ch = recovered[i];
          if (escaped) { escaped = false; continue; }
          if (ch === '\\') { escaped = true; continue; }
          if (ch === '"') { inString = !inString; continue; }
          if (inString) continue;
          if (ch === '{') openBraces++;
          if (ch === '}') openBraces--;
          if (ch === '[') openBrackets++;
          if (ch === ']') openBrackets--;
        }
      }
    }

    // Close remaining open brackets and braces
    for (let i = 0; i < openBrackets; i++) recovered += ']';
    for (let i = 0; i < openBraces; i++) recovered += '}';

    try {
      const result = JSON.parse(recovered);
      console.log(`[AI CHECK] ✅ Truncation recovery SUCCESS — parsed ${result.checkedAnswers?.length || 0} answers from truncated response`);
      return result;
    } catch (recoveryErr) {
      console.error(`[AI CHECK] ❌ Truncation recovery also failed: ${recoveryErr.message}`);
      throw directErr; // throw original error
    }
  }
};

// ═════════════════════════════════════════════════════════════════════════════
// ENDPOINT 1: Extract Answer Key from Question Card
// POST /api/physical-test-submission/extract-answer-key
// ═════════════════════════════════════════════════════════════════════════════
export const extractAnswerKey = [
  uploadQC.single("questionCard"),
  async (req, res) => {
    try {
      const { classId, testTitle, totalMarks } = req.body;

      if (!classId) return res.status(400).json({ error: "classId is required" });
      if (!testTitle) return res.status(400).json({ error: "testTitle is required" });
      if (!totalMarks) return res.status(400).json({ error: "totalMarks is required" });

      const questionCardFile = req.file;
      if (!questionCardFile) return res.status(400).json({ error: "Question card PDF is required" });

      const bucket = getBucket();
      if (!bucket) return res.status(503).json({ error: "Database not ready" });

      // Store question card in GridFS
      const qcFilename = `qcard_${classId}_${Date.now()}_${questionCardFile.originalname}`;
      const questionCardFileId = await uploadToGridFS(bucket, questionCardFile.buffer, qcFilename);

      // Ask Gemini to extract questions + generate full rubric
      const model = getModel();
      const qcBase64 = questionCardFile.buffer.toString("base64");

      const extractPrompt = RUBRIC_EXTRACTION_PROMPT +
        `\n\nUse the marks printed next to each question. If no marks are shown, distribute evenly to total ${totalMarks}. Generate comprehensive rubrics with mandatory keywords, marking schemes, depth requirements, and zero-mark conditions.`;

      let attempts = 0;
      let extractedData = null;

      while (attempts < Math.min(3, API_KEYS.length)) {
        try {
          const extractResult = await getModel().generateContent({
            contents: [{
              role: "user",
              parts: [
                { text: extractPrompt },
                { inlineData: { mimeType: "application/pdf", data: qcBase64 } },
              ],
            }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 16384, responseMimeType: "application/json" },
          });

          const raw = extractResult.response.text();
          extractedData = parseGeminiJSON(raw);
          break;
        } catch (e) {
          attempts++;
          if (e.message?.includes("quota") || e.message?.includes("429") || e.message?.includes("RESOURCE_EXHAUSTED")) {
            rotateApiKey();
          }
          if (attempts >= Math.min(3, API_KEYS.length)) {
            console.error("Question extraction failed after retries:", e.message);
            return res.status(500).json({ error: "Failed to extract questions from question card", details: e.message });
          }
          await new Promise(r => setTimeout(r, 3000));
        }
      }

      const questions = extractedData?.questions || [];
      if (questions.length === 0) {
        return res.status(400).json({ error: "No questions could be extracted from the question card. Ensure the PDF contains clear question text." });
      }

      // Ensure every question has proper rubric structure
      const normalizedQuestions = questions.map((q, idx) => ({
        questionId: q.questionId || `q${idx + 1}`,
        questionNumber: q.questionNumber || `${idx + 1}`,
        question: q.question || "",
        marks: q.marks || 0,
        topic: q.topic || "",
        answerKey: q.answerKey || "",
        rubric: {
          mandatoryKeywords: q.rubric?.mandatoryKeywords || [],
          markingScheme: q.rubric?.markingScheme || {},
          depthRequired: q.rubric?.depthRequired || "",
          zeroMarkCondition: q.rubric?.zeroMarkCondition || "",
          acceptableVariations: q.rubric?.acceptableVariations || [],
          partialMarkingAllowed: q.rubric?.partialMarkingAllowed !== false,
        },
      }));

      res.status(200).json({
        success: true,
        message: `Extracted ${normalizedQuestions.length} questions with rubrics`,
        questions: normalizedQuestions,
        totalMarks: extractedData?.totalMarks || totalMarks,
        subject: extractedData?.subject || "",
        paperType: extractedData?.paperType || "",
        questionCardFileId: questionCardFileId.toString(),
        questionCardFileName: qcFilename,
      });
    } catch (error) {
      console.error("extractAnswerKey error:", error);
      res.status(500).json({ error: "Failed to extract answer key", details: error.message });
    }
  },
];

// ═════════════════════════════════════════════════════════════════════════════
// ENDPOINT 2: Confirm Answer Key (teacher reviewed & edited)
// POST /api/physical-test-submission/confirm-answer-key
// ═════════════════════════════════════════════════════════════════════════════
export const confirmAnswerKey = async (req, res) => {
  try {
    const { classId, testTitle, totalMarks, questionCardFileId, questionCardFileName, questions } = req.body;

    if (!classId) return res.status(400).json({ error: "classId is required" });
    if (!testTitle) return res.status(400).json({ error: "testTitle is required" });
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: "questions array is required" });
    }

    // Validate each question has the required rubric structure
    for (const q of questions) {
      if (!q.questionId || !q.question || !q.marks) {
        return res.status(400).json({ error: `Question ${q.questionId || "unknown"} is missing required fields` });
      }
      if (!q.rubric?.mandatoryKeywords?.length) {
        return res.status(400).json({ error: `Question ${q.questionId} must have at least one mandatory keyword` });
      }
      if (!q.rubric?.markingScheme || Object.keys(q.rubric.markingScheme).length === 0) {
        return res.status(400).json({ error: `Question ${q.questionId} must have a marking scheme` });
      }
    }

    res.status(200).json({
      success: true,
      message: "Answer key confirmed. You can now upload student papers.",
      confirmed: true,
      questionsCount: questions.length,
    });
  } catch (error) {
    console.error("confirmAnswerKey error:", error);
    res.status(500).json({ error: "Failed to confirm answer key", details: error.message });
  }
};

// ═════════════════════════════════════════════════════════════════════════════
// ENDPOINT 3: Upload Student Papers (after answer key is confirmed)
// POST /api/physical-test-submission/upload-student-papers
// ═════════════════════════════════════════════════════════════════════════════
export const uploadStudentPapers = [
  uploadQC.fields([{ name: "papers", maxCount: 100 }]),
  async (req, res) => {
    try {
      const { classId, testTitle, totalMarks, questionCardFileId, questionCardFileName, studentMappings, questions: questionsJSON } = req.body;

      if (!classId) return res.status(400).json({ error: "classId is required" });
      if (!testTitle) return res.status(400).json({ error: "testTitle is required" });
      if (!totalMarks) return res.status(400).json({ error: "totalMarks is required" });
      if (!questionsJSON) return res.status(400).json({ error: "Confirmed answer key (questions) is required" });

      let questions = [];
      try { questions = JSON.parse(questionsJSON); } catch (e) {
        return res.status(400).json({ error: "Invalid questions JSON" });
      }

      if (questions.length === 0) return res.status(400).json({ error: "No questions in answer key" });

      const studentFiles = req.files?.papers || [];
      if (studentFiles.length === 0) return res.status(400).json({ error: "At least one student paper is required" });

      const bucket = getBucket();
      if (!bucket) return res.status(503).json({ error: "Database not ready" });

      let mappings = [];
      try { mappings = JSON.parse(studentMappings || "[]"); } catch (e) { /* ignore */ }

      const createdSubmissions = [];

      for (const file of studentFiles) {
        const mapping = mappings.find(m => m.fileName === file.originalname);
        const studentName = mapping?.studentName || file.originalname.replace(/\.pdf$/i, "");

        // Upload student PDF to GridFS
        const filename = `physical_${classId}_${Date.now()}_${file.originalname}`;
        const pdfFileId = await uploadToGridFS(bucket, file.buffer, filename);

        // Build answers array with full rubric from confirmed questions
        const answers = questions.map(q => ({
          questionId: q.questionId,
          question: q.question,
          answerKey: q.answerKey || "",
          marks: q.marks,
          topic: q.topic || "",
          rubric: {
            mandatoryKeywords: q.rubric?.mandatoryKeywords || [],
            markingScheme: q.rubric?.markingScheme || {},
            depthRequired: q.rubric?.depthRequired || "",
            zeroMarkCondition: q.rubric?.zeroMarkCondition || "",
            acceptableVariations: q.rubric?.acceptableVariations || [],
            partialMarkingAllowed: q.rubric?.partialMarkingAllowed !== false,
          },
          marksAwarded: 0,
          aiFeedback: "",
          checkedBy: "pending",
        }));

        const submission = await PhysicalTestSubmission.create({
          classId,
          testTitle,
          questionCardFileId: questionCardFileId || null,
          questionCardFileName: questionCardFileName || "",
          studentName,
          pdfFileId,
          pdfFileName: filename,
          answers,
          totalMarks: parseFloat(totalMarks) || 100,
          status: "pending",
        });

        createdSubmissions.push(submission);
      }

      res.status(201).json({
        success: true,
        message: `Uploaded ${createdSubmissions.length} student papers. Ready for AI checking.`,
        count: createdSubmissions.length,
        submissions: createdSubmissions,
      });
    } catch (error) {
      console.error("uploadStudentPapers error:", error);
      res.status(500).json({ error: "Upload failed", details: error.message });
    }
  },
];

// ═════════════════════════════════════════════════════════════════════════════
// ENDPOINT 4: Start Bulk AI Checking (async, per-student)
// POST /api/physical-test-submission/check-bulk/:classId
// ═════════════════════════════════════════════════════════════════════════════
export const checkBulkByClass = async (req, res) => {
  try {
    const { classId } = req.params;
    const { sessionId, testTitle } = req.body;

    if (!sessionId) return res.status(400).json({ error: "sessionId is required" });

    // Find pending submissions
    const query = { classId, status: "pending" };
    if (testTitle) query.testTitle = testTitle;

    const pendingSubmissions = await PhysicalTestSubmission.find(query);
    if (pendingSubmissions.length === 0) {
      return res.status(404).json({ error: "No pending submissions found" });
    }

    // Create checking session
    await CheckingSession.create({
      sessionId,
      classId,
      testTitle: testTitle || "",
      status: "active",
      totalCount: pendingSubmissions.length,
    });

    activeCheckingSessions.set(sessionId, "active");

    const io = req.app.get("io");

    // Return 202 immediately
    res.status(202).json({
      success: true,
      sessionId,
      totalToCheck: pendingSubmissions.length,
      message: "AI checking started",
    });

    // ── Async processing loop ─────────────────────────────────────────
    void (async () => {
      const bucket = getBucket();
      let checkedCount = 0;
      let failedCount = 0;
      let needsReviewCount = 0;

      // Emit started event
      io.to(`physical_check_${sessionId}`).emit("physical_check_started", {
        sessionId,
        totalCount: pendingSubmissions.length,
      });

      for (let idx = 0; idx < pendingSubmissions.length; idx++) {
        // ── Check stop flag ──────────────────────────────────────────
        if (activeCheckingSessions.get(sessionId) === "stop") {
          // Save remaining as pending
          io.to(`physical_check_${sessionId}`).emit("physical_check_stopped", {
            sessionId,
            checkedCount,
            message: "Checking stopped by teacher. Results so far have been saved.",
          });

          await CheckingSession.findOneAndUpdate(
            { sessionId },
            { status: "stopped", checkedCount, failedCount, needsReviewCount, completedAt: new Date() }
          );

          activeCheckingSessions.delete(sessionId);
          return;
        }

        const sub = pendingSubmissions[idx];

        // Update current student
        io.to(`physical_check_${sessionId}`).emit("physical_check_progress", {
          sessionId,
          checkedCount,
          totalCount: pendingSubmissions.length,
          failedCount,
          needsReviewCount,
          currentStudent: sub.studentName,
          lastResult: null,
        });

        try {
          // Mark as currently checking
          sub.status = "checking";
          await sub.save();
          console.log(`\n══════════════════════════════════════════════`);
          console.log(`[AI CHECK] Starting: ${sub.studentName} (${idx + 1}/${pendingSubmissions.length})`);
          console.log(`[AI CHECK] Submission ID: ${sub._id}`);
          console.log(`[AI CHECK] PDF File ID: ${sub.pdfFileId}`);
          console.log(`══════════════════════════════════════════════`);

          // ── Read PDF from GridFS ─────────────────────────────────
          let pdfBase64;
          try {
            pdfBase64 = await readPdfFromGridFS(bucket, sub.pdfFileId);
            console.log(`[AI CHECK] PDF read OK — size: ${(pdfBase64.length / 1024 / 1024).toFixed(2)} MB (base64)`);
          } catch (pdfErr) {
            console.error(`[AI CHECK] ❌ FAILED to read PDF from GridFS for ${sub.studentName}`);
            console.error(`[AI CHECK] PDF Error:`, pdfErr.message);
            console.error(`[AI CHECK] Stack:`, pdfErr.stack);
            throw new Error(`GridFS PDF read failed: ${pdfErr.message}`);
          }

          // ── Build rubric JSON from stored answers ────────────────
          let rubricForAI;
          try {
            rubricForAI = sub.answers.map(ans => {
              // Handle markingScheme — could be Map, plain object, or undefined
              let schemeObj = {};
              const raw = ans.rubric?.markingScheme;
              if (raw) {
                if (raw instanceof Map) {
                  schemeObj = Object.fromEntries(raw);
                } else if (typeof raw === 'object' && raw !== null) {
                  // If it has a toJSON method (Mongoose Map), use it
                  schemeObj = typeof raw.toJSON === 'function' ? raw.toJSON() : { ...raw };
                }
              }

              return {
                questionId: ans.questionId,
                question: ans.question,
                max_marks: ans.marks,
                topic: ans.topic || "",
                mandatory_keywords: ans.rubric?.mandatoryKeywords || [],
                marking_scheme: schemeObj,
                depth_required: ans.rubric?.depthRequired || "",
                zero_mark_condition: ans.rubric?.zeroMarkCondition || "",
                acceptable_variations: ans.rubric?.acceptableVariations || [],
                partial_marking_allowed: ans.rubric?.partialMarkingAllowed !== false,
              };
            });
            console.log(`[AI CHECK] Rubric built OK — ${rubricForAI.length} questions`);
          } catch (rubricErr) {
            console.error(`[AI CHECK] ❌ FAILED to build rubric for ${sub.studentName}`);
            console.error(`[AI CHECK] Rubric Error:`, rubricErr.message);
            console.error(`[AI CHECK] Raw answers:`, JSON.stringify(sub.answers.map(a => ({ qid: a.questionId, rubric: a.rubric })), null, 2));
            throw new Error(`Rubric build failed: ${rubricErr.message}`);
          }

          // ── Call Gemini with master prompt ────────────────────────
          const userPrompt = `STUDENT: ${sub.studentName}
submissionId: ${sub._id.toString()}

RUBRIC (evaluate against this):
${JSON.stringify(rubricForAI, null, 2)}

The student's handwritten answer sheet PDF is attached. Read it carefully, match answers to questions using the rubric, and evaluate each answer step-by-step.`;

          let aiResult = null;
          let lastError = null;
          let rawResponseText = null;
          const MAX_ATTEMPTS = Math.min(3, API_KEYS.length);

          for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
            try {
              console.log(`[AI CHECK] Attempt ${attempt + 1}/${MAX_ATTEMPTS} for ${sub.studentName} (API key index: ${currentKeyIndex})`);

              const geminiCall = getModel(true, MASTER_EVALUATION_PROMPT).generateContent({
                contents: [{
                  role: "user",
                  parts: [
                    { text: userPrompt },
                    { inlineData: { mimeType: "application/pdf", data: pdfBase64 } },
                  ],
                }],
                generationConfig: {
                  temperature: 0.2,
                  maxOutputTokens: 65536,
                  responseMimeType: "application/json",
                },
              });

              // No timeout — let AI take as long as it needs
              const result = await geminiCall;
              rawResponseText = result.response.text();
              console.log(`[AI CHECK] ✅ Gemini response received — length: ${rawResponseText.length} chars`);

              try {
                aiResult = parseGeminiJSON(rawResponseText);
                console.log(`[AI CHECK] ✅ JSON parsed OK — status: ${aiResult.processingStatus || 'unknown'}, answers: ${aiResult.checkedAnswers?.length || 0}`);
              } catch (parseErr) {
                console.error(`[AI CHECK] ❌ JSON PARSE FAILED for ${sub.studentName}`);
                console.error(`[AI CHECK] Parse error:`, parseErr.message);
                console.error(`[AI CHECK] Raw response (first 2000 chars):`, rawResponseText.substring(0, 2000));
                throw new Error(`JSON parse failed: ${parseErr.message}`);
              }
              break;
            } catch (err) {
              lastError = err;
              console.error(`[AI CHECK] ❌ Attempt ${attempt + 1} FAILED for ${sub.studentName}`);
              console.error(`[AI CHECK] Error type: ${err.constructor.name}`);
              console.error(`[AI CHECK] Error message: ${err.message}`);
              if (err.stack) console.error(`[AI CHECK] Stack: ${err.stack.split('\n').slice(0, 3).join('\n')}`);

              if (err.message === "TIMEOUT") {
                // Shouldn't happen anymore since timeout removed, but keep as safety
                console.error(`[AI CHECK] ⏱ TIMEOUT for ${sub.studentName}`);
                break;
              }
              if (err.message?.includes("RESOURCE_EXHAUSTED") || err.message?.includes("429") || err.message?.includes("quota") || err.message?.includes("Too Many Requests")) {
                console.error(`[AI CHECK] 🔴 QUOTA EXHAUSTED on key index ${currentKeyIndex}`);
                rotateApiKey();
                if (attempt < MAX_ATTEMPTS - 1) {
                  console.log(`[AI CHECK] ⏳ Waiting 3s before retry with key index ${currentKeyIndex}...`);
                  await new Promise(r => setTimeout(r, 3000));
                  continue;
                }
                console.error(`[AI CHECK] 🔴 ALL API KEYS EXHAUSTED — stopping session`);
                sub.status = "failed";
                sub.errorType = "quota_exceeded";
                sub.errorMessage = "AI service quota exhausted — all API keys used";
                await sub.save();
                failedCount++;

                io.to(`physical_check_${sessionId}`).emit("physical_check_error", {
                  sessionId, studentName: sub.studentName,
                  errorType: "quota_exceeded",
                  errorMessage: "AI service limit reached — remaining students not checked",
                });

                activeCheckingSessions.set(sessionId, "stop");
                continue;
              }
              // Generic error — try next key
              if (attempt < MAX_ATTEMPTS - 1) {
                console.log(`[AI CHECK] 🔄 Rotating API key and retrying...`);
                rotateApiKey();
                await new Promise(r => setTimeout(r, 5000));
              } else {
                console.error(`[AI CHECK] ❌ ALL ATTEMPTS EXHAUSTED for ${sub.studentName}`);
                console.error(`[AI CHECK] Last error: ${err.message}`);
              }
            }
          }

          // Check if we should stop after quota exhaustion
          if (activeCheckingSessions.get(sessionId) === "stop") continue;

          // ── Handle timeout ────────────────────────────────────────
          if (!aiResult && lastError?.message === "TIMEOUT") {
            console.error(`[AI CHECK] ⏱ FINAL: TIMEOUT for ${sub.studentName} — marking for review`);
            sub.status = "needs_review";
            sub.errorType = "timeout";
            sub.errorMessage = "Evaluation took too long (>90s) — marked for manual review";
            await sub.save();
            failedCount++;
            needsReviewCount++;

            io.to(`physical_check_${sessionId}`).emit("physical_check_error", {
              sessionId, studentName: sub.studentName,
              errorType: "timeout",
              errorMessage: sub.errorMessage,
            });

            checkedCount++;
            emitProgress(io, sessionId, checkedCount, pendingSubmissions.length, failedCount, needsReviewCount, sub.studentName, sub);
            continue;
          }

          // ── Handle no result / network error ──────────────────────
          if (!aiResult) {
            const errMsg = lastError?.message || "Unknown error — no AI response received";
            console.error(`[AI CHECK] ❌ FINAL: NO RESULT for ${sub.studentName}`);
            console.error(`[AI CHECK] Last error: ${errMsg}`);
            if (lastError?.stack) console.error(`[AI CHECK] Stack:`, lastError.stack);
            if (rawResponseText) console.error(`[AI CHECK] Raw response (first 1000):`, rawResponseText.substring(0, 1000));

            sub.status = "failed";
            sub.errorType = "network_error";
            sub.errorMessage = errMsg;
            await sub.save();
            failedCount++;

            io.to(`physical_check_${sessionId}`).emit("physical_check_error", {
              sessionId, studentName: sub.studentName,
              errorType: "network_error",
              errorMessage: errMsg,
            });

            checkedCount++;
            emitProgress(io, sessionId, checkedCount, pendingSubmissions.length, failedCount, needsReviewCount, sub.studentName, sub);
            continue;
          }

          // ── Handle error status from AI ───────────────────────────
          if (aiResult.processingStatus === "error") {
            console.error(`[AI CHECK] ❌ AI RETURNED ERROR for ${sub.studentName}`);
            console.error(`[AI CHECK] AI errorType: ${aiResult.errorType}`);
            console.error(`[AI CHECK] AI errorMessage: ${aiResult.errorMessage}`);
            sub.status = "failed";
            sub.errorType = aiResult.errorType || "parse_error";
            sub.errorMessage = aiResult.errorMessage || "AI returned an error status";
            await sub.save();
            failedCount++;

            io.to(`physical_check_${sessionId}`).emit("physical_check_error", {
              sessionId, studentName: sub.studentName,
              errorType: sub.errorType, errorMessage: sub.errorMessage,
            });

            checkedCount++;
            emitProgress(io, sessionId, checkedCount, pendingSubmissions.length, failedCount, needsReviewCount, sub.studentName, sub);
            continue;
          }

          // ── Parse and validate successful response ────────────────
          if (!aiResult.checkedAnswers || !Array.isArray(aiResult.checkedAnswers)) {
            console.error(`[AI CHECK] ❌ INVALID RESPONSE STRUCTURE for ${sub.studentName}`);
            console.error(`[AI CHECK] Expected 'checkedAnswers' array, got:`, Object.keys(aiResult));
            console.error(`[AI CHECK] Full parsed result:`, JSON.stringify(aiResult).substring(0, 2000));

            sub.status = "failed";
            sub.errorType = "parse_error";
            sub.errorMessage = `AI response missing checkedAnswers array. Got keys: ${Object.keys(aiResult).join(', ')}`;
            await sub.save();
            failedCount++;

            io.to(`physical_check_${sessionId}`).emit("physical_check_error", {
              sessionId, studentName: sub.studentName,
              errorType: "parse_error",
              errorMessage: sub.errorMessage,
            });

            checkedCount++;
            emitProgress(io, sessionId, checkedCount, pendingSubmissions.length, failedCount, needsReviewCount, sub.studentName, sub);
            continue;
          }

          // ── Validate answer count ─────────────────────────────────
          let studentNeedsReview = false;
          if (aiResult.checkedAnswers.length !== sub.answers.length) {
            studentNeedsReview = true;
            console.warn(`[AI CHECK] ⚠ Answer count mismatch for ${sub.studentName}: expected ${sub.answers.length}, got ${aiResult.checkedAnswers.length}`);
          }

          // ── Update each answer with AI results ────────────────────
          let totalMarksObtained = 0;

          sub.answers = sub.answers.map(ans => {
            const aiAns = aiResult.checkedAnswers.find(a => a.questionId === ans.questionId);
            if (aiAns) {
              const awarded = Math.min(parseFloat(aiAns.marksAwarded) || 0, ans.marks);
              totalMarksObtained += awarded;
              return {
                ...ans.toObject(),
                studentAnswerPoints: aiAns.studentAnswerPoints || "",
                marksAwarded: awarded,
                aiFeedback: aiAns.aiFeedback || "",
                checkedBy: "ai",
                keywordsFound: aiAns.keywordsFound || [],
                keywordsMissed: aiAns.keywordsMissed || [],
                markingBreakdown: aiAns.markingBreakdown || null,
                needs_human_review: aiAns.needs_human_review || false,
                handwritingConfidence: aiAns.handwritingConfidence ?? null,
              };
            }
            return ans;
          });

          // Check if any answer needs review
          const anyNeedsReview = sub.answers.some(a => a.needs_human_review);
          if (anyNeedsReview || studentNeedsReview) {
            needsReviewCount++;
          }

          sub.marksObtained = totalMarksObtained;
          sub.percentage = parseFloat(((totalMarksObtained / sub.totalMarks) * 100).toFixed(2));
          sub.status = (anyNeedsReview || studentNeedsReview) ? "needs_review" : "checked";
          sub.checkedAt = new Date();
          sub.errorType = null;
          sub.errorMessage = "";
          await sub.save();

          checkedCount++;
          console.log(`[AI CHECK] ✅ DONE: ${sub.studentName} — ${totalMarksObtained}/${sub.totalMarks} (${sub.percentage}%) [${sub.status}]`);

          // ── Emit progress ──────────────────────────────────────────
          emitProgress(io, sessionId, checkedCount, pendingSubmissions.length, failedCount, needsReviewCount, sub.studentName, sub);

        } catch (studentError) {
          console.error(`\n[AI CHECK] ══════════════════════════════════════`);
          console.error(`[AI CHECK] ❌❌ UNHANDLED ERROR for ${sub.studentName}`);
          console.error(`[AI CHECK] Error type: ${studentError.constructor.name}`);
          console.error(`[AI CHECK] Error message: ${studentError.message}`);
          console.error(`[AI CHECK] Full stack:`, studentError.stack);
          console.error(`[AI CHECK] ══════════════════════════════════════\n`);
          sub.status = "failed";
          sub.errorType = "network_error";
          sub.errorMessage = studentError.message;
          await sub.save();
          failedCount++;
          checkedCount++;

          io.to(`physical_check_${sessionId}`).emit("physical_check_error", {
            sessionId, studentName: sub.studentName,
            errorType: "network_error", errorMessage: studentError.message,
          });

          emitProgress(io, sessionId, checkedCount, pendingSubmissions.length, failedCount, needsReviewCount, sub.studentName, sub);
        }

        // ── Snapshot every 5 students ───────────────────────────────
        if (checkedCount % 5 === 0) {
          await CheckingSession.findOneAndUpdate(
            { sessionId },
            { checkedCount, failedCount, needsReviewCount, lastSnapshotAt: new Date() }
          );
        }

        // ── Delay between students ──────────────────────────────────
        if (idx < pendingSubmissions.length - 1) {
          await new Promise(r => setTimeout(r, 2000));
        }
      }

      // ── All done ────────────────────────────────────────────────────
      io.to(`physical_check_${sessionId}`).emit("physical_check_complete", {
        sessionId, checkedCount, failedCount, needsReviewCount,
      });

      await CheckingSession.findOneAndUpdate(
        { sessionId },
        { status: "completed", checkedCount, failedCount, needsReviewCount, completedAt: new Date(), lastSnapshotAt: new Date() }
      );

      activeCheckingSessions.delete(sessionId);
    })();

  } catch (error) {
    console.error("checkBulkByClass error:", error);
    res.status(500).json({ error: "Failed to start checking", details: error.message });
  }
};

// Helper to emit progress events
const emitProgress = (io, sessionId, checkedCount, totalCount, failedCount, needsReviewCount, studentName, sub) => {
  io.to(`physical_check_${sessionId}`).emit("physical_check_progress", {
    sessionId,
    checkedCount,
    totalCount,
    failedCount,
    needsReviewCount,
    currentStudent: "",
    lastResult: {
      studentName,
      marks: sub.marksObtained,
      total: sub.totalMarks,
      pct: sub.percentage,
      status: sub.status,
      needsReview: sub.status === "needs_review",
      errorType: sub.errorType,
    },
  });
};

// ═════════════════════════════════════════════════════════════════════════════
// ENDPOINT 5: Stop Checking
// POST /api/physical-test-submission/stop-checking/:sessionId
// ═════════════════════════════════════════════════════════════════════════════
export const stopChecking = async (req, res) => {
  try {
    const { sessionId } = req.params;
    if (!activeCheckingSessions.has(sessionId)) {
      return res.status(404).json({ error: "No active checking session found with this ID" });
    }
    activeCheckingSessions.set(sessionId, "stop");
    res.status(200).json({ success: true, message: "Stop signal sent. Checking will stop after the current student finishes." });
  } catch (error) {
    res.status(500).json({ error: "Failed to stop checking", details: error.message });
  }
};

// ═════════════════════════════════════════════════════════════════════════════
// ENDPOINT 6: Get Check Status (fallback for socket disconnect)
// GET /api/physical-test-submission/check-status/:sessionId
// ═════════════════════════════════════════════════════════════════════════════
export const getCheckStatus = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await CheckingSession.findOne({ sessionId });
    if (!session) return res.status(404).json({ error: "Session not found" });
    res.status(200).json({
      success: true,
      sessionId: session.sessionId,
      status: session.status,
      checkedCount: session.checkedCount,
      totalCount: session.totalCount,
      failedCount: session.failedCount,
      needsReviewCount: session.needsReviewCount,
      currentStudent: session.currentStudent,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to get status", details: error.message });
  }
};


// ═════════════════════════════════════════════════════════════════════════════
// LEGACY ENDPOINTS (kept for backward compatibility)
// ═════════════════════════════════════════════════════════════════════════════

// POST /api/physical-test-submission/upload-bulk
export const uploadBulkPhysicalPapers = [
  upload.array("papers", 100),
  async (req, res) => {
    try {
      const { testPaperId, studentMappings } = req.body;
      const bucket = getBucket();
      if (!bucket) return res.status(503).json({ error: "Database not ready" });

      const testPaper = await TestPaper.findById(testPaperId);
      if (!testPaper) return res.status(404).json({ error: "Test paper not found" });

      const files = req.files;
      if (!files || files.length === 0) return res.status(400).json({ error: "No PDF files uploaded" });

      let mappings = [];
      try { mappings = JSON.parse(studentMappings || "[]"); } catch (e) { /* ignore */ }

      const uploadedSubmissions = [];

      for (const file of files) {
        const mapping = mappings.find(m => m.fileName === file.originalname);
        const studentName = mapping?.studentName || file.originalname.replace(".pdf", "");
        const studentId = mapping?.studentId || null;

        if (studentId) {
          const existing = await PhysicalTestSubmission.findOne({ testPaperId, studentId });
          if (existing) continue;
        }

        const filename = `physical_${testPaperId}_${Date.now()}_${file.originalname}`;
        const pdfFileId = await uploadToGridFS(bucket, file.buffer, filename);

        const answers = testPaper.questions.map(q => ({
          questionId: q._id.toString(),
          question: q.question,
          answerKey: q.answerKey,
          marks: q.marks,
          marksAwarded: 0,
          aiFeedback: "",
          checkedBy: "pending",
        }));

        const submission = await PhysicalTestSubmission.create({
          testPaperId,
          studentId: studentId && mongoose.Types.ObjectId.isValid(studentId) ? studentId : null,
          studentName,
          pdfFileId,
          pdfFileName: filename,
          answers,
          totalMarks: testPaper.totalMarks,
          status: "pending",
        });

        uploadedSubmissions.push(submission);
      }

      res.status(201).json({
        success: true,
        message: `Uploaded ${uploadedSubmissions.length} papers successfully`,
        count: uploadedSubmissions.length,
        submissions: uploadedSubmissions,
      });
    } catch (error) {
      console.error("Bulk upload error:", error);
      res.status(500).json({ error: "Failed to upload papers", details: error.message });
    }
  }
];

// POST /api/physical-test-submission/check-with-ai/:testPaperId (legacy)
export const checkPhysicalPapersWithAI = async (req, res) => {
  try {
    const { testPaperId } = req.params;
    const bucket = getBucket();

    const testPaper = await TestPaper.findById(testPaperId);
    if (!testPaper) return res.status(404).json({ error: "Test paper not found" });

    const pendingSubmissions = await PhysicalTestSubmission.find({ testPaperId, status: "pending" });
    if (pendingSubmissions.length === 0) {
      return res.status(404).json({ error: "No pending physical submissions found" });
    }

    const answerKeys = testPaper.questions.map(q => ({
      questionId: q._id.toString(),
      question: q.question,
      answerKey: q.answerKey,
      answerGuidelines: q.answerGuidelines || "",
      marks: q.marks,
    }));

    let checkedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < pendingSubmissions.length; i++) {
      const sub = pendingSubmissions[i];
      try {
        const pdfBase64 = await readPdfFromGridFS(bucket, sub.pdfFileId);

        const answerKeyText = answerKeys.map(k => `
Question ID: ${k.questionId}
Question: ${k.question}
Answer Key: ${k.answerKey}
Guidelines: ${k.answerGuidelines || "Evaluate fairly based on content accuracy"}
Max Marks: ${k.marks}
`).join("\n---\n");

        const promptParts = [
          { text: `STUDENT: ${sub.studentName} (submissionId: ${sub._id.toString()})` },
          { inlineData: { mimeType: "application/pdf", data: pdfBase64 } },
          { text: `
You are an expert examiner checking a single student's handwritten exam paper.
Read the student's PDF carefully. Match their handwritten answers to the questions below.

ANSWER KEYS (for evaluation):
${answerKeyText}

INSTRUCTIONS:
1. Read the student's PDF thoroughly
2. For each question, identify what key points the student actually wrote
3. Award marks fairly (0 to max marks, allow partial marks like 0.5, 1, 1.5)
4. If a question is unanswered or blank, set studentAnswerPoints to "Not attempted"
5. Accept conceptually correct answers even if wording differs
6. Keep feedback concise (1-2 sentences max)
7. studentAnswerPoints should be a brief bullet summary of the student's actual answer

RETURN ONLY this exact JSON, no markdown:
{
  "results": [
    {
      "submissionId": "<exact submissionId>",
      "checkedAnswers": [
        {
          "questionId": "<exact questionId>",
          "studentAnswerPoints": "<brief bullet summary>",
          "marksAwarded": <number>,
          "feedback": "<1-2 sentence feedback>"
        }
      ]
    }
  ]
}
          ` },
        ];

        let attempts = 0;
        let subResult = null;

        while (attempts < API_KEYS.length) {
          try {
            const result = await getModel().generateContent({
              contents: [{ role: "user", parts: promptParts }],
              generationConfig: { temperature: 0.2, maxOutputTokens: 8192, responseMimeType: "application/json" },
            });
            const parsed = parseGeminiJSON(result.response.text());
            if (!parsed?.results || !Array.isArray(parsed.results)) throw new Error("Invalid response format");
            subResult = parsed.results[0];
            break;
          } catch (error) {
            attempts++;
            if (error.message?.includes("quota") || error.message?.includes("429")) rotateApiKey();
            if (attempts >= API_KEYS.length) { console.error(`Failed to check ${sub.studentName}:`, error.message); break; }
            await new Promise(r => setTimeout(r, 2000));
          }
        }

        if (subResult) {
          let totalMarks = 0;
          sub.answers = sub.answers.map(ans => {
            const aiAns = subResult.checkedAnswers?.find(a => a.questionId === ans.questionId);
            if (aiAns) {
              totalMarks += parseFloat(aiAns.marksAwarded) || 0;
              return {
                ...ans.toObject(),
                studentAnswerPoints: aiAns.studentAnswerPoints || "",
                marksAwarded: aiAns.marksAwarded,
                aiFeedback: aiAns.feedback || "",
                checkedBy: "ai",
              };
            }
            return ans;
          });

          sub.marksObtained = totalMarks;
          sub.percentage = parseFloat(((totalMarks / sub.totalMarks) * 100).toFixed(2));
          sub.status = "checked";
          sub.checkedAt = new Date();
          await sub.save();
          checkedCount++;
        } else {
          failedCount++;
        }
      } catch (error) {
        console.error(`Error checking ${sub.studentName}:`, error.message);
        failedCount++;
        rotateApiKey();
      }

      if (i < pendingSubmissions.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }

    res.status(200).json({
      success: true,
      message: `Checked ${checkedCount} papers (${failedCount} failed)`,
      checkedCount, failedCount, total: pendingSubmissions.length,
    });
  } catch (error) {
    console.error("AI check error:", error);
    res.status(500).json({ error: "Failed to check with AI", details: error.message });
  }
};

// GET /api/physical-test-submission/list/:testPaperId
export const getPhysicalSubmissions = async (req, res) => {
  try {
    const { testPaperId } = req.params;
    const submissions = await PhysicalTestSubmission.find({ testPaperId })
      .populate("studentId", "name email profilePhoto")
      .sort({ uploadedAt: -1 });
    res.status(200).json({ success: true, submissions, count: submissions.length });
  } catch (error) { res.status(500).json({ error: "Server error" }); }
};

// GET /api/physical-test-submission/submission/:submissionId
export const getPhysicalSubmissionById = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const submission = await PhysicalTestSubmission.findById(submissionId)
      .populate("testPaperId", "title totalMarks questions")
      .populate("studentId", "name email profilePhoto");
    if (!submission) return res.status(404).json({ error: "Submission not found" });
    res.status(200).json({ success: true, submission });
  } catch (error) { res.status(500).json({ error: "Server error" }); }
};

// GET /api/physical-test-submission/pdf/:submissionId
export const getPhysicalSubmissionPDF = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const submission = await PhysicalTestSubmission.findById(submissionId);
    if (!submission) return res.status(404).json({ error: "Not found" });
    const bucket = getBucket();
    const downloadStream = bucket.openDownloadStream(submission.pdfFileId);
    res.set("Content-Type", "application/pdf");
    res.set("Content-Disposition", `inline; filename="${submission.pdfFileName}"`);
    downloadStream.pipe(res);
    downloadStream.on("error", () => res.status(500).json({ error: "PDF stream error" }));
  } catch (error) { res.status(500).json({ error: "Server error" }); }
};

// DELETE /api/physical-test-submission/:submissionId
export const deletePhysicalSubmission = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const submission = await PhysicalTestSubmission.findById(submissionId);
    if (!submission) return res.status(404).json({ error: "Not found" });
    const bucket = getBucket();
    try { await bucket.delete(submission.pdfFileId); } catch (e) { console.warn("GridFS delete warn:", e.message); }
    await PhysicalTestSubmission.findByIdAndDelete(submissionId);
    res.status(200).json({ success: true, message: "Deleted successfully" });
  } catch (error) { res.status(500).json({ error: "Server error" }); }
};

// PUT /api/physical-test-submission/update-marks/:submissionId
export const updatePhysicalMarksManually = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { answers } = req.body;
    const submission = await PhysicalTestSubmission.findById(submissionId);
    if (!submission) return res.status(404).json({ error: "Not found" });

    let total = 0;
    submission.answers = submission.answers.map(ans => {
      const update = answers.find(a => a.questionId === ans.questionId);
      if (update) {
        total += parseFloat(update.marksAwarded) || 0;
        return { ...ans.toObject(), marksAwarded: update.marksAwarded, aiFeedback: update.aiFeedback || ans.aiFeedback, checkedBy: "teacher" };
      }
      total += ans.marksAwarded;
      return ans;
    });

    submission.marksObtained = total;
    submission.percentage = parseFloat(((total / submission.totalMarks) * 100).toFixed(2));
    submission.status = "checked";
    submission.checkedAt = new Date();
    await submission.save();
    res.status(200).json({ success: true, submission });
  } catch (error) { res.status(500).json({ error: "Server error" }); }
};

// ── Legacy: uploadWithQuestionCard (kept for backward compat, now simpler) ──
export const uploadWithQuestionCard = [
  uploadQC.fields([
    { name: "questionCard", maxCount: 1 },
    { name: "papers", maxCount: 100 },
  ]),
  async (req, res) => {
    try {
      const { classId, testTitle, totalMarks, studentMappings } = req.body;
      if (!classId) return res.status(400).json({ error: "classId is required" });
      if (!testTitle) return res.status(400).json({ error: "testTitle is required" });
      if (!totalMarks) return res.status(400).json({ error: "totalMarks is required" });

      const questionCardFile = req.files?.questionCard?.[0];
      const studentFiles = req.files?.papers || [];
      if (!questionCardFile) return res.status(400).json({ error: "Question card PDF is required" });
      if (studentFiles.length === 0) return res.status(400).json({ error: "At least one student paper is required" });

      const bucket = getBucket();
      if (!bucket) return res.status(503).json({ error: "Database not ready" });

      let mappings = [];
      try { mappings = JSON.parse(studentMappings || "[]"); } catch (e) { /* ignore */ }

      // Store question card
      const qcFilename = `qcard_${classId}_${Date.now()}_${questionCardFile.originalname}`;
      const questionCardFileId = await uploadToGridFS(bucket, questionCardFile.buffer, qcFilename);

      // Extract questions with rubric
      const qcBase64 = questionCardFile.buffer.toString("base64");
      let extractedQuestions = [];
      try {
        const extractResult = await getModel().generateContent({
          contents: [{
            role: "user",
            parts: [
              { text: RUBRIC_EXTRACTION_PROMPT + `\n\nUse the marks printed next to each question. If no marks shown, distribute evenly to total ${totalMarks}.` },
              { inlineData: { mimeType: "application/pdf", data: qcBase64 } },
            ],
          }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 16384, responseMimeType: "application/json" },
        });
        const parsed = parseGeminiJSON(extractResult.response.text());
        extractedQuestions = parsed.questions || [];
      } catch (e) {
        console.error("Question extraction failed:", e.message);
        return res.status(500).json({ error: "Failed to extract questions from question card", details: e.message });
      }

      if (extractedQuestions.length === 0) {
        return res.status(400).json({ error: "No questions could be extracted" });
      }

      // Store student papers (pending status, no AI check)
      const createdSubmissions = [];
      for (const file of studentFiles) {
        const mapping = mappings.find(m => m.fileName === file.originalname);
        const studentName = mapping?.studentName || file.originalname.replace(/\.pdf$/i, "");
        const filename = `physical_${classId}_${Date.now()}_${file.originalname}`;
        const pdfFileId = await uploadToGridFS(bucket, file.buffer, filename);

        const answers = extractedQuestions.map(q => ({
          questionId: q.questionId,
          question: q.question,
          answerKey: q.answerKey || "",
          marks: q.marks,
          topic: q.topic || "",
          rubric: q.rubric || {},
          marksAwarded: 0,
          aiFeedback: "",
          checkedBy: "pending",
        }));

        const submission = await PhysicalTestSubmission.create({
          classId, testTitle,
          questionCardFileId, questionCardFileName: qcFilename,
          studentName, pdfFileId, pdfFileName: filename,
          answers, totalMarks: parseFloat(totalMarks) || 100,
          status: "pending",
        });
        createdSubmissions.push(submission);
      }

      res.status(201).json({
        success: true,
        message: `Uploaded ${createdSubmissions.length} paper(s). Use check-bulk to start AI checking.`,
        count: createdSubmissions.length,
        questionsExtracted: extractedQuestions.length,
        submissions: createdSubmissions,
      });
    } catch (error) {
      console.error("uploadWithQuestionCard error:", error);
      res.status(500).json({ error: "Upload failed", details: error.message });
    }
  },
];

// GET /api/physical-test-submission/list-by-class/:classId
export const getPhysicalSubmissionsByClass = async (req, res) => {
  try {
    const { classId } = req.params;
    const submissions = await PhysicalTestSubmission.find({ classId })
      .populate("studentId", "name email profilePhoto")
      .sort({ uploadedAt: -1 });
    res.status(200).json({ success: true, submissions, count: submissions.length });
  } catch (error) { res.status(500).json({ error: "Server error" }); }
};
