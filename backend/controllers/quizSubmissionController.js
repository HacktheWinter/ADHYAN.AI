// Backend/controllers/quizSubmissionController.js
import QuizSubmission from "../models/QuizSubmission.js";
import Quiz from "../models/Quiz.js";
import { executeCode } from "../services/codeExecution.service.js";
import {
  createHttpError,
  ensureUserMatchesId,
  getAuthorizedClassroomForStudent,
  getAuthorizedClassroomForTeacher,
  getRequestUserId,
} from "../utils/accessControl.js";

/**
 * Server-side heuristic to detect obvious language mismatches.
 * Returns { mismatch: true, detectedLanguage: '...' } if mismatch found, else { mismatch: false }.
 */
const detectLanguageMismatch = (selectedLanguage, code) => {
  if (!code || !selectedLanguage) return { mismatch: false };
  
  const trimmedCode = code.trim();
  const lang = selectedLanguage.toLowerCase();

  // Java indicators
  const javaIndicators = [
    /public\s+class\s+/,
    /System\.out\.print/,
    /import\s+java\./,
    /public\s+static\s+void\s+main/,
    /Scanner\s+\w+\s*=\s*new\s+Scanner/
  ];
  
  // C++ indicators  
  const cppIndicators = [
    /cout\s*<</,
    /cin\s*>>/,
    /using\s+namespace\s+std/,
    /#include\s*<\s*(iostream|vector|string|algorithm|map|set)/
  ];
  
  // C indicators
  const cIndicators = [
    /#include\s*<\s*stdio\.h\s*>/,
    /printf\s*\(/,
    /scanf\s*\(/
  ];
  
  // Python indicators
  const pythonIndicators = [
    /^def\s+\w+\s*\(/m,
    /^import\s+\w+/m,
    /^from\s+\w+\s+import/m,
    /print\s*\(/,
    /^class\s+\w+.*:/m
  ];
  
  // JavaScript indicators
  const jsIndicators = [
    /console\.log\s*\(/,
    /\bconst\s+\w+\s*=/,
    /\blet\s+\w+\s*=/,
    /\bvar\s+\w+\s*=/,
    /=>\s*[{(]/,
    /function\s+\w+\s*\(/,
    /require\s*\(/,
    /module\.exports/
  ];

  const matchCount = (indicators) => indicators.filter(re => re.test(trimmedCode)).length;

  const javaScore = matchCount(javaIndicators);
  const cppScore = matchCount(cppIndicators);
  const cScore = matchCount(cIndicators);
  const pythonScore = matchCount(pythonIndicators);
  const jsScore = matchCount(jsIndicators);

  // Determine which language the code most likely is
  const scores = [
    { lang: 'java', score: javaScore },
    { lang: 'cpp', score: cppScore },
    { lang: 'c', score: cScore },
    { lang: 'python', score: pythonScore },
    { lang: 'javascript', score: jsScore }
  ];

  const best = scores.reduce((a, b) => a.score > b.score ? a : b);
  
  // Only flag mismatch if we have strong confidence (2+ indicators match)
  if (best.score < 2) return { mismatch: false };
  
  // Normalize language names for comparison
  const normalizedSelected = lang === 'c++' ? 'cpp' : lang;
  
  // C and C++ share #include, so be lenient between them
  if ((normalizedSelected === 'c' && best.lang === 'cpp') || 
      (normalizedSelected === 'cpp' && best.lang === 'c')) {
    return { mismatch: false };
  }
  
  if (best.lang !== normalizedSelected) {
    const langNames = { java: 'Java', cpp: 'C++', c: 'C', python: 'Python', javascript: 'JavaScript' };
    return { mismatch: true, detectedLanguage: langNames[best.lang] || best.lang };
  }

  return { mismatch: false };
};

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

export const gradeAndSubmitDraft = async (draft, quiz) => {
  const allQuestions = quiz.sections?.length > 0 
    ? quiz.sections.flatMap(s => s.questions) 
    : quiz.questions;

  let totalScore = 0;
  let totalMaxMarks = 0;

  const gradedAnswers = await Promise.all(allQuestions.map(async (question) => {
    const questionMarks = question.marks || quiz.marksPerQuestion || 1;
    const studentAnswer = draft.answers.find(a => a.questionId === question._id.toString()) || {};

    totalMaxMarks += questionMarks;

    if (question.type === "coding") {
      const code = studentAnswer.code || "";
      const language = studentAnswer.language || "";
      let marksAwarded = 0;
      let testResults = { passed: 0, total: 0, details: [] };

      const codingTestCases = question.coding?.testCases?.length > 0 
        ? question.coding.testCases 
        : (question.coding?.hiddenTestCases?.length > 0 ? question.coding.hiddenTestCases : []);

      if (code && language && codingTestCases.length > 0) {
        const mismatchCheck = detectLanguageMismatch(language, code);
        if (mismatchCheck.mismatch) {
          const mismatchError = `Language Mismatch: You selected ${language} but your code appears to be written in ${mismatchCheck.detectedLanguage}. Please write your code in the selected language or change your language selection.`;
          testResults = {
            passed: 0,
            total: codingTestCases.length,
            details: codingTestCases.map(tc => ({
              input: tc.input || "",
              expectedOutput: tc.expectedOutput || "",
              actualOutput: "",
              compileOutput: mismatchError,
              runError: "",
              exitCode: 1,
              passed: false
            }))
          };
        } else {
          try {
            const questionObj = question.toObject ? question.toObject() : question;
            const results = await executeCode(language, code, codingTestCases, questionObj);
            const passedCount = results.filter(r => r.passed).length;
            const totalCount = results.length;
            testResults = { passed: passedCount, total: totalCount, details: results };
            marksAwarded = (passedCount / totalCount) * questionMarks;
            totalScore += marksAwarded;
          } catch (err) {
            console.error("Failed to grade coding question on auto-submit:", err);
          }
        }
      }

      return {
        questionId: question._id.toString(),
        type: "coding",
        code,
        language,
        testResults,
        marksAwarded
      };
    } else {
      const selectedAnswer = studentAnswer.selectedAnswer || "";
      const isCorrect = selectedAnswer !== "" && selectedAnswer === question.correctAnswer;
      const marksAwarded = isCorrect ? questionMarks : 0;
      if (isCorrect) totalScore += marksAwarded;

      return {
        questionId: question._id.toString(),
        type: "mcq",
        selectedAnswer,
        correctAnswer: question.correctAnswer,
        isCorrect,
        marksAwarded
      };
    }
  }));

  const percentage = totalMaxMarks > 0 ? ((totalScore / totalMaxMarks) * 100).toFixed(2) : 0;

  draft.answers = gradedAnswers;
  draft.score = totalScore;
  draft.totalMarks = totalMaxMarks;
  draft.percentage = parseFloat(percentage);
  draft.isDraft = false;
  draft.autoSubmitted = true;
  draft.submittedAt = new Date();
  await draft.save();
};

export const finalizeExpiredDrafts = async (quizId) => {
  try {
    const quiz = await Quiz.findById(quizId);
    if (!quiz) return;
    
    const now = new Date();
    const isEndTimePassed = quiz.endTime && now > new Date(quiz.endTime);
    const hasDuration = !!quiz.duration;
    const durationMs = quiz.duration ? quiz.duration * 60 * 1000 : 0;
    const gracePeriodMs = 2 * 60 * 1000;

    const drafts = await QuizSubmission.find({ quizId, isDraft: true });
    
    const draftsToGrade = drafts.filter(draft => {
      if (isEndTimePassed) return true;
      if (hasDuration && draft.createdAt && (now.getTime() - draft.createdAt.getTime() > durationMs + gracePeriodMs)) return true;
      return false;
    });

    if (draftsToGrade.length > 0) {
      await Promise.all(draftsToGrade.map(async (draft) => {
        try {
          await gradeAndSubmitDraft(draft, quiz);
        } catch (e) {
          console.error("Error auto-submitting draft", e);
        }
      }));
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
      endTime.setMinutes(endTime.getMinutes() + 5); // 5-min grace for auto-submit edge cases
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
    const gradedAnswers = await Promise.all(allQuestions.map(async (question) => {
      const questionMarks = question.marks || quiz.marksPerQuestion || 1;
      const studentAnswer = answers.find(a => a.questionId === question._id.toString()) || {};

      totalMaxMarks += questionMarks;

      if (question.type === "coding") {
        // Evaluate coding question
        const code = studentAnswer.code || "";
        const language = studentAnswer.language || "";
        let marksAwarded = 0;
        let testResults = { passed: 0, total: 0, details: [] };

        // Use unified testCases, fallback to hiddenTestCases for old quizzes
        const codingTestCases = question.coding?.testCases?.length > 0 
          ? question.coding.testCases 
          : (question.coding?.hiddenTestCases?.length > 0 ? question.coding.hiddenTestCases : []);

        if (code && language && codingTestCases.length > 0) {
          // Server-side language mismatch check
          const mismatchCheck = detectLanguageMismatch(language, code);
          if (mismatchCheck.mismatch) {
            const mismatchError = `Language Mismatch: You selected ${language} but your code appears to be written in ${mismatchCheck.detectedLanguage}. Please write your code in the selected language or change your language selection.`;
            testResults = {
              passed: 0,
              total: codingTestCases.length,
              details: codingTestCases.map(tc => ({
                input: tc.input || "",
                expectedOutput: tc.expectedOutput || "",
                actualOutput: "",
                compileOutput: mismatchError,
                runError: "",
                exitCode: 1,
                passed: false
              }))
            };
            // marksAwarded stays 0
          } else {
          try {
            const questionObj = question.toObject ? question.toObject() : question;
            const results = await executeCode(
              language, 
              code, 
              codingTestCases, 
              questionObj
            );
            
            const passedCount = results.filter(r => r.passed).length;
            const totalCount = results.length;
            
            testResults = { passed: passedCount, total: totalCount, details: results };
            
            // Calculate proportional marks: (passed/total) * questionMarks
            marksAwarded = (passedCount / totalCount) * questionMarks;
            totalScore += marksAwarded;
          } catch (err) {
            console.error("Failed to grade coding question:", err);
          }
          } // closes the else block from mismatch check
        }

        return {
          questionId: question._id.toString(),
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
        const marksAwarded = isCorrect ? questionMarks : 0;
        
        if (isCorrect) totalScore += marksAwarded;

        return {
          questionId: question._id.toString(),
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
      submission = await QuizSubmission.findOneAndUpdate(
        { _id: existingSubmission._id },
        {
          $set: {
            answers: gradedAnswers,
            score: totalScore,
            totalMarks: totalMaxMarks,
            percentage: parseFloat(percentage),
            submittedAt: new Date(),
            isDraft: false,
            ...(sectionTimers && { sectionTimers })
          }
        },
        { new: true }
      );
    } else {
      submission = await QuizSubmission.create({
        quizId,
        studentId,
        studentName: student.name,
        answers: gradedAnswers,
        sectionTimers: sectionTimers || [],
        score: totalScore,
        totalQuestions,
        totalMarks: totalMaxMarks,
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
        totalMarks: totalMaxMarks,
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
    // Allow autosave within 5-min grace period after deadline so tab-close saves get through.
    // The server-side cron will finalize these drafts into proper submissions.
    if (quiz.endTime) {
      const graceEnd = new Date(quiz.endTime);
      graceEnd.setMinutes(graceEnd.getMinutes() + 5);
      if (now > graceEnd) {
        return res.status(403).json({ error: "Quiz time has expired." });
      }
    }

    const allQuestions = quiz.sections?.length > 0 
      ? quiz.sections.flatMap(s => s.questions) 
      : quiz.questions;

    let totalScore = 0;
    let totalMaxMarks = 0;

    const gradedAnswers = allQuestions.map((question) => {
      const questionMarks = question.marks || quiz.marksPerQuestion || 1;
      const studentAnswer = answers.find(a => a.questionId === question._id.toString()) || {};

      totalMaxMarks += questionMarks;

      if (question.type === "coding") {
        return {
          questionId: question._id.toString(),
          type: "coding",
          code: studentAnswer.code || "",
          language: studentAnswer.language || "",
          marksAwarded: 0 // Do not execute piston on autosave
        };
      } else {
        const selectedAnswer = studentAnswer.selectedAnswer || "";
        const isCorrect = selectedAnswer !== "" && selectedAnswer === question.correctAnswer;
        const marksAwarded = isCorrect ? questionMarks : 0;
        
        if (isCorrect) totalScore += marksAwarded;

        return {
          questionId: question._id.toString(),
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
      await QuizSubmission.findOneAndUpdate(
        { _id: existingSubmission._id },
        {
          $set: {
            answers: gradedAnswers,
            score: totalScore,
            totalMarks: totalMaxMarks,
            percentage: parseFloat(percentage),
            submittedAt: new Date(),
            isDraft: true,
            ...(sectionTimers && { sectionTimers })
          }
        }
      );
    } else {
      await QuizSubmission.create({
        quizId,
        studentId,
        studentName: student.name,
        answers: gradedAnswers,
        sectionTimers: sectionTimers || [],
        score: totalScore,
        totalQuestions,
        totalMarks: totalMaxMarks,
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
      .populate("quizId", "title questions sections status classroomId")
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

    // Server-side language mismatch check for run-code
    const mismatchCheck = detectLanguageMismatch(language, code);
    if (mismatchCheck.mismatch) {
      return res.status(400).json({ 
        error: `Language Mismatch: You selected ${language} but your code appears to be written in ${mismatchCheck.detectedLanguage}. Please write your code in the selected language or change your language selection.` 
      });
    }

    // Run against custom input OR test cases (unified testCases or legacy publicTestCases)
    let testCases = [];
    if (customInput !== undefined && customInput !== null) {
      testCases = [{ input: customInput, expectedOutput: "" }];
    } else {
      testCases = question.coding.testCases || question.coding.publicTestCases || [];
      if (testCases.length === 0) {
        return res.status(400).json({ error: "No test cases available to run." });
      }
    }
    const questionObj = question.toObject ? question.toObject() : question;
    const results = await executeCode(
      language,
      code,
      testCases,
      questionObj
    );
    
    res.status(200).json({ success: true, results });
  } catch (error) {
    console.error("Run code error:", error);
    res.status(error.statusCode || 500).json({ error: error.message || "Failed to execute code" });
  }
};
