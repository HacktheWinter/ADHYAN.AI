import mongoose from "mongoose";

const videoSchema = new mongoose.Schema(
  {
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    title: {
      type: String,
      required: true,
    },

    topic: String,

    description: String,

    videoUrl: {
      type: String,
      required: true,
    },

    visibility: {
      type: String,
      enum: ["class", "public", "draft"],
      default: "class",
    },

    thumbnail: {
      type: String,
    },

    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Video", videoSchema);
