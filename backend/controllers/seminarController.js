import crypto from "crypto";
import mongoose from "mongoose";
import SeminarSession from "../models/SeminarSession.js";
import User from "../models/User.js";

// ── Helpers ─────────────────────────────────────────────────────────

const QR_SECRET = () => process.env.QR_SECRET_KEY || "default_secret_key";
const TOKEN_WINDOW_MS = 10000; // 10 seconds

const generateSeminarToken = (sessionId) => {
  const timeWindow = Math.floor(Date.now() / TOKEN_WINDOW_MS);
  return crypto
    .createHash("sha256")
    .update(`seminar_${sessionId}_${QR_SECRET()}_${timeWindow}`)
    .digest("hex");
};

const isTokenValid = (sessionId, token) => {
  for (const offset of [0, -1]) {
    const timeWindow = Math.floor(Date.now() / TOKEN_WINDOW_MS) + offset;
    const expected = crypto
      .createHash("sha256")
      .update(`seminar_${sessionId}_${QR_SECRET()}_${timeWindow}`)
      .digest("hex");
    if (expected === token) return true;
  }
  return false;
};

// ── Start Seminar Session ───────────────────────────────────────────

export const startSeminarSession = async (req, res) => {
  try {
    const teacherId = req.user._id;
    const { title, description } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        error: "Seminar title is required",
      });
    }

    // Check if teacher already has an active session
    const existing = await SeminarSession.findOne({
      teacherId,
      isActive: true,
    });

    if (existing) {
      return res.status(200).json({
        success: true,
        message: "An active seminar session already exists",
        session: existing,
      });
    }

    const session = new SeminarSession({
      teacherId,
      title: title.trim(),
      description: description?.trim() || "",
      startedAt: new Date(),
      isActive: true,
      status: "active",
    });

    await session.save();

    return res.status(201).json({
      success: true,
      message: "Seminar session started",
      session,
    });
  } catch (error) {
    console.error("Start Seminar Session Error:", error);
    return res.status(500).json({
      success: false,
      error: "Server error while starting seminar session",
    });
  }
};

// ── Get Current QR Token ──────────────────────────────────────────

export const getSeminarToken = async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId || !mongoose.Types.ObjectId.isValid(sessionId)) {
      return res.status(400).json({
        success: false,
        error: "Valid sessionId is required",
      });
    }

    const session = await SeminarSession.findById(sessionId);
    if (!session || !session.isActive) {
      return res.status(404).json({
        success: false,
        error: "Active seminar session not found",
      });
    }

    // Verify teacher owns this session
    if (session.teacherId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: "Unauthorized: Not your seminar session",
      });
    }

    const token = generateSeminarToken(sessionId);

    // Persist token on session for validation reference
    session.currentToken = token;
    session.tokenExpiresAt = new Date(
      Date.now() + TOKEN_WINDOW_MS
    );
    await session.save();

    return res.status(200).json({
      success: true,
      token,
      sessionId,
      attendeeCount: session.attendees.length,
    });
  } catch (error) {
    console.error("Get Seminar Token Error:", error);
    return res.status(500).json({
      success: false,
      error: "Server error while generating seminar token",
    });
  }
};

// ── Mark Seminar Attendance ────────────────────────────────────────

export const markSeminarAttendance = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { token } = req.body;
    const studentId = req.user._id;

    if (!sessionId || !mongoose.Types.ObjectId.isValid(sessionId)) {
      return res.status(400).json({
        success: false,
        error: "Valid sessionId is required",
      });
    }

    if (!token) {
      return res.status(400).json({
        success: false,
        error: "QR token is required",
      });
    }

    // Validate token
    if (!isTokenValid(sessionId, token)) {
      return res.status(400).json({
        success: false,
        error: "QR code has expired. Please scan the latest QR code.",
      });
    }

    const session = await SeminarSession.findById(sessionId);
    if (!session || !session.isActive) {
      return res.status(404).json({
        success: false,
        error: "Seminar session is not active",
      });
    }

    // Check for duplicate
    const alreadyAttended = session.attendees.some(
      (entry) => entry.studentId.toString() === studentId.toString()
    );

    if (alreadyAttended) {
      return res.status(200).json({
        success: true,
        message: "Attendance already marked for this seminar",
        alreadyMarked: true,
      });
    }

    // Get student info
    const student = await User.findById(studentId).select(
      "name email role collegeName course section erpId semester"
    );
    if (!student || student.role !== "student") {
      return res.status(403).json({
        success: false,
        error: "Only students can mark seminar attendance",
      });
    }

    session.attendees.push({
      studentId,
      studentName: student.name,
      erpId: student.erpId || "",
      course: student.course || "",
      section: student.section || "",
      semester: student.semester || "",
      collegeName: student.collegeName || "",
      markedAt: new Date(),
      method: "qr",
    });
    session.attendeeCount = session.attendees.length;

    session.markModified("attendees");
    await session.save();

    return res.status(200).json({
      success: true,
      message: `Attendance marked for "${session.title}"!`,
      attendeeCount: session.attendeeCount,
    });
  } catch (error) {
    console.error("Mark Seminar Attendance Error:", error);
    return res.status(500).json({
      success: false,
      error: "Server error while marking seminar attendance",
    });
  }
};

