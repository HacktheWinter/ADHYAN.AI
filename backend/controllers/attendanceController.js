import mongoose from "mongoose";
import Attendance, {
  ATTENDANCE_ENTRY_STATUSES,
  ATTENDANCE_MARKING_METHODS,
} from "../models/Attendance.js";
import Classroom from "../models/Classroom.js";
import User from "../models/User.js";
import AuditLog from "../models/AuditLog.js";
import { extractEmbedding } from '../config/faceModel.js';
import { getPineconeIndex } from "../config/pinecone.js";
import { uploadAuditImage, shouldTriggerAudit } from "../utils/cloudinaryUpload.js";


const attendedStatuses = new Set(["present", "late", "excused"]);
const validStatuses = new Set(ATTENDANCE_ENTRY_STATUSES);
const validMethods = new Set(ATTENDANCE_MARKING_METHODS);

const normalizeAttendanceDate = (value) => {
  const isDateOnlyString =
    typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.trim());
  const date = isDateOnlyString
    ? new Date(`${value.trim()}T00:00:00`)
    : value
      ? new Date(value)
      : new Date();
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
};

const roundMetric = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

const getIdString = (value) => {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (value instanceof mongoose.Types.ObjectId) return value.toString();
  if (value?._id) return value._id.toString();
  return value.toString();
};

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const toDateKey = (value) => {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    return value.trim();
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const extractTeacherId = (req) =>
  req.user?._id?.toString() ||
  req.body?.teacherId ||
  req.query?.teacherId ||
  req.params?.teacherId ||
  null;

const extractClassId = (req) =>
  req.params?.classId || req.body?.classId || req.query?.classId || null;

const recalculateAttendanceDocument = ({ attendance, classroomStudentIds = [] }) => {
  const entryMap = new Map();

  for (const entry of attendance.attendanceEntries || []) {
    const studentId = getIdString(entry.studentId);
    if (!studentId) continue;

    entryMap.set(studentId, {
      studentId: entry.studentId,
      status: validStatuses.has(entry.status) ? entry.status : "present",
      markedAt: entry.markedAt || new Date(),
      markedBy: entry.markedBy || null,
      method: validMethods.has(entry.method) ? entry.method : "manual",
      remarks: entry.remarks || "",
    });
  }

  if (!attendance.isActive) {
    for (const classroomStudentId of classroomStudentIds) {
      const studentKey = getIdString(classroomStudentId);
      if (!studentKey || entryMap.has(studentKey)) continue;

      entryMap.set(studentKey, {
        studentId: classroomStudentId,
        status: "absent",
        markedAt: attendance.endedAt || new Date(),
        markedBy: attendance.teacherId || null,
        method: "system",
        remarks: "Marked absent when attendance session was closed.",
      });
    }
  }

  const normalizedEntries = Array.from(entryMap.values());

  attendance.attendanceEntries = normalizedEntries;
  attendance.studentsPresent = normalizedEntries
    .filter((entry) => attendedStatuses.has(entry.status))
    .map((entry) => ({
      studentId: entry.studentId,
      scannedAt: entry.markedAt || new Date(),
      markedAt: entry.markedAt || new Date(),
      method: entry.method || "manual",
    }));

  const summary = {
    presentCount: 0,
    absentCount: 0,
    lateCount: 0,
    excusedCount: 0,
  };

  for (const entry of normalizedEntries) {
    if (entry.status === "absent") summary.absentCount += 1;
    else if (entry.status === "late") summary.lateCount += 1;
    else if (entry.status === "excused") summary.excusedCount += 1;
    else summary.presentCount += 1;
  }

  const totalStudents = Math.max(
    classroomStudentIds.length,
    attendance.totalStudents || 0,
    normalizedEntries.length
  );

  attendance.totalStudents = totalStudents;
  attendance.summary = {
    totalStudents,
    ...summary,
  };
};

const getOwnedClassroom = async ({ classId, teacherId }) => {
  if (!classId || !teacherId) return null;

  const classroom = await Classroom.findById(classId).select(
    "name subject classCode teacherId students"
  );

  if (!classroom) return null;
  if (classroom.teacherId.toString() !== teacherId.toString()) return false;
  return classroom;
};

const findAttendanceSession = async ({ attendanceId, classId, isActiveOnly = false }) => {
  if (attendanceId && isValidObjectId(attendanceId)) {
    return Attendance.findById(attendanceId);
  }

  if (!classId || !isValidObjectId(classId)) return null;

  const filter = { classId };
  if (isActiveOnly) {
    filter.isActive = true;
  }

  return Attendance.findOne(filter).sort({ startedAt: -1, createdAt: -1 });
};

export const startAttendanceSession = async (req, res) => {
  try {
    const classId = extractClassId(req);
    const teacherId = extractTeacherId(req);
    const attendanceDate = normalizeAttendanceDate(req.body?.attendanceDate);
    const sessionLabel = req.body?.sessionLabel?.trim() || "";
    const latitude = (req.body?.latitude !== undefined && req.body?.latitude !== null) ? parseFloat(req.body.latitude) : null;
    const longitude = (req.body?.longitude !== undefined && req.body?.longitude !== null) ? parseFloat(req.body.longitude) : null;

    if (!classId || !teacherId) {
      return res.status(400).json({
        success: false,
        error: "classId and teacherId are required",
      });
    }

    const classroom = await getOwnedClassroom({ classId, teacherId });
    if (classroom === false) {
      return res.status(403).json({
        success: false,
        error: "Unauthorized: You are not the teacher of this classroom",
      });
    }

    if (!classroom) {
      return res.status(404).json({
        success: false,
        error: "Classroom not found",
      });
    }

    if (!attendanceDate) {
      return res.status(400).json({
        success: false,
        error: "attendanceDate is invalid",
      });
    }

    const existingActiveSession = await Attendance.findOne({
      classId,
      isActive: true,
    }).sort({ startedAt: -1 });

    if (existingActiveSession) {
      return res.status(200).json({
        success: true,
        message: "An active attendance session already exists for this class",
        attendance: existingActiveSession,
      });
    }

    const attendance = new Attendance({
      classId,
      teacherId,
      date: attendanceDate,
      teacherLocation: { lat: latitude, lng: longitude },
      attendanceDate,
      sessionLabel,
      startedAt: new Date(),
      isActive: true,
      status: "active",
      totalStudents: classroom.students.length,
      summary: {
        totalStudents: classroom.students.length,
        presentCount: 0,
        absentCount: 0,
        lateCount: 0,
        excusedCount: 0,
      },
    });

    recalculateAttendanceDocument({
      attendance,
      classroomStudentIds: classroom.students,
    });

    await attendance.save();

    return res.status(201).json({
      success: true,
      message: "Attendance session started successfully",
      attendance,
    });
  } catch (error) {
    console.error("Start Attendance Session Error:", error);
    return res.status(500).json({
      success: false,
      error: "Server error while starting attendance session",
    });
  }
};

export const markAttendance = async (req, res) => {
  try {
    const attendanceId = req.params?.attendanceId || req.body?.attendanceId;
    const classId = extractClassId(req);
    const studentId = req.params?.studentId || req.body?.studentId;
    const status = req.body?.status || "present";
    const method = req.body?.method || "manual";
    const remarks = req.body?.remarks?.trim() || "";
    const markedBy = req.user?._id || req.body?.markedBy || null;

    if (!studentId || !isValidObjectId(studentId)) {
      return res.status(400).json({
        success: false,
        error: "A valid studentId is required",
      });
    }

    if (!validStatuses.has(status)) {
      return res.status(400).json({
        success: false,
        error: `status must be one of: ${ATTENDANCE_ENTRY_STATUSES.join(", ")}`,
      });
    }

    if (!validMethods.has(method)) {
      return res.status(400).json({
        success: false,
        error: `method must be one of: ${ATTENDANCE_MARKING_METHODS.join(", ")}`,
      });
    }

    const attendance = await findAttendanceSession({
      attendanceId,
      classId,
      isActiveOnly: true,
    });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        error: "Active attendance session not found",
      });
    }

    const classroom = await Classroom.findById(attendance.classId).select(
      "students teacherId name subject classCode"
    );
    if (!classroom) {
      return res.status(404).json({
        success: false,
        error: "Classroom not found for this attendance session",
      });
    }

    const isStudentEnrolled = classroom.students.some(
      (enrolledStudentId) => enrolledStudentId.toString() === studentId.toString()
    );

    if (!isStudentEnrolled) {
      return res.status(400).json({
        success: false,
        error: "Student is not enrolled in this classroom",
      });
    }

    const student = await User.findById(studentId).select("name email role");
    if (!student || student.role !== "student") {
      return res.status(404).json({
        success: false,
        error: "Student not found",
      });
    }

    const existingEntryIndex = attendance.attendanceEntries.findIndex(
      (entry) => entry.studentId.toString() === studentId.toString()
    );

    const entryPayload = {
      studentId,
      status,
      markedAt: new Date(),
      markedBy,
      method,
      remarks,
    };

    if (existingEntryIndex >= 0) {
      attendance.attendanceEntries[existingEntryIndex] = entryPayload;
    } else {
      attendance.attendanceEntries.push(entryPayload);
    }

    recalculateAttendanceDocument({
      attendance,
      classroomStudentIds: classroom.students,
    });

    await attendance.save();

    const savedEntry = attendance.attendanceEntries.find(
      (entry) => entry.studentId.toString() === studentId.toString()
    );

    return res.status(200).json({
      success: true,
      message: "Attendance updated successfully",
      attendance,
      entry: savedEntry,
      student: {
        _id: student._id,
        name: student.name,
        email: student.email,
      },
    });
  } catch (error) {
    console.error("Mark Attendance Error:", error);
    return res.status(500).json({
      success: false,
      error: "Server error while marking attendance",
    });
  }
};

