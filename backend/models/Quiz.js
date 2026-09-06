// Backend/models/Quiz.js
import mongoose from "mongoose";

const questionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["mcq", "coding"],
    default: "mcq",
  },
  question: String,
  marks: { type: Number, default: 1 }, // Used for individual question marking

  // MCQ fields
  options: [String],
  correctAnswer: String,

  // Coding fields
  coding: {
    title: String,
    description: String,
    examples: [
      { input: String, output: String, explanation: String }
    ],
    constraints: [String],
    allowedLanguages: [String],
    starterCode: [
      { language: String, code: String }
    ],
    driverCode: [
      { language: String, code: String }
    ],
    // Unified test cases array (replaces old publicTestCases/hiddenTestCases split)
    testCases: [
      { input: String, expectedOutput: String }
    ],
    functionParams: [
      { name: String, description: String }
    ],
    comparisonMode: {
      type: String,
      enum: ["exact", "trimmed"],
      default: "trimmed"
    },
    executionMode: {
      type: String,
      enum: ["standard", "function"],
      default: "standard"
    }
  }
});

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
  
  // Legacy root questions array (default section)
  questions: [questionSchema],

  // New multi-section structure
  sections: [
    {
      type: {
        type: String,
        enum: ["mcq", "coding"],
        default: "mcq",
      },
      title: String,
      instructions: String,
      durationMinutes: Number,
      order: Number,
      questions: [questionSchema]
    }
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
  resultsPublished: {
    type: Boolean,
    default: false,
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
  webcamEnabled: {
    type: Boolean,
    default: false,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("Quiz", quizSchema);