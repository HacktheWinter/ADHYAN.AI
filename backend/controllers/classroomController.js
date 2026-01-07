import Classroom from "../models/Classroom.js";
import User from "../models/User.js";
import { nanoid } from "nanoid";

/**
 * Create Classroom (Teacher)
 * POST /api/classroom/create
 * Body: { teacherId, name }
 */
export const createClassroom = async (req, res) => {
  try {
    const {
      teacherId,
      name,
      subject = "",
      colorTheme = "bg-gradient-to-br from-purple-500 to-purple-700",
      themeImage = "",
    } = req.body;

    if (!teacherId || !name) {
      return res.status(400).json({ success: false, error: "teacherId and name are required" });
    }

    const teacher = await User.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ success: false, error: "Teacher not found" });
    }
    if (teacher.role !== "teacher") {
      return res.status(400).json({ success: false, error: "User is not a teacher" });
    }

    const classCode = nanoid(6).toUpperCase();

    const classroom = await Classroom.create({
      teacherId,
      name,
      subject,
      classCode,
      colorTheme,
      themeImage,
    });

    res.status(201).json({
      success: true,
      message: "Classroom created successfully",
      classroom,
    });
  } catch (error) {
    console.error("Create Classroom Error:", error);
    res.status(500).json({ success: false, error: "Server error while creating classroom" });
  }
};

/**
 * Join Classroom (Student)
 * POST /api/classroom/join
 * Body: { studentId, classCode }
 */
export const joinClassroom = async (req, res) => {
  try {
    const { studentId, classCode } = req.body;

    if (!studentId || !classCode) {
      return res
        .status(400)
        .json({ success: false, error: "studentId and classCode are required" });
    }

    const classroom = await Classroom.findOne({ classCode });
    if (!classroom)
      return res.status(404).json({ success: false, error: "Invalid class code" });

    const student = await User.findById(studentId);
    if (!student) return res.status(404).json({ success: false, error: "Student not found" });
    if (student.role !== "student") {
      return res.status(400).json({ success: false, error: "User is not a student" });
    }

    if (classroom.students.some(id => id.toString() === studentId.toString())) {
      return res
        .status(400)
        .json({ success: false, error: "Student already joined this classroom" });
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
    res.status(500).json({ success: false, error: "Server error while joining classroom" });
  }
};

/**
 * Get classrooms for teacher or student
 * GET /api/classroom?userId=xxx&role=teacher|student
 */
export const getClassrooms = async (req, res) => {
  try {
    const { userId, role } = req.query;

    if (!userId || !role) {
      return res.status(400).json({ success: false, error: "userId and role are required" });
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
    res.status(500).json({ success: false, error: "Server error while fetching classrooms" });
  }
};

/**
 * Get Classroom by ID
 * GET /api/classroom/:classId
 */
export const getClassroomById = async (req, res) => {
  try {
    const { classId } = req.params;

    const classroom = await Classroom.findById(classId)
      .populate("students", "name email profilePhoto createdAt")
      .populate("leftStudents.studentId", "name email profilePhoto createdAt")
      .populate("teacherId", "name email");

    if (!classroom) {
      return res.status(404).json({ success: false, error: "Classroom not found" });
    }

    res.status(200).json({
      success: true,
      classroom,
    });
  } catch (error) {
    console.error("Error fetching classroom:", error);
    res.status(500).json({ success: false, error: "Server error" });
  }
};

/**
 * Update classroom details (teacher)
 * PUT /api/classroom/:classId
 * Body: { teacherId, name?, subject?, colorTheme?, themeImage? }
 */
export const updateClassroom = async (req, res) => {
  try {
    const { classId } = req.params;
    const { teacherId, name, subject, colorTheme, themeImage } = req.body;

    if (!teacherId) {
      return res.status(400).json({ success: false, error: "teacherId is required" });
    }

    const classroom = await Classroom.findById(classId);
    if (!classroom) {
      return res.status(404).json({ success: false, error: "Classroom not found" });
    }

    if (classroom.teacherId.toString() !== teacherId) {
      return res.status(403).json({ success: false, error: "Unauthorized: You are not the teacher of this classroom" });
    }

    if (name !== undefined) classroom.name = name;
    if (subject !== undefined) classroom.subject = subject;
    if (colorTheme !== undefined) classroom.colorTheme = colorTheme;
    if (themeImage !== undefined) classroom.themeImage = themeImage;

    await classroom.save();

    res.status(200).json({
      success: true,
      message: "Classroom updated successfully",
      classroom,
    });
  } catch (error) {
    console.error("Update Classroom Error:", error);
    res.status(500).json({ success: false, error: "Server error while updating classroom" });
  }
};

/**
 * Delete Classroom (Teacher)
 * DELETE /api/classroom/:classId
 * Body: { teacherId }
 */
export const deleteClassroom = async (req, res) => {
  try {
    const { classId } = req.params;
    const { teacherId } = req.body;

    if (!teacherId) {
      return res.status(400).json({ success: false, error: "teacherId is required" });
    }

    const classroom = await Classroom.findById(classId);

    if (!classroom) {
      return res.status(404).json({ success: false, error: "Classroom not found" });
    }

    if (classroom.teacherId.toString() !== teacherId) {
      return res.status(403).json({ success: false, error: "Unauthorized" });
    }

    await Classroom.findByIdAndDelete(classId);

    res.status(200).json({
      success: true,
      message: "Classroom deleted successfully",
    });
  } catch (error) {
    console.error("Delete Classroom Error:", error);
    res.status(500).json({ success: false, error: "Server error while deleting classroom" });
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
    const { teacherId } = req.body;

    const classroom = await Classroom.findById(classId);
    if (!classroom) {
      return res.status(404).json({ success: false, error: "Classroom not found" });
    }

    if (classroom.teacherId.toString() !== teacherId) {
      return res.status(403).json({ success: false, error: "Unauthorized" });
    }

    classroom.isLive = true;
    await classroom.save();

    const io = req.app.get("io");
    if (io) {
      io.to(classId).emit("meeting_status_changed", { isLive: true, classId });
    }

    res.status(200).json({ success: true, message: "Meeting started", isLive: true });
  } catch (error) {
    console.error("Start Meeting Error:", error);
    res.status(500).json({ success: false, error: "Server error" });
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
    const { teacherId } = req.body;

    const classroom = await Classroom.findById(classId);
    if (!classroom) {
      return res.status(404).json({ success: false, error: "Classroom not found" });
    }

    if (classroom.teacherId.toString() !== teacherId) {
      return res.status(403).json({ success: false, error: "Unauthorized" });
    }

    classroom.isLive = false;
    await classroom.save();

    const io = req.app.get("io");
    if (io) {
      io.to(classId).emit("meeting_status_changed", { isLive: false, classId });
    }

    res.status(200).json({ success: true, message: "Meeting ended", isLive: false });
  } catch (error) {
    console.error("End Meeting Error:", error);
    res.status(500).json({ success: false, error: "Server error" });
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
    const { studentId } = req.body;

    if (!studentId) {
      return res.status(400).json({ success: false, error: "studentId is required" });
    }

    const classroom = await Classroom.findById(classId);
    if (!classroom) {
      return res.status(404).json({ success: false, error: "Classroom not found" });
    }

    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, error: "Student not found" });
    }

    if (!classroom.students.some(id => id.toString() === studentId.toString())) {
      return res.status(400).json({ success: false, error: "Student is not enrolled in this classroom" });
    }

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
    res.status(500).json({ success: false, error: "Server error while leaving classroom" });
  }
};
