// Backend/controllers/testSubmissionController.js
import TestSubmission from "../models/TestSubmission.js";
import TestPaper from "../models/TestPaper.js";
import User from "../models/User.js";
import { checkAnswersWithAI } from "../config/geminiTestPaper.js";

/**
 * Submit test answers (without grading)
 * POST /api/test-submission/submit
 */
export const submitTest = async (req, res) => {
  try {
    const { testPaperId, studentId, answers } = req.body;

    console.log("Test submission received:", { testPaperId, studentId });

    if (!testPaperId || !studentId || !answers || !Array.isArray(answers)) {
      return res.status(400).json({
        error: "testPaperId, studentId, and answers array are required",
      });
    }

    const testPaper = await TestPaper.findById(testPaperId);
    if (!testPaper) {
      return res.status(404).json({ error: "Test paper not found" });
    }

    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    // Check if already submitted
    const existingSubmission = await TestSubmission.findOne({
      testPaperId,
      studentId,
    });
    if (existingSubmission) {
      return res.status(400).json({
        error: "Test already submitted",
        submission: existingSubmission,
      });
    }

    // Check test timing
    if (testPaper.endTime && new Date() > new Date(testPaper.endTime)) {
      return res.status(400).json({ error: "Test time has expired" });
    }

    // Add question details to answers
    const submissionAnswers = answers.map((studentAnswer) => {
      const question = testPaper.questions.find(
        (q) => q._id.toString() === studentAnswer.questionId
      );

      if (!question) {
        throw new Error(`Question not found: ${studentAnswer.questionId}`);
      }

      return {
        questionId: studentAnswer.questionId,
        question: question.question,
        studentAnswer: studentAnswer.answer,
        answerKey: question.answerKey,
        marks: question.marks,
        marksAwarded: 0,
        checkedBy: "pending",
      };
    });

    const submission = await TestSubmission.create({
      testPaperId,
      studentId,
      studentName: student.name,
      answers: submissionAnswers,
      totalMarks: testPaper.totalMarks,
      marksObtained: 0,
      percentage: 0,
      status: "pending",
      isResultPublished: false,
    });

    console.log("Test submitted (pending checking)");

    res.status(201).json({
      success: true,
      message: "Test submitted successfully. Awaiting results.",
      submission: {
        _id: submission._id,
        status: "pending",
        submittedAt: submission.submittedAt,
      },
    });
  } catch (error) {
    console.error("Test submission error:", error);
    res.status(500).json({
      error: "Failed to submit test",
      details: error.message,
    });
  }
};

/**
 *  OPTIMIZED: Check test with AI - BATCH SIZE 2 with SHORT feedback
 * POST /api/test-submission/check-with-ai/:testPaperId
 */