export const endAttendanceSession = async (req, res) => {
  try {
    const attendanceId = req.params?.attendanceId || req.body?.attendanceId;
    const classId = extractClassId(req);
    const teacherId = extractTeacherId(req);

    const attendance = await findAttendanceSession({
      attendanceId,
      classId,
      isActiveOnly: true,
    });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        error: "Active attendance session not found",
      });
    }

    const classroom = await Classroom.findById(attendance.classId).select(
      "students teacherId name subject classCode"
    );
    if (!classroom) {
      return res.status(404).json({
        success: false,
        error: "Classroom not found for this attendance session",
      });
    }

    const resolvedTeacherId = teacherId || attendance.teacherId?.toString();
    if (
      resolvedTeacherId &&
      classroom.teacherId.toString() !== resolvedTeacherId.toString()
    ) {
      return res.status(403).json({
        success: false,
        error: "Unauthorized: You are not the teacher of this classroom",
      });
    }

    attendance.teacherId = attendance.teacherId || classroom.teacherId;
    attendance.endedAt = new Date();
    attendance.isActive = false;
    attendance.status = "completed";
    attendance.totalStudents = classroom.students.length;

    recalculateAttendanceDocument({
      attendance,
      classroomStudentIds: classroom.students,
    });

    await attendance.save();

    return res.status(200).json({
      success: true,
      message: "Attendance session ended successfully",
      attendance,
    });
  } catch (error) {
    console.error("End Attendance Session Error:", error);
    return res.status(500).json({
      success: false,
      error: "Server error while ending attendance session",
    });
  }
};

