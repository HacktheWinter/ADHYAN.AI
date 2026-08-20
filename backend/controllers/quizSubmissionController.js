// Backend/controllers/quizSubmissionController.js
import QuizSubmission from "../models/QuizSubmission.js";
import Quiz from "../models/Quiz.js";
import {
  createHttpError,
  ensureUserMatchesId,
  getAuthorizedClassroomForStudent,
  getAuthorizedClassroomForTeacher,
  getRequestUserId,
} from "../utils/accessControl.js";

const getAuthorizedQuizForStudent = async (req, quizId) => {
  const quiz = await Quiz.findById(quizId);

  if (!quiz) {
    throw createHttpError(404, "Quiz not found");
  }

  await getAuthorizedClassroomForStudent(req, quiz.classroomId);
  return quiz;
};

const getAuthorizedQuizForTeacher = async (req, quizId) => {
  const quiz = await Quiz.findById(quizId);

  if (!quiz) {
    throw createHttpError(404, "Quiz not found");
  }

  await getAuthorizedClassroomForTeacher(req, quiz.classroomId);
  return quiz;
};

const getAuthorizedQuizSubmissionForTeacher = async (req, submissionId) => {
  const submission = await QuizSubmission.findById(submissionId)
    .populate("studentId", "name email profilePhoto")
    .populate("quizId", "title questions classroomId");

  if (!submission) {
    throw createHttpError(404, "Submission not found");
  }

  await getAuthorizedClassroomForTeacher(req, submission.quizId.classroomId);
  return submission;
};

const finalizeExpiredDrafts = async (quizId) => {
  try {
    const quiz = await Quiz.findById(quizId);
    if (!quiz) return;
    
    if (quiz.endTime && new Date() > new Date(quiz.endTime)) {
      await QuizSubmission.updateMany(
        { quizId, isDraft: true },
        { $set: { isDraft: false, submittedAt: new Date() } }
      );
    } else if (quiz.duration) {
      const durationMs = quiz.duration * 60 * 1000;
      const gracePeriodMs = 2 * 60 * 1000;
      const now = new Date();
      
      const drafts = await QuizSubmission.find({ quizId, isDraft: true });
      for (const draft of drafts) {
        if (draft.createdAt && (now.getTime() - draft.createdAt.getTime() > durationMs + gracePeriodMs)) {
          draft.isDraft = false;
          draft.submittedAt = new Date();
          await draft.save();
        }
      }
    }
  } catch (error) {
    console.error("Error finalizing expired drafts:", error);
  }
};

/**
 * Submit quiz answers and auto-grade
 * POST /api/quiz-submission/submit
 */
