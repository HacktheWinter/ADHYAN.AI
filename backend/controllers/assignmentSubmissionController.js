import AssignmentSubmission from "../models/AssignmentSubmission.js";
import Assignment from "../models/Assignment.js";
import User from "../models/User.js";
import { checkAssignmentWithAI } from "../config/geminiAssignment.js";

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

    // 🔹 BATCH SIZE = 1 (Process submissions one by one)
    const BATCH_SIZE = 1;
    const DELAY = 2000; // 2 seconds delay between submissions

    for (let i = 0; i < submissions.length; i += BATCH_SIZE) {
      const batch = submissions.slice(i, i + BATCH_SIZE);

      console.log(`\n Processing submission ${i + 1}/${submissions.length}`);

      for (const submission of batch) {
        try {
          console.log(`Checking submission for: ${submission.studentName}`);

          const studentAnswers = submission.answers.map((ans) => ({
            questionId: ans.questionId,
            studentAnswer: ans.studentAnswer,
          }));

          // Call AI checking (which itself processes one by one)
          let aiResults;
          let retries = 3;

          while (retries > 0) {
            try {
              aiResults = await checkAssignmentWithAI(
                answerKeys,
                studentAnswers
              );
              break;
            } catch (error) {
              retries--;
              console.error(`Retry ${3 - retries}/3 failed:`, error.message);
              if (retries === 0) throw error;
              await new Promise((resolve) => setTimeout(resolve, 2000)); // 2s retry delay
            }
          }

          let totalMarksObtained = 0;

          submission.answers = submission.answers.map((ans) => {
            const aiResult = aiResults.find(
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

          await submission.save();
          checkedCount++;

          console.log(
            `Checked successfully - Marks: ${totalMarksObtained}/${submission.totalMarks}`
          );
        } catch (error) {
          failedCount++;
          console.error(` Failed to check submission:`, error.message);
        }
      }

      // Delay between submissions
      if (i + BATCH_SIZE < submissions.length) {
        console.log(`Waiting ${DELAY / 1000}s before next submission...`);
        await new Promise((resolve) => setTimeout(resolve, DELAY));
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
