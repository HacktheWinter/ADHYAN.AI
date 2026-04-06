import mongoose from "mongoose";
import Classroom from "../models/Classroom.js";
import User from "../models/User.js";
import { nanoid } from "nanoid";
import { sendLiveClassStartedEmails } from "../utils/emailNotifications.js";
import {
  endClassSession,
  logActivity,
  startClassSession,
} from "../utils/activityTracker.js";
import {
  createHttpError,
  ensureUserMatchesId,
  getAuthorizedClassroomForStudent,
  getAuthorizedClassroomForTeacher,
  getRequestUserId,
} from "../utils/accessControl.js";

/**
 * Create Classroom (Teacher)
 * POST /api/classroom/create
 * Body: { teacherId, name }
 */
export const createClassroom = async (req, res) => {
  try {
    const {
      name,
      subject = "",
      colorTheme = "bg-gradient-to-br from-purple-500 to-purple-700",
      themeImage = "",
    } = req.body;
    const teacherId = getRequestUserId(req);

    if (!name) {
      return res
        .status(400)
        .json({ success: false, error: "name is required" });
    }

    const teacher = await User.findById(teacherId);
    if (!teacher) {
      return res
        .status(404)
        .json({ success: false, error: "Teacher not found" });
    }
    if (teacher.role !== "teacher") {
      return res
        .status(400)
        .json({ success: false, error: "User is not a teacher" });
    }

    const classCode = nanoid(6).toUpperCase();

    const classroom = await Classroom.create({
      teacherId,
      name,
      subject,
      classCode,
      colorTheme,
      themeImage,
      themeId: req.body.themeId || null,
    });

    void logActivity({
      actorId: teacher._id,
      actorRole: "teacher",
      classroomId: classroom._id,
      action: "classroom_created",
      entityType: "classroom",
      entityId: classroom._id,
      meta: {
        className: classroom.subject?.trim() || classroom.name,
        classCode: classroom.classCode,
      },
    });

    res.status(201).json({
      success: true,
      message: "Classroom created successfully",
      classroom,
    });
  } catch (error) {
    console.error("Create Classroom Error:", error);
    res
      .status(500)
      .json({ success: false, error: "Server error while creating classroom" });
  }
};

/**
 * Join Classroom (Student)
 * POST /api/classroom/join
 * Body: { studentId, classCode }
 */
export const joinClassroom = async (req, res) => {
  try {
    const { studentId: requestedStudentId, classCode } = req.body;
    const studentId = getRequestUserId(req);

    if (!classCode) {
      return res.status(400).json({
        success: false,
        error: "classCode is required",
      });
    }

    ensureUserMatchesId(
      requestedStudentId,
      studentId,
      "You can only join a classroom for your own account."
    );

    const classroom = await Classroom.findOne({ classCode });
    if (!classroom)
      return res
        .status(404)
        .json({ success: false, error: "Invalid class code" });

    const student = req.user;

    if (
      classroom.students.some((id) => id.toString() === studentId.toString())
    ) {
      return res.status(400).json({
        success: false,
        error: "Student already joined this classroom",
      });
    }

    // Check if student previously left this class
    const wasInLeftStudents = classroom.leftStudents.some(
      (ls) => ls.studentId.toString() === studentId.toString()
    );

    if (wasInLeftStudents) {
      // Remove from leftStudents
      classroom.leftStudents = classroom.leftStudents.filter(
        (ls) => ls.studentId.toString() !== studentId.toString()
      );
    }

    classroom.students.push(studentId);
    await classroom.save();

    res.status(200).json({
      success: true,
      message: "Joined classroom successfully",
      classroom,
    });
  } catch (error) {
    console.error("Join Classroom Error:", error);
    res
      .status(500)
      .json({ success: false, error: "Server error while joining classroom" });
  }
};

/**
 * Get classrooms for teacher or student
 * GET /api/classroom?userId=xxx&role=teacher|student
 */
export const getClassrooms = async (req, res) => {
  try {
    const requestedUserId = req.query.userId;
    const requestedRole = req.query.role;
    const userId = getRequestUserId(req);
    const role = req.user?.role;

    if (!userId || !role) {
      throw createHttpError(401, "Authentication required");
    }

    if (requestedUserId) {
      ensureUserMatchesId(
        requestedUserId,
        userId,
        "You can only fetch classrooms for your own account."
      );
    }

    if (requestedRole && requestedRole !== role) {
      throw createHttpError(403, "You are not allowed to access classrooms for another role.");
    }

    let classrooms;
    if (role === "teacher") {
      classrooms = await Classroom.find({ teacherId: userId })
        .populate("students", "name email")
        .populate("leftStudents.studentId", "name email");
    } else if (role === "student") {
      classrooms = await Classroom.find({ students: userId }).populate(
        "teacherId",
        "name email"
      );
    } else {
      return res.status(400).json({ success: false, error: "Invalid role" });
    }

    res.status(200).json({ success: true, classrooms });
  } catch (error) {
    console.error("Get Classrooms Error:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || "Server error while fetching classrooms",
    });
  }
};

