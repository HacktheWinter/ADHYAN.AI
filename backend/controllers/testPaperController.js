import mongoose from "mongoose";
import TestPaper from "../models/TestPaper.js";
import Note from "../models/Note.js";
import { bucket } from "../config/gridfs.js";
import { generateTestPaperFromText } from "../config/geminiTestPaper.js";
import {
  extractTextFromPDF,
  cleanText,
  validateTextContent,
} from "../utils/pdfExtractor.js";

/**
 * Generate test paper using AI
 * POST /api/test-paper/generate-ai
 */
export const generateTestPaperWithAI = async (req, res) => {
  try {
    const { noteIds, classroomId } = req.body;

    console.log("=== TEST PAPER GENERATION STARTED ===");
    console.log("📥 Request:", { noteIds, classroomId });

    if (!noteIds || !Array.isArray(noteIds) || noteIds.length === 0) {
      return res.status(400).json({ error: "Please select at least one note" });
    }

    if (!classroomId) {
      return res.status(400).json({ error: "classroomId is required" });
    }

    // Fetch notes
    const notes = await Note.find({ _id: { $in: noteIds } });

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
    const cleanedText = cleanText(combinedText, 15000);

    // Generate test paper using Gemini
    console.log("Calling Gemini API...");
    const questions = await generateTestPaperFromText(cleanedText);

    console.log(`Generated ${questions.length} questions`);

    // Create title
    const noteNames = notes
      .slice(0, 2)
      .map((n) => n.title)
      .join(", ");
    const testTitle =
      notes.length > 2
        ? `Test Paper from ${noteNames} and ${notes.length - 2} more`
        : `Test Paper from ${noteNames}`;

    // Save to database
    const testPaper = await TestPaper.create({
      classroomId,
      title: testTitle,
      generatedFrom: noteIds,
      questions: questions.map((q) => ({
        question: q.question,
        type: q.type,
        marks: q.marks,
        answerKey: q.answerKey,
        answerGuidelines: q.answerGuidelines || "",
      })),
      totalMarks: 50,
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
        totalMarks: 50,
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

    const testPaper = await TestPaper.findById(testId);
    if (!testPaper) {
      return res.status(404).json({ error: "Test paper not found" });
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

    // Auto-create Calendar Event
    try {
      const CalendarEvent = (await import("../models/CalendarEvent.js")).default;
      await CalendarEvent.create({
        title: `Test: ${testPaper.title}`,
        type: 'test',
        classId: testPaper.classroomId,
        teacherId: req.user._id, // Assuming auth middleware
        startDate: startTime || new Date(),
        endDate: calculatedEndTime || new Date(Date.now() + (duration || 60) * 60000),
        description: `Test duration: ${duration} minutes`,
        relatedId: testPaper._id,
        onModel: 'TestPaper'
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

    const testPaper = await TestPaper.findByIdAndDelete(testId);

    if (!testPaper) {
      return res.status(404).json({ error: "Test paper not found" });
    }

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
