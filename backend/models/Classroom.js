import mongoose from "mongoose";
import { nanoid } from "nanoid";

const classroomSchema = new mongoose.Schema({
  name: { type: String, required: true },
  subject: { type: String, default: "" },
  classCode: { type: String, required: true, unique: true, default: () => nanoid(6).toUpperCase() },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  students: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  leftStudents: [{ 
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    leftAt: { type: Date, default: Date.now }
  }],
  colorTheme: {
    type: String,
    default: "bg-gradient-to-br from-purple-500 to-purple-700",
  },
  themeImage: { type: String, default: "" },
}, { timestamps: true });

export default mongoose.model("Classroom", classroomSchema);
