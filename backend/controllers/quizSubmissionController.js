// Backend/controllers/quizSubmissionController.js
import QuizSubmission from "../models/QuizSubmission.js";
import Quiz from "../models/Quiz.js";
import { executeCode } from "../services/geminiCodeExecutionService.js";
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
    .populate("studentId", "name email profilePhoto erpId")
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
    const { quizId, studentId: requestedStudentId, answers, sectionTimers } = req.body;
    const studentId = getRequestUserId(req);

    console.log(" Quiz submission received:", {
      quizId,
      studentId,
      answersCount: answers?.length,
    });

    if (!quizId || !answers || !Array.isArray(answers)) {
      return res.status(400).json({
        error: "quizId and answers array are required",
      });
    }

    ensureUserMatchesId(requestedStudentId, studentId, "You can only submit quizzes for your own account.");

    const quiz = await getAuthorizedQuizForStudent(req, quizId);
    const student = req.user;

    let existingSubmission = await QuizSubmission.findOne({ quizId, studentId });
    
    if (existingSubmission && !existingSubmission.isDraft) {
      return res.status(400).json({ error: "Quiz already submitted", submission: existingSubmission });
    }

    const now = new Date();
    if (quiz.startTime && now < new Date(quiz.startTime)) {
      return res.status(403).json({ error: "Quiz has not started yet." });
    }

    if (quiz.endTime) {
      const endTime = new Date(quiz.endTime);
      endTime.setMinutes(endTime.getMinutes() + 2);
      if (now > endTime) {
        return res.status(403).json({ error: "Quiz time has expired." });
      }
    }

    // Build flat list of questions across all sections (or default questions)
    const allQuestions = quiz.sections?.length > 0 
      ? quiz.sections.flatMap(s => s.questions) 
      : quiz.questions;

    let totalScore = 0;
    let totalMaxMarks = 0;

    // Grade answers
    const gradedAnswers = await Promise.all(answers.map(async (studentAnswer) => {
      const question = allQuestions.find(q => q._id.toString() === studentAnswer.questionId);

      if (!question) {
        return {
          questionId: studentAnswer.questionId,
          type: studentAnswer.type || "mcq",
          selectedAnswer: studentAnswer.selectedAnswer || "",
          correctAnswer: "N/A",
          isCorrect: false,
          marksAwarded: 0
        };
      }

      totalMaxMarks += question.marks || quiz.marksPerQuestion || 1;

      if (question.type === "coding") {
        // Evaluate coding question
        const code = studentAnswer.code || "";
        const language = studentAnswer.language || "";
        let marksAwarded = 0;
        let testResults = { passed: 0, total: 0, details: [] };

        if (code && language && question.coding?.hiddenTestCases?.length > 0) {
          try {
            const results = await executeCode(
              language, 
              code, 
              question.coding.hiddenTestCases, 
              {
                title: question.coding?.title,
                description: question.coding?.description,
                constraints: question.coding?.constraints
              }
            );
            
            const passedCount = results.filter(r => r.passed).length;
            const totalCount = results.length;
            
            testResults = { passed: passedCount, total: totalCount, details: results };
            
            // Calculate proportional marks
            marksAwarded = (passedCount / totalCount) * (question.marks || quiz.marksPerQuestion || 1);
            totalScore += marksAwarded;
          } catch (err) {
            console.error("Failed to grade coding question:", err);
          }
        }

        return {
          questionId: studentAnswer.questionId,
          type: "coding",
          code,
          language,
          testResults,
          marksAwarded
        };
      } else {
        // MCQ grading
        const selectedAnswer = studentAnswer.selectedAnswer || "";
        const isCorrect = selectedAnswer !== "" && selectedAnswer === question.correctAnswer;
        const marksAwarded = isCorrect ? (question.marks || quiz.marksPerQuestion || 1) : 0;
        
        if (isCorrect) totalScore += marksAwarded;

        return {
          questionId: studentAnswer.questionId,
          type: "mcq",
          selectedAnswer: selectedAnswer,
          correctAnswer: question.correctAnswer,
          isCorrect,
          marksAwarded
        };
      }
    }));

    const totalQuestions = allQuestions.length;
    const percentage = totalMaxMarks > 0 ? ((totalScore / totalMaxMarks) * 100).toFixed(2) : 0;

    let submission;
    if (existingSubmission) {
      existingSubmission.answers = gradedAnswers;
      existingSubmission.score = totalScore;
      existingSubmission.percentage = parseFloat(percentage);
      existingSubmission.submittedAt = new Date();
      existingSubmission.isDraft = false;
      if (sectionTimers) existingSubmission.sectionTimers = sectionTimers;
      submission = await existingSubmission.save();
    } else {
      submission = await QuizSubmission.create({
        quizId,
        studentId,
        studentName: student.name,
        answers: gradedAnswers,
        sectionTimers: sectionTimers || [],
        score: totalScore,
        totalQuestions,
        percentage: parseFloat(percentage),
        submittedAt: new Date(),
        isDraft: false,
      });
    }

    res.status(201).json({
      success: true,
      message: "Quiz submitted and graded successfully",
      submission: {
        _id: submission._id,
        score: totalScore,
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
    const { quizId, studentId: requestedStudentId, answers, sectionTimers } = req.body;
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

    const allQuestions = quiz.sections?.length > 0 
      ? quiz.sections.flatMap(s => s.questions) 
      : quiz.questions;

    let totalScore = 0;
    let totalMaxMarks = 0;

    const gradedAnswers = answers.map((studentAnswer) => {
      const question = allQuestions.find(q => q._id.toString() === studentAnswer.questionId);
      if (!question) {
        return {
          questionId: studentAnswer.questionId,
          type: studentAnswer.type || "mcq",
          selectedAnswer: studentAnswer.selectedAnswer || "",
          correctAnswer: "N/A",
          isCorrect: false,
          marksAwarded: 0
        };
      }

      totalMaxMarks += question.marks || quiz.marksPerQuestion || 1;

      if (question.type === "coding") {
        return {
          questionId: studentAnswer.questionId,
          type: "coding",
          code: studentAnswer.code || "",
          language: studentAnswer.language || "",
          marksAwarded: 0 // Do not execute piston on autosave
        };
      } else {
        const selectedAnswer = studentAnswer.selectedAnswer || "";
        const isCorrect = selectedAnswer !== "" && selectedAnswer === question.correctAnswer;
        const marksAwarded = isCorrect ? (question.marks || quiz.marksPerQuestion || 1) : 0;
        
        if (isCorrect) totalScore += marksAwarded;

        return {
          questionId: studentAnswer.questionId,
          type: "mcq",
          selectedAnswer,
          correctAnswer: question.correctAnswer,
          isCorrect,
          marksAwarded
        };
      }
    });

    const totalQuestions = allQuestions.length;
    const percentage = totalMaxMarks > 0 ? ((totalScore / totalMaxMarks) * 100).toFixed(2) : 0;

    if (existingSubmission) {
      existingSubmission.answers = gradedAnswers;
      existingSubmission.score = totalScore;
      existingSubmission.percentage = parseFloat(percentage);
      existingSubmission.submittedAt = new Date();
      existingSubmission.isDraft = true;
      if (sectionTimers) existingSubmission.sectionTimers = sectionTimers;
      await existingSubmission.save();
    } else {
      await QuizSubmission.create({
        quizId,
        studentId,
        studentName: student.name,
        answers: gradedAnswers,
        sectionTimers: sectionTimers || [],
        score: totalScore,
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
      .populate("studentId", "name email profilePhoto erpId")
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
      .populate("studentId", "name email profilePhoto erpId")
      .populate("quizId", "title questions sections classroomId");
      
    if (!updatedSubmission) {
      return res.status(404).json({ error: "Final submission not found" });
    }

    res.status(200).json({ submission: updatedSubmission });
  } catch (error) {
    console.error("Error fetching submission:", error);
    res.status(error.statusCode || 500).json({ error: error.message || "Server error" });
  }
};

/**
 * Run code against public test cases or custom input
 * POST /api/quiz-submission/run-code
 */
export const runCode = async (req, res) => {
  try {
    const { quizId, questionId, code, language, customInput } = req.body;
    
    if (!code || !language) {
      return res.status(400).json({ error: "Code and language are required" });
    }

    const quiz = await getAuthorizedQuizForStudent(req, quizId);
    
    const allQuestions = quiz.sections?.length > 0 
      ? quiz.sections.flatMap(s => s.questions) 
      : quiz.questions;
      
    const question = allQuestions.find(q => q._id.toString() === questionId);
    
    if (!question || question.type !== "coding") {
      return res.status(404).json({ error: "Coding question not found" });
    }

    // Run against custom input OR public test cases
    let testCases = [];
    if (customInput !== undefined && customInput !== null) {
      testCases = [{ input: customInput, expectedOutput: "" }];
    } else {
      testCases = question.coding.publicTestCases || [];
      if (testCases.length === 0) {
        return res.status(400).json({ error: "No public test cases available to run." });
      }
    }

    const results = await executeCode(
      language,
      code,
      testCases,
      {
        title: question.coding?.title,
        description: question.coding?.description,
        constraints: question.coding?.constraints
      }
    );

    res.status(200).json({ success: true, results });
  } catch (error) {
    console.error("Run code error:", error);
    res.status(error.statusCode || 500).json({ error: error.message || "Failed to execute code" });
  }
};
