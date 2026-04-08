import mongoose from "mongoose";

const checkingSessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: "Classroom", required: true },
  testTitle: { type: String, default: "" },
  status: {
    type: String,
    enum: ["active", "stopped", "completed", "error"],
    default: "active",
  },
  totalCount: { type: Number, required: true },
  checkedCount: { type: Number, default: 0 },
  failedCount: { type: Number, default: 0 },
  needsReviewCount: { type: Number, default: 0 },
  currentStudent: { type: String, default: "" },
  startedAt: { type: Date, default: Date.now },
  completedAt: { type: Date, default: null },
  lastSnapshotAt: { type: Date, default: null },
}, { timestamps: true });

export default mongoose.model("CheckingSession", checkingSessionSchema);
