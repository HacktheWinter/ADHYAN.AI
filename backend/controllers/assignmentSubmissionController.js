import AssignmentSubmission from "../models/AssignmentSubmission.js";
import Assignment from "../models/Assignment.js";
import User from "../models/User.js";
import { checkAssignmentWithAI, checkPDFSubmissionsBatch } from "../config/geminiAssignment.js";
import multer from "multer";
import mongoose from "mongoose";
import { getBucket } from "../config/gridfs.js";

// Multer configured for memory storage (max 4MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 }, // 4MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed!"), false);
    }
  },
});


export const submitAssignment = async (req, res) => {
  try {
    const { assignmentId, studentId, answers } = req.body;

    console.log("Assignment submission received:", {
      assignmentId,
      studentId,
    });

    if (!assignmentId || !studentId || !answers || !Array.isArray(answers)) {
      return res.status(400).json({
        error: "assignmentId, studentId, and answers array are required",
      });
    }

    // Validate assignment
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    // Validate student
    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    // Check if already submitted
    const existingSubmission = await AssignmentSubmission.findOne({
      assignmentId,
      studentId,
    });
    if (existingSubmission) {
      return res.status(400).json({
        error: "Assignment already submitted",
        submission: existingSubmission,
      });
    }

    // Check due date
    if (assignment.dueDate && new Date() > new Date(assignment.dueDate)) {
      return res.status(400).json({ error: "Assignment deadline has passed" });
    }

    // Add question details to answers
    const submissionAnswers = answers.map((studentAnswer) => {
      const question = assignment.questions.find(
        (q) => q._id.toString() === studentAnswer.questionId
      );

      if (!question) {
        throw new Error(`Question not found: ${studentAnswer.questionId}`);
      }

      return {
        questionId: studentAnswer.questionId,
        question: question.question,
        studentAnswer: studentAnswer.answer || "",
        answerKey: question.answerKey,
        marks: question.marks,
        marksAwarded: 0,
        checkedBy: "pending",
      };
    });

    const submission = await AssignmentSubmission.create({
      assignmentId,
      studentId,
      studentName: student.name,
      answers: submissionAnswers,
      totalMarks: assignment.totalMarks,
      marksObtained: 0,
      percentage: 0,
      status: "pending",
      isResultPublished: false,
    });

    console.log("Assignment submitted");

    res.status(201).json({
      success: true,
      message: "Assignment submitted successfully. Awaiting results.",
      submission: {
        _id: submission._id,
        status: submission.status,
        submittedAt: submission.submittedAt,
      },
    });
  } catch (error) {
    console.error("Assignment submission error:", error);
    res.status(500).json({
      error: "Failed to submit assignment",
      details: error.message,
    });
  }
};

export const submitAssignmentPDF = [
  upload.single("assignmentPdf"),
  async (req, res) => {
    try {
      const { assignmentId, studentId } = req.body;
      const file = req.file;

      if (!assignmentId || !studentId || !file) {
        return res.status(400).json({ error: "assignmentId, studentId, and PDF file are required" });
      }

      const assignment = await Assignment.findById(assignmentId);
      if (!assignment) return res.status(404).json({ error: "Assignment not found" });

      const student = await User.findById(studentId);
      if (!student) return res.status(404).json({ error: "Student not found" });

      const existingSubmission = await AssignmentSubmission.findOne({ assignmentId, studentId });
      if (existingSubmission) {
        return res.status(400).json({ error: "Assignment already submitted" });
      }

      if (assignment.dueDate && new Date() > new Date(assignment.dueDate)) {
        return res.status(400).json({ error: "Assignment deadline has passed" });
      }

      // Upload file to GridFS
      const bucket = getBucket();
      const filename = `${student.name.replace(/\s+/g, "_")}_${Date.now()}.pdf`;

      const uploadStream = bucket.openUploadStream(filename, {
        contentType: "application/pdf",
      });

      uploadStream.end(file.buffer);

      uploadStream.on("finish", async () => {
        // Build Answers array using assignment questions
        const submissionAnswers = assignment.questions.map((q) => ({
          questionId: q._id.toString(),
          question: q.question,
          studentAnswer: "(PDF submission)",
          answerKey: q.answerKey,
          marks: q.marks,
          marksAwarded: 0,
          checkedBy: "pending",
        }));

        const submission = await AssignmentSubmission.create({
          assignmentId,
          studentId,
          studentName: student.name,
          answers: submissionAnswers,
          totalMarks: assignment.totalMarks,
          marksObtained: 0,
          percentage: 0,
          status: "pending",
          isResultPublished: false,
          submissionType: "pdf",
          pdfFileId: uploadStream.id,
          pdfFileName: filename,
        });

        res.status(201).json({
          success: true,
          message: "PDF Assignment submitted successfully. Awaiting results.",
          submission: {
            _id: submission._id,
            status: submission.status,
            submittedAt: submission.submittedAt,
          },
        });
      });

      uploadStream.on("error", (err) => {
        throw err;
      });

    } catch (error) {
      console.error("PDF assignment submission error:", error);
      res.status(500).json({
        error: "Failed to submit PDF assignment",
        details: error.message,
      });
    }
  }
];