export const getAttendanceSessionsByClass = async (req, res) => {
  try {
    const classId = extractClassId(req);
    const status = req.query?.status;
    const date = req.query?.date;
    const dateFrom = req.query?.dateFrom;
    const dateTo = req.query?.dateTo;

    if (!classId || !isValidObjectId(classId)) {
      return res.status(400).json({
        success: false,
        error: "A valid classId is required",
      });
    }

    const filters = { classId };
    if (status) {
      filters.status = status;
    }

    if (date) {
      const normalizedDate = normalizeAttendanceDate(date);
      if (!normalizedDate) {
        return res.status(400).json({
          success: false,
          error: "date is invalid",
        });
      }

      const nextDay = new Date(normalizedDate);
      nextDay.setDate(nextDay.getDate() + 1);

      filters.date = { $gte: normalizedDate, $lt: nextDay };
    } else if (dateFrom || dateTo) {
      filters.date = {};
      if (dateFrom) {
        const normalizedFrom = normalizeAttendanceDate(dateFrom);
        if (!normalizedFrom) {
          return res.status(400).json({
            success: false,
            error: "dateFrom is invalid",
          });
        }
        filters.date.$gte = normalizedFrom;
      }

      if (dateTo) {
        const normalizedTo = normalizeAttendanceDate(dateTo);
        if (!normalizedTo) {
          return res.status(400).json({
            success: false,
            error: "dateTo is invalid",
          });
        }
        normalizedTo.setDate(normalizedTo.getDate() + 1);
        filters.date.$lt = normalizedTo;
      }
    }

    const attendances = await Attendance.find(filters)
      .sort({ date: -1, startedAt: -1, createdAt: -1 })
      .populate("teacherId", "name email")
      .populate("classId", "name subject classCode");

    return res.status(200).json({
      success: true,
      count: attendances.length,
      attendance: attendances,
    });
  } catch (error) {
    console.error("Get Attendance Sessions Error:", error);
    return res.status(500).json({
      success: false,
      error: "Server error while fetching attendance sessions",
    });
  }
};

