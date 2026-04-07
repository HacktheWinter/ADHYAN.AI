import mongoose from "mongoose";

const generationQuotaSchema = new mongoose.Schema(
  {
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    contentType: {
      type: String,
      enum: ["quiz", "assignment", "test"],
      required: true,
      index: true,
    },
    dateKey: {
      type: String,
      required: true,
      index: true,
    },
    successCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

generationQuotaSchema.index(
  { teacherId: 1, contentType: 1, dateKey: 1 },
  { unique: true }
);

export default mongoose.model("GenerationQuota", generationQuotaSchema);