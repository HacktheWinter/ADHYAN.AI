// Backend/controllers/assessmentAnalyticsController.js
import Classroom from "../models/Classroom.js";
import Quiz from "../models/Quiz.js";
import QuizSubmission from "../models/QuizSubmission.js";
import TestPaper from "../models/TestPaper.js";
import TestSubmission from "../models/TestSubmission.js";
import Assignment from "../models/Assignment.js";
import AssignmentSubmission from "../models/AssignmentSubmission.js";
import CodingAssessment from "../models/CodingAssessment.js";
import CodingSubmission from "../models/CodingSubmission.js";

/**
 * GET /api/assessment-analytics/assessments/:teacherId
 * Returns all published quizzes, test papers, and assignments
 * across every classroom this teacher owns — used to populate
 * the assessment selector dropdown.
 */
export const getTeacherAssessments = async (req, res) => {
  try {
    const { teacherId } = req.params;

    // 1. Find all classrooms belonging to the teacher
    const classrooms = await Classroom.find({ teacherId }).select(
      "_id name subject students"
    );

    if (!classrooms.length) {
      return res.json({ assessments: [] });
    }

    const classroomIds = classrooms.map((c) => c._id);
    const classroomMap = {};
    classrooms.forEach((c) => {
      classroomMap[c._id.toString()] = {
        name: c.name,
        subject: c.subject,
        studentCount: c.students?.length || 0,
      };
    });

    // 2. Fetch published items from all assessment types in parallel
    const [quizzes, testPapers, assignments, codingAssessments] = await Promise.all([
      Quiz.find({
        classroomId: { $in: classroomIds },
        status: "published",
      }).select("_id title classroomId createdAt totalMarks"),
      TestPaper.find({
        classroomId: { $in: classroomIds },
        status: "published",
      }).select("_id title classroomId createdAt totalMarks"),
      Assignment.find({
        classroomId: { $in: classroomIds },
        status: "published",
      }).select("_id title classroomId createdAt totalMarks"),
      CodingAssessment.find({
        classroomId: { $in: classroomIds },
        status: "published",
      }).select("_id title classroomId createdAt maxMarks"),
    ]);

    // 3. Shape them into a unified list
    const shape = (items, type) =>
      items.map((item) => {
        const cId = item.classroomId.toString();
        return {
          _id: item._id,
          title: item.title,
          type,
          className: classroomMap[cId]?.name || "Unknown",
          classSubject: classroomMap[cId]?.subject || "",
          classroomId: cId,
          studentCount: classroomMap[cId]?.studentCount || 0,
          totalMarks: item.totalMarks || item.maxMarks || 0,
          createdAt: item.createdAt,
        };
      });

    const assessments = [
      ...shape(quizzes, "quiz"),
      ...shape(testPapers, "test"),
      ...shape(assignments, "assignment"),
      ...shape(codingAssessments, "coding"),
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return res.json({ assessments });
  } catch (error) {
    console.error("Error fetching teacher assessments:", error);
    return res.status(500).json({ error: "Failed to fetch assessments" });
  }
};

/**
 * GET /api/assessment-analytics/:type/:assessmentId
 * Returns detailed analytics for a single assessment.
 *   type = "quiz" | "test" | "assignment"
 */
export const getAssessmentAnalytics = async (req, res) => {
  try {
    const { type, assessmentId } = req.params;

    // -------- 1. Load the assessment document --------
    let assessment = null;
    let submissions = [];

    if (type === "quiz") {
      assessment = await Quiz.findById(assessmentId);
      if (!assessment)
        return res.status(404).json({ error: "Quiz not found" });

      submissions = await QuizSubmission.find({ quizId: assessmentId })
        .populate("studentId", "name email")
        .lean();
    } else if (type === "test") {
      assessment = await TestPaper.findById(assessmentId);
      if (!assessment)
        return res.status(404).json({ error: "Test paper not found" });

      submissions = await TestSubmission.find({ testPaperId: assessmentId })
        .populate("studentId", "name email")
        .lean();
    } else if (type === "assignment") {
      assessment = await Assignment.findById(assessmentId);
      if (!assessment)
        return res.status(404).json({ error: "Assignment not found" });

      submissions = await AssignmentSubmission.find({
        assignmentId: assessmentId,
      })
        .populate("studentId", "name email")
        .lean();
    } else if (type === "coding") {
      assessment = await CodingAssessment.findById(assessmentId);
      if (!assessment)
        return res.status(404).json({ error: "Coding assessment not found" });

      submissions = await CodingSubmission.find({ assessmentId: assessmentId })
        .populate("studentId", "name email")
        .lean();
    } else {
      return res.status(400).json({ error: "Invalid assessment type" });
    }

    // -------- 2. Classroom info for total students --------
    const classroom = await Classroom.findById(assessment.classroomId)
      .populate("students", "name email")
      .lean();

    const totalStudents = classroom?.students?.length || 0;

    // -------- 3. Compute per-student results --------
    const PASS_THRESHOLD = 40; // percentage

    // Normalise percentage across different submission schemas
    const getPercentage = (sub) => {
      if (typeof sub.percentage === "number") return sub.percentage;
      const total = sub.totalMarks || assessment.totalMarks || assessment.maxMarks || 1;
      const obtained = sub.marksObtained ?? sub.score ?? sub.marksAwarded ?? 0;
      return Math.round((obtained / total) * 100);
    };

    const getMarksObtained = (sub) => {
      return sub.marksObtained ?? sub.score ?? sub.marksAwarded ?? 0;
    };

    const studentResults = submissions.map((sub) => {
      const pct = getPercentage(sub);
      return {
        studentId: sub.studentId?._id || sub.studentId,
        studentName:
          sub.studentName ||
          sub.studentId?.name ||
          "Unknown",
        email: sub.studentId?.email || "",
        marksObtained: getMarksObtained(sub),
        totalMarks: sub.totalMarks || assessment.totalMarks || assessment.maxMarks || 0,
        percentage: pct,
        status: pct >= PASS_THRESHOLD ? "pass" : "fail",
        submittedAt: sub.submittedAt,
      };
    });

    // -------- 4. Aggregate stats --------
    const attempted = studentResults.length;
    const notAttempted = Math.max(0, totalStudents - attempted);
    const passCount = studentResults.filter((s) => s.status === "pass").length;
    const failCount = studentResults.filter((s) => s.status === "fail").length;

    const percentages = studentResults.map((s) => s.percentage);
    const avgPercentage = attempted
      ? Math.round(percentages.reduce((a, b) => a + b, 0) / attempted)
      : 0;
    const highestPercentage = attempted ? Math.max(...percentages) : 0;
    const lowestPercentage = attempted ? Math.min(...percentages) : 0;

    // Score distribution buckets
    const distribution = [
      { range: "0-20%", count: 0, color: "#EF4444" },
      { range: "21-40%", count: 0, color: "#F97316" },
      { range: "41-60%", count: 0, color: "#EAB308" },
      { range: "61-80%", count: 0, color: "#22C55E" },
      { range: "81-100%", count: 0, color: "#8B5CF6" },
    ];

    percentages.forEach((p) => {
      if (p <= 20) distribution[0].count++;
      else if (p <= 40) distribution[1].count++;
      else if (p <= 60) distribution[2].count++;
      else if (p <= 80) distribution[3].count++;
      else distribution[4].count++;
    });

    // -------- 5. Build not-attempted list --------
    const attemptedIds = new Set(
      studentResults.map((s) => s.studentId?.toString())
    );
    const notAttemptedStudents = (classroom?.students || [])
      .filter((s) => !attemptedIds.has(s._id.toString()))
      .map((s) => ({
        studentId: s._id,
        studentName: s.name,
        email: s.email || "",
      }));

    // -------- 6. Response --------
    return res.json({
      assessment: {
        _id: assessment._id,
        title: assessment.title,
        type,
        totalMarks: assessment.totalMarks || assessment.maxMarks,
        createdAt: assessment.createdAt,
      },
      classroom: {
        _id: classroom?._id,
        name: classroom?.name,
        subject: classroom?.subject,
      },
      summary: {
        totalStudents,
        attempted,
        notAttempted,
        passCount,
        failCount,
        avgPercentage,
        highestPercentage,
        lowestPercentage,
        passThreshold: PASS_THRESHOLD,
      },
      distribution,
      studentResults: studentResults.sort(
        (a, b) => b.percentage - a.percentage
      ),
      notAttemptedStudents,
    });
  } catch (error) {
    console.error("Error fetching assessment analytics:", error);
    return res.status(500).json({ error: "Failed to fetch analytics" });
  }
};