export const getAttendanceSessionById = async (req, res) => {
  try {
    const { attendanceId } = req.params;

    if (!attendanceId || !isValidObjectId(attendanceId)) {
      return res.status(400).json({
        success: false,
        error: "A valid attendanceId is required",
      });
    }

    const attendance = await Attendance.findById(attendanceId)
      .populate("teacherId", "name email")
      .populate("classId", "name subject classCode")
      .populate("attendanceEntries.studentId", "name email")
      .populate("studentsPresent.studentId", "name email");

    if (!attendance) {
      return res.status(404).json({
        success: false,
        error: "Attendance session not found",
      });
    }

    return res.status(200).json({
      success: true,
      attendance,
    });
  } catch (error) {
    console.error("Get Attendance Session By Id Error:", error);
    return res.status(500).json({
      success: false,
      error: "Server error while fetching attendance session",
    });
  }
};

const buildStudentAttendanceSummary = async ({ classId, studentId }) => {
  const studentObjectId = new mongoose.Types.ObjectId(studentId);

  const [classroom, isStudentEnrolled, student, attendanceSessions] = await Promise.all([
    Classroom.findById(classId).select("name subject classCode").lean(),
    Classroom.exists({ _id: classId, students: studentObjectId }),
    User.findById(studentId).select("name email role").lean(),
    Attendance.find({ classId })
      .sort({ date: -1, startedAt: -1 })
      .select("attendanceDate date sessionLabel isActive status createdAt updatedAt startedAt")
      .select("attendanceEntries.studentId attendanceEntries.status attendanceEntries.markedAt attendanceEntries.method attendanceEntries.remarks")
      .lean(),
  ]);

  if (!classroom) {
    return {
      errorStatus: 404,
      error: "Classroom not found",
    };
  }

  if (!student || student.role !== "student") {
    return {
      errorStatus: 404,
      error: "Student not found",
    };
  }

  if (!isStudentEnrolled) {
    return {
      errorStatus: 400,
      error: "Student is not enrolled in this classroom",
    };
  }

  const records = [];

  for (const session of attendanceSessions) {
    const entry = Array.isArray(session.attendanceEntries)
      ? session.attendanceEntries.find(
          (item) => getIdString(item?.studentId) === studentId.toString()
        ) || null
      : null;

    const attendanceDateValue = session.attendanceDate || session.date;
    const attendanceDateKey = toDateKey(attendanceDateValue);
    if (!attendanceDateKey) continue;

    // Avoid false "absent" for the currently running session only.
    // Past sessions should still be visible even if their status was left active.
    const todayKey = toDateKey(new Date());
    if (
      session.isActive &&
      session.status === "active" &&
      !entry &&
      attendanceDateKey === todayKey
    ) {
      continue;
    }

    records.push({
      attendanceId: session._id,
      attendanceDate: attendanceDateValue,
      sessionLabel: session.sessionLabel,
      status: entry?.status || "absent",
      markedAt: entry?.markedAt || null,
      method: entry?.method || null,
      remarks: entry?.remarks || "",
      isActive: session.isActive,
    });
  }

  records.sort((a, b) => {
    const dateDiff =
      new Date(b.attendanceDate || 0).getTime() -
      new Date(a.attendanceDate || 0).getTime();
    if (dateDiff !== 0) return dateDiff;

    const aTime = new Date(a.markedAt || 0).getTime() || 0;
    const bTime = new Date(b.markedAt || 0).getTime() || 0;
    return bTime - aTime;
  });

  const summary = records.reduce(
    (accumulator, record) => {
      if (record.status === "present") accumulator.present += 1;
      else if (record.status === "late") accumulator.late += 1;
      else if (record.status === "excused") accumulator.excused += 1;
      else accumulator.absent += 1;
      return accumulator;
    },
    {
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
    }
  );

  const attendedCount = summary.present + summary.late + summary.excused;
  const totalSessions = records.length;

  return {
    data: {
      classroom: {
        _id: classroom._id,
        name: classroom.name,
        subject: classroom.subject,
        classCode: classroom.classCode,
      },
      student: {
        _id: student._id,
        name: student.name,
        email: student.email,
      },
      summary: {
        totalSessions,
        ...summary,
        attendancePercentage:
          totalSessions > 0 ? roundMetric((attendedCount / totalSessions) * 100) : 0,
      },
      records,
    },
  };
};

