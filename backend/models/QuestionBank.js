import mongoose from "mongoose";

const questionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  type: {
    type: String,
    enum: ["easy", "medium", "hard"], // <-- change here
    required: true,
  },
  marks: { type: Number, required: true },
});

const QuestionBankSchema = new mongoose.Schema({
  noteId: { type: mongoose.Schema.Types.ObjectId, ref: "Note", required: true },
  questions: [questionSchema],
});

const QuestionBank = mongoose.model("QuestionBank", QuestionBankSchema);

export default QuestionBank;
