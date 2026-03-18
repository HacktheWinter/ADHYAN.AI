import User from "../models/User.js";
import Classroom from "../models/Classroom.js";
import Note from "../models/Note.js";
import Assignment from "../models/Assignment.js";
import Quiz from "../models/Quiz.js";
import TestPaper from "../models/TestPaper.js";
import Announcement from "../models/Announcement.js";
import Attendance from "../models/Attendance.js";
import AssignmentSubmission from "../models/AssignmentSubmission.js";
import QuizSubmission from "../models/QuizSubmission.js";
import TestSubmission from "../models/TestSubmission.js";
import ActivityLog from "../models/ActivityLog.js";
import ClassSession from "../models/ClassSession.js";

const roundMetric = (value) => {
  if (!Number.isFinite(value)) return 0;
  return Number(value.toFixed(1));
};

const averagePercentage = (records = []) => {
  if (!records.length) return 0;
  const total = records.reduce((sum, record) => sum + (record.percentage || 0), 0);
  return roundMetric(total / records.length);
};

const averageFromNumbers = (values = []) => {
  const validValues = values.filter((value) => Number.isFinite(value));
  if (!validValues.length) return 0;
  const total = validValues.reduce((sum, value) => sum + value, 0);
  return roundMetric(total / validValues.length);
};

const buildParticipationRate = (submissionCount, itemCount, studentCount) => {
  if (!itemCount || !studentCount) return 0;
  return roundMetric((submissionCount / (itemCount * studentCount)) * 100);
};

const formatActivity = (activity) => ({
  _id: activity._id,
  action: activity.action,
  actor: activity.actorId
    ? {
        _id: activity.actorId._id,
        name: activity.actorId.name,
        email: activity.actorId.email,
        role: activity.actorId.role,
      }
    : null,
  teacherName: activity.actorId?.name || activity.meta?.teacherName || "Teacher",
  className:
    activity.classroomId?.subject ||
    activity.classroomId?.name ||
    activity.meta?.className ||
    "Class",
  entityType: activity.entityType,
  entityId: activity.entityId,
  meta: activity.meta || {},
  createdAt: activity.createdAt,
});

const getRecentActivities = async (query = {}, limit = 10) => {
  const activities = await ActivityLog.find(query)
    .populate("actorId", "name email role")
    .populate("classroomId", "name subject")
    .sort({ createdAt: -1 })
    .limit(limit);

  return activities.map(formatActivity);
};

const getClassroomNoteCount = async (classroomIds = []) => {
  if (!classroomIds.length) return 0;
  const classroomIdStrings = classroomIds.map((id) => id.toString());
  return Note.countDocuments({ classroomId: { $in: classroomIdStrings } });
};

const getTeacherOverview = async (teacher) => {
  const classrooms = await Classroom.find({ teacherId: teacher._id }).select(
    "_id name subject classCode students isLive createdAt"
  );
  const classroomIds = classrooms.map((classroom) => classroom._id);
  const uniqueStudentIds = new Set(
    classrooms.flatMap((classroom) =>
      (classroom.students || []).map((studentId) => studentId.toString())
    )
  );

  const [
    noteCount,
    assignmentCount,
    quizCount,
    testPaperCount,
    announcementCount,
    sessionCount,
    liveSessionCount,
    attendanceSessionCount,
    lastActivity,
  ] = await Promise.all([
    getClassroomNoteCount(classroomIds),
    Assignment.countDocuments({
      classroomId: { $in: classroomIds },
      status: "published",
    }),
    Quiz.countDocuments({
      classroomId: { $in: classroomIds },
      status: "published",
    }),
    TestPaper.countDocuments({
      classroomId: { $in: classroomIds },
      status: "published",
    }),
    Announcement.countDocuments({ classroomId: { $in: classroomIds } }),
    ClassSession.countDocuments({ teacherId: teacher._id }),
    ClassSession.countDocuments({ teacherId: teacher._id, source: "live" }),
    ClassSession.countDocuments({ teacherId: teacher._id, source: "attendance" }),
    ActivityLog.findOne({ actorId: teacher._id }).sort({ createdAt: -1 }),
  ]);

  return {
    _id: teacher._id,
    name: teacher.name,
    email: teacher.email,
    profilePhoto: teacher.profilePhoto,
    collegeName: teacher.collegeName,
    classCount: classrooms.length,
    studentCount: uniqueStudentIds.size,
    activeLiveClasses: classrooms.filter((classroom) => classroom.isLive).length,
    noteCount,
    assignmentCount,
    quizCount,
    testPaperCount,
    announcementCount,
    sessionCount,
    liveSessionCount,
    attendanceSessionCount,
    lastActivityAt: lastActivity?.createdAt || null,
    classrooms: classrooms.map((classroom) => ({
      _id: classroom._id,
      name: classroom.name,
      subject: classroom.subject,
      classCode: classroom.classCode,
      studentCount: classroom.students?.length || 0,
      isLive: classroom.isLive,
      createdAt: classroom.createdAt,
    })),
  };
};

