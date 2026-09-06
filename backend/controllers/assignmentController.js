import mongoose from "mongoose";
import Assignment from "../models/Assignment.js";
import Note from "../models/Note.js";
import Classroom from "../models/Classroom.js";
import User from "../models/User.js";
import { getBucket } from "../config/gridfs.js";
import { generateAssignmentFromText, generateAssignmentFromTopics } from "../config/geminiAssignment.js";
import { sendAssignmentPublishedEmails } from "../utils/emailNotifications.js";
import { logActivity } from "../utils/activityTracker.js";
import {
  extractTextFromFile,
  cleanTextFull,
  validateTextContent,
} from "../utils/fileExtractor.js";
import axios from "axios";

/**
 * Create assignment manually (teacher enters questions)
 * POST /api/assignment/create-manual
 */
export const createAssignmentManually = async (req, res) => {
  try {
    const { classroomId, title, description, questions, marksPerQuestion, difficulty, dueDate } = req.body;
    const teacherId = req.user?._id?.toString();

    if (!classroomId) return res.status(400).json({ error: "classroomId is required" });
    if (!title?.trim()) return res.status(400).json({ error: "Title is required" });
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: "At least one question is required" });
    }

    if (teacherId) {
      const classroom = await Classroom.findById(classroomId).select("teacherId");
      if (!classroom) return res.status(404).json({ error: "Classroom not found" });
      if (classroom.teacherId?.toString() !== teacherId) {
        return res.status(403).json({ error: "Unauthorized" });
      }
    }

    // Validate each question
    for (const q of questions) {
      if (!q.question?.trim()) return res.status(400).json({ error: "Each question must have text" });
      if (!q.answerKey?.trim()) return res.status(400).json({ error: "Each question must have an answer key" });
    }

    const mPerQ = marksPerQuestion || 2;
    const totalMarks = questions.length * mPerQ;

    const assignment = await Assignment.create({
      classroomId,
      title: title.trim(),
      description: description?.trim() || "",
      questions: questions.map((q) => ({
        question: q.question.trim(),
        marks: mPerQ,
        answerKey: q.answerKey.trim(),
        answerGuidelines: q.answerGuidelines || "",
      })),
      marksPerQuestion: mPerQ,
      totalMarks,
      difficulty: difficulty || "mixed",
      dueDate: dueDate || null,
      status: "draft",
    });

    console.log("Manual assignment created:", assignment._id);

    res.status(201).json({
      success: true,
      message: `Created assignment with ${questions.length} questions`,
      assignment,
    });
  } catch (error) {
    console.error("Manual assignment creation failed:", error);
    res.status(500).json({ error: "Failed to create assignment", details: error.message });
  }
};

