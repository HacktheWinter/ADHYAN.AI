// Backend/index.js
import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import connectDB from "./config/db.js";
import dotenv from "dotenv";

import teacherRoutes from "./routes/teacherRoutes.js";
import studentRoutes from "./routes/studentRoutes.js";
import principalRoutes from "./routes/principalRoutes.js";
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
import physicalTestSubmissionRoutes from "./routes/physicalTestSubmissionRoutes.js";

import calendarRoutes from "./routes/calendarRoutes.js";
import forgotPasswordRoutes from './routes/forgotPassword.js';
import profileRoutes from "./routes/profileRoutes.js";

import videoRoutes from "./routes/video.routes.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";
import socketHandler from "./socket/socketHandler.js";

const app = express();

dotenv.config();
connectDB();

const staticAllowedOrigins = [
  "https://adhyanai-teacher.onrender.com",
  "https://adhyanai-student.onrender.com",
  "https://adhyanai-principal.onrender.com",
  ...(process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(",").map((origin) => origin.trim())
    : []),
].filter(Boolean);

const isAllowedOrigin = (origin) => {
  if (!origin) return true;

  const isLocalhost = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(
    origin
  );
  if (isLocalhost) return true;

  return staticAllowedOrigins.includes(origin);
};

const corsOriginHandler = (origin, callback) => {
  if (isAllowedOrigin(origin)) {
    callback(null, true);
    return;
  }

  callback(new Error(`CORS blocked for origin: ${origin}`));
};


const server = http.createServer(app);

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: corsOriginHandler,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Initialize Socket Handler for Attendance and other features
socketHandler(io);

app.set("io", io);

// Middleware
app.use(
  cors({
    origin: corsOriginHandler,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  })
);
// Increase body limit to allow base64 theme images when creating classes
app.use(express.json({ limit: "10mb" }));

// Routes
app.use("/api/teacher", teacherRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/principal", principalRoutes);
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
app.use("/api/physical-test-submission", physicalTestSubmissionRoutes);

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