const getClassroomMetrics = async (classroom) => {
  const studentCount = classroom.students?.length || 0;
  const classIdString = classroom._id.toString();

  const [
    notes,
    noteCountTotal,
    assignments,
    quizzes,
    testPapers,
    announcements,
    sessions,
    sessionCountTotal,
    attendanceRecords,
  ] =
    await Promise.all([
      Note.find({ classroomId: classIdString })
        .sort({ createdAt: -1 })
        .limit(5)
        .select("title uploadedBy createdAt"),
      Note.countDocuments({ classroomId: classIdString }),
      Assignment.find({ classroomId: classroom._id, status: "published" })
        .sort({ createdAt: -1 })
        .select("_id title dueDate createdAt"),
      Quiz.find({ classroomId: classroom._id, status: "published" })
        .sort({ createdAt: -1 })
        .select("_id title startTime endTime createdAt"),
      TestPaper.find({ classroomId: classroom._id, status: "published" })
        .sort({ createdAt: -1 })
        .select("_id title startTime endTime createdAt"),
      Announcement.countDocuments({ classroomId: classroom._id }),
      ClassSession.find({ classroomId: classroom._id })
        .sort({ startedAt: -1 })
        .limit(10)
        .select("source startedAt endedAt durationMinutes status"),
      ClassSession.countDocuments({ classroomId: classroom._id }),
      Attendance.find({ classId: classroom._id }).select("studentsPresent"),
    ]);

  const assignmentIds = assignments.map((assignment) => assignment._id);
  const quizIds = quizzes.map((quiz) => quiz._id);
  const testIds = testPapers.map((testPaper) => testPaper._id);

  const [assignmentSubmissions, quizSubmissions, testSubmissions] = await Promise.all([
    assignmentIds.length
      ? AssignmentSubmission.find({ assignmentId: { $in: assignmentIds } }).select(
          "assignmentId percentage marksObtained totalMarks status submittedAt studentId"
        )
      : [],
    quizIds.length
      ? QuizSubmission.find({ quizId: { $in: quizIds } }).select(
          "quizId percentage score totalQuestions submittedAt studentId"
        )
      : [],
    testIds.length
      ? TestSubmission.find({ testPaperId: { $in: testIds } }).select(
          "testPaperId percentage marksObtained totalMarks status submittedAt studentId"
        )
      : [],
  ]);

  const totalPresentCount = attendanceRecords.reduce(
    (sum, record) => sum + (record.studentsPresent?.length || 0),
    0
  );
  const totalAttendanceSlots = attendanceRecords.length * studentCount;

  return {
    _id: classroom._id,
    name: classroom.name,
    subject: classroom.subject,
    classCode: classroom.classCode,
    teacher: classroom.teacherId
      ? {
          _id: classroom.teacherId._id,
          name: classroom.teacherId.name,
          email: classroom.teacherId.email,
        }
      : null,
    studentCount,
    noteCount: noteCountTotal,
    assignmentCount: assignments.length,
    quizCount: quizzes.length,
    testPaperCount: testPapers.length,
    announcementCount: announcements,
    sessionCount: sessionCountTotal,
    activeLive: classroom.isLive,
    attendancePercentage:
      totalAttendanceSlots > 0
        ? roundMetric((totalPresentCount / totalAttendanceSlots) * 100)
        : 0,
    assignmentSubmissionRate: buildParticipationRate(
      assignmentSubmissions.length,
      assignments.length,
      studentCount
    ),
    quizParticipationRate: buildParticipationRate(
      quizSubmissions.length,
      quizzes.length,
      studentCount
    ),
    testParticipationRate: buildParticipationRate(
      testSubmissions.length,
      testPapers.length,
      studentCount
    ),
    averageAssignmentScore: averagePercentage(assignmentSubmissions),
    averageQuizScore: averagePercentage(quizSubmissions),
    averageTestScore: averagePercentage(testSubmissions),
    recentNotes: notes,
    recentAssignments: assignments.slice(0, 5),
    recentQuizzes: quizzes.slice(0, 5),
    recentTestPapers: testPapers.slice(0, 5),
    recentSessions: sessions,
  };
};

