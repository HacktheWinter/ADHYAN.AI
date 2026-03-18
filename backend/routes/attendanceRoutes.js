import express from "express";
import crypto from "crypto";
import { authMiddleware, authorizeRoles } from "../middleware/authMiddleware.js";
import {
  startAttendanceSession,
  endAttendanceSession,
  markAttendance,
  getAttendanceSessionsByClass,
  getAttendanceSessionById,
  getStudentAttendanceSummary,
  getMyAttendanceSummary,
  getActiveAttendanceSession,
  saveAttendanceRecord,
} from "../controllers/attendanceController.js";

const router = express.Router();

// GET /api/attendance/generate-token/:classId
// Protect route using existing teacher authentication middleware.
router.get(
  "/generate-token/:classId",
  authMiddleware,
  authorizeRoles("teacher"),
  (req, res) => {
    try {
      const { classId } = req.params;
      const qrSecretKey = process.env.QR_SECRET_KEY || "default_secret_key"; // fallback for safety, but should be in env

      // 20-second time window
      // Note: This logic assumes the token is valid ONLY within this specific 20s window.
      // Since the socket handler validates against the CURRENTLY ACTIVE session token, 
      // this route mainly serves to generate a unique token that changes every 20s.
      // The socket handler's in-memory validation is the primary check.
      const timeWindow = Math.floor(Date.now() / 20000);

      // Generate SHA256 token
      const token = crypto
        .createHash("sha256")
        .update(classId + qrSecretKey + timeWindow)
        .digest("hex");

      res.status(200).json({ token });
    } catch (error) {
      console.error("Error generating attendance token:", error);
      res.status(500).json({ message: "Server Error", error: error.message });
    }
  }
);

router.post(
  "/session/start/:classId",
  authMiddleware,
  authorizeRoles("teacher"),
  startAttendanceSession
);

router.post(
  "/session/end/:classId",
  authMiddleware,
  authorizeRoles("teacher"),
  endAttendanceSession
);

router.post(
  "/session/:attendanceId/mark/:studentId",
  authMiddleware,
  authorizeRoles("teacher"),
  markAttendance
);

router.post(
  "/session/:attendanceId/mark",
  authMiddleware,
  authorizeRoles("teacher"),
  markAttendance
);

router.get(
  "/sessions/:classId",
  authMiddleware,
  authorizeRoles("teacher", "student", "principal"),
  getAttendanceSessionsByClass
);

router.get(
  "/session/:attendanceId",
  authMiddleware,
  authorizeRoles("teacher", "student", "principal"),
  getAttendanceSessionById
);

router.get(
  "/active/:classId",
  authMiddleware,
  authorizeRoles("teacher", "student", "principal"),
  getActiveAttendanceSession
);

router.get(
  "/summary/:classId/student/:studentId",
  authMiddleware,
  authorizeRoles("teacher", "student", "principal"),
  getStudentAttendanceSummary
);

router.get(
  "/summary/:classId/me",
  authMiddleware,
  authorizeRoles("student"),
  getMyAttendanceSummary
);

router.post(
  "/save-record/:classId",
  authMiddleware,
  authorizeRoles("teacher"),
  saveAttendanceRecord
);

export default router;