export const getStudentAttendanceSummary = async (req, res) => {
  try {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
    res.set("Surrogate-Control", "no-store");

    const classId = extractClassId(req);
    const studentId = req.params?.studentId || req.query?.studentId || req.body?.studentId;

    if (!classId || !isValidObjectId(classId) || !studentId || !isValidObjectId(studentId)) {
      return res.status(400).json({
        success: false,
        error: "Valid classId and studentId are required",
      });
    }

    const summaryPayload = await buildStudentAttendanceSummary({ classId, studentId });
    if (summaryPayload.error) {
      return res.status(summaryPayload.errorStatus).json({
        success: false,
        error: summaryPayload.error,
      });
    }

    return res.status(200).json({
      success: true,
      ...summaryPayload.data,
    });
  } catch (error) {
    console.error("Get Student Attendance Summary Error:", error);
    return res.status(500).json({
      success: false,
      error: "Server error while fetching student attendance summary",
    });
  }
};

export const getMyAttendanceSummary = async (req, res) => {
  try {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
    res.set("Surrogate-Control", "no-store");

    const classId = extractClassId(req);
    const studentId = req.user?._id?.toString();

    if (!classId || !isValidObjectId(classId)) {
      return res.status(400).json({
        success: false,
        error: "A valid classId is required",
      });
    }

    if (!studentId || !isValidObjectId(studentId)) {
      return res.status(401).json({
        success: false,
        error: "Valid student session is required",
      });
    }

    const summaryPayload = await buildStudentAttendanceSummary({ classId, studentId });
    if (summaryPayload.error) {
      return res.status(summaryPayload.errorStatus).json({
        success: false,
        error: summaryPayload.error,
      });
    }

    return res.status(200).json({
      success: true,
      ...summaryPayload.data,
    });
  } catch (error) {
    console.error("Get My Attendance Summary Error:", error);
    return res.status(500).json({
      success: false,
      error: "Server error while fetching student attendance summary",
    });
  }
};

