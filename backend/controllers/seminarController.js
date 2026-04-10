import crypto from "crypto";
import mongoose from "mongoose";
import SeminarSession from "../models/SeminarSession.js";
import User from "../models/User.js";
import AuditLog from "../models/AuditLog.js";
import { extractEmbedding } from "../config/faceModel.js";
import { getPineconeIndex } from "../config/pinecone.js";
import {
  uploadAuditImage,
  shouldTriggerAudit,
} from "../utils/cloudinaryUpload.js";

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth radius in metres
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) *
      Math.cos(phi2) *
      Math.sin(deltaLambda / 2) *
      Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return distance;
};

// ── Helpers ─────────────────────────────────────────────────────────

const QR_SECRET = () => process.env.QR_SECRET_KEY || "default_secret_key";
const TOKEN_WINDOW_MS = 20000; // 20 seconds

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
    const { title, description, latitude, longitude } = req.body;

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
      teacherLocation: {
        lat:
          latitude !== undefined && latitude !== null
            ? parseFloat(latitude)
            : null,
        lng:
          longitude !== undefined && longitude !== null
            ? parseFloat(longitude)
            : null,
      },
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
    session.tokenExpiresAt = new Date(Date.now() + TOKEN_WINDOW_MS);
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
    const { token, latitude, longitude } = req.body;
    const studentId = req.user._id;

    const SIMILARITY_THRESHOLD =
      parseFloat(process.env.SIMILARITY_THRESHOLD) || 0.75;
    const AUDIT_SAMPLE_RATE = parseFloat(process.env.AUDIT_SAMPLE_RATE) || 0.05;

    if (!sessionId || !mongoose.Types.ObjectId.isValid(sessionId)) {
      return res
        .status(400)
        .json({ success: false, error: "Valid sessionId is required" });
    }

    if (!token) {
      return res
        .status(400)
        .json({ success: false, error: "QR token is required" });
    }

    // Capture student position
    const studentLat =
      latitude !== undefined && latitude !== null ? parseFloat(latitude) : NaN;
    const studentLng =
      longitude !== undefined && longitude !== null
        ? parseFloat(longitude)
        : NaN;

    // Validate token
    if (!isTokenValid(sessionId, token)) {
      return res.status(400).json({
        success: false,
        error: "QR code has expired. Please scan the latest QR code.",
      });
    }

    const session = await SeminarSession.findById(sessionId);
    if (!session || !session.isActive) {
      return res
        .status(404)
        .json({ success: false, error: "Seminar session is not active" });
    }

    // Geolocation verification
    if (
      session.teacherLocation &&
      session.teacherLocation.lat !== null &&
      session.teacherLocation.lng !== null
    ) {
      if (isNaN(studentLat) || isNaN(studentLng)) {
        return res.status(400).json({
          success: false,
          error: "Location data required. Please enable GPS and try again.",
        });
      }

      const distance = calculateDistance(
        session.teacherLocation.lat,
        session.teacherLocation.lng,
        studentLat,
        studentLng,
      );

      if (distance > 50) {
        // 50 meters tolerance
        return res.status(403).json({
          success: false,
          error: `Too far from venue (${Math.round(distance)}m). You must be at the seminar location.`,
        });
      }
    }

    // Face verification
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, error: "Face verification image is required" });
    }

    let descriptor;
    try {
      descriptor = await extractEmbedding(req.file.buffer);
    } catch (err) {
      return res.status(400).json({
        success: false,
        error: "Face capture failed. Ensure your face is clearly visible.",
      });
    }

    const index = getPineconeIndex();
    const queryResponse = await index.query({
      vector: descriptor,
      topK: 1,
      filter: { studentId: { $eq: studentId.toString() } },
      includeMetadata: true,
    });

    if (!queryResponse.matches || queryResponse.matches.length === 0) {
      // Audit: no match found
      const auditUrl = await uploadAuditImage(req.file.buffer, {
        studentId: studentId.toString(),
        reason: "low_similarity",
      });
      AuditLog.create({
        studentId,
        classId: null,
        similarityScore: 0,
        status: "no_match",
        triggerReason: "low_similarity",
        auditImageUrl: auditUrl,
        metadata: { method: "face", threshold: SIMILARITY_THRESHOLD },
      }).catch((e) => console.error("[Audit]", e.message));

      return res.status(401).json({
        success: false,
        error:
          "Face not recognized. First-time students must register during scanning.",
      });
    }

    const bestMatch = queryResponse.matches[0];
    const similarityScore = bestMatch.score;

    // Audit decision
    const { shouldAudit, reason: auditReason } = shouldTriggerAudit(
      similarityScore,
      SIMILARITY_THRESHOLD,
      AUDIT_SAMPLE_RATE,
    );
    if (shouldAudit) {
      const auditUrl = await uploadAuditImage(req.file.buffer, {
        studentId: studentId.toString(),
        reason: auditReason,
      });
      AuditLog.create({
        studentId,
        classId: null,
        similarityScore,
        status: similarityScore >= SIMILARITY_THRESHOLD ? "match" : "no_match",
        triggerReason: auditReason,
        auditImageUrl: auditUrl,
        metadata: { method: "face", threshold: SIMILARITY_THRESHOLD },
      }).catch((e) => console.error("[Audit]", e.message));
    }

    if (similarityScore < SIMILARITY_THRESHOLD) {
      return res.status(401).json({
        success: false,
        error: `Face identity confidence too low (${(similarityScore * 100).toFixed(1)}%). Try again with better lighting.`,
      });
    }

    // Check for duplicate
    const alreadyAttended = session.attendees.some(
      (entry) => entry.studentId.toString() === studentId.toString(),
    );

    if (alreadyAttended) {
      return res.status(200).json({
        success: true,
        message: "Attendance already marked.",
        alreadyMarked: true,
      });
    }

    const student = await User.findById(studentId).select(
      "name email role collegeName course section erpId semester",
    );
    if (!student || student.role !== "student") {
      return res.status(403).json({ success: false, error: "Unauthorized" });
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
      method: "face",
    });
    session.attendeeCount = session.attendees.length;
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

    session.isActive = false;
    session.status = "completed";
    session.endedAt = new Date();
    session.currentToken = "";
    session.tokenExpiresAt = null;
    await session.save();

    return res.status(200).json({
      success: true,
      message: "Seminar session ended",
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
      .populate("attendees.studentId", "name email collegeName")
      .lean();

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
