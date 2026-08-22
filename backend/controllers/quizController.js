// Backend/controllers/quizController.js
import mongoose from "mongoose";
import Quiz from "../models/Quiz.js";
import Note from "../models/Note.js";
import Classroom from "../models/Classroom.js";
import { getBucket } from "../config/gridfs.js";
import { generateQuizFromText, generateQuizFromTopics, extractExactQuestions } from "../config/gemini.js";
import {
  extractTextFromFile,
  cleanTextFull,
  validateTextContent,
} from "../utils/fileExtractor.js";
import { logActivity } from "../utils/activityTracker.js";
import axios from "axios";

/**
 * Extract exact questions from an uploaded file (PDF/Word/Excel)
 * POST /api/quiz/extract-exact
 */
export const extractExactQuestionsFromFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const { buffer, mimetype, originalname } = req.file;

    console.log(`=== EXACT QUESTION EXTRACTION STARTED for ${originalname} ===`);

    // 1. Extract text
    const text = await extractTextFromFile(buffer, mimetype);
    
    // 2. Clean text
    let cleanedText;
    try {
      cleanedText = cleanTextFull(text);
    } catch (e) {
      return res.status(400).json({ error: e.message || "File text too short or invalid" });
    }

    // 3. Extract exact questions via Gemini
    console.log("Calling Gemini to extract exact questions...");
    const parsedQuestions = await extractExactQuestions(cleanedText);

    console.log(`Successfully extracted ${parsedQuestions.length} questions`);
    console.log("=== EXACT QUESTION EXTRACTION COMPLETED ===");

    return res.status(200).json({
      success: true,
      questions: parsedQuestions
    });
  } catch (error) {
    console.error("EXACT QUESTION EXTRACTION FAILED:", error);
    res.status(500).json({
      error: "Failed to extract questions from file",
      details: error.message
    });
  }
};

/**
 * Create quiz manually (teacher enters questions)
 * POST /api/quiz/create-manual
 */
export const createQuizManually = async (req, res) => {
  try {
    const { classroomId, title, questions, sections, marksPerQuestion, difficulty } = req.body;
    const teacherId = req.user?._id?.toString();

    if (!classroomId) return res.status(400).json({ error: "classroomId is required" });
    if (!title?.trim()) return res.status(400).json({ error: "Title is required" });
    
    const hasQuestions = questions && Array.isArray(questions) && questions.length > 0;
    const hasSections = sections && Array.isArray(sections) && sections.length > 0;
    
    if (!hasQuestions && !hasSections) {
      return res.status(400).json({ error: "At least one question or section is required" });
    }

    if (teacherId) {
      const classroom = await Classroom.findById(classroomId).select("teacherId");
      if (!classroom) return res.status(404).json({ error: "Classroom not found" });
      if (classroom.teacherId?.toString() !== teacherId) {
        return res.status(403).json({ error: "Unauthorized" });
      }
    }

    // Helper to validate a question
    const validateQuestion = (q, index) => {
      if (!q.question?.trim()) throw new Error(`Question ${index} must have text`);
      if (q.type === "coding") {
        if (!q.coding || !q.coding.title) throw new Error(`Coding question ${index} must have a title`);
        if (!q.coding.hiddenTestCases || q.coding.hiddenTestCases.length === 0) {
          throw new Error(`Coding question ${index} must have at least one hidden test case`);
        }
      } else {
        if (!Array.isArray(q.options) || q.options.length !== 4) {
          throw new Error(`MCQ ${index} must have exactly 4 options`);
        }
        if (!q.correctAnswer || !q.options.includes(q.correctAnswer)) {
          throw new Error(`MCQ ${index} correctAnswer must match one of the options`);
        }
      }
    };

    let totalMarks = 0;
    let finalQuestions = undefined;
    let finalSections = undefined;
    const mPerQ = marksPerQuestion || 1;

    if (hasSections) {
      finalSections = sections.map((sec, sIdx) => {
        let sectionMarks = 0;
        const mappedQuestions = sec.questions.map((q, qIdx) => {
          validateQuestion(q, `${sIdx + 1}.${qIdx + 1}`);
          const qMarks = q.marks || mPerQ;
          sectionMarks += qMarks;
          return {
            ...q,
            marks: qMarks
          };
        });
        totalMarks += sectionMarks;
        return {
          title: sec.title || `Section ${sIdx + 1}`,
          instructions: sec.instructions || "",
          durationMinutes: sec.durationMinutes || null,
          order: sec.order || sIdx,
          questions: mappedQuestions
        };
      });
    } else {
      finalQuestions = questions.map((q, qIdx) => {
        validateQuestion(q, qIdx + 1);
        const qMarks = q.marks || mPerQ;
        totalMarks += qMarks;
        return {
          ...q,
          marks: qMarks
        };
      });
    }

    const quiz = await Quiz.create({
      classroomId,
      title: title.trim(),
      questions: finalQuestions,
      sections: finalSections,
      marksPerQuestion: mPerQ,
      totalMarks,
      difficulty: difficulty || "mixed",
      status: "draft",
    });

    console.log("Manual quiz created:", quiz._id);

    res.status(201).json({
      success: true,
      message: `Created quiz successfully`,
      quiz,
    });
  } catch (error) {
    console.error("Manual quiz creation failed:", error);
    res.status(400).json({ error: error.message || "Failed to create quiz" });
  }
};

