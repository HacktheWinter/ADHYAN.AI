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

    // Check if already submitted
    const existingSubmission = await QuizSubmission.findOne({
      quizId,
      studentId,
    });
    if (existingSubmission) {
      return res.status(400).json({
        error: "Quiz already submitted",
        submission: existingSubmission,
      });
    }

    // REMOVED: Time expiry check - allow submission anytime
    // Students can submit even after deadline (for partial/auto-submit cases)

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

    // Save submission
    const submission = await QuizSubmission.create({
      quizId,
      studentId,
      studentName: student.name,
      answers: gradedAnswers,
      score: correctCount,
      totalQuestions,
      percentage: parseFloat(percentage),
      submittedAt: new Date(),
    });

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

    await getAuthorizedQuizForStudent(req, quizId);

    const submission = await QuizSubmission.findOne({
      quizId,
      studentId,
    }).populate("quizId", "title questions");

    if (!submission) {
      return res.status(404).json({ error: "No submission found" });
    }

    res.status(200).json({
      success: true,
      submission,
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

    await getAuthorizedQuizForStudent(req, quizId);

    const submission = await QuizSubmission.findOne({ quizId, studentId });

    res.status(200).json({
      hasSubmitted: !!submission,
      submissionId: submission?._id || null,
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

    const submissions = await QuizSubmission.find({ quizId })
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

    res.status(200).json({ submission });
  } catch (error) {
    console.error("Error fetching submission:", error);
    res.status(error.statusCode || 500).json({ error: error.message || "Server error" });
  }
};
