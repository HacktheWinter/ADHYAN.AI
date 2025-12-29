import mongoose from "mongoose";

const answerSchema = new mongoose.Schema({
  questionId: {
    type: String,
    required: true,
  },
  question: {
    type: String,
    required: true,
  },
  studentAnswer: {
    type: String,
    default: "",
    required: false,
  },
  answerKey: {
    type: String,
    required: true,
  },
  marks: {
    type: Number,
    required: true,
  },
  marksAwarded: {
    type: Number,
    default: 0,
  },
  aiMarks: {
    type: Number,
    default: null,
  },
  aiFeedback: {
    type: String,
    default: "",
  },
  teacherFeedback: {
    type: String,
    default: "",
  },
  checkedBy: {
    type: String,
    enum: ["pending", "ai", "teacher", "both"],
    default: "pending",
  },
});

const assignmentSubmissionSchema = new mongoose.Schema(
  {
    assignmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Assignment",
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
    totalMarks: {
      type: Number,
      required: true,
    },
    marksObtained: {
      type: Number,
      default: 0,
    },
    percentage: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["pending", "checked"],
      default: "pending",
    },
    isResultPublished: {
      type: Boolean,
      default: false,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    checkedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

assignmentSubmissionSchema.index(
  { assignmentId: 1, studentId: 1 },
  { unique: true }
);

export default mongoose.model(
  "AssignmentSubmission",
  assignmentSubmissionSchema
);
