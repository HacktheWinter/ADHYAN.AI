import express from "express";
import {
  createAnnouncement,
  getAnnouncements,
  deleteAnnouncement,
} from "../controllers/announcementController.js";

const router = express.Router();

// Teacher posts announcement
router.post("/create", createAnnouncement);

// Get all announcements for a classroom
router.get("/:classroomId", getAnnouncements);

// Teacher deletes announcement
router.delete("/:id", deleteAnnouncement);

export default router;
