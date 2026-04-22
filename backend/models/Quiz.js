// Backend/models/Quiz.js
import mongoose from "mongoose";

const quizSchema = new mongoose.Schema({
  noteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Note",
    required: false, // Made optional for topic-based quizzes
  },
  classroomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Classroom",
    required: true,
  },
  title: {
    type: String,
    default: "Untitled Quiz",
  },
  generatedFrom: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Note",
    },
  ],
  // NEW FIELD - Store topics when quiz is generated from topics
  generatedFromTopics: [
    {
      type: String,
    },
  ],
  questions: [
    {
      question: String,
      options: [String],
      correctAnswer: String,
    },
  ],
  marksPerQuestion: {
    type: Number,
    default: 1,
  },
  totalMarks: {
    type: Number,
    default: null, // Auto-calculated: questions.length × marksPerQuestion
  },
  difficulty: {
    type: String,
    enum: ["easy", "medium", "hard", "mixed"],
    default: "mixed",
  },
  status: {
    type: String,
    enum: ["draft", "published"],
    default: "draft",
  },

  duration: {
    type: Number,
    required: false,
    default: null, // Duration in minutes
  },
  startTime: {
    type: Date,
    required: false,
    default: null,
  },
  endTime: {
    type: Date,
    required: false,
    default: null,
  },
  isActive: {
    type: Boolean,
    default: true, // Auto-calculated based on time
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("Quiz", quizSchema);