export const submitQuiz = async (req, res) => {
  try {
    const { quizId, studentId: requestedStudentId, answers } = req.body;
    const studentId = getRequestUserId(req);

    console.log(" Quiz submission received:", {
      quizId,
      studentId,
      answersCount: answers?.length,
    });

    // Validation
    if (!quizId || !answers || !Array.isArray(answers)) {
      return res.status(400).json({
        error: "quizId and answers array are required",
      });
    }

    ensureUserMatchesId(
      requestedStudentId,
      studentId,
      "You can only submit quizzes for your own account."
    );

    const quiz = await getAuthorizedQuizForStudent(req, quizId);
    const student = req.user;

    // Check if already submitted (and not a draft)
    let existingSubmission = await QuizSubmission.findOne({
      quizId,
      studentId,
    });
    
    if (existingSubmission && !existingSubmission.isDraft) {
      return res.status(400).json({
        error: "Quiz already submitted",
        submission: existingSubmission,
      });
    }

    const now = new Date();
    
    if (quiz.startTime && now < new Date(quiz.startTime)) {
      return res.status(403).json({ error: "Quiz has not started yet." });
    }

    if (quiz.endTime) {
      const endTime = new Date(quiz.endTime);
      // Give a 2-minute grace period for network latency on auto-submit
      endTime.setMinutes(endTime.getMinutes() + 2);
      
      if (now > endTime) {
        return res.status(403).json({ error: "Quiz time has expired. Submissions are no longer accepted." });
      }
    }

    // Auto-grade answers (handle unanswered questions)
    let correctCount = 0;
    const gradedAnswers = answers.map((studentAnswer) => {
      const question = quiz.questions.find(
        (q) => q._id.toString() === studentAnswer.questionId
      );

      if (!question) {
        console.warn(` Question not found: ${studentAnswer.questionId}`);
        return {
          questionId: studentAnswer.questionId,
          selectedAnswer: studentAnswer.selectedAnswer || "",
          correctAnswer: "N/A",
          isCorrect: false,
        };
      }

      // Handle empty/unanswered questions (selectedAnswer can be empty string)
      const selectedAnswer = studentAnswer.selectedAnswer || "";
      const isCorrect =
        selectedAnswer !== "" && selectedAnswer === question.correctAnswer;

      if (isCorrect) correctCount++;

      return {
        questionId: studentAnswer.questionId,
        selectedAnswer: selectedAnswer,
        correctAnswer: question.correctAnswer,
        isCorrect,
      };
    });

    const totalQuestions = quiz.questions.length;
    const percentage =
      totalQuestions > 0
        ? ((correctCount / totalQuestions) * 100).toFixed(2)
        : 0;

    // Save or update submission
    let submission;
    if (existingSubmission) {
      existingSubmission.answers = gradedAnswers;
      existingSubmission.score = correctCount;
      existingSubmission.percentage = parseFloat(percentage);
      existingSubmission.submittedAt = new Date();
      existingSubmission.isDraft = false;
      submission = await existingSubmission.save();
    } else {
      submission = await QuizSubmission.create({
        quizId,
        studentId,
        studentName: student.name,
        answers: gradedAnswers,
        score: correctCount,
        totalQuestions,
        percentage: parseFloat(percentage),
        submittedAt: new Date(),
        isDraft: false,
      });
    }

    console.log("Quiz graded and saved:", {
      score: `${correctCount}/${totalQuestions}`,
      percentage: `${percentage}%`,
      answeredCount: answers.filter(
        (a) => a.selectedAnswer && a.selectedAnswer !== ""
      ).length,
    });

    res.status(201).json({
      success: true,
      message: "Quiz submitted and graded successfully",
      submission: {
        _id: submission._id,
        score: correctCount,
        totalQuestions,
        percentage: parseFloat(percentage),
        submittedAt: submission.submittedAt,
      },
    });
  } catch (error) {
    console.error("Quiz submission error:", error);
    res.status(error.statusCode || 500).json({
      error: error.statusCode ? error.message : "Failed to submit quiz",
      details: error.statusCode ? undefined : error.message,
    });
  }
};

/**
 * Autosave quiz answers (Draft)
 * POST /api/quiz-submission/autosave
 */
export const autosaveQuiz = async (req, res) => {
  try {
    const { quizId, studentId: requestedStudentId, answers } = req.body;
    const studentId = getRequestUserId(req);

    if (!quizId || !answers || !Array.isArray(answers)) {
      return res.status(400).json({ error: "quizId and answers array are required" });
    }

    ensureUserMatchesId(requestedStudentId, studentId, "You can only save your own quizzes.");

    const quiz = await getAuthorizedQuizForStudent(req, quizId);
    const student = req.user;

    const existingSubmission = await QuizSubmission.findOne({ quizId, studentId });
    if (existingSubmission && !existingSubmission.isDraft) {
      return res.status(400).json({ error: "Quiz already submitted" });
    }

    const now = new Date();
    if (quiz.startTime && now < new Date(quiz.startTime)) {
      return res.status(403).json({ error: "Quiz has not started yet." });
    }
    if (quiz.endTime && now > new Date(quiz.endTime)) {
      return res.status(403).json({ error: "Quiz time has expired." });
    }

    let correctCount = 0;
    const gradedAnswers = answers.map((studentAnswer) => {
      const question = quiz.questions.find((q) => q._id.toString() === studentAnswer.questionId);
      if (!question) {
        return {
          questionId: studentAnswer.questionId,
          selectedAnswer: studentAnswer.selectedAnswer || "",
          correctAnswer: "N/A",
          isCorrect: false,
        };
      }
      const selectedAnswer = studentAnswer.selectedAnswer || "";
      const isCorrect = selectedAnswer !== "" && selectedAnswer === question.correctAnswer;
      if (isCorrect) correctCount++;
      return {
        questionId: studentAnswer.questionId,
        selectedAnswer: selectedAnswer,
        correctAnswer: question.correctAnswer,
        isCorrect,
      };
    });

    const totalQuestions = quiz.questions.length;
    const percentage = totalQuestions > 0 ? ((correctCount / totalQuestions) * 100).toFixed(2) : 0;

    if (existingSubmission) {
      existingSubmission.answers = gradedAnswers;
      existingSubmission.score = correctCount;
      existingSubmission.percentage = parseFloat(percentage);
      existingSubmission.submittedAt = new Date();
      existingSubmission.isDraft = true;
      await existingSubmission.save();
    } else {
      await QuizSubmission.create({
        quizId,
        studentId,
        studentName: student.name,
        answers: gradedAnswers,
        score: correctCount,
        totalQuestions,
        percentage: parseFloat(percentage),
        submittedAt: new Date(),
        isDraft: true,
      });
    }

    res.status(200).json({ success: true, message: "Draft saved successfully" });
  } catch (error) {
    console.error("Autosave error:", error);
    res.status(error.statusCode || 500).json({ error: "Failed to autosave quiz" });
  }
};

