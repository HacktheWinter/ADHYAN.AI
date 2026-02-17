// Backend/index.js
import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import connectDB from "./config/db.js";
import dotenv from "dotenv";

import teacherRoutes from "./routes/teacherRoutes.js";
import studentRoutes from "./routes/studentRoutes.js";
import classroomRoutes from "./routes/classroomRoutes.js";
import announcementRoutes from "./routes/announcementRoutes.js";
import noteRoutes from "./routes/noteRoutes.js";
import quizRoutes from "./routes/quizRoutes.js";
import questionBankRoutes from "./routes/questionBankRoutes.js";
import doubtRoutes from "./routes/doubtRoutes.js";
import quizSubmissionRoutes from "./routes/quizSubmissionRoutes.js";
import testPaperRoutes from "./routes/testPaperRoutes.js";
import testSubmissionRoutes from "./routes/testSubmissionRoutes.js";
import assignmentRoutes from "./routes/assignmentRoutes.js";
import assignmentSubmissionRoutes from "./routes/assignmentSubmissionRoutes.js";
import feedbackRoutes from "./routes/feedbackRoutes.js";

import calendarRoutes from "./routes/calendarRoutes.js";
import forgotPasswordRoutes from './routes/forgotPassword.js';
import profileRoutes from "./routes/profileRoutes.js";

import videoRoutes from "./routes/video.routes.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";

const app = express();

dotenv.config();
connectDB();


const server = http.createServer(app);

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "https://adhyanai-teacher.onrender.com",
      "https://adhyanai-student.onrender.com",
    ],
    methods: ["GET", "POST"],
  },
});

// Socket.IO connection
io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);

  socket.on("join_class", (classId) => {
    socket.join(classId);
    console.log(`🔹 Socket ${socket.id} joined class ${classId}`);
  });

  socket.on("new_doubt", (doubt) => {
    io.to(doubt.classId).emit("doubt_added", doubt);
  });

  socket.on("new_reply", ({ classId, doubtId, reply }) => {
    io.to(classId).emit("reply_added", { doubtId, reply });
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

app.set("io", io);

// Middleware
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "https://adhyanai-teacher.onrender.com",
      "https://adhyanai-student.onrender.com",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  })
);
// Increase body limit to allow base64 theme images when creating classes
app.use(express.json({ limit: "10mb" }));

// Routes
app.use("/api/teacher", teacherRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/classroom", classroomRoutes);
app.use("/api/notes", noteRoutes);
app.use("/api/announcement", announcementRoutes);
app.use("/api/quiz", quizRoutes);
app.use("/api/question-bank", questionBankRoutes);
app.use("/api/doubts", doubtRoutes);
app.use("/api/quiz-submission", quizSubmissionRoutes);
app.use("/api/test-paper", testPaperRoutes);
app.use("/api/test-submission", testSubmissionRoutes);
app.use("/api/assignment", assignmentRoutes);
app.use("/api/assignment-submission", assignmentSubmissionRoutes);
app.use("/api/feedback", feedbackRoutes);

app.use("/api/calendar", calendarRoutes);
app.use('/api', forgotPasswordRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api", videoRoutes);
app.use("/api/attendance", attendanceRoutes);


// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// Health check
app.get("/", (req, res) => {
  res.send("AI-Powered Smart Classroom Backend is Running!");
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

export { io };
