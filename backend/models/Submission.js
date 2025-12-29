import mongoose from "mongoose";

const submissionSchema = new mongoose.Schema({
  submissionId: String,
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  answerText: String,
  grade: Number,
  feedback: String,
  plagiarismScore: Number,
});

export default mongoose.model("Submission", submissionSchema);