export const getPrincipalDashboard = async (_req, res) => {
  try {
    const [teachers, totalStudents, totalClasses, activeLiveClasses, notesUploaded] =
      await Promise.all([
        User.find({ role: "teacher" }).select("name email profilePhoto collegeName"),
        User.countDocuments({ role: "student" }),
        Classroom.countDocuments(),
        Classroom.countDocuments({ isLive: true }),
        Note.countDocuments(),
      ]);

    const [
      assignmentsPublished,
      quizzesPublished,
      testPapersPublished,
      attendanceSessions,
      classSessions,
      recentActivity,
    ] = await Promise.all([
      Assignment.countDocuments({ status: "published" }),
      Quiz.countDocuments({ status: "published" }),
      TestPaper.countDocuments({ status: "published" }),
      Attendance.countDocuments(),
      ClassSession.countDocuments(),
      getRecentActivities({}, 12),
    ]);

    const teacherSummaries = await Promise.all(teachers.map(getTeacherOverview));
    const topTeachers = teacherSummaries
      .sort((first, second) => {
        const firstScore =
          first.sessionCount * 4 +
          first.assignmentCount * 3 +
          first.noteCount * 2 +
          first.quizCount +
          first.testPaperCount;
        const secondScore =
          second.sessionCount * 4 +
          second.assignmentCount * 3 +
          second.noteCount * 2 +
          second.quizCount +
          second.testPaperCount;

        return secondScore - firstScore;
      })
      .slice(0, 5);

    res.status(200).json({
      success: true,
      summary: {
        totalTeachers: teachers.length,
        totalStudents,
        totalClasses,
        activeLiveClasses,
        notesUploaded,
        assignmentsPublished,
        quizzesPublished,
        testPapersPublished,
        attendanceSessions,
        classSessions,
      },
      topTeachers,
      recentActivity,
    });
  } catch (error) {
    console.error("Principal dashboard error:", error);
    res.status(500).json({ error: "Failed to load principal dashboard" });
  }
};

export const getPrincipalTeachers = async (_req, res) => {
  try {
    const teachers = await User.find({ role: "teacher" }).select(
      "name email profilePhoto collegeName"
    );
    const teacherSummaries = await Promise.all(teachers.map(getTeacherOverview));

    teacherSummaries.sort((first, second) => {
      const firstDate = first.lastActivityAt ? new Date(first.lastActivityAt).getTime() : 0;
      const secondDate = second.lastActivityAt
        ? new Date(second.lastActivityAt).getTime()
        : 0;
      return secondDate - firstDate;
    });

    res.status(200).json({ success: true, teachers: teacherSummaries });
  } catch (error) {
    console.error("Principal teachers error:", error);
    res.status(500).json({ error: "Failed to load teachers inspection data" });
  }
};

