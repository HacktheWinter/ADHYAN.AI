import mongoose from "mongoose";

/**
 * AuditLog — Stores face verification audit trail.
 *
 * PRIVACY DESIGN:
 * - Raw images are NEVER stored in MongoDB.
 * - Only Cloudinary URLs are saved, and only when triggered by:
 *   1. Similarity score below threshold (failed match)
 *   2. Random 5% audit sample (successful match)
 *   3. Client-reported liveness failure
 */

const auditLogSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    attendanceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Attendance",
      default: null,
    },

    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Classroom",
      default: null,
    },

    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },

    similarityScore: {
      type: Number,
      default: null,
    },

    status: {
      type: String,
      enum: ["match", "no_match", "liveness_fail"],
      required: true,
      index: true,
    },

    triggerReason: {
      type: String,
      enum: ["random_5pct", "low_similarity", "liveness_fail"],
      required: true,
    },

    auditImageUrl: {
      type: String,
      default: null,
    },

    metadata: {
      method: { type: String, default: "system" },
      ipAddress: { type: String, default: null },
      userAgent: { type: String, default: null },
      threshold: { type: Number, default: null },
    },
  },
  { timestamps: true }
);

// Compound indexes for efficient admin queries
auditLogSchema.index({ status: 1, timestamp: -1 });
auditLogSchema.index({ studentId: 1, timestamp: -1 });
auditLogSchema.index({ classId: 1, timestamp: -1 });

const AuditLog = mongoose.model("AuditLog", auditLogSchema);
export default AuditLog;