export const generateAssignmentWithAI = async (req, res) => {
  try {
    const bucket = getBucket();
    if (!bucket) {
      console.error("GridFS bucket not ready");
      return;
    }
    const { noteIds, classroomId, customTitle, questionCount, marksPerQuestion, difficulty, topics } = req.body;

    console.log("=== ASSIGNMENT GENERATION STARTED ===");
    console.log("Request:", { noteIds, classroomId, customTitle, questionCount, marksPerQuestion, difficulty, topics });

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

    const isTopicBased = topics && (Array.isArray(topics) ? topics.length > 0 : String(topics).trim());

    if (!isTopicBased && (!noteIds || !Array.isArray(noteIds) || noteIds.length === 0)) {
      return res.status(400).json({ error: "Please select at least one note or provide topics" });
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

    let questions;
    let assignmentTitle;
    let normalizedNoteIds = [];
    let successfulExtractions = 0;
    let totalNotesCount = 0;

    if (isTopicBased) {
      const topicsArray = Array.isArray(topics) ? topics : [topics];
      console.log(`Generating assignment from ${topicsArray.length} topics...`);

      assignmentTitle = customTitle?.trim()
        ? customTitle.trim()
        : topicsArray.length > 2
          ? `Assignment: ${topicsArray.slice(0, 2).join(", ")} and ${topicsArray.length - 2} more`
          : `Assignment: ${topicsArray.join(", ")}`;

      try {
        questions = await generateAssignmentFromTopics(topicsArray, aiConfig);
        console.log(`Generated ${questions.length} questions from topics`);
      } catch (aiError) {
        console.error("AI Generation from Topics Error:", aiError.message);
        return res.status(500).json({
          error: "Failed to generate assignment from topics using AI",
          details: aiError.message,
        });
      }
    } else {
      normalizedNoteIds = [...new Set(noteIds.map(String))]
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
        .map((id) => new mongoose.Types.ObjectId(id));

      if (normalizedNoteIds.length === 0) {
        return res.status(400).json({ error: "No valid note IDs provided" });
      }

      // Fetch notes
      const notes = await Note.find({ _id: { $in: normalizedNoteIds } });
      totalNotesCount = notes.length;

      if (notes.length === 0) {
        return res.status(404).json({ error: "No notes found" });
      }

      console.log(`Found ${notes.length} notes`);

      // Extract text from PDFs
      let combinedText = "";

      for (const note of notes) {
        try {
          console.log(`Processing: ${note.title}`);

          let buffer;
          if (note.fileUrl) {
            console.log(`Fetching from Cloudinary URL`);
            const response = await axios.get(note.fileUrl, { responseType: 'arraybuffer' });
            buffer = Buffer.from(response.data);
          } else if (note.fileId) {
            const fileId = new mongoose.Types.ObjectId(note.fileId);
            const chunks = [];
            const readstream = bucket.openDownloadStream(fileId);

            await new Promise((resolve, reject) => {
              readstream.on("data", (chunk) => chunks.push(chunk));
              readstream.on("error", reject);
              readstream.on("end", resolve);
            });

            buffer = Buffer.concat(chunks);
          } else {
            console.log(`No file source for ${note.title}`);
            continue;
          }
          const mimetype = note.mimetype || "application/pdf";
          const text = await extractTextFromFile(buffer, mimetype);

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

      // Clean text — no truncation, chunking is handled in AI layer
      const cleanedText = cleanTextFull(combinedText);

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

      // Create title
      const noteNames = notes
        .slice(0, 2)
        .map((n) => n.title)
        .join(", ");
      
      assignmentTitle = customTitle?.trim() 
        ? customTitle.trim() 
        : notes.length > 2
          ? `Assignment from ${noteNames} and ${notes.length - 2} more`
          : `Assignment from ${noteNames}`;
    } // End of Notes block

    // Validate questions count (allowing some flexibility but not too much)
    if (!questions || questions.length === 0) {
      return res.status(500).json({
        error: "AI did not generate any questions",
      });
    }

    const totalMarks = questions.reduce((acc, q) => acc + (q.marks || aiConfig.marksPerQuestion), 0);

    // Save to database
    const assignment = await Assignment.create({
      classroomId,
      title: assignmentTitle,
      description: `Complete all ${questions.length} questions. Each question is worth ${aiConfig.marksPerQuestion} marks.`,
      generatedFrom: isTopicBased ? [] : normalizedNoteIds,
      generatedFromTopics: isTopicBased ? (Array.isArray(topics) ? topics : [topics]) : [],
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

    let assignmentObj = assignment.toObject();

    // Strip answer keys for non-teacher users
    if (req.user?.role !== "teacher") {
      if (assignmentObj.questions) {
        assignmentObj.questions.forEach(q => {
          delete q.answerKey;
          delete q.answerGuidelines;
        });
      }
    }

    res.status(200).json(assignmentObj);
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

    // Strip answer keys for non-teacher users
    let assignmentsData = assignments;
    if (req.user?.role !== "teacher") {
      assignmentsData = assignments.map(a => {
        const obj = a.toObject();
        if (obj.questions) {
          obj.questions.forEach(q => {
            delete q.answerKey;
            delete q.answerGuidelines;
          });
        }
        return obj;
      });
    }

    res.status(200).json({
      success: true,
      count: assignmentsData.length,
      assignments: assignmentsData,
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
          .populate("students", "name email settings")
          .populate("teacherId", "name");
        if (!classroom) return;

        let students = (classroom.students || [])
          .filter((student) => student?.email && student?.settings?.emailNotifications === true)
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
              "settings.emailNotifications": true,
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
        // Strip answer keys for student-facing endpoint
        questions: assignment.toObject().questions?.map(q => {
          const { answerKey, answerGuidelines, ...rest } = q;
          return rest;
        }),
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
