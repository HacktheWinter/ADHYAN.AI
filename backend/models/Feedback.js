import mongoose from "mongoose";

const QuestionSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
  },
});

const FeedbackSchema = new mongoose.Schema(
  {
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Classroom",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User", // teacher
    },

    questions: [QuestionSchema],

    enableComment: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: false,
    },

    responses: [
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    studentName: String,
    studentEmail: String,

    answers: [
      {
        questionId: mongoose.Schema.Types.ObjectId,
        rating: Number,
      },
    ],

    comment: String,
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
],

  },
  { timestamps: true }
);

export default mongoose.model("Feedback", FeedbackSchema);
