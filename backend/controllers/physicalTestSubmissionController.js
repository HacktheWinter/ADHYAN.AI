import multer from "multer";
import mongoose from "mongoose";
import PhysicalTestSubmission from "../models/PhysicalTestSubmission.js";
import TestPaper from "../models/TestPaper.js";
import User from "../models/User.js";
import { getBucket } from "../config/gridfs.js";
import { GoogleGenerativeAI } from "@google/generative-ai";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per file
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") cb(null, true);
    else cb(new Error("Only PDF files allowed"), false);
  },
});

const API_KEYS = [
  process.env.GEN_API_KEY_1,
  process.env.GEN_API_KEY_2,
  process.env.GEN_API_KEY_3,
].filter(Boolean);

let currentKeyIndex = 0;

const getModel = () => {
  const apiKey = API_KEYS[currentKeyIndex];
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
};

const rotateApiKey = () => {
  currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
};

// POST /api/physical-test-submission/upload-bulk
// Accepts: multipart form with multiple PDFs + testPaperId + studentNames JSON array
export const uploadBulkPhysicalPapers = [
  upload.array("papers", 100), // max 100 files
  async (req, res) => {
    try {
      const { testPaperId, studentMappings } = req.body;
      // studentMappings is a JSON string: [{ fileName: "abc.pdf", studentName: "John", studentId: "..." }, ...]
      
      const bucket = getBucket();
      if (!bucket) return res.status(503).json({ error: "Database not ready" });
      
      const testPaper = await TestPaper.findById(testPaperId);
      if (!testPaper) return res.status(404).json({ error: "Test paper not found" });
      
      const files = req.files;
      if (!files || files.length === 0) return res.status(400).json({ error: "No PDF files uploaded" });
      
      let mappings = [];
      try {
        mappings = JSON.parse(studentMappings || "[]");
      } catch (e) {
        // if no mappings, use file names as student names
      }

      const uploadedSubmissions = [];

      for (const file of files) {
        // Find mapping for this file
        const mapping = mappings.find(m => m.fileName === file.originalname);
        const studentName = mapping?.studentName || file.originalname.replace(".pdf", "");
        const studentId = mapping?.studentId || null;

        // Check if already uploaded for this student+test
        if (studentId) {
          const existing = await PhysicalTestSubmission.findOne({ testPaperId, studentId });
          if (existing) continue;
        }

        // Upload to GridFS
        const filename = `physical_${testPaperId}_${Date.now()}_${file.originalname}`;
        const uploadStream = bucket.openUploadStream(filename, { contentType: "application/pdf" });
        uploadStream.end(file.buffer);

        await new Promise((resolve, reject) => {
          uploadStream.on("finish", resolve);
          uploadStream.on("error", reject);
        });

        // Build answers array from test paper questions
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
          pdfFileId: uploadStream.id,
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

// POST /api/physical-test-submission/check-with-ai/:testPaperId
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

    const BATCH_SIZE = 1;
    const DELAY = 3000;
    let checkedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < pendingSubmissions.length; i += BATCH_SIZE) {
      const batch = pendingSubmissions.slice(i, i + BATCH_SIZE);
      console.log(`Processing batch ${Math.floor(i/BATCH_SIZE)+1}: ${batch.length} papers`);

      try {
        // Read PDFs from GridFS
        const geminiSubmissions = await Promise.all(batch.map(sub => {
          return new Promise((resolve, reject) => {
            const downloadStream = bucket.openDownloadStream(sub.pdfFileId);
            const chunks = [];
            downloadStream.on("data", chunk => chunks.push(chunk));
            downloadStream.on("end", () => {
              const buffer = Buffer.concat(chunks);
              resolve({
                submissionId: sub._id.toString(),
                studentName: sub.studentName,
                pdfBase64: buffer.toString("base64"),
              });
            });
            downloadStream.on("error", reject);
          });
        }));

        // Call Gemini multimodal
        const results = await checkHandwrittenPDFsWithGemini(geminiSubmissions, answerKeys);

        // Update submissions
        for (const sub of batch) {
          const result = results.find(r => r.submissionId === sub._id.toString());
          if (!result) { failedCount++; continue; }

          let totalMarks = 0;
          sub.answers = sub.answers.map(ans => {
            const aiAns = result.checkedAnswers?.find(a => a.questionId === ans.questionId);
            if (aiAns) {
              totalMarks += parseFloat(aiAns.marksAwarded) || 0;
              return {
                ...ans,
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
        }
      } catch (error) {
        console.error(`Batch failed:`, error.message);
        failedCount += batch.length;
        rotateApiKey();
      }

      if (i + BATCH_SIZE < pendingSubmissions.length) {
        await new Promise(resolve => setTimeout(resolve, DELAY));
      }
    }

    res.status(200).json({
      success: true,
      message: `Checked ${checkedCount} papers (${failedCount} failed)`,
      checkedCount,
      failedCount,
      total: pendingSubmissions.length,
    });
  } catch (error) {
    console.error("AI check error:", error);
    res.status(500).json({ error: "Failed to check with AI", details: error.message });
  }
};

const checkHandwrittenPDFsWithGemini = async (submissions, answerKeys) => {
  const model = getModel();
  const results = [];

  for (const sub of submissions) {
    const promptParts = [
      { text: `STUDENT: ${sub.studentName} (submissionId: ${sub.submissionId})` },
      { inlineData: { mimeType: "application/pdf", data: sub.pdfBase64 } },
    ];

    const answerKeyText = answerKeys.map(k => `
Question ID: ${k.questionId}
Question: ${k.question}
Answer Key: ${k.answerKey}
Guidelines: ${k.answerGuidelines || "Evaluate fairly based on content accuracy"}
Max Marks: ${k.marks}
`).join("\n---\n");

    promptParts.push({ text: `
You are an expert examiner checking a single student's handwritten exam paper.
Read the student's PDF carefully. Match their handwritten answers to the questions below.

ANSWER KEYS (for evaluation):
${answerKeyText}

INSTRUCTIONS:
1. Read the student's PDF thoroughly
2. For each question, identify what key points the student actually wrote in their answer
3. Award marks fairly (0 to max marks, allow partial marks like 0.5, 1, 1.5)
4. If a question is unanswered or blank, set studentAnswerPoints to "Not attempted"
5. Accept conceptually correct answers even if wording differs
6. Keep feedback concise (1-2 sentences max)
7. studentAnswerPoints should be a brief bullet summary of the student's actual answer (not the expected answer)

RETURN ONLY this exact JSON, no markdown, no extra text:
{
  "results": [
    {
      "submissionId": "<exact submissionId>",
      "checkedAnswers": [
        {
          "questionId": "<exact questionId>",
          "studentAnswerPoints": "<brief bullet-style summary of what the student actually wrote, e.g. '• Point 1 • Point 2'>",
          "marksAwarded": <number>,
          "feedback": "<1-2 sentence evaluation feedback>"
        }
      ]
    }
  ]
}

Ensure EVERY questionId from answer keys appears in checkedAnswers.
` });

    let attempts = 0;
    const MAX_RETRIES = API_KEYS.length;
    let subResult = null;

    while (attempts < MAX_RETRIES) {
      try {
        const result = await model.generateContent({
          contents: [{ role: "user", parts: promptParts }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 8192,
            responseMimeType: "application/json",
          },
        });

        const responseText = result.response.text().trim();
        let cleaned = responseText.replace(/```json\n?/gi, "").replace(/```/g, "");
        const firstBrace = cleaned.indexOf("{");
        const lastBrace = cleaned.lastIndexOf("}");
        cleaned = cleaned.substring(firstBrace, lastBrace + 1);
        const parsed = JSON.parse(cleaned);

        if (!parsed?.results || !Array.isArray(parsed.results)) {
          throw new Error("Invalid response format");
        }

        subResult = parsed.results[0];
        break;
      } catch (error) {
        attempts++;
        if (error.message?.includes("quota") || error.message?.includes("429")) {
          rotateApiKey();
        }
        if (attempts >= MAX_RETRIES) {
          console.error(`Failed to check ${sub.studentName}:`, error.message);
          break;
        }
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    if (subResult) results.push(subResult);
  }

  return results;
};


// GET /api/physical-test-submission/list/:testPaperId
export const getPhysicalSubmissions = async (req, res) => {
  try {
    const { testPaperId } = req.params;
    const submissions = await PhysicalTestSubmission.find({ testPaperId })
      .populate("studentId", "name email profilePhoto")
      .sort({ uploadedAt: -1 });

    res.status(200).json({ success: true, submissions, count: submissions.length });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
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
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
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
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
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
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
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
        return { ...ans, marksAwarded: update.marksAwarded, aiFeedback: update.aiFeedback || ans.aiFeedback, checkedBy: "teacher" };
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
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Multer for question-card flow: one "questionCard" field + many "papers"
// ─────────────────────────────────────────────────────────────────────────────
const uploadQC = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB (question card can be larger)
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") cb(null, true);
    else cb(new Error("Only PDF files allowed"), false);
  },
});

// POST /api/physical-test-submission/upload-with-question-card
// Accepts: questionCard (single PDF), papers (multiple PDFs), classId, testTitle, totalMarks, studentMappings
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

      // ── 1. Store question card in GridFS ────────────────────────────────────
      const qcFilename = `qcard_${classId}_${Date.now()}_${questionCardFile.originalname}`;
      const qcUploadStream = bucket.openUploadStream(qcFilename, { contentType: "application/pdf" });
      qcUploadStream.end(questionCardFile.buffer);
      await new Promise((resolve, reject) => {
        qcUploadStream.on("finish", resolve);
        qcUploadStream.on("error", reject);
      });
      const questionCardFileId = qcUploadStream.id;

      // ── 2. Store each student paper in GridFS ───────────────────────────────
      const storedStudents = [];
      for (const file of studentFiles) {
        const mapping = mappings.find(m => m.fileName === file.originalname);
        const studentName = mapping?.studentName || file.originalname.replace(/\.pdf$/i, "");

        const filename = `physical_${classId}_${Date.now()}_${file.originalname}`;
        const uploadStream = bucket.openUploadStream(filename, { contentType: "application/pdf" });
        uploadStream.end(file.buffer);
        await new Promise((resolve, reject) => {
          uploadStream.on("finish", resolve);
          uploadStream.on("error", reject);
        });

        storedStudents.push({
          studentName,
          pdfFileId: uploadStream.id,
          pdfFileName: filename,
          pdfBase64: file.buffer.toString("base64"),
        });
      }

      // ── 3. Ask Gemini to extract questions from the question card ───────────
      const model = getModel();
      const qcBase64 = questionCardFile.buffer.toString("base64");

      let extractedQuestions = [];
      try {
        const extractResult = await model.generateContent({
          contents: [{
            role: "user",
            parts: [
              { text: "Extract ALL questions from this question paper PDF. Return ONLY JSON, no markdown:" +
                `\n{\n  "questions": [\n    { "questionId": "q1", "question": "<full question text>", "answerKey": "<expected answer / key points>", "marks": <number> }\n  ],\n  "totalMarks": <sum of all marks>\n}` +
                `\n\nUse the marks printed next to each question. If no marks shown, distribute evenly to total ${totalMarks}. Keep answerKey as ideal answer guidelines.`
              },
              { inlineData: { mimeType: "application/pdf", data: qcBase64 } },
            ],
          }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 8192, responseMimeType: "application/json" },
        });

        const raw = extractResult.response.text().trim();
        const cleaned = raw.replace(/```json\n?/gi, "").replace(/```/g, "");
        const parsed = JSON.parse(cleaned.substring(cleaned.indexOf("{"), cleaned.lastIndexOf("}") + 1));
        extractedQuestions = parsed.questions || [];
      } catch (e) {
        console.error("Question extraction failed:", e.message);
        return res.status(500).json({ error: "Failed to extract questions from question card", details: e.message });
      }

      if (extractedQuestions.length === 0) {
        return res.status(400).json({ error: "No questions could be extracted from the question card. Ensure the PDF contains clear question text." });
      }

      // ── 4. Check each student's PDF using extracted questions ───────────────
      const answerKeys = extractedQuestions.map(q => ({
        questionId: q.questionId,
        question: q.question,
        answerKey: q.answerKey,
        marks: q.marks,
      }));

      const BATCH_SIZE = 1;
      const DELAY = 3000;
      const createdSubmissions = [];

      for (let i = 0; i < storedStudents.length; i += BATCH_SIZE) {
        const batch = storedStudents.slice(i, i + BATCH_SIZE);

        const geminiSubmissions = batch.map(s => ({
          submissionId: s.pdfFileName, // temp id for matching
          studentName: s.studentName,
          pdfBase64: s.pdfBase64,
        }));

        let batchResults = [];
        try {
          batchResults = await checkHandwrittenPDFsWithGemini(geminiSubmissions, answerKeys);
        } catch (e) {
          console.error("AI check batch failed:", e.message);
          rotateApiKey();
        }

        for (const student of batch) {
          const result = batchResults.find(r => r.submissionId === student.pdfFileName);
          const answerSet = extractedQuestions.map(q => {
            const aiAns = result?.checkedAnswers?.find(a => a.questionId === q.questionId);
            return {
              questionId: q.questionId,
              question: q.question,
              answerKey: q.answerKey,
              marks: q.marks,
              studentAnswerPoints: aiAns?.studentAnswerPoints || "",
              marksAwarded: aiAns ? parseFloat(aiAns.marksAwarded) || 0 : 0,
              aiFeedback: aiAns?.feedback || "",
              checkedBy: result ? "ai" : "pending",
            };
          });

          const marksObtained = answerSet.reduce((s, a) => s + a.marksAwarded, 0);
          const parsedTotal = parseFloat(totalMarks) || 100;

          const submission = await PhysicalTestSubmission.create({
            classId,
            testTitle,
            questionCardFileId,
            questionCardFileName: qcFilename,
            studentName: student.studentName,
            pdfFileId: student.pdfFileId,
            pdfFileName: student.pdfFileName,
            answers: answerSet,
            totalMarks: parsedTotal,
            marksObtained,
            percentage: parseFloat(((marksObtained / parsedTotal) * 100).toFixed(2)),
            status: result ? "checked" : "pending",
            checkedAt: result ? new Date() : null,
          });

          createdSubmissions.push(submission);
        }

        if (i + BATCH_SIZE < storedStudents.length) {
          await new Promise(r => setTimeout(r, DELAY));
        }
      }

      res.status(201).json({
        success: true,
        message: `Uploaded and checked ${createdSubmissions.length} paper(s)`,
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
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

