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
      required: false, // Optional file attachment (legacy)
    },
    fileName: {
      type: String, // Original name of the file (legacy)
      required: false,
    },
    mimeType: {
      type: String, // e.g., 'application/pdf', 'image/png' (legacy)
      required: false,
    },
    attachments: [
      {
        fileId: { type: mongoose.Schema.Types.ObjectId, required: true },
        fileName: { type: String, required: true },
        mimeType: { type: String, required: true },
      }
    ],
    message: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Announcement", announcementSchema);
