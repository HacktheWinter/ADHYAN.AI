import mongoose from "mongoose";

const codingAssessmentSchema = new mongoose.Schema(
  {
    classroomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Classroom",
      required: true,
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    problemStatement: {
      type: String,
      required: true,
    },
    requirements: {
      type: String,
      default: "",
    },
    maxMarks: { type: Number, min: 1, default: 10 },
    // Duration in minutes
    duration: {
      type: Number,
      required: true,
      default: 60,
    },
    // Optional Reference Image for UI/design problem
    referenceImageUrl: {
      type: String,
      default: null,
    },
    // Optional starter code
    starterHtml: {
      type: String,
      default: "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"UTF-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n  <title>My Project</title>\n</head>\n<body>\n  \n</body>\n</html>",
    },
    starterCss: {
      type: String,
      default: "/* Write your CSS here */\n",
    },
    starterJs: {
      type: String,
      default: "// Write your JavaScript here\n",
    },
    // Publishing & Timing
    status: {
      type: String,
      enum: ["draft", "published"],
      default: "draft",
    },
    startTime: {
      type: Date,
      default: null,
    },
    endTime: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

codingAssessmentSchema.index({ classroomId: 1, status: 1 });
codingAssessmentSchema.index({ teacherId: 1 });

export default mongoose.model("CodingAssessment", codingAssessmentSchema);
