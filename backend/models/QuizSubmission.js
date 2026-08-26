// Backend/models/QuizSubmission.js
import mongoose from "mongoose";

const answerSchema = new mongoose.Schema({
  questionId: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ["mcq", "coding"],
    default: "mcq",
  },
  // MCQ Fields
  selectedAnswer: {
    type: String,
    required: false,
    default: "",
  },
  correctAnswer: {
    type: String,
    required: false,
  },
  isCorrect: {
    type: Boolean,
    required: false,
    default: false,
  },
  // Coding Fields
  code: {
    type: String,
    required: false,
  },
  language: {
    type: String,
    required: false,
  },
  testResults: {
    passed: Number,
    total: Number,
    details: Array,
  },
  marksAwarded: {
    type: Number,
    default: 0,
  }
});

const quizSubmissionSchema = new mongoose.Schema(
  {
    quizId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quiz",
      required: true,
    },
    sectionTimers: [
      {
        sectionId: String,
        startTime: Date,
        endTime: Date,
        status: {
          type: String,
          enum: ["active", "locked"],
          default: "active",
        },
        autoSubmitted: Boolean,
      }
    ],
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    studentName: {
      type: String,
      required: true,
    },
    answers: [answerSchema],
    score: {
      type: Number,
      required: true,
      default: 0,
    },
    totalQuestions: {
      type: Number,
      required: true,
    },
    totalMarks: {
      type: Number,
      default: 0,
    },
    percentage: {
      type: Number,
      required: true,
      default: 0,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    isDraft: {
      type: Boolean,
      default: false,
    },
    autoSubmitted: {
      type: Boolean,
      default: false,
    }
  },
  { timestamps: true }
);

// Index for faster queries and to prevent duplicates
quizSubmissionSchema.index({ quizId: 1, studentId: 1 }, { unique: true });

export default mongoose.model("QuizSubmission", quizSubmissionSchema);