/**
 * Get Classroom by ID
 * GET /api/classroom/:classId
 */
export const getClassroomById = async (req, res) => {
  try {
    const { classId } = req.params;
    const classroom = await Classroom.findById(classId);

    if (!classroom) {
      return res
        .status(404)
        .json({ success: false, error: "Classroom not found" });
    }

    const userId = getRequestUserId(req);
    let responseClassroom;

    if (req.user.role === "teacher") {
      if (classroom.teacherId.toString() !== userId) {
        throw createHttpError(403, "You are not authorized to access this classroom.");
      }

      responseClassroom = await Classroom.findById(classId)
        .populate("students", "name email profilePhoto createdAt")
        .populate("leftStudents.studentId", "name email profilePhoto createdAt")
        .populate("teacherId", "name email");
    } else if (req.user.role === "student") {
      const isEnrolled = classroom.students.some(
        (student) => student.toString() === userId
      );

      if (!isEnrolled) {
        throw createHttpError(403, "You are not enrolled in this classroom.");
      }

      responseClassroom = await Classroom.findById(classId).populate(
        "teacherId",
        "name email"
      );

      if (responseClassroom) {
        const classroomObject = responseClassroom.toObject();
        delete classroomObject.students;
        delete classroomObject.leftStudents;
        responseClassroom = classroomObject;
      }
    } else {
      throw createHttpError(403, "You are not allowed to access this classroom.");
    }

    res.status(200).json({
      success: true,
      classroom: responseClassroom,
    });
  } catch (error) {
    console.error("Error fetching classroom:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || "Server error",
    });
  }
};

/**
 * Delete Classroom (Teacher)
 * DELETE /api/classroom/:classId
 * Body: { teacherId }
 
 * Update classroom details (teacher)
 * PUT /api/classroom/:classId
 * Body: { teacherId, name?, subject?, colorTheme?, themeImage? }
 */
export const updateClassroom = async (req, res) => {
  try {
    const { classId } = req.params;
    const { name, subject, colorTheme, themeImage } = req.body;
    const classroom = await getAuthorizedClassroomForTeacher(req, classId);

    if (name !== undefined) classroom.name = name;
    if (subject !== undefined) classroom.subject = subject;
    if (colorTheme !== undefined) classroom.colorTheme = colorTheme;
    if (themeImage !== undefined) classroom.themeImage = themeImage;
    if (req.body.themeId !== undefined) classroom.themeId = req.body.themeId;

    await classroom.save();

    res.status(200).json({
      success: true,
      message: "Classroom updated successfully",
      classroom,
    });
  } catch (error) {
    console.error("Update Classroom Error:", error);
    res.status(error.statusCode || 500).json({
      error: error.message || "Server error while updating classroom",
    });
  }
};

export const deleteClassroom = async (req, res) => {
  try {
    const { classId } = req.params;
    await getAuthorizedClassroomForTeacher(req, classId);

    await Classroom.findByIdAndDelete(classId);

    res.status(200).json({
      success: true,
      message: "Classroom deleted successfully",
    });
  } catch (error) {
    console.error("Delete Classroom Error:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || "Server error while deleting classroom",
    });
  }
};

/**
 * Start Live Meeting
 * PUT /api/classroom/:classId/meeting/start
 * Body: { teacherId }
 */
