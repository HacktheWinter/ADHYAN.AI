// Backend/controllers/quizController.js
import mongoose from "mongoose";
import Quiz from "../models/Quiz.js";
import Note from "../models/Note.js";
import { bucket } from "../config/gridfs.js";
import { generateQuizFromText } from "../config/gemini.js";
import {
  extractTextFromPDF,
  cleanText,
  validateTextContent,
} from "../utils/pdfExtractor.js";

/**
 * Generate quiz using AI from selected notes
 * POST /api/quiz/generate-ai
 * Body: { noteIds: [string], classroomId: string }
 */
export const generateQuizWithAI = async (req, res) => {
  try {
    const { noteIds, classroomId } = req.body;

    console.log("=== QUIZ GENERATION STARTED ===");
    console.log(" Request body:", { noteIds, classroomId });

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

    console.log(` Generating quiz from ${noteIds.length} notes`);

    // Fetch notes from database
    const notes = await Note.find({ _id: { $in: noteIds } });

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

        const buffer = Buffer.concat(chunks);
        console.log(`Buffer size: ${buffer.length} bytes`);

        const text = await extractTextFromPDF(buffer);

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

    // Clean text for AI processing (limit to 15000 chars for faster processing)
    let cleanedText;
    try {
      cleanedText = cleanText(combinedText, 15000);
      console.log(`Text cleaned: ${cleanedText.length} characters`);
    } catch (error) {
      return res.status(400).json({
        error: error.message,
      });
    }

    // Generate quiz using Gemini AI
    console.log("\n Calling Gemini API...");
    let questions;

    try {
      questions = await generateQuizFromText(cleanedText);
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

    // Create quiz title
    const noteNames = notes
      .slice(0, 2)
      .map((n) => n.title)
      .join(", ");
    const quizTitle =
      notes.length > 2
        ? `Quiz from ${noteNames} and ${notes.length - 2} more`
        : `Quiz from ${noteNames}`;

    // Save to database
    const quiz = await Quiz.create({
      noteId: noteIds[0], // Primary note
      classroomId,
      title: quizTitle,
      generatedFrom: noteIds,
      questions: questions.map((q) => ({
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
      })),
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

    res.status(200).json(quiz);
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

    const quiz = await Quiz.findByIdAndDelete(quizId);

    if (!quiz) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    res.status(200).json({
      success: true,
      message: "Quiz deleted successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};

// NEW FUNCTION - Publish quiz with timing
/**
 * Publish quiz with timing
 * PUT /api/quiz/:quizId/publish
 */
export const publishQuizWithTiming = async (req, res) => {
  try {
    const { quizId } = req.params;
    const { duration, startTime, endTime } = req.body;

    console.log("Publishing quiz:", { quizId, duration, startTime, endTime });

    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    // Calculate endTime if not provided
    let calculatedEndTime = endTime;
    if (startTime && duration && !endTime) {
      const start = new Date(startTime);
      calculatedEndTime = new Date(start.getTime() + duration * 60000); // Convert minutes to milliseconds
    }

    // Update quiz
    quiz.status = "published";
    quiz.duration = duration || null;
    quiz.startTime = startTime || null;
    quiz.endTime = calculatedEndTime || null;
    quiz.isActive = true;

    await quiz.save();

    console.log("Quiz published successfully");

    // Auto-create Calendar Event
    try {
      const CalendarEvent = (await import("../models/CalendarEvent.js")).default;
      await CalendarEvent.create({
        title: `Quiz: ${quiz.title}`,
        type: 'quiz',
        classId: quiz.classroomId,
        teacherId: req.user._id, // Assuming auth middleware populates req.user
        startDate: startTime || new Date(),
        endDate: calculatedEndTime || new Date(Date.now() + (duration || 60) * 60000),
        description: `Quiz duration: ${duration} minutes`,
        relatedId: quiz._id,
        onModel: 'Quiz'
      });
      console.log("Calendar event created for Quiz");
    } catch (calError) {
      console.error("Failed to create calendar event:", calError);
      // Don't fail the request if calendar creation fails
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

//  NEW FUNCTION - Get active quizzes for students
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
      let isActive = true;

      if (quiz.endTime && now > new Date(quiz.endTime)) {
        isActive = false;
      }

      if (quiz.startTime && now < new Date(quiz.startTime)) {
        isActive = false;
      }

      return {
        ...quiz.toObject(),
        isActive,
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
