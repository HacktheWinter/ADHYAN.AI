import mongoose from "mongoose";

const replySchema = new mongoose.Schema({
  authorId: String,
  authorName: String,
  message: String,
  createdAt: { type: Date, default: Date.now },
});

const doubtSchema = new mongoose.Schema({
  classId: { type: String, required: true },
  authorId: String,
  authorName: String,
  title: String,
  description: String,
  createdAt: { type: Date, default: Date.now },
  replies: [replySchema],
});

export default mongoose.model("Doubt", doubtSchema);