export const startMeeting = async (req, res) => {
  try {
    const { classId } = req.params;
    const teacherId = getRequestUserId(req);

    console.log('[startMeeting] Request received:', { classId, teacherId });

    const classroom = await getAuthorizedClassroomForTeacher(req, classId);

    console.log('[startMeeting] Classroom found:', {
      classroomId: classroom._id,
      classroomTeacherId: classroom.teacherId,
      providedTeacherId: teacherId,
      currentIsLive: classroom.isLive
    });

    console.log('[startMeeting] Authorization passed, updating isLive to true');
    classroom.isLive = true;

    const savedClassroom = await classroom.save();
    console.log('[startMeeting] Classroom saved successfully:', {
      classroomId: savedClassroom._id,
      isLive: savedClassroom.isLive
    });

    const io = req.app.get("io");
    if (io) {
      console.log('[startMeeting] Emitting socket event to room:', classId);
      io.to(classId).emit("meeting_status_changed", { isLive: true, classId });
    } else {
      console.warn('[startMeeting] Socket.io not available');
    }

    // Email notification to students (non-blocking)
    void (async () => {
      try {
        if (!classroom.students?.length) return;

        const studentIds = classroom.students
          .filter((id) => mongoose.Types.ObjectId.isValid(id));
        if (studentIds.length === 0) {
          console.log(
            `[Email] Live class notification skipped - no valid student ids in class ${classroom._id}`
          );
          return;
        }

        const [students, teacher] = await Promise.all([
          User.find({ _id: { $in: studentIds }, role: "student" }).select("name email"),
          User.findById(classroom.teacherId).select("name"),
        ]);

        const studentsWithEmail = students.filter((student) => student?.email);
        if (studentsWithEmail.length === 0) {
          console.log(
            `[Email] Live class notification skipped - no student emails in class ${classroom._id}`
          );
          return;
        }

        const className = classroom.subject?.trim() || classroom.name;
        const result = await sendLiveClassStartedEmails({
          students: studentsWithEmail,
          className,
          teacherName: teacher?.name || "Your teacher",
        });

        console.log(
          `[Email] Live class notifications sent: ${result.sent}/${result.total} (failed: ${result.failed}, skipped: ${result.skipped || 0})`
        );
      } catch (emailError) {
        console.error("[Email] Live class notification failed:", emailError.message);
      }
    })();

    void startClassSession({
      classroomId: classroom._id,
      teacherId: classroom.teacherId,
      source: "live",
      meta: {
        className: classroom.subject?.trim() || classroom.name,
      },
    });

    void logActivity({
      actorId: classroom.teacherId,
      actorRole: "teacher",
      classroomId: classroom._id,
      action: "live_class_started",
      entityType: "class_session",
      entityId: classroom._id,
      meta: {
        className: classroom.subject?.trim() || classroom.name,
      },
    });

    console.log('[startMeeting] Sending success response');
    res
      .status(200)
      .json({ success: true, message: "Meeting started", isLive: true });
  } catch (error) {
    console.error("[startMeeting] ERROR:", error);
    console.error("[startMeeting] Error stack:", error.stack);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || "Server error",
    });
  }
};

/**
 * End Live Meeting
 * PUT /api/classroom/:classId/meeting/end
 * Body: { teacherId }
 */
export const endMeeting = async (req, res) => {
  try {
    const { classId } = req.params;
    const classroom = await getAuthorizedClassroomForTeacher(req, classId);

    classroom.isLive = false;
    await classroom.save();

    const io = req.app.get("io");
    if (io) {
      io.to(classId).emit("meeting_status_changed", { isLive: false, classId });
    }

    void endClassSession({
      classroomId: classroom._id,
      teacherId: classroom.teacherId,
      source: "live",
      meta: {
        className: classroom.subject?.trim() || classroom.name,
      },
    });

    void logActivity({
      actorId: classroom.teacherId,
      actorRole: "teacher",
      classroomId: classroom._id,
      action: "live_class_ended",
      entityType: "class_session",
      entityId: classroom._id,
      meta: {
        className: classroom.subject?.trim() || classroom.name,
      },
    });

    res
      .status(200)
      .json({ success: true, message: "Meeting ended", isLive: false });
  } catch (error) {
    console.error("End Meeting Error:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || "Server error",
    });
  }
};

/**
 * Leave Classroom (Student)
 * POST /api/classroom/:classId/leave
 * Body: { studentId }
 */
export const leaveClassroom = async (req, res) => {
  try {
    const { classId } = req.params;
    const { studentId: requestedStudentId } = req.body;
    const studentId = getRequestUserId(req);

    ensureUserMatchesId(
      requestedStudentId,
      studentId,
      "You can only leave a classroom for your own account."
    );

    const classroom = await getAuthorizedClassroomForStudent(req, classId);

    // Remove student from active students
    classroom.students = classroom.students.filter(
      (id) => id.toString() !== studentId.toString()
    );

    // Add to leftStudents array if not already there
    const alreadyLeft = classroom.leftStudents.some(
      (ls) => ls.studentId.toString() === studentId.toString()
    );

    if (!alreadyLeft) {
      classroom.leftStudents.push({
        studentId: studentId,
        leftAt: new Date(),
      });
    }

    await classroom.save();

    res.status(200).json({
      success: true,
      message: "Successfully left the classroom",
    });
  } catch (error) {
    console.error("Leave Classroom Error:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || "Server error while leaving classroom",
    });
  }
};
