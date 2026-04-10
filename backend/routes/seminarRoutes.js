import express from "express";
import multer from "multer";
import { authMiddleware, authorizeRoles } from "../middleware/authMiddleware.js";
import {
  startSeminarSession,
  getSeminarToken,
  markSeminarAttendance,
  stopSeminarSession,
  getActiveSeminarSession,
  getSeminarAttendanceRecords,
  getSeminarSessionById,
} from "../controllers/seminarController.js";

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Teacher: Start a new seminar session
router.post(
  "/start",
  authMiddleware,
  authorizeRoles("teacher"),
  startSeminarSession
);

// Teacher: Get current QR token for active session
router.get(
  "/token/:sessionId",
  authMiddleware,
  authorizeRoles("teacher"),
  getSeminarToken
);

// Teacher: Stop seminar session
router.post(
  "/stop/:sessionId",
  authMiddleware,
  authorizeRoles("teacher"),
  stopSeminarSession
);

// Teacher: Get active seminar session
router.get(
  "/active",
  authMiddleware,
  authorizeRoles("teacher"),
  getActiveSeminarSession
);

// Teacher: Get all seminar attendance records
router.get(
  "/records",
  authMiddleware,
  authorizeRoles("teacher"),
  getSeminarAttendanceRecords
);

// Teacher/Student: Get single session details
router.get(
  "/session/:sessionId",
  authMiddleware,
  authorizeRoles("teacher", "student"),
  getSeminarSessionById
);

// Student: Mark attendance via QR scan
router.post(
  "/attend/:sessionId",
  authMiddleware,
  authorizeRoles("student"),
  upload.single("image"),
  markSeminarAttendance
);

export default router;
