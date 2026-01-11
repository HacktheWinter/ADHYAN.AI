import mongoose from "mongoose";
import multer from "multer";
import Announcement from "../models/Announcement.js";
import Classroom from "../models/Classroom.js";
import User from "../models/User.js";
import { getBucket } from "../config/gridfs.js";

// Multer setup for GridFS (memory storage for streaming to bucket)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

/**
 * POST /api/announcement/create
 * Body: { teacherId, classroomId, message }
 * File: file (optional)
 */
export const createAnnouncement = [
  upload.single("file"),
  async (req, res) => {
    try {
      const { teacherId, classroomId, message } = req.body;
      const bucket = getBucket();

      if (!bucket) {
        return res
          .status(503)
          .json({ message: "Database connection not ready" });
      }

      if (!teacherId || !classroomId || !message) {
        return res.status(400).json({ error: "All fields are required" });
      }

      // Verify teacher and classroom
      const teacher = await User.findById(teacherId);
      if (!teacher || teacher.role !== "teacher") {
        return res.status(400).json({ error: "Invalid teacher" });
      }

      const classroom = await Classroom.findById(classroomId);
      if (!classroom) {
        return res.status(404).json({ error: "Classroom not found" });
      }

      if (classroom.teacherId.toString() !== teacherId) {
        return res
          .status(403)
          .json({ error: "You are not the teacher of this class" });
      }

      let fileId = null;
      let fileName = null;
      let mimeType = null;

      // Upload file to GridFS if present
      if (req.file) {
        const uploadStream = bucket.openUploadStream(req.file.originalname, {
          contentType: req.file.mimetype,
        });

        // Use a promise to handle the stream completion
        await new Promise((resolve, reject) => {
          uploadStream.end(req.file.buffer);
          uploadStream.on("finish", () => {
            fileId = uploadStream.id;
            fileName = req.file.originalname;
            mimeType = req.file.mimetype;
            resolve();
          });
          uploadStream.on("error", reject);
        });
      }

      const announcement = await Announcement.create({
        classroomId,
        teacherId,
        message,
        fileId,
        fileName,
        mimeType,
      });

      res.status(201).json({
        message: "Announcement created successfully",
        announcement,
      });
    } catch (error) {
      console.error("Create Announcement Error:", error);
      res
        .status(500)
        .json({ error: "Server error while creating announcement" });
    }
  },
];

/**
 * GET /api/announcement/:classroomId
 * Fetch all announcements for a classroom
 */
export const getAnnouncements = async (req, res) => {
  try {
    const { classroomId } = req.params;

    const announcements = await Announcement.find({ classroomId })
      .populate("teacherId", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({ announcements });
  } catch (error) {
    console.error("Get Announcements Error:", error);
    res
      .status(500)
      .json({ error: "Server error while fetching announcements" });
  }
};

/**
 * DELETE /api/announcement/:id
 * Only teacher can delete their own announcement
 */
export const deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const { teacherId } = req.body;
    const bucket = getBucket();

    if (!bucket) {
      return res.status(503).json({ message: "Database connection not ready" });
    }

    const announcement = await Announcement.findById(id);
    if (!announcement)
      return res.status(404).json({ error: "Announcement not found" });

    if (announcement.teacherId.toString() !== teacherId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    // Delete file from GridFS if it exists
    if (announcement.fileId) {
      try {
        await bucket.delete(new mongoose.Types.ObjectId(announcement.fileId));
      } catch (err) {
        console.error("Error deleting file from GridFS:", err);
        // Continue deleting announcement even if file delete fails
      }
    }

    await announcement.deleteOne();

    res.status(200).json({ message: "Announcement deleted successfully" });
  } catch (error) {
    console.error("Delete Announcement Error:", error);
    res
      .status(500)
      .json({ error: "Server error while deleting announcement" });
  }
};

/**
 * GET /api/announcement/file/:fileId
 * Stream announcement file
 */
export const getAnnouncementFile = async (req, res) => {
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
      res.status(404).json({
        message: "File not found",
        error: err.message,
      });
    });

    // You might want to get the specific content type from the file metadata if you stored it in GridFS metadata
    // For now, we rely on browser detection or the `mimeType` from the announcement document if we were fetching it first.
    // But simpler for a file stream endpoint is just to pipe.

    readStream.pipe(res);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * GET /api/announcement/student/:studentId
 * Get announcements from all classes a student is enrolled in
 */
export const getStudentAnnouncements = async (req, res) => {
  try {
    const { studentId } = req.params;

    // 1. Find all classrooms where student is enrolled
    const classrooms = await Classroom.find({ students: studentId }).select('_id');
    const classroomIds = classrooms.map(c => c._id);

    if (classroomIds.length === 0) {
      return res.status(200).json({ announcements: [] });
    }

    // 2. Find announcements for these classrooms
    const announcements = await Announcement.find({
      classroomId: { $in: classroomIds }
    })
      .populate('teacherId', 'name email')
      .populate('classroomId', 'name') // Populate class name for display
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, announcements });
  } catch (error) {
    console.error("Get Student Announcements Error:", error);
    res.status(500).json({ error: "Server error" });
  }
};
