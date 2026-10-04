import mongoose from "mongoose";

const codingSubmissionSchema = new mongoose.Schema(
  {
    assessmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CodingAssessment",
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
    classroomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Classroom",
      required: true,
    },
    // Code content
    htmlCode: {
      type: String,
      default: "",
    },
    cssCode: {
      type: String,
      default: "",
    },
    jsCode: {
      type: String,
      default: "",
    },
    // Timing
    startTime: {
      type: Date,
      required: true,
    },
    submissionTime: {
      type: Date,
      default: null,
    },
    timeTaken: {
      type: Number, // seconds
      default: 0,
    },
    // Status
    submissionStatus: {
      type: String,
      enum: ["in-progress", "submitted", "auto-submitted"],
      default: "in-progress",
    },
    // Exam integrity data
    violations: [
      {
        timestamp: { type: Date, default: Date.now },
        reason: { type: String },
      },
    ],
    violationCount: {
      type: Number,
      default: 0,
    },
    marksAwarded: { type: Number, min: 0, default: null },
    teacherFeedback: { type: String, default: "" },
    gradedAt: { type: Date, default: null },
    autoSubmitted: {
      type: Boolean,
      default: false,
    },
    autoSubmitReason: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

// Prevent duplicate submissions
codingSubmissionSchema.index(
  { assessmentId: 1, studentId: 1 },
  { unique: true }
);
codingSubmissionSchema.index({ classroomId: 1 });

export default mongoose.model("CodingSubmission", codingSubmissionSchema);