// ── Stop Seminar Session ──────────────────────────────────────────

/**
 * Sort attendees by: 1) Course (A→Z)  2) Section (A→Z)  3) Name (A→Z)
 * Mutates the array in-place and returns it.
 */
const sortAttendees = (attendees) => {
  return attendees.sort((a, b) => {
    const courseA = (a.course || "").toLowerCase();
    const courseB = (b.course || "").toLowerCase();
    if (courseA !== courseB) return courseA.localeCompare(courseB);

    const secA = (a.section || "").toLowerCase();
    const secB = (b.section || "").toLowerCase();
    if (secA !== secB) return secA.localeCompare(secB);

    const nameA = (a.studentName || "").toLowerCase();
    const nameB = (b.studentName || "").toLowerCase();
    return nameA.localeCompare(nameB);
  });
};

export const stopSeminarSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const teacherId = req.user._id;

    if (!sessionId || !mongoose.Types.ObjectId.isValid(sessionId)) {
      return res.status(400).json({
        success: false,
        error: "Valid sessionId is required",
      });
    }

    const session = await SeminarSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: "Seminar session not found",
      });
    }

    if (session.teacherId.toString() !== teacherId.toString()) {
      return res.status(403).json({
        success: false,
        error: "Unauthorized: Not your seminar session",
      });
    }

    // Sort attendees (Course → Section → Name) before persisting
    sortAttendees(session.attendees);

    session.isActive = false;
    session.status = "completed";
    session.endedAt = new Date();
    session.currentToken = "";
    session.tokenExpiresAt = null;
    session.markModified("attendees");
    await session.save();

    return res.status(200).json({
      success: true,
      message: "Seminar session ended — attendance sorted successfully",
      session,
    });
  } catch (error) {
    console.error("Stop Seminar Session Error:", error);
    return res.status(500).json({
      success: false,
      error: "Server error while stopping seminar session",
    });
  }
};

// ── Get Active Session for Teacher ─────────────────────────────────

export const getActiveSeminarSession = async (req, res) => {
  try {
    const teacherId = req.user._id;

    const session = await SeminarSession.findOne({
      teacherId,
      isActive: true,
    }).sort({ startedAt: -1 });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: "No active seminar session found",
      });
    }

    return res.status(200).json({
      success: true,
      session,
    });
  } catch (error) {
    console.error("Get Active Seminar Session Error:", error);
    return res.status(500).json({
      success: false,
      error: "Server error while fetching active seminar session",
    });
  }
};

// ── Fetch Seminar Attendance Records ───────────────────────────────

export const getSeminarAttendanceRecords = async (req, res) => {
  try {
    const teacherId = req.user._id;

    const sessions = await SeminarSession.find({ teacherId })
      .sort({ startedAt: -1 })
      .populate("attendees.studentId", "name email collegeName course section erpId semester")
      .lean();

    // Ensure sorted order even for older sessions that were saved unsorted
    for (const s of sessions) {
      if (s.attendees?.length > 1) {
        s.attendees.sort((a, b) => {
          const cA = (a.course || a.studentId?.course || "").toLowerCase();
          const cB = (b.course || b.studentId?.course || "").toLowerCase();
          if (cA !== cB) return cA.localeCompare(cB);

          const sA = (a.section || a.studentId?.section || "").toLowerCase();
          const sB = (b.section || b.studentId?.section || "").toLowerCase();
          if (sA !== sB) return sA.localeCompare(sB);

          const nA = (a.studentName || a.studentId?.name || "").toLowerCase();
          const nB = (b.studentName || b.studentId?.name || "").toLowerCase();
          return nA.localeCompare(nB);
        });
      }
    }

    return res.status(200).json({
      success: true,
      count: sessions.length,
      sessions,
    });
  } catch (error) {
    console.error("Get Seminar Attendance Records Error:", error);
    return res.status(500).json({
      success: false,
      error: "Server error while fetching seminar attendance records",
    });
  }
};

// ── Get Single Session Details ─────────────────────────────────────

export const getSeminarSessionById = async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId || !mongoose.Types.ObjectId.isValid(sessionId)) {
      return res.status(400).json({
        success: false,
        error: "Valid sessionId is required",
      });
    }

    const session = await SeminarSession.findById(sessionId)
      .populate("teacherId", "name email")
      .populate("attendees.studentId", "name email collegeName")
      .lean();

    if (!session) {
      return res.status(404).json({
        success: false,
        error: "Seminar session not found",
      });
    }

    return res.status(200).json({
      success: true,
      session,
    });
  } catch (error) {
    console.error("Get Seminar Session By Id Error:", error);
    return res.status(500).json({
      success: false,
      error: "Server error while fetching seminar session",
    });
  }
};
