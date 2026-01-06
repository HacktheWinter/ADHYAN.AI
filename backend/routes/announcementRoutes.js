import express from "express";
import {
  createAnnouncement,
  getAnnouncements,
  deleteAnnouncement,
  getAnnouncementFile,
  getStudentAnnouncements,
} from "../controllers/announcementController.js";

const router = express.Router();

// Teacher posts announcement
router.post("/create", createAnnouncement);

// Get all announcements for a student's enrolled classes
router.get("/student/:studentId", getStudentAnnouncements);

// Get all announcements for a classroom
router.get("/:classroomId", getAnnouncements);

// Teacher deletes announcement
// Teacher deletes announcement
router.delete("/:id", deleteAnnouncement);

// Get Announcement File
router.get("/file/:fileId", getAnnouncementFile);

export default router;
