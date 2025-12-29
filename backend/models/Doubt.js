import mongoose from "mongoose";

const replySchema = new mongoose.Schema({
  authorId: String,
  authorName: String,
  message: String,
  createdAt: Date,
});

const doubtSchema = new mongoose.Schema({
  classId: String,
  authorId: String,
  authorName: String,
  title: String,
  description: String,
  replies: [replySchema],
  createdAt: Date,
});

export default mongoose.model("Doubt", doubtSchema);
