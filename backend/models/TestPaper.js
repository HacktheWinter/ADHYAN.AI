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
  }, // Alternate acceptable answers
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
  totalMarks: {
    type: Number,
    default: 50,
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