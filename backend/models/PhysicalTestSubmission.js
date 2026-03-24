import mongoose from "mongoose";

const answerSchema = new mongoose.Schema({
  questionId: { type: String, required: true },
  question: { type: String, required: true },
  answerKey: { type: String, required: true },
  marks: { type: Number, required: true },
  studentAnswerPoints: { type: String, default: "" }, // key points student actually wrote
  marksAwarded: { type: Number, default: 0 },
  aiFeedback: { type: String, default: "" },
  checkedBy: { type: String, enum: ["pending", "ai", "teacher"], default: "pending" },
});

const physicalTestSubmissionSchema = new mongoose.Schema({
  // Optional — linked to a published digital test (legacy flow)
  testPaperId: { type: mongoose.Schema.Types.ObjectId, ref: "TestPaper", required: false, default: null },
  // New freeform flow — linked to classroom + custom test title
  classId: { type: mongoose.Schema.Types.ObjectId, ref: "Classroom", required: false, default: null },
  testTitle: { type: String, default: "" },
  questionCardFileId: { type: mongoose.Schema.Types.ObjectId, default: null },
  questionCardFileName: { type: String, default: "" },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  studentName: { type: String, required: true },
  pdfFileId: { type: mongoose.Schema.Types.ObjectId, required: true },
  pdfFileName: { type: String, required: true },
  answers: [answerSchema],
  totalMarks: { type: Number, required: true },
  marksObtained: { type: Number, default: 0 },
  percentage: { type: Number, default: 0 },
  status: { type: String, enum: ["pending", "checked"], default: "pending" },
  isResultPublished: { type: Boolean, default: false },
  uploadedAt: { type: Date, default: Date.now },
  checkedAt: { type: Date, default: null },
}, { timestamps: true });

export default mongoose.model("PhysicalTestSubmission", physicalTestSubmissionSchema);
