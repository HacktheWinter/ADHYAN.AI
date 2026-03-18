import mongoose from "mongoose";

const classSessionSchema = new mongoose.Schema(
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
    source: {
      type: String,
      enum: ["live", "attendance"],
      default: "live",
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    endedAt: {
      type: Date,
      default: null,
    },
    durationMinutes: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["active", "ended"],
      default: "active",
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

classSessionSchema.index({ classroomId: 1, source: 1, status: 1 });
classSessionSchema.index({ teacherId: 1, source: 1, status: 1 });

export default mongoose.model("ClassSession", classSessionSchema);
