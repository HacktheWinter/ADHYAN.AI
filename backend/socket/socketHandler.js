import Attendance from "../models/Attendance.js";
import Classroom from "../models/Classroom.js";
import User from "../models/User.js";
import mongoose from "mongoose";
import crypto from "crypto";

// Keep track of active QR tokens per class: classId -> { token, startedAt }
const activeQrSessions = new Map();

const ATTENDANCE_ENTRY_STATUSES = ["absent", "present", "late", "excused"];
const ATTENDANCE_MARKING_METHODS = ["qr", "manual", "system"];

const normalizeAttendanceDate = (value) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
};

const getIdString = (value) => {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (value?._id) return value._id.toString();
  return value.toString();
};

export const setupSocketHandler = (io) => {
  io.on("connection", (socket) => {
    console.log(`[Socket] Client ${socket.id} connected`);

    // ────────────────────────────────────────────────────────────────
    // Classroom & Attendance Session Management
    // ────────────────────────────────────────────────────────────────

    /**
     * join_class: Student/Teacher joins a class
     * Payload: classId
     */
    socket.on("join_class", (classPayload) => {
      const classId =
        typeof classPayload === "object" && classPayload !== null
          ? classPayload.classId
          : classPayload;

      if (!classId) return socket.emit("error", "classId required");

      socket.join(`class_${classId}`);
      console.log(`[Socket] ${socket.id} joined class ${classId}`);

      // Notify others in the class about active users
      io.to(`class_${classId}`).emit("active_users_update", {
        count: io.sockets.adapter.rooms.get(`class_${classId}`)?.size || 0,
      });
    });

    /**
     * leave_class: Student/Teacher leaves a class
     * Payload: classId
     */
    socket.on("leave_class", (classPayload) => {
      const classId =
        typeof classPayload === "object" && classPayload !== null
          ? classPayload.classId
          : classPayload;

      if (!classId) return;

      socket.leave(`class_${classId}`);
      console.log(`[Socket] ${socket.id} left class ${classId}`);

      io.to(`class_${classId}`).emit("active_users_update", {
        count: io.sockets.adapter.rooms.get(`class_${classId}`)?.size || 0,
      });
    });

    // ────────────────────────────────────────────────────────────────
    // Attendance Session Events (Real-time QR/Manual)
    // ────────────────────────────────────────────────────────────────

    socket.on("start_attendance", async ({ classId, token }) => {
      try {
        if (!classId || !token) {
          return;
        }

        activeQrSessions.set(classId, {
          token,
          startedAt: Date.now(),
          startedBySocketId: socket.id,
        });

        let session = await Attendance.findOne({ classId, isActive: true }).sort({
          startedAt: -1,
        });

        if (!session) {
          const classroom = await Classroom.findById(classId).select(
            "teacherId students"
          );
          if (!classroom) {
            socket.emit("attendance_error", { message: "Classroom not found." });
            return;
          }

          const today = new Date();
          today.setHours(0, 0, 0, 0);

          session = new Attendance({
            classId,
            teacherId: classroom.teacherId,
            date: today,
            attendanceDate: today,
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
            attendanceEntries: [],
            studentsPresent: [],
          });

          await session.save();
        }
      } catch (error) {
        console.error("[Socket] Error in start_attendance:", error);
        socket.emit("attendance_error", {
          message: "Failed to start attendance session.",
        });
      }
    });

    socket.on("refresh_token", ({ classId, token }) => {
      if (!classId || !token) {
        return;
      }

      if (activeQrSessions.has(classId)) {
        const session = activeQrSessions.get(classId);
        activeQrSessions.set(classId, {
          ...session,
          token,
        });
      }
    });

    socket.on("stop_attendance", async (classPayload) => {
      const classId =
        typeof classPayload === "object" && classPayload !== null
          ? classPayload.classId
          : classPayload;

      if (!classId) {
        return;
      }

      activeQrSessions.delete(classId);

      // Keep DB state aligned with socket state so scans stop immediately
      // even when clients are connected through different server instances.
      try {
        const activeSession = await Attendance.findOne({ classId, isActive: true }).sort({
          startedAt: -1,
        });
        if (activeSession) {
          activeSession.isActive = false;
          activeSession.status = "completed";
          activeSession.endedAt = new Date();
          await activeSession.save();
        }
      } catch (error) {
        console.error("[Socket] Error in stop_attendance:", error);
      }
    });

    socket.on("mark_attendance", async ({ classId, studentId, studentName, token }) => {
      try {
        if (!classId || !token) {
          socket.emit("attendance_error", {
            message: "QR attendance session is not active.",
          });
          return;
        }

        // Step 1 - Validate token
        const qrSecretKey = process.env.QR_SECRET_KEY || "default_secret_key";
        let isTokenValid = false;

        for (const offset of [0, -1]) {
          const timeWindow = Math.floor(Date.now() / 20000) + offset;
          const expected = crypto
            .createHash("sha256")
            .update(classId + qrSecretKey + timeWindow)
            .digest("hex");

          if (expected === token) {
            isTokenValid = true;
            break;
          }
        }

        if (!isTokenValid) {
          socket.emit("attendance_error", {
            message: "QR code has expired. Please scan the latest QR code.",
          });
          return;
        }

        // Step 2 - Validate ObjectIds
        if (
          !mongoose.Types.ObjectId.isValid(classId) ||
          !mongoose.Types.ObjectId.isValid(studentId)
        ) {
          socket.emit("attendance_error", {
            message: "Invalid class or student ID.",
          });
          return;
        }

        // Step 3 - Validate class and enrollment
        const classroom = await Classroom.findById(classId).select("name teacherId students");
        if (!classroom) {
          socket.emit("attendance_error", { message: "Classroom not found." });
          return;
        }

        const isEnrolled = classroom.students.some(
          (enrolledId) => enrolledId.toString() === studentId.toString()
        );
        if (!isEnrolled) {
          socket.emit("attendance_error", {
            message: "You are not enrolled in this class.",
          });
          return;
        }

        // Step 4 - Find an active DB-backed session.
        // This makes scanning resilient even when teacher and student hit
        // different server instances (where in-memory maps are not shared).
        let session = await Attendance.findOne({ classId, isActive: true }).sort({
          startedAt: -1,
        });
        if (!session) {
          socket.emit("attendance_error", {
            message: "QR attendance is not currently active for this class.",
          });
          return;
        }

        // Step 5 - Duplicate check
        const duplicatePresent = (session.attendanceEntries || []).some(
          (entry) =>
            entry.studentId?.toString() === studentId.toString() &&
            entry.status === "present"
        );
        if (duplicatePresent) {
          socket.emit("attendance_error", {
            message: "Attendance already marked for this session.",
          });
          return;
        }

        // Step 6 - Build entry objects
        const now = new Date();
        const studentObjectId = new mongoose.Types.ObjectId(studentId);
        const attendanceEntry = {
          studentId: studentObjectId,
          status: "present",
          markedAt: now,
          markedBy: studentObjectId,
          method: "qr",
          remarks: "",
        };

        const existingEntryIndex = (session.attendanceEntries || []).findIndex(
          (entry) => entry.studentId?.toString() === studentId.toString()
        );
        if (existingEntryIndex >= 0) {
          session.attendanceEntries[existingEntryIndex] = attendanceEntry;
        } else {
          session.attendanceEntries.push(attendanceEntry);
        }

        const studentsPresentEntry = {
          studentId: studentObjectId,
          scannedAt: now,
          markedAt: now,
          method: "qr",
        };

        const existingPresentIndex = (session.studentsPresent || []).findIndex(
          (entry) => entry.studentId?.toString() === studentId.toString()
        );
        if (existingPresentIndex >= 0) {
          session.studentsPresent[existingPresentIndex] = studentsPresentEntry;
        } else {
          session.studentsPresent.push(studentsPresentEntry);
        }

        // Step 7 - Recalculate summary
        let presentCount = 0;
        let absentCount = 0;
        let lateCount = 0;
        let excusedCount = 0;

        for (const entry of session.attendanceEntries || []) {
          if (entry.status === "present") presentCount += 1;
          else if (entry.status === "absent") absentCount += 1;
          else if (entry.status === "late") lateCount += 1;
          else if (entry.status === "excused") excusedCount += 1;
        }

        session.summary = {
          totalStudents: classroom.students.length,
          presentCount,
          absentCount,
          lateCount,
          excusedCount,
        };
        session.totalStudents = classroom.students.length;

        // Step 8 - Mark modified and save
        session.markModified("attendanceEntries");
        session.markModified("studentsPresent");
        session.markModified("summary");
        await session.save();

        // Step 9 - Success to current socket
        socket.emit("attendance_success", {
          message: `Attendance marked for ${classroom.name}!`,
        });

        // Step 10 - Broadcast update to classroom room
        io.to(`class_${classId}`).emit("attendance_update", {
          studentId,
          studentName,
          presentCount,
        });
      } catch (error) {
        console.error("[Socket] Error in mark_attendance:", error);
        socket.emit("attendance_error", {
          message: "Failed to mark attendance.",
        });
      }
    });

    // ────────────────────────────────────────────────────────────────
    // Doubt Management Events
    // ────────────────────────────────────────────────────────────────

    socket.on("new_doubt", (doubt) => {
      if (doubt?.classId) {
        io.to(doubt.classId).emit("doubt_added", doubt);
        console.log(`[Socket] New doubt in class ${doubt.classId}`);
      }
    });

    socket.on("new_reply", ({ classId, doubtId, reply }) => {
      if (classId && doubtId && reply) {
        io.to(classId).emit("reply_added", { doubtId, reply });
        console.log(`[Socket] New reply to doubt ${doubtId} in class ${classId}`);
      }
    });

    // ────────────────────────────────────────────────────────────────
    // Cleanup on disconnect
    // ────────────────────────────────────────────────────────────────

    socket.on("disconnecting", () => {
      for (const room of socket.rooms) {
        if (!room.startsWith("class_")) continue;

        const roomSize = io.sockets.adapter.rooms.get(room)?.size || 1;
        io.to(room).emit("active_users_update", {
          count: Math.max(roomSize - 1, 0),
        });
      }

      // Remove QR sessions owned by this socket to avoid stale active sessions.
      for (const [classId, session] of activeQrSessions.entries()) {
        if (session?.startedBySocketId === socket.id) {
          activeQrSessions.delete(classId);

          // Best-effort DB close for sessions owned by this socket.
          Attendance.findOne({ classId, isActive: true })
            .sort({ startedAt: -1 })
            .then((activeSession) => {
              if (!activeSession) return;
              activeSession.isActive = false;
              activeSession.status = "completed";
              activeSession.endedAt = new Date();
              return activeSession.save();
            })
            .catch((error) => {
              console.error("[Socket] Error closing session on disconnect:", error);
            });
        }
      }
    });

    socket.on("disconnect", (reason) => {
      // Avoid noisy logs for expected client-side disconnects (tab switch/navigation)
      if (reason !== "client namespace disconnect") {
        console.log(`[Socket] Client ${socket.id} disconnected (${reason})`);
      }
    });

    socket.on("error", (error) => {
      console.error(`[Socket] Client ${socket.id} error:`, error);
    });
  });
};

export default setupSocketHandler;
