// Backend/controllers/noteController.js
import mongoose from "mongoose";
import multer from "multer";
import Note from "../models/Note.js";
import Classroom from "../models/Classroom.js";
import User from "../models/User.js";
import { getBucket } from "../config/gridfs.js";
import { sendNoteUploadedEmails } from "../utils/emailNotifications.js";
import { logActivity } from "../utils/activityTracker.js";

// Multer setup for GridFS (memory storage for streaming to bucket)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed!"), false);
    }
  },
});

export const uploadNote = [
  upload.single("file"),
  async (req, res) => {
    try {
      const { title, uploadedBy, classroomId } = req.body;
      const bucket = getBucket();

      if (!bucket) {
        return res.status(503).json({ message: "Database connection not ready. Please try again in a few seconds." });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      if (!title) {
        return res.status(400).json({ message: "Title is required" });
      }
      if (!uploadedBy) {
        return res.status(400).json({ message: "uploadedBy is required" });
      }
      if (!classroomId) {
        return res.status(400).json({ message: "classroomId is required" });
      }

      const teacherId = req.user?._id?.toString();
      let classroom = null;

      if (mongoose.Types.ObjectId.isValid(classroomId)) {
        classroom = await Classroom.findById(classroomId);
      }

      if (!classroom) {
        classroom = await Classroom.findOne({ classCode: classroomId });
      }

      if (!classroom) {
        return res.status(404).json({ message: "Classroom not found" });
      }

      if (teacherId && classroom.teacherId?.toString() !== teacherId) {
        return res.status(403).json({ message: "Unauthorized to upload notes for this class" });
      }

      // Upload file to GridFS
      const uploadStream = bucket.openUploadStream(req.file.originalname, {
        contentType: req.file.mimetype,
      });

      const fileId = uploadStream.id;

      uploadStream.end(req.file.buffer);

      uploadStream.on("finish", async () => {
        try {
          const note = await Note.create({
            title,
            uploadedBy,
            classroomId,
            fileId: fileId,
          });

          res.status(201).json({
            message: "Note uploaded successfully",
            note,
          });

          void logActivity({
            actorId: req.user?._id,
            actorRole: "teacher",
            classroomId: classroom._id,
            action: "note_uploaded",
            entityType: "note",
            entityId: note._id,
            meta: {
              className: classroom.subject?.trim() || classroom.name,
              noteTitle: note.title,
            },
          });

          // Email notification to students (non-blocking)
          void (async () => {
            try {
              let populatedClassroom = null;

              if (mongoose.Types.ObjectId.isValid(classroomId)) {
                populatedClassroom = await Classroom.findById(classroomId)
                  .populate("students", "name email")
                  .populate("teacherId", "name");
              }

              if (!populatedClassroom) {
                populatedClassroom = await Classroom.findOne({ classCode: classroomId })
                  .populate("students", "name email")
                  .populate("teacherId", "name");
              }

              if (!populatedClassroom) {
                console.log(
                  `[Email] Note notification skipped - classroom not found for ${classroomId}`
                );
                return;
              }

              let students = (populatedClassroom.students || [])
                .filter((student) => student?.email)
                .map((student) => ({ name: student.name, email: student.email }));

              // Fallback: resolve users by raw ObjectIds if populate did not return docs.
              if (students.length === 0 && Array.isArray(populatedClassroom.students) && populatedClassroom.students.length > 0) {
                const studentIds = populatedClassroom.students
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
                  `[Email] Note notification skipped - no student emails in class ${populatedClassroom._id}. studentsCount=${populatedClassroom.students?.length || 0}`
                );
                return;
              }

              let teacherName = "Your teacher";

              // Frontend currently sends uploadedBy as teacher name string.
              if (uploadedBy && mongoose.Types.ObjectId.isValid(uploadedBy)) {
                const uploader = await User.findById(uploadedBy).select("name");
                teacherName = uploader?.name || teacherName;
              } else if (uploadedBy && typeof uploadedBy === "string") {
                teacherName = uploadedBy.trim() || teacherName;
              } else if (populatedClassroom.teacherId?.name) {
                teacherName = populatedClassroom.teacherId.name;
              }

              const className =
                populatedClassroom.subject?.trim() || populatedClassroom.name;
              const result = await sendNoteUploadedEmails({
                students,
                className,
                noteTitle: title,
                teacherName,
              });

              console.log(
                `[Email] Note notifications sent: ${result.sent}/${result.total} (failed: ${result.failed}, skipped: ${result.skipped || 0})`
              );
            } catch (emailError) {
              console.error("[Email] Note upload notification failed:", emailError.message);
            }
          })();
        } catch (dbError) {
          console.error("Database Error after GridFS upload:", dbError);
          res.status(500).json({ message: "File uploaded but database record failed" });
        }
      });

      uploadStream.on("error", (err) => {
        console.error("GridFS Upload Error:", err);
        res.status(500).json({
          message: "Error uploading file",
          error: err.message,
        });
      });
    } catch (error) {
      console.error("Upload Note Error:", error);
      res.status(500).json({
        message: "Server error",
        error: error.message,
      });
    }
  },
];

// Get all notes (for admin purposes)
export const getNotes = async (req, res) => {
  try {
    const notes = await Note.find().sort({ createdAt: -1 });
    res.status(200).json(notes);
  } catch (error) {
    console.error("Get Notes Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get notes by classroom ID
export const getNotesByClassroom = async (req, res) => {
  try {
    const { classroomId } = req.params;

    if (!classroomId) {
      return res.status(400).json({ message: "Classroom ID is required" });
    }

    // Try finding by classroomId (as stored in DB)
    const notes = await Note.find({ classroomId }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: notes.length,
      notes,
    });
  } catch (error) {
    console.error("Get Classroom Notes Error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Stream PDF to browser
export const getNoteFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const bucket = getBucket();

    if (!bucket) {
      return res.status(503).json({ message: "Database connection not ready" });
    }

    const _id = new mongoose.Types.ObjectId(fileId);

    const readStream = bucket.openDownloadStream(_id);

    readStream.on("error", (err) => {
      console.error("GridFS Read Error:", err);
      if (!res.headersSent) {
        res.status(404).json({
          message: "File not found",
          error: err.message,
        });
      }
    });

    res.set("Content-Type", "application/pdf");
    readStream.pipe(res);
  } catch (error) {
    console.error(error);
    if (!res.headersSent) {
      res.status(500).json({ message: "Server error" });
    }
  }
};

export const deleteNote = async (req, res) => {
  try {
    const { noteId } = req.params;
    const bucket = getBucket();

    if (!bucket) {
      return res.status(503).json({ message: "Database connection not ready" });
    }

    // Find the note
    const note = await Note.findById(noteId);

    if (!note) {
      return res.status(404).json({
        success: false,
        message: "Note not found",
      });
    }

    // Delete file from GridFS
    try {
      await bucket.delete(new mongoose.Types.ObjectId(note.fileId));
    } catch (gridFsError) {
      console.error("GridFS delete error:", gridFsError);
      // Continue even if GridFS delete fails (maybe file already gone)
    }

    // Delete note from database
    await Note.findByIdAndDelete(noteId);

    res.status(200).json({
      success: true,
      message: "Note deleted successfully",
    });
  } catch (error) {
    console.error("Delete Note Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while deleting note",
      error: error.message,
    });
  }
};
