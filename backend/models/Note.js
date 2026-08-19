import mongoose from "mongoose";

const noteSchema = new mongoose.Schema({
  title: { type: String, required: true },
  uploadedBy: { type: String, required: true },
  classroomId: { type: String },
  fileId: { type: mongoose.Schema.Types.ObjectId, required: false },
  fileUrl: { type: String, required: false },
  cloudinaryId: { type: String, required: false },
  mimetype: { type: String, default: "application/pdf" },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Note", noteSchema);