export const getActiveAttendanceSession = async (req, res) => {
  try {
    const classId = extractClassId(req);

    if (!classId || !isValidObjectId(classId)) {
      return res.status(400).json({
        success: false,
        error: "A valid classId is required",
      });
    }

    const attendance = await Attendance.findOne({
      classId,
      isActive: true,
    })
      .sort({ startedAt: -1, createdAt: -1 })
      .populate("teacherId", "name email")
      .populate("classId", "name subject classCode");

    if (!attendance) {
      return res.status(404).json({
        success: false,
        error: "No active attendance session found",
      });
    }

    return res.status(200).json({
      success: true,
      attendance,
    });
  } catch (error) {
    console.error("Get Active Attendance Session Error:", error);
    return res.status(500).json({
      success: false,
      error: "Server error while fetching active attendance session",
    });
  }
};

export const verifyFaceAndMarkAttendance = async (req, res) => {
  try {
    const classId = extractClassId(req);
    const studentId = req.user?._id?.toString();
    const { token, status = "present", method = "system", latitude, longitude } = req.body;
    const file = req.file;

    if (!classId || !studentId || !file) {
      return res.status(400).json({ success: false, error: "classId, token, and face image are required" });
    }

    // ── Config from env ─────────────────────────────────────────────────
    const SIMILARITY_THRESHOLD = parseFloat(process.env.SIMILARITY_THRESHOLD) || 0.10;
    const AUDIT_SAMPLE_RATE = parseFloat(process.env.AUDIT_SAMPLE_RATE) || 0.05;

    // 1. Basic Attendance Session Checks
    const attendance = await findAttendanceSession({ classId, isActiveOnly: true });
    if (!attendance) return res.status(404).json({ success: false, error: "Active attendance session not found" });

    // 2. Geofencing Check
    if (attendance.teacherLocation && attendance.teacherLocation.lat !== null && attendance.teacherLocation.lng !== null) {
      if (!latitude || !longitude) {
         return res.status(400).json({ success: false, error: "Location permission is required to mark attendance." });
      }

      const studentLat = parseFloat(latitude);
      const studentLng = parseFloat(longitude);

      if (isNaN(studentLat) || isNaN(studentLng)) {
        return res.status(400).json({ success: false, error: "Invalid location data received." });
      }

      const R = 6371e3;
      const lat1 = (attendance.teacherLocation.lat * Math.PI) / 180;
      const lat2 = (studentLat * Math.PI) / 180;
      const deltaLat = (studentLat - attendance.teacherLocation.lat) * Math.PI / 180;
      const deltaLng = (studentLng - attendance.teacherLocation.lng) * Math.PI / 180;

      const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
                Math.cos(lat1) * Math.cos(lat2) *
                Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c;

      if (distance > 50) {
        return res.status(403).json({ 
          success: false, 
          error: `You are not in the classroom. Detected distance: ${Math.round(distance)}m from teacher.`,
          distance: Math.round(distance)
        });
      }
    }

    // 3. Process Image for Face Detection via FaceNet Microservice
    let descriptor;
    try {
      descriptor = await extractEmbedding(file.buffer);
    } catch (err) {
      const errStatus = err.statusCode || 400;
      return res.status(errStatus).json({ success: false, error: err.message || "Face detection failed." });
    }

    // 4. Query Pinecone with strict studentId filter
    const index = getPineconeIndex();
    const queryResponse = await index.query({
      vector: descriptor,
      topK: 1,
      filter: { studentId: { '$eq': studentId } },
      includeMetadata: true
    });

    const studentInfo = await User.findById(studentId);
    let similarityScore = 0;
    const isRecentlyRegistered = studentInfo?.isFaceRegistered && (new Date() - studentInfo.updatedAt) < 15000;

    if (!queryResponse.matches || queryResponse.matches.length === 0) {
      if (isRecentlyRegistered) {
        similarityScore = 1.0;
      } else {
        // No registered face found — audit + reject
        const auditUrl = await uploadAuditImage(file.buffer, {
        studentId,
        reason: "low_similarity",
      });

      // Fire-and-forget: create audit log
      AuditLog.create({
        studentId,
        attendanceId: attendance._id,
        classId,
        similarityScore: 0,
        status: "no_match",
        triggerReason: "low_similarity",
        auditImageUrl: auditUrl,
        metadata: {
          method,
          threshold: SIMILARITY_THRESHOLD,
          ipAddress: req.ip || req.connection?.remoteAddress || null,
          userAgent: req.headers?.["user-agent"] || null,
        },
      }).catch((err) => console.error("[Audit] Failed to create log:", err.message));

      return res.status(400).json({ 
        success: false, 
        error: "Face not recognized. Please ensure you have registered your face correctly in your profile." 
      });
      }
    } else {
      const match = queryResponse.matches[0];
      similarityScore = match.score;
    }

    // 5. Audit Decision — BEFORE marking attendance
    const { shouldAudit, reason: auditReason } = shouldTriggerAudit(
      similarityScore,
      SIMILARITY_THRESHOLD,
      AUDIT_SAMPLE_RATE
    );

    let auditImageUrl = null;
    if (shouldAudit) {
      auditImageUrl = await uploadAuditImage(file.buffer, {
        studentId,
        reason: auditReason,
      });

      // Fire-and-forget: create audit log
      AuditLog.create({
        studentId,
        attendanceId: attendance._id,
        classId,
        similarityScore,
        status: similarityScore >= SIMILARITY_THRESHOLD ? "match" : "no_match",
        triggerReason: auditReason,
        auditImageUrl,
        metadata: {
          method,
          threshold: SIMILARITY_THRESHOLD,
          ipAddress: req.ip || req.connection?.remoteAddress || null,
          userAgent: req.headers?.["user-agent"] || null,
        },
      }).catch((err) => console.error("[Audit] Failed to create log:", err.message));
    }

    // 6. STRICT CHECK: Score >= threshold (default 0.75)
    if (similarityScore < SIMILARITY_THRESHOLD) {
      return res.status(400).json({ 
        success: false, 
        error: `Face verification failed. Confidence: ${(similarityScore * 100).toFixed(1)}%. Please try again with better lighting.`,
        similarityScore,
      });
    }

    // 7. Mark Attendance — Face verified successfully
    const existingEntryIndex = attendance.attendanceEntries.findIndex(
      (entry) => entry.studentId.toString() === studentId
    );

    const entryPayload = {
      studentId,
      status,
      markedAt: new Date(),
      markedBy: studentId,
      method,
      remarks: `Face verified (confidence: ${(similarityScore * 100).toFixed(1)}%)`,
      similarityScore,
      auditImageUrl,
    };

    if (existingEntryIndex >= 0) {
      attendance.attendanceEntries[existingEntryIndex] = entryPayload;
    } else {
      attendance.attendanceEntries.push(entryPayload);
    }

    const classroom = await Classroom.findById(classId).select("students");
    recalculateAttendanceDocument({ attendance, classroomStudentIds: classroom.students });

    await attendance.save();

    return res.status(200).json({
      success: true,
      message: "Face verified and attendance marked securely",
      entry: entryPayload,
      similarityScore,
    });

  } catch (error) {
    console.error("Face Verification Error:", error);
    return res.status(500).json({ success: false, error: "Server error during face verification" });
  }
};

