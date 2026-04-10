import mongoose from "mongoose";
import TestPaper from "../models/TestPaper.js";
import Note from "../models/Note.js";
import Classroom from "../models/Classroom.js";
import { getBucket } from "../config/gridfs.js";
import { generateTestPaperFromText } from "../config/geminiTestPaper.js";
import {
  extractTextFromPDF,
  cleanText,
  validateTextContent,
} from "../utils/pdfExtractor.js";
import { logActivity } from "../utils/activityTracker.js";

/**
 * Generate test paper using AI
 * POST /api/test-paper/generate-ai
 */
export const generateTestPaperWithAI = async (req, res) => {
  try {
    const bucket = getBucket();
    if (!bucket) {
      console.error("GridFS bucket not ready");
      return;
    }
    const { noteIds, classroomId, customTitle, counts, difficulty } = req.body;
    const teacherId = req.user?._id?.toString();

    console.log("=== TEST PAPER GENERATION STARTED ===");
    console.log("Request:", { noteIds, classroomId, customTitle, counts, difficulty });

    if (!noteIds || !Array.isArray(noteIds) || noteIds.length === 0) {
      return res.status(400).json({ error: "Please select at least one note" });
    }

    if (!classroomId) {
      return res.status(400).json({ error: "classroomId is required" });
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

    const toNonNegativeNumberOrDefault = (value, defaultValue) => {
      const parsed = Number(value);
      if (!Number.isFinite(parsed)) return defaultValue;
      return Math.max(0, parsed);
    };

    // Build config with proper nested structure for counts
    const testConfig = {
      counts: {
        short: { 
          count: typeof counts?.short === 'object'
            ? toNonNegativeNumberOrDefault(counts.short.count, 5)
            : toNonNegativeNumberOrDefault(counts?.short, 5),
          optional: typeof counts?.short === 'object'
            ? toNonNegativeNumberOrDefault(counts.short.optional, 0)
            : 0,
        },
        medium: { 
          count: typeof counts?.medium === 'object'
            ? toNonNegativeNumberOrDefault(counts.medium.count, 4)
            : toNonNegativeNumberOrDefault(counts?.medium, 4),
          optional: typeof counts?.medium === 'object'
            ? toNonNegativeNumberOrDefault(counts.medium.optional, 0)
            : 0,
        },
        long: { 
          count: typeof counts?.long === 'object'
            ? toNonNegativeNumberOrDefault(counts.long.count, 2)
            : toNonNegativeNumberOrDefault(counts?.long, 2),
          optional: typeof counts?.long === 'object'
            ? toNonNegativeNumberOrDefault(counts.long.optional, 0)
            : 0,
        },
      },
      difficulty: difficulty || "mixed",
    };

    // Fetch notes
    const notes = await Note.find({ _id: { $in: normalizedNoteIds } });

    if (notes.length === 0) {
      return res.status(404).json({ error: "No notes found" });
    }

    console.log(`Found ${notes.length} notes`);

    // Extract text from PDFs
    let combinedText = "";
    let successfulExtractions = 0;

    for (const note of notes) {
      try {
        console.log(`Processing: ${note.title}`);

        const fileId = new mongoose.Types.ObjectId(note.fileId);
        const chunks = [];
        const readstream = bucket.openDownloadStream(fileId);

        await new Promise((resolve, reject) => {
          readstream.on("data", (chunk) => chunks.push(chunk));
          readstream.on("error", reject);
          readstream.on("end", resolve);
        });

        const buffer = Buffer.concat(chunks);
        const text = await extractTextFromPDF(buffer);

        if (text && text.trim().length > 0) {
          combinedText += `\n\n=== ${note.title} ===\n\n${text}`;
          successfulExtractions++;
          console.log(`Extracted ${text.length} characters`);
        }
      } catch (error) {
        console.error(`Error processing ${note.title}:`, error.message);
      }
    }

    if (successfulExtractions === 0) {
      return res.status(400).json({
        error: "Could not extract text from any PDF",
      });
    }

    if (!combinedText || combinedText.trim().length < 500) {
      return res.status(400).json({
        error: "Not enough content in notes (min 500 characters required)",
      });
    }

    console.log("Content validation passed");

    // Clean text
    const cleanedText = cleanText(combinedText, 15001);

    // Fetch existing questions for this classroom to avoid repetition
    // Fetch existing questions for this classroom AND same notes to avoid repetition
    const existingPapers = await TestPaper.find({ 
      classroomId, 
      generatedFrom: { $all: normalizedNoteIds, $size: normalizedNoteIds.length },
    })
      .sort({ createdAt: -1 })
      .limit(10) // Can increase limit since we're filtering more strictly
      .select("questions.question");
    
    const excludeQuestions = existingPapers.flatMap(p => p.questions.map(extQ => extQ.question));

    // Generate test paper using Gemini
    console.log("Calling Gemini API...");
    const questions = await generateTestPaperFromText(cleanedText, { ...testConfig, excludeQuestions });

    console.log(`Generated ${questions.length} questions`);

    // Create title
    const noteNames = notes
      .slice(0, 2)
      .map((n) => n.title)
      .join(", ");
    
    const testTitle = customTitle?.trim()
      ? customTitle.trim()
      : notes.length > 2
        ? `Test Paper from ${noteNames} and ${notes.length - 2} more`
        : `Test Paper from ${noteNames}`;

    // Normalize marks per generated question and derive total from actual saved content.
    const normalizedQuestions = questions.map((q) => {
      const fallbackMarksByType = {
        short: 2,
        medium: 5,
        long: 10,
      };

      const rawMarks = Number(q.marks);
      const marks = Number.isFinite(rawMarks) && rawMarks > 0
        ? rawMarks
        : (fallbackMarksByType[q.type] || 0);

      return {
        question: q.question,
        type: q.type,
        marks,
        section: q.section || "",
        choiceLabel: q.choiceLabel || "",
        choiceGroup: q.choiceGroup || "",
        answerKey: q.answerKey,
        answerGuidelines: q.answerGuidelines || "",
      };
    });

    const calculatedTotalMarks = normalizedQuestions.reduce(
      (sum, q) => sum + (Number(q.marks) || 0),
      0
    );

    // Save to database
    const testPaper = await TestPaper.create({
      classroomId,
      title: testTitle,
      generatedFrom: normalizedNoteIds,
      questions: normalizedQuestions,
      questionCounts: testConfig.counts,
      totalMarks: calculatedTotalMarks,
      difficulty: testConfig.difficulty,
      status: "draft",
    });

    console.log(" Test paper saved:", testPaper._id);
    console.log("=== GENERATION COMPLETED ===\n");

    res.status(201).json({
      success: true,
      message: `Generated test paper with ${questions.length} questions`,
      testPaper,
      stats: {
        totalNotes: notes.length,
        processedNotes: successfulExtractions,
        questionsGenerated: questions.length,
        totalMarks: calculatedTotalMarks,
        difficulty: testConfig.difficulty,
      },
    });
  } catch (error) {
    console.error("TEST PAPER GENERATION FAILED:", error);
    res.status(500).json({
      error: "Failed to generate test paper",
      details: error.message,
    });
  }
};

/**
 * Get test paper by ID
 */
export const getTestPaper = async (req, res) => {
  try {
    const { testId } = req.params;
    const testPaper = await TestPaper.findById(testId);

    if (!testPaper) {
      return res.status(404).json({ error: "Test paper not found" });
    }

    res.status(200).json(testPaper);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};

/**
 * Get all test papers for a classroom
 */
export const getTestPapersByClassroom = async (req, res) => {
  try {
    const { classroomId } = req.params;

    const testPapers = await TestPaper.find({ classroomId }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      count: testPapers.length,
      testPapers,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};

/**
 * Update test paper (edit answer keys)
 */
export const updateTestPaper = async (req, res) => {
  try {
    const { testId } = req.params;
    const updateData = req.body;
    const teacherId = req.user?._id?.toString();

    const existingTestPaper = await TestPaper.findById(testId);
    if (!existingTestPaper) {
      return res.status(404).json({ error: "Test paper not found" });
    }

    if (teacherId) {
      const classroom = await Classroom.findById(existingTestPaper.classroomId).select(
        "teacherId"
      );
      if (!classroom || classroom.teacherId?.toString() !== teacherId) {
        return res.status(403).json({ error: "Unauthorized" });
      }
    }

    const testPaper = await TestPaper.findByIdAndUpdate(testId, updateData, {
      new: true,
      runValidators: true,
    });

    if (!testPaper) {
      return res.status(404).json({ error: "Test paper not found" });
    }

    res.status(200).json({
      success: true,
      message: "Test paper updated successfully",
      testPaper,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};

/**
 * Publish test paper with timing
 */
export const publishTestPaper = async (req, res) => {
  try {
    const { testId } = req.params;
    const { duration, startTime, endTime } = req.body;
    const teacherId = req.user?._id?.toString();

    const testPaper = await TestPaper.findById(testId);
    if (!testPaper) {
      return res.status(404).json({ error: "Test paper not found" });
    }

    if (teacherId) {
      const classroom = await Classroom.findById(testPaper.classroomId).select("teacherId");
      if (!classroom || classroom.teacherId?.toString() !== teacherId) {
        return res.status(403).json({ error: "Unauthorized" });
      }
    }

    let calculatedEndTime = endTime;
    if (startTime && duration && !endTime) {
      const start = new Date(startTime);
      calculatedEndTime = new Date(start.getTime() + duration * 60000);
    }

    testPaper.status = "published";
    testPaper.duration = duration || null;
    testPaper.startTime = startTime || null;
    testPaper.endTime = calculatedEndTime || null;
    testPaper.isActive = true;

    await testPaper.save();

    void logActivity({
      actorId: req.user?._id,
      actorRole: "teacher",
      classroomId: testPaper.classroomId,
      action: "test_paper_published",
      entityType: "test_paper",
      entityId: testPaper._id,
      meta: {
        testTitle: testPaper.title,
        startTime: testPaper.startTime,
        endTime: testPaper.endTime,
      },
    });

    // Auto-create Calendar Event
    try {
      const CalendarEvent = (await import("../models/CalendarEvent.js"))
        .default;
      await CalendarEvent.create({
        title: `Test: ${testPaper.title}`,
        type: "test",
        classId: testPaper.classroomId,
        teacherId: req.user._id, // Assuming auth middleware
        startDate: startTime || new Date(),
        endDate:
          calculatedEndTime || new Date(Date.now() + (duration || 60) * 60000),
        description: `Test duration: ${duration} minutes`,
        relatedId: testPaper._id,
        onModel: "TestPaper",
      });
      console.log("Calendar event created for Test Paper");
    } catch (calError) {
      console.error("Failed to create calendar event:", calError);
    }

    res.status(200).json({
      success: true,
      message: "Test paper published successfully",
      testPaper,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to publish test paper" });
  }
};

/**
 * Delete test paper
 */
export const deleteTestPaper = async (req, res) => {
  try {
    const { testId } = req.params;
    const teacherId = req.user?._id?.toString();

    const existingTestPaper = await TestPaper.findById(testId);
    if (!existingTestPaper) {
      return res.status(404).json({ error: "Test paper not found" });
    }

    if (teacherId) {
      const classroom = await Classroom.findById(existingTestPaper.classroomId).select(
        "teacherId"
      );
      if (!classroom || classroom.teacherId?.toString() !== teacherId) {
        return res.status(403).json({ error: "Unauthorized" });
      }
    }

    const testPaper = await TestPaper.findByIdAndDelete(testId);

    res.status(200).json({
      success: true,
      message: "Test paper deleted successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};

/**
 * Get active test papers for students
 */
export const getActiveTestPapersForStudent = async (req, res) => {
  try {
    const { classroomId } = req.params;

    const now = new Date();

    const testPapers = await TestPaper.find({
      classroomId,
      status: "published",
    }).sort({ createdAt: -1 });

    const activeTestPapers = testPapers.map((test) => {
      let isActive = true;

      if (test.endTime && now > new Date(test.endTime)) {
        isActive = false;
      }

      if (test.startTime && now < new Date(test.startTime)) {
        isActive = false;
      }

      return {
        ...test.toObject(),
        isActive,
      };
    });

    res.status(200).json({
      success: true,
      count: activeTestPapers.length,
      testPapers: activeTestPapers,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};
