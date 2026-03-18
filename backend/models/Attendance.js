import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema({
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Classroom",
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  studentsPresent: [
    {
      studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      scannedAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  isActive: {
    type: Boolean,
    default: true, // Session is active
  },
});

const Attendance = mongoose.model("Attendance", attendanceSchema);
export default Attendance;
