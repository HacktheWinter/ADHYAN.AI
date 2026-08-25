import express from "express";
import mongoose from "mongoose";
import User from "../models/User.js";
import Classroom from "../models/Classroom.js";
import Quiz from "../models/Quiz.js";
import Note from "../models/Note.js";
import QuizSubmission from "../models/QuizSubmission.js";
import ActivityLog from "../models/ActivityLog.js";
import Announcement from "../models/Announcement.js";
import Feedback from "../models/Feedback.js";
const router = express.Router();

router.get("/stats", async (req, res) => {
  try {
    const [usersCount, classesCount, assessmentsCount, notesCount, announcementsCount, feedbacksCount, dbStats] = await Promise.all([
      User.countDocuments(),
      Classroom.countDocuments(),
      Quiz.countDocuments(),
      Note.countDocuments(),
      Announcement.countDocuments(),
      Feedback.countDocuments(),
      mongoose.connection.db.stats()
    ]);

    // DB stats dataSize or storageSize is in bytes. Let's use dataSize or storageSize.
    // Usually storageSize represents actual space taken on disk.
    const mongoSpaceMB = dbStats.storageSize ? (dbStats.storageSize / (1024 * 1024)) : 0;

    // Get individual collection sizes
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionStats = await Promise.all(
      collections.map(async (col) => {
        const stats = await mongoose.connection.db.command({ collStats: col.name });
        return {
          name: col.name,
          sizeMB: stats.storageSize ? (stats.storageSize / (1024 * 1024)) : 0
        };
      })
    );
    // Sort collections by size descending
    collectionStats.sort((a, b) => b.sizeMB - a.sizeMB);

    res.json({
      users: usersCount,
      classes: classesCount,
      assessments: assessmentsCount,
      notes: notesCount,
      announcements: announcementsCount,
      feedbacks: feedbacksCount,
      mongoSpaceMB: mongoSpaceMB,
      collectionStats: collectionStats
    });
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    res.status(500).json({ message: "Error fetching statistics" });
  }
});

router.get("/users", async (req, res) => {
  try {
    const users = await User.find({}, "-password").sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Error fetching users" });
  }
});

router.get("/classes", async (req, res) => {
  try {
    const classes = await Classroom.find()
      .populate("teacherId", "name email")
      .sort({ createdAt: -1 });
    res.json(classes);
  } catch (error) {
    console.error("Error fetching classes:", error);
    res.status(500).json({ message: "Error fetching classes" });
  }
});

router.get("/assessments", async (req, res) => {
  try {
    const quizzes = await Quiz.find()
      .populate({
        path: "classroomId",
        populate: { path: "teacherId", select: "name email" }
      })
      .sort({ createdAt: -1 });
    
    const assessmentsWithDetails = await Promise.all(quizzes.map(async (quiz) => {
      const submissions = await QuizSubmission.find({ quizId: quiz._id })
        .populate("studentId", "name email")
        .select("studentId score submittedAt");
      
      const quizObj = quiz.toObject();
      quizObj.teacherId = quizObj.classroomId?.teacherId || null;

      return {
        ...quizObj,
        submissions
      };
    }));

    res.json(assessmentsWithDetails);
  } catch (error) {
    console.error("Error fetching assessments:", error);
    res.status(500).json({ message: "Error fetching assessments" });
  }
});

router.get("/notes", async (req, res) => {
  try {
    const notes = await Note.find().sort({ createdAt: -1 });
    
    const enrichedNotes = await Promise.all(notes.map(async (note) => {
      let classroom = null;
      if (mongoose.Types.ObjectId.isValid(note.classroomId)) {
        classroom = await Classroom.findById(note.classroomId).select("name");
      }
      if (!classroom && note.classroomId) {
        classroom = await Classroom.findOne({ classCode: note.classroomId }).select("name");
      }
      
      return {
        ...note.toObject(),
        teacherId: { name: note.uploadedBy },
        classroomId: classroom || { name: note.classroomId }
      };
    }));

    res.json(enrichedNotes);
  } catch (error) {
    console.error("Error fetching notes:", error);
    res.status(500).json({ message: "Error fetching notes" });
  }
});

router.get("/activitylogs", async (req, res) => {
  try {
    const logs = await ActivityLog.find()
      .populate("actorId", "name email")
      .populate("classroomId", "name classCode")
      .sort({ createdAt: -1 })
      .limit(100);
    res.json(logs);
  } catch (error) {
    console.error("Error fetching activity logs:", error);
    res.status(500).json({ message: "Error fetching activity logs" });
  }
});

router.get("/announcements", async (req, res) => {
  try {
    const announcements = await Announcement.find()
      .populate("teacherId", "name email")
      .populate("classroomId", "name classCode")
      .sort({ createdAt: -1 });
    res.json(announcements);
  } catch (error) {
    console.error("Error fetching announcements:", error);
    res.status(500).json({ message: "Error fetching announcements" });
  }
});

router.get("/feedbacks", async (req, res) => {
  try {
    const feedbacks = await Feedback.find()
      .populate("createdBy", "name email")
      .populate("classId", "name classCode")
      .sort({ createdAt: -1 });
    res.json(feedbacks);
  } catch (error) {
    console.error("Error fetching feedbacks:", error);
    res.status(500).json({ message: "Error fetching feedbacks" });
  }
});

router.get("/reports", async (req, res) => {
  try {
    const usersAgg = await User.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      { $limit: 14 }
    ]);

    const activityAgg = await ActivityLog.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      { $limit: 14 }
    ]);

    const performanceAgg = await QuizSubmission.aggregate([
      {
        $lookup: {
          from: "quizzes",
          localField: "quizId",
          foreignField: "_id",
          as: "quiz"
        }
      },
      { $unwind: "$quiz" },
      {
        $group: {
          _id: "$quiz.title",
          averageScore: { $avg: "$percentage" }
        }
      },
      { $sort: { averageScore: -1 } },
      { $limit: 10 }
    ]);

    // Simulated AI usage data as a placeholder
    const today = new Date();
    const aiUsage = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (6 - i));
      return {
        date: d.toISOString().split('T')[0],
        requests: Math.floor(Math.random() * 50) + 10 // Random 10-60 requests
      };
    });

    res.json({
      userGrowth: usersAgg.map(item => ({ date: item._id, newUsers: item.count })),
      activity: activityAgg.map(item => ({ date: item._id, actions: item.count })),
      performance: performanceAgg.map(item => ({ quizName: item._id || "Unknown Quiz", averageScore: Math.round(item.averageScore) })),
      aiUsage: aiUsage
    });
  } catch (error) {
    console.error("Error fetching reports data:", error);
    res.status(500).json({ message: "Error fetching reports data" });
  }
});

export default router;