export const checkTestWithAI = async (req, res) => {
  try {
    const { testPaperId } = req.params;

    console.log("Starting AI checking for test:", testPaperId);

    const testPaper = await TestPaper.findById(testPaperId);
    if (!testPaper) {
      return res.status(404).json({ error: "Test paper not found" });
    }

    const submissions = await TestSubmission.find({
      testPaperId,
      status: "pending",
    });

    if (submissions.length === 0) {
      return res.status(404).json({ error: "No pending submissions found" });
    }

    console.log(` Found ${submissions.length} pending submissions`);

    const answerKeys = testPaper.questions.map((q) => ({
      questionId: q._id.toString(),
      question: q.question,
      answerKey: q.answerKey,
      answerGuidelines: q.answerGuidelines,
      marks: q.marks,
    }));

    let checkedCount = 0;
    let failedCount = 0;

    //  BATCH SIZE: 1 student per API call (Most Reliable)
    const BATCH_SIZE = 1;
    const DELAY_BETWEEN_BATCHES = 1500; // 1.5 seconds

    const totalBatches = Math.ceil(submissions.length / BATCH_SIZE);

    console.log(`\n Processing Plan:`);
    console.log(`   Total Students: ${submissions.length}`);
    console.log(`   Batch Size: ${BATCH_SIZE} student per API call (safest)`);
    console.log(`   Total API Calls: ${totalBatches}`);
    console.log(
      `   Estimated Time: ~${Math.ceil((totalBatches * 1.5) / 60)} minutes\n`
    );

    // Process in batches of 2
    for (let i = 0; i < submissions.length; i += BATCH_SIZE) {
      const batch = submissions.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;

      console.log(`\n API Call ${batchNumber}/${totalBatches}`);
      console.log(`   Processing student ${i + 1} of ${submissions.length}`);
      console.log(`   Student: ${batch[0].studentName}`);

      // Collect all answers from this batch for a SINGLE AI call
      const batchStudentAnswers = batch.map((submission) => ({
        submissionId: submission._id.toString(),
        studentName: submission.studentName,
        answers: submission.answers.map((ans) => ({
          questionId: ans.questionId,
          studentAnswer: ans.studentAnswer,
        })),
      }));

      try {
        //  SINGLE AI CALL FOR 1 STUDENT (100% reliable)
        console.log(`Sending API call for ${batch[0].studentName}...`);

        const aiResults = await checkAnswersWithAI(
          answerKeys,
          batchStudentAnswers
        );

        console.log(`Received result for ${batch[0].studentName}`);

        // Update each submission in the batch
        for (const submission of batch) {
          try {
            const submissionResult = aiResults.find(
              (r) => r.submissionId === submission._id.toString()
            );

            if (!submissionResult) {
              console.log(`No result found for ${submission.studentName}`);
              failedCount++;
              continue;
            }

            let totalMarksObtained = 0;

            submission.answers = submission.answers.map((ans) => {
              const aiResult = submissionResult.checkedAnswers.find(
                (r) => r.questionId === ans.questionId
              );

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
            submission.percentage = parseFloat(
              ((totalMarksObtained / submission.totalMarks) * 100).toFixed(2)
            );
            submission.status = "checked";
            submission.checkedAt = new Date();
            submission.isResultPublished = false;

            await submission.save();
            checkedCount++;

            console.log(
              `${submission.studentName}: ${totalMarksObtained}/${submission.totalMarks} (${submission.percentage}%)`
            );
          } catch (error) {
            console.error(
              `Error processing ${submission.studentName}:`,
              error.message
            );
            failedCount++;
          }
        }
      } catch (error) {
        console.error(
          `API call failed for batch ${batchNumber}:`,
          error.message
        );
        failedCount += batch.length;

        console.log(`Continuing to next batch...`);
      }

      // Delay between batches (except for last batch)
      if (i + BATCH_SIZE < submissions.length) {
        console.log(
          `Waiting ${DELAY_BETWEEN_BATCHES / 1000}s before next API call...`
        );
        await new Promise((resolve) =>
          setTimeout(resolve, DELAY_BETWEEN_BATCHES)
        );
      }
    }

    console.log(`\n AI checking completed:`);
    console.log(
      `   Successfully checked: ${checkedCount}/${submissions.length}`
    );
    console.log(`   Failed: ${failedCount}/${submissions.length}`);
    console.log(`   Total API Calls Made: ${totalBatches}`);

    res.status(200).json({
      success: true,
      message: `Checked ${checkedCount} submissions using AI${
        failedCount > 0 ? ` (${failedCount} failed)` : ""
      }`,
      checkedCount,
      failedCount,
      totalSubmissions: submissions.length,
      totalApiCalls: totalBatches,
      batchSize: BATCH_SIZE,
    });
  } catch (error) {
    console.error("AI checking error:", error);
    res.status(500).json({
      error: "Failed to check with AI",
      details: error.message,
    });
  }
};

/**
 * Publish results to students
 * POST /api/test-submission/publish-results/:testPaperId
 */
export const publishResults = async (req, res) => {
  try {
    const { testPaperId } = req.params;

    const result = await TestSubmission.updateMany(
      { testPaperId, status: "checked" },
      { $set: { isResultPublished: true } }
    );

    console.log("Results published:", result.modifiedCount);

    res.status(200).json({
      success: true,
      message: `Published results for ${result.modifiedCount} students`,
      count: result.modifiedCount,
    });
  } catch (error) {
    console.error("Error publishing results:", error);
    res.status(500).json({ error: "Server error" });
  }
};

/**
 * Get student's test result (only if published)
 * GET /api/test-submission/result/:testPaperId/:studentId
 */
export const getTestResult = async (req, res) => {
  try {
    const { testPaperId, studentId } = req.params;

    const submission = await TestSubmission.findOne({
      testPaperId,
      studentId,
    }).populate("testPaperId", "title totalMarks");

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

/**
 * Get single submission by ID
 * GET /api/test-submission/submission/:submissionId
 */
export const getSubmissionById = async (req, res) => {
  try {
    const { submissionId } = req.params;

    const submission = await TestSubmission.findById(submissionId)
      .populate("testPaperId", "title totalMarks questions")
      .populate("studentId", "name email");

    if (!submission) {
      return res.status(404).json({ error: "Submission not found" });
    }

    res.status(200).json({
      success: true,
      submission,
    });
  } catch (error) {
    console.error("Error fetching submission:", error);
    res.status(500).json({ error: "Server error" });
  }
};

/**
 * Check if student has submitted test
 * GET /api/test-submission/check/:testPaperId/:studentId
 */
export const checkSubmission = async (req, res) => {
  try {
    const { testPaperId, studentId } = req.params;

    const submission = await TestSubmission.findOne({
      testPaperId,
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

/**
 * Get all submissions for teacher
 * GET /api/test-submission/test/:testPaperId
 */
export const getTestSubmissions = async (req, res) => {
  try {
    const { testPaperId } = req.params;

    const submissions = await TestSubmission.find({ testPaperId })
      .populate("studentId", "name email")
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

/**
 * Update marks manually by teacher
 * PUT /api/test-submission/update-marks/:submissionId
 */
export const updateMarksManually = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { answers } = req.body;

    const submission = await TestSubmission.findById(submissionId);
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
