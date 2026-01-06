import mongoose from "mongoose";

const announcementSchema = new mongoose.Schema(
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
    fileId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false, // Optional file attachment
    },
    fileName: {
      type: String, // Original name of the file
      required: false,
    },
    mimeType: {
      type: String, // e.g., 'application/pdf', 'image/png'
      required: false,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Announcement", announcementSchema);
