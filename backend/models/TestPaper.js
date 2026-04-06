import mongoose from "mongoose";

const questionSchema = new mongoose.Schema({
  question: { 
    type: String, 
    required: true 
  },
  type: { 
    type: String, 
    enum: ["short", "medium", "long"], 
    required: true 
  },
  marks: { 
    type: Number, 
    required: true 
  },
  answerKey: { 
    type: String, 
    required: true 
  },
  answerGuidelines: { 
    type: String, 
    default: "" 
  },
  section: {
    type: String,
    default: ""
  },
  choiceLabel: {
    type: String,
    default: ""
  },
  choiceGroup: {
    type: String,
    default: ""
  }
});

const testPaperSchema = new mongoose.Schema({
  classroomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Classroom",
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  generatedFrom: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Note",
  }],
  questions: [questionSchema],
  questionCounts: {
    short: { 
      count: { type: Number, default: 5 },
      optional: { type: Number, default: 0 }
    },
    medium: { 
      count: { type: Number, default: 4 },
      optional: { type: Number, default: 0 }
    },
    long: { 
      count: { type: Number, default: 2 },
      optional: { type: Number, default: 0 }
    },
  },
  totalMarks: {
    type: Number,
    required: true,
  },
  difficulty: {
    type: String,
    enum: ["easy", "medium", "hard", "mixed"],
    default: "mixed",
  },
  status: {
    type: String,
    enum: ["draft", "published"],
    default: "draft",
  },
  // Timing
  duration: { 
    type: Number, 
    default: null 
  }, // Minutes
  startTime: {
    type: Date,
    default: null,
  },
  endTime: {
    type: Date,
    default: null,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("TestPaper", testPaperSchema);