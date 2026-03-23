import mongoose from "mongoose";
import Attendance, {
  ATTENDANCE_ENTRY_STATUSES,
  ATTENDANCE_MARKING_METHODS,
} from "../models/Attendance.js";
import Classroom from "../models/Classroom.js";
import User from "../models/User.js";

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
