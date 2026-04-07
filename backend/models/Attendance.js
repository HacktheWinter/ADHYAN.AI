import mongoose from "mongoose";

export const ATTENDANCE_ENTRY_STATUSES = [
  "present",
  "absent",
  "late",
  "excused",
];

export const ATTENDANCE_MARKING_METHODS = ["qr", "manual", "system"];

const attendedStatuses = new Set(["present", "late", "excused"]);

const normalizeAttendanceDate = (value) => {
  const isDateOnlyString =
    typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.trim());
  const date = isDateOnlyString
    ? new Date(`${value.trim()}T00:00:00`)
    : value
      ? new Date(value)
      : new Date();
  if (Number.isNaN(date.getTime())) return new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};

const getStudentKey = (studentId) => {
  if (!studentId) return null;
  if (typeof studentId === "string") return studentId;
  if (studentId instanceof mongoose.Types.ObjectId) return studentId.toString();
  if (studentId?._id) return studentId._id.toString();
  return studentId.toString();
};

const attendancePresenceSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    scannedAt: {
      type: Date,
      default: Date.now,
    },
    markedAt: {
      type: Date,
      default: Date.now,
    },
    method: {
      type: String,
      enum: ATTENDANCE_MARKING_METHODS,
      default: "qr",
    },
  },
  { _id: false }
);

const attendanceEntrySchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ATTENDANCE_ENTRY_STATUSES,
      default: "present",
    },
    markedAt: {
      type: Date,
      default: Date.now,
    },
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    method: {
      type: String,
      enum: ATTENDANCE_MARKING_METHODS,
      default: "qr",
    },
    remarks: {
      type: String,
      default: "",
      trim: true,
      maxlength: 300,
    },
  },
  { _id: false }
);

const attendanceSummarySchema = new mongoose.Schema(
  {
    totalStudents: {
      type: Number,
      default: 0,
      min: 0,
    },
    presentCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    absentCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    lateCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    excusedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: false }
);

const attendanceSchema = new mongoose.Schema(
  {
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Classroom",
      required: true,
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    date: {
      type: Date,
      default: Date.now,
      required: true,
    },
    attendanceDate: {
      type: Date,
      default: Date.now,
      required: true,
    },
    sessionLabel: {
      type: String,
      default: "",
      trim: true,
      maxlength: 100,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    endedAt: {
      type: Date,
      default: null,
    },
    studentsPresent: {
      type: [attendancePresenceSchema],
      default: [],
    },
    attendanceEntries: {
      type: [attendanceEntrySchema],
      default: [],
    },
    summary: {
      type: attendanceSummarySchema,
      default: () => ({
        totalStudents: 0,
        presentCount: 0,
        absentCount: 0,
        lateCount: 0,
        excusedCount: 0,
      }),
    },
    totalStudents: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ["draft", "active", "completed", "cancelled"],
      default: "active",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

attendanceSchema.index({ classId: 1, date: -1 });
attendanceSchema.index({ classId: 1, isActive: 1 });
attendanceSchema.index({ classId: 1, isActive: 1, startedAt: -1 });
attendanceSchema.index({ teacherId: 1, date: -1 });
attendanceSchema.index({ "attendanceEntries.studentId": 1, date: -1 });

attendanceSchema.pre("validate", function syncAttendanceShape(next) {
  const normalizedDate = normalizeAttendanceDate(
    this.attendanceDate || this.date || this.startedAt
  );

  this.date = normalizedDate;
  this.attendanceDate = normalizedDate;

  const entryMap = new Map();
  for (const entry of this.attendanceEntries || []) {
    const studentKey = getStudentKey(entry.studentId);
    if (!studentKey) continue;

    entryMap.set(studentKey, {
      studentId: entry.studentId,
      status: entry.status || "present",
      markedAt: entry.markedAt || new Date(),
      markedBy: entry.markedBy || null,
      method: entry.method || "qr",
      remarks: entry.remarks || "",
    });
  }

  for (const presentRecord of this.studentsPresent || []) {
    const studentKey = getStudentKey(presentRecord.studentId);
    if (!studentKey) continue;

    if (!entryMap.has(studentKey)) {
      entryMap.set(studentKey, {
        studentId: presentRecord.studentId,
        status: "present",
        markedAt: presentRecord.markedAt || presentRecord.scannedAt || new Date(),
        markedBy: null,
        method: presentRecord.method || "qr",
        remarks: "",
      });
    }
  }

  const normalizedEntries = Array.from(entryMap.values());
  this.attendanceEntries = normalizedEntries;

  this.studentsPresent = normalizedEntries
    .filter((entry) => attendedStatuses.has(entry.status))
    .map((entry) => ({
      studentId: entry.studentId,
      scannedAt: entry.markedAt || new Date(),
      markedAt: entry.markedAt || new Date(),
      method: entry.method || "qr",
    }));

  const counts = {
    presentCount: 0,
    absentCount: 0,
    lateCount: 0,
    excusedCount: 0,
  };

  for (const entry of normalizedEntries) {
    if (entry.status === "late") counts.lateCount += 1;
    else if (entry.status === "absent") counts.absentCount += 1;
    else if (entry.status === "excused") counts.excusedCount += 1;
    else counts.presentCount += 1;
  }

  const totalStudents = Math.max(
    this.totalStudents || 0,
    normalizedEntries.length,
    this.studentsPresent.length
  );

  this.totalStudents = totalStudents;
  this.summary = {
    totalStudents,
    ...counts,
  };

  if (this.endedAt && this.isActive) {
    this.isActive = false;
  }

  if (this.isActive && this.status !== "draft") {
    this.status = "active";
  }

  if (!this.isActive && this.status === "active") {
    this.status = "completed";
  }

  next();
});

const Attendance = mongoose.model("Attendance", attendanceSchema);
export default Attendance;
