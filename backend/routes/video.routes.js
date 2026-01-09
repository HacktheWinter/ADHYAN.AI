import express from "express";
import {
  authMiddleware,
  authorizeRoles,
} from "../middleware/authMiddleware.js";
import upload from "../middleware/upload.middleware.js";
import {
  uploadVideo,
  getVideosByClass,
  deleteVideo,
} from "../controllers/video.controller.js";

const router = express.Router();

// 🔒 Fetch videos (teacher + student)
router.get("/live/videos/:classId", authMiddleware, getVideosByClass);

// 🔒 Upload video (teacher only)
router.post(
  "/live/videos",
  authMiddleware,
  authorizeRoles("teacher"),
  upload.single("video"),
  uploadVideo
);

router.delete(
  "/live/videos/:id",
  authMiddleware,
  authorizeRoles("teacher"),
  deleteVideo
);

export default router;
