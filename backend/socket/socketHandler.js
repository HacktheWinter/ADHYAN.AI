export default function socketHandler(io) {
  let activeUsers = 0;
  // Store active attendance sessions: { classId: { token: "...", startTime: ... } }
  // In a real production app, use Redis. For now, in-memory is okay for single instance.
  const activeSessions = {};

  io.on("connection", (socket) => {
    activeUsers++;
    io.emit("active_users_update", { count: activeUsers });

    socket.on("join_class", (classId) => {
      socket.join(classId);
    });

    socket.on("leave_class", (classId) => {
      socket.leave(classId);
    });

    // --- Attendance Events ---

    // Teacher starts attendance
    socket.on("start_attendance", ({ classId, token }) => {
      activeSessions[classId] = { token, startTime: Date.now() };
      io.to(classId).emit("attendance_started", { isActive: true });
      console.log(`Attendance started for class ${classId}`);
    });

    // Teacher stops attendance
    socket.on("stop_attendance", (classId) => {
        if (activeSessions[classId]) {
            delete activeSessions[classId];
        }
        io.to(classId).emit("attendance_stopped", { isActive: false });
        console.log(`Attendance stopped for class ${classId}`);
    });

    // Student scans QR
    socket.on("mark_attendance", async ({ classId, studentId, token, studentName }) => {
      // 1. Validate session
      const session = activeSessions[classId];
      if (!session) {
        socket.emit("attendance_error", { message: "No active attendance session." });
        return;
      }

      // 2. Validate token (simple check matches current token)
      // In a more robust system, you might check if token is "recent enough"
      if (session.token !== token) {
        socket.emit("attendance_error", { message: "Invalid or expired QR code." });
        return;
      }

      try {
        // 3. Update Database
        // Dynamic import to avoid circular dependency issues if any, or just to keep it clean
        const { default: Attendance } = await import("../models/Attendance.js");
        
        // Find today's active attendance record for this class
        let attendanceRecord = await Attendance.findOne({ 
          classId, 
          isActive: true 
        }).sort({ date: -1 });

        // If no active session found in DB, create one (or handle error)
        // Since we have in-memory session, we should probably have a DB record.
        // For simplicity, if not found, create new.
        if (!attendanceRecord) {
             attendanceRecord = new Attendance({ classId, isActive: true, studentsPresent: [] });
        }
        
        // Check if already present
        const alreadyPresent = attendanceRecord.studentsPresent.some(s => s.studentId.toString() === studentId);
        
        if (!alreadyPresent) {
             attendanceRecord.studentsPresent.push({ studentId });
             await attendanceRecord.save();
        }

        // 4. Notify Teacher (and specific student)
        io.to(classId).emit("attendance_update", {
          studentId,
          studentName,
          status: "Present",
        });

        socket.emit("attendance_success", { message: "Attendance marked successfully!" });

      } catch (err) {
        console.error("Attendance socket error:", err);
        socket.emit("attendance_error", { message: "Server error marking attendance." });
      }
    });

    socket.on("disconnect", () => {
      activeUsers--;
      io.emit("active_users_update", { count: activeUsers });
    });
  });
}
