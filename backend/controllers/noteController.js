// Backend/controllers/noteController.js
import mongoose from "mongoose";
import multer from "multer";
import Note from "../models/Note.js";
import { bucket, conn } from "../config/gridfs.js";

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

      // Upload file to GridFS
      const uploadStream = bucket.openUploadStream(req.file.originalname, {
        contentType: req.file.mimetype,
      });

      uploadStream.end(req.file.buffer);

      uploadStream.on("finish", async () => {
        const note = await Note.create({
          title,
          uploadedBy,
          classroomId,
          fileId: uploadStream.id,
        });

        res.status(201).json({
          message: "Note uploaded successfully",
          note,
        });
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
    const _id = new mongoose.Types.ObjectId(fileId);

    const readStream = bucket.openDownloadStream(_id);

    readStream.on("error", (err) => {
      console.error("GridFS Read Error:", err);
      res.status(404).json({
        message: "File not found",
        error: err.message,
      });
    });

    res.set("Content-Type", "application/pdf");
    readStream.pipe(res);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const deleteNote = async (req, res) => {
  try {
    const { noteId } = req.params;

    console.log("Delete request for note:", noteId);

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
      console.log("File deleted from GridFS:", note.fileId);
    } catch (gridFsError) {
      console.error("GridFS delete error:", gridFsError);
      // Continue even if GridFS delete fails
    }

    // Delete note from database
    await Note.findByIdAndDelete(noteId);
    console.log("Note deleted from database:", noteId);

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