export const saveAttendanceRecord = async (req, res) => {
  try {
    const classId = extractClassId(req);
    const teacherId = extractTeacherId(req);
    const { date, attendance: attendanceOverrides } = req.body;

    if (!classId || !teacherId) {
      return res.status(400).json({
        success: false,
        error: "classId and teacherId are required",
      });
    }

    if (!date) {
      return res.status(400).json({
        success: false,
        error: "date is required",
      });
    }

    if (!attendanceOverrides || typeof attendanceOverrides !== "object") {
      return res.status(400).json({
        success: false,
        error: "attendance object is required",
      });
    }

    const classroom = await getOwnedClassroom({ classId, teacherId });
    if (classroom === false) {
      return res.status(403).json({
        success: false,
        error: "Unauthorized: You are not the teacher of this classroom",
      });
    }

    if (!classroom) {
      return res.status(404).json({
        success: false,
        error: "Classroom not found",
      });
    }

    const normalizedDate = normalizeAttendanceDate(date);
    if (!normalizedDate) {
      return res.status(400).json({
        success: false,
        error: "Invalid date format",
      });
    }

    const nextDay = new Date(normalizedDate);
    nextDay.setDate(nextDay.getDate() + 1);

    // Always prefer the session that belongs to the selected date.
    let attendance = await Attendance.findOne({
      classId,
      date: { $gte: normalizedDate, $lt: nextDay },
    }).sort({ isActive: -1, updatedAt: -1, createdAt: -1 });

    // Only fall back to an active session when saving today's attendance
    // and no session exists yet for today.
    if (!attendance && toDateKey(normalizedDate) === toDateKey(new Date())) {
      attendance = await Attendance.findOne({
        classId,
        isActive: true,
      }).sort({ startedAt: -1, updatedAt: -1, createdAt: -1 });
    }

    const existingEntryByStudent = new Map(
      (attendance?.attendanceEntries || []).map((entry) => [
        getIdString(entry.studentId),
        entry,
      ])
    );

    const attendanceEntries = [];
    const studentsPresent = [];
    let presentCount = 0;
    let absentCount = 0;

    for (const student of classroom.students) {
      const studentId = student._id || student;
      const studentIdStr = getIdString(studentId);
      const isPresent = attendanceOverrides[studentIdStr] === "P";
      const status = isPresent ? "present" : "absent";
      const existingEntry = existingEntryByStudent.get(studentIdStr);

      // Preserve original QR method for students already marked through QR.
      const method =
        isPresent && validMethods.has(existingEntry?.method)
          ? existingEntry.method
          : "manual";

      const markedAt =
        isPresent && existingEntry?.method === "qr" && existingEntry?.markedAt
          ? existingEntry.markedAt
          : new Date();

      if (isPresent) presentCount += 1;
      else absentCount += 1;

      attendanceEntries.push({
        studentId,
        status,
        markedAt,
        markedBy: teacherId,
        method,
        remarks: "",
      });

      if (isPresent) {
        studentsPresent.push({
          studentId,
          scannedAt: method === "qr" ? markedAt : new Date(),
          markedAt,
          method,
        });
      }
    }

    const summary = {
      totalStudents: classroom.students.length,
      presentCount,
      absentCount,
      lateCount: 0,
      excusedCount: 0,
    };

    if (attendance) {
      attendance.classId = classId;
      attendance.teacherId = teacherId;
      attendance.date = normalizedDate;
      attendance.attendanceDate = normalizedDate;
      attendance.attendanceEntries = attendanceEntries;
      attendance.studentsPresent = studentsPresent;
      attendance.summary = summary;
      attendance.totalStudents = classroom.students.length;
      attendance.isActive = false;
      attendance.status = "completed";
      attendance.endedAt = new Date();
    } else {
      attendance = new Attendance({
        classId,
        teacherId,
        date: normalizedDate,
        attendanceDate: normalizedDate,
        attendanceEntries,
        studentsPresent,
        summary,
        totalStudents: classroom.students.length,
        isActive: false,
        startedAt: new Date(),
        status: "completed",
        endedAt: new Date(),
      });
    }

    attendance.markModified("attendanceEntries");

    const savedAttendance = await attendance.save();

    return res.status(200).json({
      success: true,
      message: "Attendance record saved successfully",
      attendance: savedAttendance,
    });
  } catch (error) {
    console.error("[AttendanceController] Save Attendance Record Error:", error);
    return res.status(500).json({
      success: false,
      error: "Server error while saving attendance record",
    });
  }
};