export const getPrincipalTeacherDetail = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const teacher = await User.findOne({ _id: teacherId, role: "teacher" }).select(
      "name email profilePhoto collegeName createdAt"
    );

    if (!teacher) {
      return res.status(404).json({ error: "Teacher not found" });
    }

    const teacherOverview = await getTeacherOverview(teacher);
    const classDetails = await Promise.all(
      teacherOverview.classrooms.map(async (classroom) => {
        const fullClassroom = await Classroom.findById(classroom._id).populate(
          "teacherId",
          "name email"
        );
        return getClassroomMetrics(fullClassroom);
      })
    );

    const classIds = classDetails.map((classroom) => classroom._id);
    const recentActivity = await getRecentActivities(
      { actorId: teacher._id },
      15
    );
    const recentSessions = await ClassSession.find({ teacherId: teacher._id })
      .populate("classroomId", "name subject")
      .sort({ startedAt: -1 })
      .limit(12);

    res.status(200).json({
      success: true,
      teacher: {
        ...teacherOverview,
        createdAt: teacher.createdAt,
        averageAssignmentScore: averageFromNumbers(
          classDetails.map((classroom) => classroom.averageAssignmentScore)
        ),
        averageQuizScore: averageFromNumbers(
          classDetails.map((classroom) => classroom.averageQuizScore)
        ),
        averageTestScore: averageFromNumbers(
          classDetails.map((classroom) => classroom.averageTestScore)
        ),
      },
      classes: classDetails,
      recentSessions,
      recentActivity,
      totals: {
        classCount: classIds.length,
        liveClassCount: recentSessions.filter((session) => session.source === "live").length,
        attendanceClassCount: recentSessions.filter(
          (session) => session.source === "attendance"
        ).length,
      },
    });
  } catch (error) {
    console.error("Principal teacher detail error:", error);
    res.status(500).json({ error: "Failed to load teacher detail" });
  }
};

export const getPrincipalClasses = async (_req, res) => {
  try {
    const classrooms = await Classroom.find()
      .populate("teacherId", "name email")
      .sort({ createdAt: -1 });

    const classSummaries = await Promise.all(classrooms.map(getClassroomMetrics));

    res.status(200).json({ success: true, classes: classSummaries });
  } catch (error) {
    console.error("Principal classes error:", error);
    res.status(500).json({ error: "Failed to load classes inspection data" });
  }
};

export const getPrincipalClassDetail = async (req, res) => {
  try {
    const { classId } = req.params;
    const classroom = await Classroom.findById(classId)
      .populate("teacherId", "name email")
      .populate("students", "name email profilePhoto");

    if (!classroom) {
      return res.status(404).json({ error: "Class not found" });
    }

    const classroomMetrics = await getClassroomMetrics(classroom);
    const recentActivity = await getRecentActivities({ classroomId: classroom._id }, 15);

    res.status(200).json({
      success: true,
      classroom: {
        ...classroomMetrics,
        students: classroom.students || [],
      },
      recentActivity,
    });
  } catch (error) {
    console.error("Principal class detail error:", error);
    res.status(500).json({ error: "Failed to load class detail" });
  }
};

export const getPrincipalActivity = async (req, res) => {
  try {
    const { limit = 40, teacherId, classId, action } = req.query;
    const query = {};

    if (teacherId) query.actorId = teacherId;
    if (classId) query.classroomId = classId;
    if (action) query.action = action;

    const activities = await getRecentActivities(query, Number(limit));
    res.status(200).json({ success: true, activities });
  } catch (error) {
    console.error("Principal activity error:", error);
    res.status(500).json({ error: "Failed to load activity feed" });
  }
};
