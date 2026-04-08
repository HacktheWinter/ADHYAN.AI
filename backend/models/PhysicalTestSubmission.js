import mongoose from "mongoose";

const rubricSchema = new mongoose.Schema({
  mandatoryKeywords: { type: [String], default: [] },
  markingScheme: { type: mongoose.Schema.Types.Mixed, default: {} },
  depthRequired: { type: String, default: "" },
  zeroMarkCondition: { type: String, default: "" },
  acceptableVariations: { type: [String], default: [] },
  partialMarkingAllowed: { type: Boolean, default: true },
}, { _id: false });

const answerSchema = new mongoose.Schema({
  questionId: { type: String, required: true },
  question: { type: String, required: true },
  answerKey: { type: String, default: "" },
  marks: { type: Number, required: true },
  topic: { type: String, default: "" },
  rubric: { type: rubricSchema, default: () => ({}) },

  // AI evaluation results (populated after checking)
  studentAnswerPoints: { type: String, default: "" },
  marksAwarded: { type: Number, default: 0 },
  aiFeedback: { type: String, default: "" },
  checkedBy: { type: String, enum: ["pending", "ai", "teacher"], default: "pending" },
  keywordsFound: { type: [String], default: [] },
  keywordsMissed: { type: [String], default: [] },
  markingBreakdown: { type: mongoose.Schema.Types.Mixed, default: null },
  needs_human_review: { type: Boolean, default: false },
  handwritingConfidence: { type: Number, default: null },
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
  status: {
    type: String,
    enum: ["pending", "checking", "checked", "failed", "needs_review"],
    default: "pending",
  },
  errorType: {
    type: String,
    enum: ["illegible", "network_error", "quota_exceeded", "parse_error", "timeout", null],
    default: null,
  },
  errorMessage: { type: String, default: "" },
  isResultPublished: { type: Boolean, default: false },
  uploadedAt: { type: Date, default: Date.now },
  checkedAt: { type: Date, default: null },
}, { timestamps: true });

export default mongoose.model("PhysicalTestSubmission", physicalTestSubmissionSchema);
