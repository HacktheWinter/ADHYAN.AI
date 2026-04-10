import mongoose from "mongoose";
import Assignment from "../models/Assignment.js";
import Note from "../models/Note.js";
import Classroom from "../models/Classroom.js";
import User from "../models/User.js";
import { getBucket } from "../config/gridfs.js";
import { generateAssignmentFromText } from "../config/geminiAssignment.js";
import { sendAssignmentPublishedEmails } from "../utils/emailNotifications.js";
import { logActivity } from "../utils/activityTracker.js";
import {
  extractTextFromPDF,
  cleanText,
  validateTextContent,
} from "../utils/pdfExtractor.js";

export const generateAssignmentWithAI = async (req, res) => {
  try {
    const bucket = getBucket();
    if (!bucket) {
      console.error("GridFS bucket not ready");
      return;
    }
    const { noteIds, classroomId, customTitle, questionCount, marksPerQuestion, difficulty } = req.body;

    console.log("=== ASSIGNMENT GENERATION STARTED ===");
    console.log("Request:", { noteIds, classroomId, customTitle, questionCount, marksPerQuestion, difficulty });

    if (!noteIds || !Array.isArray(noteIds) || noteIds.length === 0) {
      return res.status(400).json({ error: "Please select at least one note" });
    }

    if (!classroomId) {
      return res.status(400).json({ error: "classroomId is required" });
    }

    const teacherId = req.user?._id?.toString();
    if (teacherId) {
      const classroom = await Classroom.findById(classroomId).select("teacherId");
      if (!classroom) {
        return res.status(404).json({ error: "Classroom not found" });
      }
      if (classroom.teacherId?.toString() !== teacherId) {
        return res
          .status(403)
          .json({ error: "Unauthorized to generate assignments for this classroom" });
      }
    }

    const normalizedNoteIds = [...new Set(noteIds.map(String))]
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    if (normalizedNoteIds.length === 0) {
      return res.status(400).json({ error: "No valid note IDs provided" });
    }

    const toClampedInt = (value, defaultValue, min, max) => {
      const parsed = Number.parseInt(value, 10);
      if (!Number.isFinite(parsed)) return defaultValue;
      return Math.min(max, Math.max(min, parsed));
    };

    const toClampedNumber = (value, defaultValue, min, max) => {
      const parsed = Number(value);
      if (!Number.isFinite(parsed)) return defaultValue;
      return Math.min(max, Math.max(min, parsed));
    };

    // AI Config
    const aiConfig = {
      questionCount: toClampedInt(questionCount, 5, 1, 10),
      marksPerQuestion: toClampedNumber(marksPerQuestion, 2, 1, 10),
      difficulty: difficulty || "mixed"
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
    const existingAssignments = await Assignment.find({ 
      classroomId, 
      generatedFrom: { $all: normalizedNoteIds, $size: normalizedNoteIds.length },
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .select("questions.question");
    
    const excludeQuestions = existingAssignments.flatMap(a => a.questions.map(extQ => extQ.question));

    // Generate assignment using Gemini
    console.log("Calling Gemini API for assignment generation...");
    
    let questions;
    try {
      questions = await generateAssignmentFromText(cleanedText, { ...aiConfig, excludeQuestions });
      console.log(`Generated ${questions.length} questions`);
    } catch (aiError) {
      console.error("AI Generation Error:", aiError.message);
      return res.status(500).json({
        error: "Failed to generate assignment using AI",
        details: aiError.message,
      });
    }

    // Validate questions count (allowing some flexibility but not too much)
    if (!questions || questions.length === 0) {
      return res.status(500).json({
        error: "AI did not generate any questions",
      });
    }

    // Create title
    const noteNames = notes
      .slice(0, 2)
      .map((n) => n.title)
      .join(", ");
    
    const assignmentTitle = customTitle?.trim() 
      ? customTitle.trim() 
      : notes.length > 2
        ? `Assignment from ${noteNames} and ${notes.length - 2} more`
        : `Assignment from ${noteNames}`;

    const totalMarks = questions.reduce((acc, q) => acc + (q.marks || aiConfig.marksPerQuestion), 0);

    // Save to database
    const assignment = await Assignment.create({
      classroomId,
      title: assignmentTitle,
      description: `Complete all ${questions.length} questions. Each question is worth ${aiConfig.marksPerQuestion} marks.`,
      generatedFrom: normalizedNoteIds,
      questions: questions.map((q) => ({
        question: q.question,
        marks: q.marks || aiConfig.marksPerQuestion,
        answerKey: q.answerKey,
        answerGuidelines: q.answerGuidelines || "",
      })),
      marksPerQuestion: aiConfig.marksPerQuestion,
      totalMarks: totalMarks,
      difficulty: aiConfig.difficulty,
      status: "draft",
    });

    console.log("Assignment saved:", assignment._id);
    console.log("=== GENERATION COMPLETED ===\n");

    res.status(201).json({
      success: true,
      message: `Generated assignment with ${questions.length} questions`,
      assignment,
      stats: {
        totalNotes: notes.length,
        processedNotes: successfulExtractions,
        questionsGenerated: questions.length,
        marksPerQuestion: aiConfig.marksPerQuestion,
        totalMarks: totalMarks,
        difficulty: aiConfig.difficulty,
      },
    });
  } catch (error) {
    console.error("ASSIGNMENT GENERATION FAILED:", error);

    // Detailed error response
    res.status(500).json({
      error: "Failed to generate assignment",
      details: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};

/**
 * Get assignment by ID
 */
export const getAssignment = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const assignment = await Assignment.findById(assignmentId);

    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    res.status(200).json(assignment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};

/**
 * Get all assignments for a classroom
 */
export const getAssignmentsByClassroom = async (req, res) => {
  try {
    const { classroomId } = req.params;

    const assignments = await Assignment.find({ classroomId }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      count: assignments.length,
      assignments,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};

/**
 * Update assignment
 */
export const updateAssignment = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const updateData = req.body;
    const teacherId = req.user?._id?.toString();

    const existingAssignment = await Assignment.findById(assignmentId);
    if (!existingAssignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    if (teacherId) {
      const classroom = await Classroom.findById(existingAssignment.classroomId).select("teacherId");
      if (!classroom || classroom.teacherId?.toString() !== teacherId) {
        return res.status(403).json({ error: "Unauthorized" });
      }
    }

    const assignment = await Assignment.findByIdAndUpdate(
      assignmentId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    res.status(200).json({
      success: true,
      message: "Assignment updated successfully",
      assignment,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};

/**
 * Publish assignment
 */
export const publishAssignment = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { dueDate } = req.body;
    const teacherId = req.user?._id?.toString();

    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    if (teacherId) {
      const classroom = await Classroom.findById(assignment.classroomId).select(
        "teacherId name subject"
      );
      if (!classroom || classroom.teacherId?.toString() !== teacherId) {
        return res.status(403).json({ error: "Unauthorized" });
      }
    }

    assignment.status = "published";
    assignment.dueDate = dueDate || null;
    assignment.isActive = true;

    await assignment.save();

    void logActivity({
      actorId: req.user?._id,
      actorRole: "teacher",
      classroomId: assignment.classroomId,
      action: "assignment_published",
      entityType: "assignment",
      entityId: assignment._id,
      meta: {
        assignmentTitle: assignment.title,
        dueDate: assignment.dueDate,
      },
    });

    // Email notification to students (non-blocking)
    void (async () => {
      try {
        const classroom = await Classroom.findById(assignment.classroomId)
          .populate("students", "name email")
          .populate("teacherId", "name");
        if (!classroom) return;

        let students = (classroom.students || [])
          .filter((student) => student?.email)
          .map((student) => ({ name: student.name, email: student.email }));

        // Fallback: resolve users by raw ObjectIds if populate did not return docs.
        if (students.length === 0 && Array.isArray(classroom.students) && classroom.students.length > 0) {
          const studentIds = classroom.students
            .map((student) => student?._id || student)
            .filter((id) => mongoose.Types.ObjectId.isValid(id));

          if (studentIds.length > 0) {
            const studentDocs = await User.find({
              _id: { $in: studentIds },
              role: "student",
            }).select("name email");

            students = studentDocs
              .filter((student) => student?.email)
              .map((student) => ({ name: student.name, email: student.email }));
          }
        }

        if (students.length === 0) {
          console.log(
            `[Email] Assignment notification skipped - no student emails in class ${classroom._id}. studentsCount=${classroom.students?.length || 0}`
          );
          return;
        }

        const className = classroom.subject?.trim() || classroom.name;
        const result = await sendAssignmentPublishedEmails({
          students,
          className,
          assignmentTitle: assignment.title,
          dueDate: assignment.dueDate,
          teacherName: classroom.teacherId?.name || "Your teacher",
        });

        console.log(
          `[Email] Assignment notifications sent: ${result.sent}/${result.total} (failed: ${result.failed}, skipped: ${result.skipped || 0})`
        );
      } catch (emailError) {
        console.error("[Email] Assignment publish notification failed:", emailError.message);
      }
    })();

    // Auto-create Calendar Event
    try {
      const CalendarEvent = (await import("../models/CalendarEvent.js"))
        .default;
      await CalendarEvent.create({
        title: `Assignment: ${assignment.title}`,
        type: "assignment",
        classId: assignment.classroomId,
        teacherId: req.user._id, // Assuming auth middleware populates req.user
        startDate: new Date(),
        submissionDeadline: dueDate,
        description: assignment.description,
        relatedId: assignment._id,
        onModel: "Assignment",
      });
      console.log("Calendar event created for Assignment");
    } catch (calError) {
      console.error("Failed to create calendar event:", calError);
    }

    res.status(200).json({
      success: true,
      message: "Assignment published successfully",
      assignment,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to publish assignment" });
  }
};

/**
 * Delete assignment
 */
export const deleteAssignment = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const teacherId = req.user?._id?.toString();

    const existingAssignment = await Assignment.findById(assignmentId);
    if (!existingAssignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    if (teacherId) {
      const classroom = await Classroom.findById(existingAssignment.classroomId).select(
        "teacherId"
      );
      if (!classroom || classroom.teacherId?.toString() !== teacherId) {
        return res.status(403).json({ error: "Unauthorized" });
      }
    }

    const assignment = await Assignment.findByIdAndDelete(assignmentId);

    res.status(200).json({
      success: true,
      message: "Assignment deleted successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};

/**
 * Get active assignments for students
 */
export const getActiveAssignmentsForStudent = async (req, res) => {
  try {
    const { classroomId } = req.params;

    const now = new Date();

    const assignments = await Assignment.find({
      classroomId,
      status: "published",
    }).sort({ createdAt: -1 });

    const activeAssignments = assignments.map((assignment) => {
      let isActive = true;

      if (assignment.dueDate && now > new Date(assignment.dueDate)) {
        isActive = false;
      }

      return {
        ...assignment.toObject(),
        isActive,
      };
    });

    res.status(200).json({
      success: true,
      count: activeAssignments.length,
      assignments: activeAssignments,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};