/**
 * Generate quiz from topics
 * POST /api/quiz/generate-from-topics
 * Body: { topics: string[], classroomId: string, customTitle?, questionCount?, marksPerQuestion?, difficulty? }
 */
export const generateQuizFromTopicsAPI = async (req, res) => {
  try {
    const { topics, classroomId, customTitle, questionCount, marksPerQuestion, difficulty } = req.body;
    const teacherId = req.user?._id?.toString();

    console.log("=== QUIZ GENERATION FROM TOPICS STARTED ===");
    console.log(" Request body:", { topics, classroomId, customTitle, questionCount, marksPerQuestion, difficulty });

    // Validation
    if (!topics || (Array.isArray(topics) && topics.length === 0) || (!Array.isArray(topics) && !topics.trim())) {
      console.log(" No topics provided");
      return res.status(400).json({
        error: "Please provide at least one topic",
      });
    }

    if (!classroomId) {
      console.log(" No classroomId provided");
      return res.status(400).json({
        error: "classroomId is required",
      });
    }

    if (teacherId) {
      const classroom = await Classroom.findById(classroomId).select("teacherId");
      if (!classroom) {
        return res.status(404).json({ error: "Classroom not found" });
      }
      if (classroom.teacherId?.toString() !== teacherId) {
        return res.status(403).json({ error: "Unauthorized" });
      }
    }

    // Convert to normalized array and remove duplicates for strict dedupe matching
    const topicsArray = [...new Set((Array.isArray(topics) ? topics : [topics])
      .map((topic) => String(topic || "").trim())
      .filter(Boolean))];

    if (topicsArray.length === 0) {
      return res.status(400).json({ error: "Please provide at least one valid topic" });
    }

    // Build quiz config
    const quizConfig = {
      questionCount: questionCount || 20,
      marksPerQuestion: marksPerQuestion || 1,
      difficulty: difficulty || "mixed",
    };
    
    console.log(` Generating quiz from ${topicsArray.length} topic(s) with config:`, quizConfig);

    // Fetch existing questions for this classroom AND same topics to avoid repetition
    const existingQuizzes = await Quiz.find({
      classroomId,
      generatedFromTopics: { $all: topicsArray, $size: topicsArray.length },
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .select("questions.question");
    
    const excludeQuestions = existingQuizzes.flatMap(q => q.questions.map(extQ => extQ.question));

    // Generate quiz using Gemini AI
    console.log("\n Calling Gemini API for topic-based quiz...");
    let questions;

    try {
      questions = await generateQuizFromTopics(topicsArray, { ...quizConfig, excludeQuestions });
      console.log(`Generated ${questions.length} questions`);
    } catch (error) {
      console.error("Gemini API Error:", error);
      return res.status(500).json({
        error: "Failed to generate quiz from AI. Please try again.",
        details: error.message,
      });
    }

    // Validate questions
    if (!questions || questions.length === 0) {
      return res.status(500).json({
        error:
          "AI could not generate questions from the topics provided. Please try with different topics.",
      });
    }

    // Create quiz title (use custom title if provided)
    const quizTitle = customTitle?.trim()
      ? customTitle.trim()
      : topicsArray.length > 2
        ? `Quiz: ${topicsArray.slice(0, 2).join(", ")} and ${topicsArray.length - 2} more`
        : `Quiz: ${topicsArray.join(", ")}`;

    const calculatedTotalMarks = questions.length * quizConfig.marksPerQuestion;

    // Save to database
    const quiz = await Quiz.create({
      noteId: null, // No note for topic-based quiz
      classroomId,
      title: quizTitle,
      generatedFrom: [], // Empty array since no notes used
      generatedFromTopics: topicsArray, // Store topics used
      questions: questions.map((q) => ({
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
      })),
      marksPerQuestion: quizConfig.marksPerQuestion,
      totalMarks: calculatedTotalMarks,
      difficulty: quizConfig.difficulty,
      status: "draft",
    });

    console.log("Quiz saved to database:", quiz._id);
    console.log("=== QUIZ GENERATION FROM TOPICS COMPLETED ===\n");

    res.status(201).json({
      success: true,
      message: `Generated ${questions.length} questions successfully from ${topicsArray.length} topic(s)`,
      quiz,
      stats: {
        topics: topicsArray,
        questionsGenerated: questions.length,
        marksPerQuestion: quizConfig.marksPerQuestion,
        totalMarks: calculatedTotalMarks,
        difficulty: quizConfig.difficulty,
      },
    });
  } catch (error) {
    console.error("QUIZ GENERATION FROM TOPICS FAILED:", error);
    console.error("Stack trace:", error.stack);

    res.status(500).json({
      error: "Failed to generate quiz from topics",
      details: error.message,
    });
  }
};

/**
 * Generate quiz using AI from selected notes
 * POST /api/quiz/generate-ai
 * Body: { noteIds: [string], classroomId: string, customTitle?, questionCount?, marksPerQuestion?, difficulty? }
 */
export const generateQuizWithAI = async (req, res) => {
  try {
    const { noteIds, classroomId, customTitle, questionCount, marksPerQuestion, difficulty } = req.body;
    const teacherId = req.user?._id?.toString();

    const bucket = getBucket();
    if (!bucket) {
      console.error("GridFS bucket not ready");
      return;
    }

    console.log("=== QUIZ GENERATION STARTED ===");
    console.log(" Request body:", { noteIds, classroomId, customTitle, questionCount, marksPerQuestion, difficulty });

    // Validation
    if (!noteIds || !Array.isArray(noteIds) || noteIds.length === 0) {
      console.log(" No notes selected");
      return res.status(400).json({
        error: "Please select at least one note",
      });
    }

    if (!classroomId) {
      console.log(" No classroomId provided");
      return res.status(400).json({
        error: "classroomId is required",
      });
    }

    if (teacherId) {
      const classroom = await Classroom.findById(classroomId).select("teacherId");
      if (!classroom) {
        return res.status(404).json({ error: "Classroom not found" });
      }
      if (classroom.teacherId?.toString() !== teacherId) {
        return res.status(403).json({ error: "Unauthorized" });
      }
    }

    const normalizedNoteIds = [...new Set(noteIds.map(String))]
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    if (normalizedNoteIds.length === 0) {
      return res.status(400).json({ error: "No valid note IDs provided" });
    }

    // Build quiz config
    const quizConfig = {
      questionCount: questionCount || 20,
      marksPerQuestion: marksPerQuestion || 1,
      difficulty: difficulty || "mixed",
    };

    console.log(` Generating quiz from ${noteIds.length} notes with config:`, quizConfig);

    // Fetch notes from database
    const notes = await Note.find({ _id: { $in: normalizedNoteIds } });

    if (notes.length === 0) {
      console.log(" No notes found in database");
      return res.status(404).json({
        error: "No notes found. Please upload notes first.",
      });
    }

    console.log(`Found ${notes.length} notes in database`);

    // Extract text from all PDFs
    let combinedText = "";
    let successfulExtractions = 0;

      for (const note of notes) {
        try {
          console.log(`\n Processing: ${note.title}`);

          let buffer;
          if (note.fileUrl) {
            console.log(`Fetching from Cloudinary URL`);
            const response = await axios.get(note.fileUrl, { responseType: 'arraybuffer' });
            buffer = Buffer.from(response.data);
          } else if (note.fileId) {
            const fileId = new mongoose.Types.ObjectId(note.fileId);
            const chunks = [];
            const readstream = bucket.openDownloadStream(fileId);

            // Read PDF chunks
            await new Promise((resolve, reject) => {
              readstream.on("data", (chunk) => {
                chunks.push(chunk);
              });

              readstream.on("error", (error) => {
                console.error(`Stream error for ${note.title}:`, error.message);
                reject(error);
              });

              readstream.on("end", () => {
                console.log(` Stream ended for ${note.title}`);
                resolve();
              });
            });

            if (chunks.length === 0) {
              console.log(` No chunks received for ${note.title}`);
              continue;
            }

            buffer = Buffer.concat(chunks);
          } else {
            console.log(` No file source for ${note.title}`);
            continue;
          }

          console.log(`Buffer size: ${buffer.length} bytes`);

        const mimetype = note.mimetype || "application/pdf";
        const text = await extractTextFromFile(buffer, mimetype);

        if (text && text.trim().length > 0) {
          combinedText += `\n\n=== ${note.title} ===\n\n${text}`;
          successfulExtractions++;
          console.log(
            ` Extracted ${text.length} characters from ${note.title}`
          );
        } else {
          console.log(`Empty text from ${note.title}`);
        }
      } catch (error) {
        console.error(`Error processing ${note.title}:`, error.message);
        // Continue with other notes even if one fails
      }
    }

    console.log(`\n Summary:`);
    console.log(`  - Total notes: ${notes.length}`);
    console.log(`  - Successfully extracted: ${successfulExtractions}`);
    console.log(`  - Combined text length: ${combinedText.length} characters`);

    // Validation: Check if we have enough content
    if (successfulExtractions === 0) {
      return res.status(400).json({
        error:
          "Could not extract text from any PDF. Please check if PDFs are valid and not encrypted.",
      });
    }

    if (!combinedText || combinedText.trim().length < 500) {
      return res.status(400).json({
        error:
          "Not enough content in notes to generate quiz. Please upload notes with more content (at least 500 characters needed).",
      });
    }

    if (!validateTextContent(combinedText)) {
      return res.status(400).json({
        error:
          "Notes don't have enough meaningful content. Please ensure notes contain educational material.",
      });
    }

    console.log("Content validation passed");

    // Clean text for AI processing — no truncation, chunking is handled in AI layer
    let cleanedText;
    try {
      cleanedText = cleanTextFull(combinedText);
      console.log(`Text cleaned: ${cleanedText.length} characters`);
    } catch (error) {
      return res.status(400).json({
        error: error.message,
      });
    }

    // Fetch existing questions for this classroom AND same notes to avoid repetition
    const existingQuizzes = await Quiz.find({ 
      classroomId, 
      generatedFrom: { $all: normalizedNoteIds, $size: normalizedNoteIds.length },
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .select("questions.question");
    
    const excludeQuestions = existingQuizzes.flatMap(q => q.questions.map(extQ => extQ.question));

    // Generate quiz using Gemini AI with config
    console.log("\n Calling Gemini API...");
    let questions;

    try {
      questions = await generateQuizFromText(cleanedText, { ...quizConfig, excludeQuestions });
      console.log(`Generated ${questions.length} questions`);
    } catch (error) {
      console.error("Gemini API Error:", error);
      return res.status(500).json({
        error: "Failed to generate quiz from AI. Please try again.",
        details: error.message,
      });
    }

    // Validate questions
    if (!questions || questions.length === 0) {
      return res.status(500).json({
        error:
          "AI could not generate questions. Please try with different notes or check content quality.",
      });
    }

    // Create quiz title (use custom title if provided)
    let quizTitle;
    if (customTitle?.trim()) {
      quizTitle = customTitle.trim();
    } else {
      const noteNames = notes
        .slice(0, 2)
        .map((n) => n.title)
        .join(", ");
      quizTitle =
        notes.length > 2
          ? `Quiz from ${noteNames} and ${notes.length - 2} more`
          : `Quiz from ${noteNames}`;
    }

    const calculatedTotalMarks = questions.length * quizConfig.marksPerQuestion;

    // Save to database
    const quiz = await Quiz.create({
      noteId: normalizedNoteIds[0], // Primary note
      classroomId,
      title: quizTitle,
      generatedFrom: normalizedNoteIds,
      questions: questions.map((q) => ({
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
      })),
      marksPerQuestion: quizConfig.marksPerQuestion,
      totalMarks: calculatedTotalMarks,
      difficulty: quizConfig.difficulty,
      status: "draft",
    });

    console.log("Quiz saved to database:", quiz._id);
    console.log("=== QUIZ GENERATION COMPLETED ===\n");

    res.status(201).json({
      success: true,
      message: `Generated ${questions.length} questions successfully from ${successfulExtractions} notes`,
      quiz,
      stats: {
        totalNotes: notes.length,
        processedNotes: successfulExtractions,
        questionsGenerated: questions.length,
        marksPerQuestion: quizConfig.marksPerQuestion,
        totalMarks: calculatedTotalMarks,
        difficulty: quizConfig.difficulty,
        textLength: cleanedText.length,
      },
    });
  } catch (error) {
    console.error("QUIZ GENERATION FAILED:", error);
    console.error("Stack trace:", error.stack);

    res.status(500).json({
      error: "Failed to generate quiz",
      details: error.message,
      hint: "Please ensure PDFs are not encrypted and contain readable text content.",
    });
  }
};

/**
 * Get quiz by ID
 * GET /api/quiz/:quizId
 */
export const getQuiz = async (req, res) => {
  try {
    const { quizId } = req.params;
    const quiz = await Quiz.findById(quizId);

    if (!quiz) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    let quizObj = quiz.toObject();
    
    // Normalize to sections for consistent frontend handling
    if (!quizObj.sections || quizObj.sections.length === 0) {
      if (quizObj.questions && quizObj.questions.length > 0) {
        quizObj.sections = [
          {
            _id: "default_section",
            title: "Default Section",
            order: 0,
            questions: quizObj.questions,
            durationMinutes: quizObj.duration || null
          }
        ];
      } else {
        quizObj.sections = [];
      }
    }
    
    // Remove root questions from response to enforce new standard in frontend
    delete quizObj.questions;
    
    if (req.user?.role === "student") {
      const now = new Date();
      if ((quiz.endTime && now > new Date(quiz.endTime)) || 
          (quiz.startTime && now < new Date(quiz.startTime))) {
        delete quizObj.sections;
      } else if (quizObj.sections) {
        // Strip sensitive info
        quizObj.sections.forEach(sec => {
          if (sec.questions) {
            sec.questions.forEach(q => {
              delete q.correctAnswer;
              if (q.coding) {
                delete q.coding.hiddenTestCases;
              }
            });
          }
        });
      }
    }

    res.status(200).json(quizObj);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};

/**
 * Get all quizzes for a classroom
 * GET /api/quiz/classroom/:classroomId
 */
export const getQuizzesByClassroom = async (req, res) => {
  try {
    const { classroomId } = req.params;

    const quizzes = await Quiz.find({ classroomId }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: quizzes.length,
      quizzes,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};

/**
 * Update quiz
 * PUT /api/quiz/:quizId
 */
export const updateQuiz = async (req, res) => {
  try {
    const { quizId } = req.params;
    const updateData = req.body;
    const teacherId = req.user?._id?.toString();

    const existingQuiz = await Quiz.findById(quizId);
    if (!existingQuiz) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    if (teacherId) {
      const classroom = await Classroom.findById(existingQuiz.classroomId).select("teacherId");
      if (!classroom || classroom.teacherId?.toString() !== teacherId) {
        return res.status(403).json({ error: "Unauthorized" });
      }
    }

    const quiz = await Quiz.findByIdAndUpdate(quizId, updateData, {
      new: true,
      runValidators: true,
    });

    if (!quiz) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    res.status(200).json({
      success: true,
      message: "Quiz updated successfully",
      quiz,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};

/**
 * Delete quiz
 * DELETE /api/quiz/:quizId
 */
export const deleteQuiz = async (req, res) => {
  try {
    const { quizId } = req.params;
    const teacherId = req.user?._id?.toString();

    const existingQuiz = await Quiz.findById(quizId);
    if (!existingQuiz) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    if (teacherId) {
      const classroom = await Classroom.findById(existingQuiz.classroomId).select("teacherId");
      if (!classroom || classroom.teacherId?.toString() !== teacherId) {
        return res.status(403).json({ error: "Unauthorized" });
      }
    }

    const quiz = await Quiz.findByIdAndDelete(quizId);

    res.status(200).json({
      success: true,
      message: "Quiz deleted successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};

/**
 * Publish quiz with timing
 * PUT /api/quiz/:quizId/publish
 */
export const publishQuizWithTiming = async (req, res) => {
  try {
    const { quizId } = req.params;
    const { duration, startTime, endTime } = req.body;
    const teacherId = req.user?._id?.toString();

    console.log("Publishing quiz:", { quizId, duration, startTime, endTime });

    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    if (teacherId) {
      const classroom = await Classroom.findById(quiz.classroomId).select("teacherId");
      if (!classroom || classroom.teacherId?.toString() !== teacherId) {
        return res.status(403).json({ error: "Unauthorized" });
      }
    }

    // Calculate endTime if not provided
    let calculatedEndTime = endTime;
    if (startTime && duration && !endTime) {
      const start = new Date(startTime);
      calculatedEndTime = new Date(start.getTime() + duration * 60000);
    }

    // Update quiz
    quiz.status = "published";
    quiz.duration = duration || null;
    quiz.startTime = startTime || null;
    quiz.endTime = calculatedEndTime || null;
    quiz.isActive = true;

    await quiz.save();

    console.log("Quiz published successfully");

    void logActivity({
      actorId: req.user?._id,
      actorRole: "teacher",
      classroomId: quiz.classroomId,
      action: "quiz_published",
      entityType: "quiz",
      entityId: quiz._id,
      meta: {
        quizTitle: quiz.title,
        startTime: quiz.startTime,
        endTime: quiz.endTime,
      },
    });

    // Auto-create Calendar Event
    try {
      const CalendarEvent = (await import("../models/CalendarEvent.js"))
        .default;
      await CalendarEvent.create({
        title: `Quiz: ${quiz.title}`,
        type: "quiz",
        classId: quiz.classroomId,
        teacherId: req.user._id,
        startDate: startTime || new Date(),
        endDate:
          calculatedEndTime || new Date(Date.now() + (duration || 60) * 60000),
        description: `Quiz duration: ${duration} minutes`,
        relatedId: quiz._id,
        onModel: "Quiz",
      });
      console.log("Calendar event created for Quiz");
    } catch (calError) {
      console.error("Failed to create calendar event:", calError);
    }

    res.status(200).json({
      success: true,
      message: "Quiz published successfully",
      quiz,
    });
  } catch (error) {
    console.error("Publish error:", error);
    res.status(500).json({
      error: "Failed to publish quiz",
      details: error.message,
    });
  }
};

/**
 * Get active quizzes for student (filters by time)
 * GET /api/quiz/active/classroom/:classroomId
 */
export const getActiveQuizzesForStudent = async (req, res) => {
  try {
    const { classroomId } = req.params;

    const now = new Date();

    const quizzes = await Quiz.find({
      classroomId,
      status: "published",
    }).sort({ createdAt: -1 });

    // Filter active quizzes based on time
    const activeQuizzes = quizzes.map((quiz) => {
      let quizStatus = "active";
      const quizObj = quiz.toObject();

      if (quiz.endTime && now > new Date(quiz.endTime)) {
        quizStatus = "expired";
        delete quizObj.questions; // Security
      } else if (quiz.startTime && now < new Date(quiz.startTime)) {
        quizStatus = "upcoming";
        delete quizObj.questions; // Security
      }

      return {
        ...quizObj,
        quizStatus,
        isActive: quizStatus === "active",
      };
    });

    res.status(200).json({
      success: true,
      count: activeQuizzes.length,
      quizzes: activeQuizzes,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};

/**
 * Publish quiz results so students can view them
 * PUT /api/quiz/:quizId/publish-results
 */
export const publishQuizResults = async (req, res) => {
  try {
    const { quizId } = req.params;
    const teacherId = req.user?._id?.toString();

    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    if (teacherId) {
      const classroom = await Classroom.findById(quiz.classroomId).select("teacherId");
      if (!classroom || classroom.teacherId?.toString() !== teacherId) {
        return res.status(403).json({ error: "Unauthorized" });
      }
    }

    quiz.resultsPublished = true;
    await quiz.save();

    res.status(200).json({
      success: true,
      message: "Quiz results published successfully",
      quiz,
    });
  } catch (error) {
    console.error("Publish results error:", error);
    res.status(500).json({
      error: "Failed to publish quiz results",
      details: error.message,
    });
  }
};
