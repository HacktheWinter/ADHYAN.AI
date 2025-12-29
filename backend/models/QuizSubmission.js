// Backend/models/QuizSubmission.js
import mongoose from "mongoose";

const answerSchema = new mongoose.Schema({
  questionId: {
    type: String,
    required: true,
  },
  selectedAnswer: {
    type: String,
    required: false,
    default: "",
  },
  correctAnswer: {
    type: String,
    required: true,
  },
  isCorrect: {
    type: Boolean,
    required: true,
    default: false,
  },
});

const quizSubmissionSchema = new mongoose.Schema(
  {
    quizId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quiz",
      required: true,
    },
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
    percentage: {
      type: Number,
      required: true,
      default: 0,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Index for faster queries
quizSubmissionSchema.index({ quizId: 1, studentId: 1 });

export default mongoose.model("QuizSubmission", quizSubmissionSchema);
