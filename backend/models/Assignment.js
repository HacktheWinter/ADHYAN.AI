import mongoose from "mongoose";

const questionSchema = new mongoose.Schema({
  question: { 
    type: String, 
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
});

const assignmentSchema = new mongoose.Schema({
  classroomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Classroom",
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: "",
  },
  generatedFrom: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Note",
  }],
  questions: [questionSchema],
  marksPerQuestion: {
    type: Number,
    default: 2,
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
  dueDate: {
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

export default mongoose.model("Assignment", assignmentSchema);