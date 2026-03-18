import Attendance from "../models/Attendance.js";
import Classroom from "../models/Classroom.js";
import User from "../models/User.js";
import mongoose from "mongoose";

// Keep track of active attendance sessions: classId -> { attendanceId, teacherSocket, createdAt }
const activeSessions = new Map();

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
     * Payload: { classId, studentId, studentName }
     */
    socket.on("join_class", ({ classId, studentId, studentName }) => {
      if (!classId) return socket.emit("error", "classId required");

      socket.join(`class:${classId}`);
      console.log(`[Socket] ${socket.id} joined class ${classId}`);

      // Notify others in the class about active users
      io.to(`class:${classId}`).emit("active_users_update", {
        count: io.sockets.adapter.rooms.get(`class:${classId}`)?.size || 0,
      });
    });

    /**
     * leave_class: Student/Teacher leaves a class
     * Payload: { classId }
     */
    socket.on("leave_class", ({ classId }) => {
      if (!classId) return;

      socket.leave(`class:${classId}`);
      console.log(`[Socket] ${socket.id} left class ${classId}`);

      io.to(`class:${classId}`).emit("active_users_update", {
        count: io.sockets.adapter.rooms.get(`class:${classId}`)?.size || 0,
      });
    });

    // ────────────────────────────────────────────────────────────────
    // Attendance Session Events (Real-time QR/Manual)
    // ────────────────────────────────────────────────────────────────

    /**
     * start_attendance: Teacher starts an attendance session (QR mode)
     * Payload: { classId, token }
     */
    socket.on("start_attendance", async ({ classId, token }) => {
      try {
        if (!classId) {
          return socket.emit(
            "attendance_error",
            "classId required"
          );
        }

        // Find the active attendance session for this class
        const attendance = await Attendance.findOne({
          classId,
          isActive: true,
        }).sort({ startedAt: -1 });

        if (!attendance) {
          // Log warning but don't fail - frontend will have called /session/start before this
          console.warn(
            `[Socket] No active attendance session found for class ${classId}`
          );
          // Still store the session tracker so we know QR is active
          activeSessions.set(classId, {
            attendanceId: null,
            token,
            teacherSocketId: socket.id,
            createdAt: new Date(),
          });
          return socket.emit("attendance_started", {
            classId,
            token,
            message: "QR attendance mode active (no DB session yet)",
          });
        }

        // Store active session info
        activeSessions.set(classId, {
          attendanceId: attendance._id.toString(),
          token,
          teacherSocketId: socket.id,
          createdAt: new Date(),
        });

        // Notify all users in the class that attendance has started
        io.to(`class:${classId}`).emit("attendance_started", {
          classId,
          token,
          sessionId: attendance._id.toString(),
          message: "Attendance session is now active - begin scanning",
        });

        console.log(
          `[Socket] Attendance started for class ${classId}, session ${attendance._id}`
        );
      } catch (error) {
        console.error("[Socket] Error in start_attendance:", error);
        socket.emit("attendance_error", `Failed to start attendance: ${error.message}`);
      }
    });

    /**
     * stop_attendance: Teacher ends an attendance session
     * Payload: { classId }
     */
    socket.on("stop_attendance", async ({ classId }) => {
      try {
        if (!classId) {
          return socket.emit(
            "attendance_error",
            "classId required"
          );
        }

        const sessionData = activeSessions.get(classId);
        if (!sessionData || !sessionData.attendanceId) {
          // Session wasn't tracked, find it from DB
          const attendance = await Attendance.findOne({
            classId,
            isActive: true,
          }).sort({ startedAt: -1 });

          if (attendance) {
            // Mark absent all students who didn't mark present
            const classroom = await Classroom.findById(classId);
            if (classroom) {
              const presentIds = new Set(
                attendance.attendanceEntries
                  .filter((e) => e.status !== "absent")
                  .map((e) => getIdString(e.studentId))
              );

              for (const studentId of classroom.students) {
                const studentKey = getIdString(studentId);
                if (!presentIds.has(studentKey)) {
                  const existingEntry = attendance.attendanceEntries.find(
                    (e) => getIdString(e.studentId) === studentKey
                  );
                  if (!existingEntry) {
                    attendance.attendanceEntries.push({
                      studentId,
                      status: "absent",
                      markedAt: new Date(),
                      markedBy: null,
                      method: "system",
                      remarks: "Marked absent when session ended",
                    });
                  }
                }
              }
            }

            attendance.isActive = false;
            attendance.status = "completed";
            attendance.endedAt = new Date();
            await attendance.save();

            activeSessions.delete(classId);

            io.to(`class:${classId}`).emit("attendance_stopped", {
              classId,
              sessionId: attendance._id.toString(),
              message: "Attendance session ended",
            });

            console.log(
              `[Socket] Attendance stopped for class ${classId}, session ${attendance._id}`
            );
          }
        } else {
          // We have the session data, update the DB record
          const attendance = await Attendance.findById(sessionData.attendanceId);
          if (attendance) {
            // Mark absent all students who didn't mark present
            const classroom = await Classroom.findById(classId);
            if (classroom) {
              const presentIds = new Set(
                attendance.attendanceEntries
                  .filter((e) => e.status !== "absent")
                  .map((e) => getIdString(e.studentId))
              );

              for (const studentId of classroom.students) {
                const studentKey = getIdString(studentId);
                if (!presentIds.has(studentKey)) {
                  const existingEntry = attendance.attendanceEntries.find(
                    (e) => getIdString(e.studentId) === studentKey
                  );
                  if (!existingEntry) {
                    attendance.attendanceEntries.push({
                      studentId,
                      status: "absent",
                      markedAt: new Date(),
                      markedBy: null,
                      method: "system",
                      remarks: "Marked absent when session ended",
                    });
                  }
                }
              }
            }

            attendance.isActive = false;
            attendance.status = "completed";
            attendance.endedAt = new Date();
            await attendance.save();

            activeSessions.delete(classId);

            io.to(`class:${classId}`).emit("attendance_stopped", {
              classId,
              sessionId: attendance._id.toString(),
              message: "Attendance session ended",
            });

            console.log(
              `[Socket] Attendance stopped for class ${classId}, session ${attendance._id}`
            );
          }
        }
      } catch (error) {
        console.error("[Socket] Error in stop_attendance:", error);
        socket.emit("attendance_error", `Failed to stop attendance: ${error.message}`);
      }
    });

    socket.on("mark_attendance", async ({ classId, studentId, studentName, token }) => {
      try {
        if (!classId || !studentId) {
          return socket.emit(
            "attendance_error",
            "classId and studentId required"
          );
        }

        // Ensure studentId is a valid ObjectId string
        if (!mongoose.Types.ObjectId.isValid(studentId)) {
          return socket.emit("attendance_error", "Invalid studentId format");
        }

        // Find or get active session
        let sessionData = activeSessions.get(classId);
        let attendance = null;

        if (sessionData?.attendanceId) {
          // Use cached session ID
          attendance = await Attendance.findById(sessionData.attendanceId);
        } else {
          // Look up active attendance in DB
          attendance = await Attendance.findOne({
            classId,
            isActive: true,
          }).sort({ startedAt: -1 });
        }

        if (!attendance || !attendance.isActive) {
          return socket.emit("attendance_error", "No active attendance session");
        }

        // Verify student is in the class
        const classroom = await Classroom.findById(classId).select("students");
        if (!classroom) {
          return socket.emit("attendance_error", "Classroom not found");
        }

        const studentIds = classroom.students.map((s) => getIdString(s));
        if (!studentIds.includes(getIdString(studentId))) {
          return socket.emit("attendance_error", "Student not enrolled in this class");
        }

        // Find or create attendance entry for this student
        const existingEntryIndex = attendance.attendanceEntries.findIndex(
          (e) => getIdString(e.studentId) === getIdString(studentId)
        );

        // Convert studentId to ObjectId for storage
        const studentObjectId = new mongoose.Types.ObjectId(studentId);

        if (existingEntryIndex >= 0) {
          // Update existing entry
          const entry = attendance.attendanceEntries[existingEntryIndex];
          entry.status = "present";
          entry.markedAt = new Date();
          entry.method = "qr";
          entry.markedBy = studentObjectId;
        } else {
          // Create new entry with ObjectId
          attendance.attendanceEntries.push({
            studentId: studentObjectId,
            status: "present",
            markedAt: new Date(),
            markedBy: studentObjectId,
            method: "qr",
            remarks: "",
          });
        }

        // Update studentsPresent array
        const presentEntry = {
          studentId: studentObjectId,
          scannedAt: new Date(),
          markedAt: new Date(),
          method: "qr",
        };

        const existingPresentIndex = attendance.studentsPresent.findIndex(
          (p) => getIdString(p.studentId) === getIdString(studentId)
        );

        if (existingPresentIndex >= 0) {
          attendance.studentsPresent[existingPresentIndex] = presentEntry;
        } else {
          attendance.studentsPresent.push(presentEntry);
        }

        // Save to DB
        const savedAttendance = await attendance.save();
        console.log(`[Socket] Attendance saved for student ${studentId} in class ${classId}`);

        // Update cache
        if (sessionData) {
          sessionData.lastUpdate = new Date();
        }

        // Broadcast to classroom that student marked attendance
        io.to(`class:${classId}`).emit("attendance_update", {
          classId,
          studentId,
          studentName,
          status: "present",
          timestamp: new Date(),
          message: `${studentName} marked present`,
        });

        // Confirm to the student
        socket.emit("attendance_success", {
          message: "Attendance marked successfully",
          studentId,
          timestamp: new Date(),
        });

        console.log(
          `[Socket] ${studentName} (${studentId}) marked present in class ${classId}`
        );
      } catch (error) {
        console.error("[Socket] Error in mark_attendance:", error);
        socket.emit(
          "attendance_error",
          `Failed to mark attendance: ${error.message}`
        );
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

    socket.on("disconnect", (reason) => {
      // Clean up any active sessions started by this socket
      for (const [classId, sessionData] of activeSessions) {
        if (sessionData.teacherSocketId === socket.id) {
          console.log(`[Socket] Teacher disconnected, ending session for class ${classId}`);
          activeSessions.delete(classId);
          // Could emit a notification that teacher disconnected
        }
      }

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
