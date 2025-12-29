import Announcement from "../models/Announcement.js";
import Classroom from "../models/Classroom.js";
import User from "../models/User.js";

/**
 * POST /api/announcement/create
 * Body: { teacherId, classroomId, message }
 */
export const createAnnouncement = async (req, res) => {
  try {
    const { teacherId, classroomId, message } = req.body;

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
      return res.status(403).json({ error: "You are not the teacher of this class" });
    }

    const announcement = await Announcement.create({
      classroomId,
      teacherId,
      message,
    });

    res.status(201).json({
      message: "Announcement created successfully",
      announcement,
    });
  } catch (error) {
    console.error("Create Announcement Error:", error);
    res.status(500).json({ error: "Server error while creating announcement" });
  }
};

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
    res.status(500).json({ error: "Server error while fetching announcements" });
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

    const announcement = await Announcement.findById(id);
    if (!announcement) return res.status(404).json({ error: "Announcement not found" });

    if (announcement.teacherId.toString() !== teacherId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    await announcement.deleteOne();

    res.status(200).json({ message: "Announcement deleted successfully" });
  } catch (error) {
    console.error("Delete Announcement Error:", error);
    res.status(500).json({ error: "Server error while deleting announcement" });
  }
};