export const checkAssignmentWithAI_Batch = async (req, res) => {
  try {
    const { assignmentId } = req.params;

    console.log("Starting AI checking for assignment:", assignmentId);

    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    const submissions = await AssignmentSubmission.find({
      assignmentId,
      status: "pending",
    });

    if (submissions.length === 0) {
      return res.status(404).json({ error: "No pending submissions found" });
    }

    console.log(`Total submissions to check: ${submissions.length}`);

    const answerKeys = assignment.questions.map((q) => ({
      questionId: q._id.toString(),
      question: q.question,
      answerKey: q.answerKey,
      answerGuidelines: q.answerGuidelines,
      marks: q.marks,
    }));

    let checkedCount = 0;
    let failedCount = 0;

    const onlineSubmissions = submissions.filter(s => !s.submissionType || s.submissionType === 'online');
    const pdfSubmissions = submissions.filter(s => s.submissionType === 'pdf');

    // 🔹 Process ONLINE Submissions
    const BATCH_SIZE = 1;
    const DELAY = 2000;

    for (let i = 0; i < onlineSubmissions.length; i += BATCH_SIZE) {
      const batch = onlineSubmissions.slice(i, i + BATCH_SIZE);

      console.log(`\n Processing online submission ${i + 1}/${onlineSubmissions.length}`);

      for (const submission of batch) {
        try {
          console.log(`Checking submission for: ${submission.studentName}`);

          const studentAnswers = submission.answers.map((ans) => ({
            questionId: ans.questionId,
            studentAnswer: ans.studentAnswer,
          }));

          let aiResults;
          let retries = 3;

          while (retries > 0) {
            try {
              aiResults = await checkAssignmentWithAI(answerKeys, studentAnswers);
              break;
            } catch (error) {
              retries--;
              console.error(`Retry ${3 - retries}/3 failed:`, error.message);
              if (retries === 0) throw error;
              await new Promise((resolve) => setTimeout(resolve, 2000));
            }
          }

          let totalMarksObtained = 0;

          submission.answers = submission.answers.map((ans) => {
            const aiResult = aiResults.find((r) => r.questionId === ans.questionId);

            if (aiResult) {
              totalMarksObtained += aiResult.marksAwarded;
              return {
                ...ans,
                aiMarks: aiResult.marksAwarded,
                marksAwarded: aiResult.marksAwarded,
                aiFeedback: aiResult.feedback || "",
                checkedBy: "ai",
              };
            }
            return ans;
          });

          submission.marksObtained = totalMarksObtained;
          submission.percentage = parseFloat(((totalMarksObtained / submission.totalMarks) * 100).toFixed(2));
          submission.status = "checked";
          submission.checkedAt = new Date();

          await submission.save();
          checkedCount++;

          console.log(`Checked successfully - Marks: ${totalMarksObtained}/${submission.totalMarks}`);
        } catch (error) {
          failedCount++;
          console.error(` Failed to check online submission:`, error.message);
        }
      }

      if (i + BATCH_SIZE < onlineSubmissions.length) {
        console.log(`Waiting ${DELAY / 1000}s before next online submission...`);
        await new Promise((resolve) => setTimeout(resolve, DELAY));
      }
    }

    // 🔹 Process PDF Submissions
    const bucket = getBucket();
    const PDF_BATCH_SIZE = 5;
    const PDF_DELAY = 3000;

    for (let i = 0; i < pdfSubmissions.length; i += PDF_BATCH_SIZE) {
      const batch = pdfSubmissions.slice(i, i + PDF_BATCH_SIZE);
      console.log(`\n Processing PDF batch ${Math.floor(i / PDF_BATCH_SIZE) + 1} (${batch.length} submissions)`);

      try {
        const geminiSubmissions = await Promise.all(batch.map(sub => {
          return new Promise((resolve, reject) => {
            const downloadStream = bucket.openDownloadStream(sub.pdfFileId);
            const chunks = [];
            downloadStream.on('data', chunk => chunks.push(chunk));
            downloadStream.on('end', () => {
               const buffer = Buffer.concat(chunks);
               resolve({
                 submissionId: sub._id.toString(),
                 studentName: sub.studentName,
                 pdfBase64: buffer.toString('base64')
               });
            });
            downloadStream.on('error', err => reject(err));
          });
        }));

        let aiResults;
        let retries = 3;
        while (retries > 0) {
          try {
            aiResults = await checkPDFSubmissionsBatch(geminiSubmissions, answerKeys);
            break;
          } catch (error) {
            retries--;
            console.error(`PDF checking retry ${3 - retries}/3 failed:`, error.message);
            if (retries === 0) throw error;
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
        }

        for (const sub of batch) {
          const resMap = aiResults.find(r => r.submissionId === sub._id.toString());
          if (!resMap) {
            console.warn(`No result mapped for PDF sub ${sub._id}`);
            failedCount++;
            continue;
          }

          let totalMarksObtained = 0;
          sub.answers = sub.answers.map(ans => {
            const aiAns = resMap.checkedAnswers && resMap.checkedAnswers.find(a => a.questionId === ans.questionId);
            if (aiAns) {
               totalMarksObtained += parseFloat(aiAns.marksAwarded) || 0;
               return {
                  ...ans,
                  aiMarks: aiAns.marksAwarded,
                  marksAwarded: aiAns.marksAwarded,
                  aiFeedback: aiAns.feedback || "",
                  checkedBy: "ai"
               };
            }
            return { ...ans, checkedBy: "ai" };
          });

          sub.marksObtained = totalMarksObtained;
          sub.percentage = parseFloat(((totalMarksObtained / sub.totalMarks) * 100).toFixed(2));
          sub.status = "checked";
          sub.checkedAt = new Date();

          await sub.save();
          checkedCount++;
          console.log(`Checked PDF successfully: ${sub.studentName} - ${totalMarksObtained}/${sub.totalMarks}`);
        }

      } catch (error) {
        failedCount += batch.length;
        console.error("Failed to check PDF batch:", error.message);
      }

      if (i + PDF_BATCH_SIZE < pdfSubmissions.length) {
         console.log(`Waiting ${PDF_DELAY / 1000}s before next PDF batch...`);
         await new Promise(res => setTimeout(res, PDF_DELAY));
      }
    }

    console.log("\n=== AI CHECKING COMPLETED ===");
    console.log(`Successfully checked: ${checkedCount}`);
    console.log(`Failed: ${failedCount}`);

    res.status(200).json({
      success: true,
      message: `Checked ${checkedCount} submissions using AI${
        failedCount > 0 ? ` (${failedCount} failed)` : ""
      }`,
      checkedCount,
      failedCount,
      totalSubmissions: submissions.length,
    });
  } catch (error) {
    console.error("AI checking error:", error);
    res.status(500).json({
      error: "Failed to check with AI",
      details: error.message,
    });
  }
};

export const publishResults = async (req, res) => {
  try {
    const { assignmentId } = req.params;

    const result = await AssignmentSubmission.updateMany(
      { assignmentId, status: "checked" },
      { $set: { isResultPublished: true } }
    );

    res.status(200).json({
      success: true,
      message: `Published results for ${result.modifiedCount} students`,
    });
  } catch (error) {
    console.error("Error publishing results:", error);
    res.status(500).json({ error: "Server error" });
  }
};

export const getAssignmentResult = async (req, res) => {
  try {
    const { assignmentId, studentId } = req.params;

    const submission = await AssignmentSubmission.findOne({
      assignmentId,
      studentId,
    }).populate("assignmentId", "title totalMarks");

    if (!submission) {
      return res.status(404).json({ error: "No submission found" });
    }

    if (!submission.isResultPublished) {
      return res.status(403).json({
        error: "Results not published yet",
        status: submission.status,
      });
    }

    res.status(200).json({
      success: true,
      submission,
    });
  } catch (error) {
    console.error("Error fetching result:", error);
    res.status(500).json({ error: "Server error" });
  }
};

export const getSubmissionById = async (req, res) => {
  try {
    const { submissionId } = req.params;

    const submission = await AssignmentSubmission.findById(submissionId)
      .populate("assignmentId", "title totalMarks questions")
      .populate("studentId", "name email");

    if (!submission) {
      return res.status(404).json({ error: "Submission not found" });
    }

    res.status(200).json({ success: true, submission });
  } catch (error) {
    console.error("Error fetching submission:", error);
    res.status(500).json({ error: "Server error" });
  }
};

export const checkSubmission = async (req, res) => {
  try {
    const { assignmentId, studentId } = req.params;

    const submission = await AssignmentSubmission.findOne({
      assignmentId,
      studentId,
    });

    res.status(200).json({
      hasSubmitted: !!submission,
      status: submission?.status || null,
      isResultPublished: submission?.isResultPublished || false,
      submissionId: submission?._id || null,
    });
  } catch (error) {
    console.error("Error checking submission:", error);
    res.status(500).json({ error: "Server error" });
  }
};

export const getAssignmentSubmissions = async (req, res) => {
  try {
    const { assignmentId } = req.params;

    const submissions = await AssignmentSubmission.find({ assignmentId })
      .populate("studentId", "name email profilePhoto")
      .sort({ submittedAt: -1 });

    res.status(200).json({
      success: true,
      count: submissions.length,
      submissions,
    });
  } catch (error) {
    console.error("Error fetching submissions:", error);
    res.status(500).json({ error: "Server error" });
  }
};

export const updateMarksManually = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { answers } = req.body;

    const submission = await AssignmentSubmission.findById(submissionId);

    if (!submission) {
      return res.status(404).json({ error: "Submission not found" });
    }

    let totalMarksObtained = 0;

    submission.answers = submission.answers.map((ans) => {
      const update = answers.find((a) => a.questionId === ans.questionId);

      if (update) {
        totalMarksObtained += update.marksAwarded;

        return {
          ...ans,
          marksAwarded: update.marksAwarded,
          teacherFeedback: update.teacherFeedback || ans.teacherFeedback,
          checkedBy: ans.checkedBy === "ai" ? "both" : "teacher",
        };
      }

      totalMarksObtained += ans.marksAwarded;
      return ans;
    });

    submission.marksObtained = totalMarksObtained;
    submission.percentage = parseFloat(
      ((totalMarksObtained / submission.totalMarks) * 100).toFixed(2)
    );
    submission.status = "checked";
    submission.checkedAt = new Date();

    await submission.save();

    res.status(200).json({
      success: true,
      message: "Marks updated successfully",
      submission,
    });
  } catch (error) {
    console.error("Error updating marks:", error);
    res.status(500).json({ error: "Server error" });
  }
};

export const getSubmissionPDF = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const submission = await AssignmentSubmission.findById(submissionId);

    if (!submission || !submission.pdfFileId) {
       return res.status(404).json({ error: "Submission or PDF not found" });
    }

    const bucket = getBucket();
    const downloadStream = bucket.openDownloadStream(submission.pdfFileId);

    res.set("Content-Type", "application/pdf");
    res.set("Content-Disposition", `inline; filename="${submission.pdfFileName}"`);

    downloadStream.pipe(res);

    downloadStream.on("error", (err) => {
      console.error("Error streaming PDF:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: "Error streaming PDF" });
      }
    });

  } catch (error) {
    console.error("Error fetching submission PDF:", error);
    res.status(500).json({ error: "Server error" });
  }
};