/**
 * Get student's quiz result
 * GET /api/quiz-submission/result/:quizId/:studentId
 */
export const getQuizResult = async (req, res) => {
  try {
    const { quizId, studentId: requestedStudentId } = req.params;
    const studentId = getRequestUserId(req);

    ensureUserMatchesId(
      requestedStudentId,
      studentId,
      "You can only access your own quiz results."
    );

    const quiz = await getAuthorizedQuizForStudent(req, quizId);
    
    await finalizeExpiredDrafts(quizId);

    const submission = await QuizSubmission.findOne({
      quizId,
      studentId,
      isDraft: false
    }).populate("quizId", "title questions resultsPublished");

    if (!submission) {
      return res.status(404).json({ error: "No submission found" });
    }

    if (!quiz.resultsPublished) {
      return res.status(403).json({
        error: "Results are pending",
        message: "Your results will be available once the teacher publishes them.",
        resultsPublished: false,
      });
    }

    res.status(200).json({
      success: true,
      submission,
      resultsPublished: true,
    });
  } catch (error) {
    console.error("Error fetching result:", error);
    res.status(error.statusCode || 500).json({ error: error.message || "Server error" });
  }
};

/**
 * Check if student has submitted quiz
 * GET /api/quiz-submission/check/:quizId/:studentId
 */
export const checkSubmission = async (req, res) => {
  try {
    const { quizId, studentId: requestedStudentId } = req.params;
    const studentId = getRequestUserId(req);

    ensureUserMatchesId(
      requestedStudentId,
      studentId,
      "You can only check submissions for your own account."
    );

    const quiz = await getAuthorizedQuizForStudent(req, quizId);

    await finalizeExpiredDrafts(quizId);

    const submission = await QuizSubmission.findOne({ quizId, studentId, isDraft: false });

    res.status(200).json({
      hasSubmitted: !!submission,
      submissionId: submission?._id || null,
      resultsPublished: quiz.resultsPublished || false,
    });
  } catch (error) {
    console.error("Error checking submission:", error);
    res.status(error.statusCode || 500).json({ error: error.message || "Server error" });
  }
};

/**
 * Get all submissions for a quiz (Teacher view)
 * GET /api/quiz-submission/quiz/:quizId
 */
export const getQuizSubmissions = async (req, res) => {
  try {
    const { quizId } = req.params;
    await getAuthorizedQuizForTeacher(req, quizId);
    
    await finalizeExpiredDrafts(quizId);

    const submissions = await QuizSubmission.find({ quizId, isDraft: false })
      .populate("studentId", "name email profilePhoto")
      .populate("quizId", "title questions status classroomId")
      .sort({ submittedAt: -1 });

    res.status(200).json({
      success: true,
      count: submissions.length,
      submissions,
    });
  } catch (error) {
    console.error("Error fetching submissions:", error);
    res.status(error.statusCode || 500).json({ error: error.message || "Server error" });
  }
};
export const getSubmissionById = async (req, res) => {
  try {
    const { submissionId } = req.params;

    const submission = await getAuthorizedQuizSubmissionForTeacher(req, submissionId);
    
    await finalizeExpiredDrafts(submission.quizId._id);
    
    // Check again in case it was a draft and we finalized it
    const updatedSubmission = await QuizSubmission.findOne({ _id: submissionId, isDraft: false })
      .populate("studentId", "name email profilePhoto")
      .populate("quizId", "title questions classroomId");
      
    if (!updatedSubmission) {
      return res.status(404).json({ error: "Final submission not found" });
    }

    res.status(200).json({ submission: updatedSubmission });
  } catch (error) {
    console.error("Error fetching submission:", error);
    res.status(error.statusCode || 500).json({ error: error.message || "Server error" });
  }
};
