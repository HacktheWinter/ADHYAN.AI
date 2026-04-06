import mongoose from "mongoose";

const seminarAttendanceEntrySchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    studentName: { type: String, default: "" },
    erpId: { type: String, default: "" },
    course: { type: String, default: "" },
    section: { type: String, default: "" },
    semester: { type: String, default: "" },
    collegeName: { type: String, default: "" },
    markedAt: { type: Date, default: Date.now },
    method: { type: String, enum: ["qr"], default: "qr" },
  },
  { _id: false }
);

const seminarSessionSchema = new mongoose.Schema(
  {
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
    status: {
      type: String,
      enum: ["active", "completed"],
      default: "active",
    },
    currentToken: { type: String, default: "" },
    tokenExpiresAt: { type: Date, default: null },
    attendees: {
      type: [seminarAttendanceEntrySchema],
      default: [],
    },
    attendeeCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

seminarSessionSchema.index({ teacherId: 1, status: 1 });
seminarSessionSchema.index({ isActive: 1 });
seminarSessionSchema.index({ "attendees.studentId": 1 });

export default mongoose.model("SeminarSession", seminarSessionSchema);
