import mongoose from "mongoose";
import Note from "../models/Note.js";
import QuestionBank from "../models/QuestionBank.js";
import { bucket } from "../config/gridfs.js"; // your GridFSBucket

export const generateQuestionBank = async (req, res) => {
  try {
    const { noteId } = req.body;
    if (!noteId) return res.status(400).json({ error: "noteId is required" });

    // Fetch the note from DB
    const note = await Note.findById(noteId);
    if (!note) return res.status(404).json({ error: "Note not found" });

    // Read PDF from GridFS
    const _id = new mongoose.Types.ObjectId(note.fileId);
    const chunks = [];
    const readstream = bucket.openDownloadStream(_id);

    readstream.on("data", (chunk) => chunks.push(chunk));
    readstream.on("error", (err) => {
      console.error(err);
      return res.status(500).json({ error: "Error reading PDF from GridFS" });
    });

    readstream.on("end", async () => {
      const buffer = Buffer.concat(chunks);
      const text = buffer.toString("utf-8"); // simple text extraction

      if (!text || text.length < 300) {
        return res.status(400).json({
          error: "Not enough content in PDF to generate 30 questions",
        });
      }

      // Split text into sentences/paragraphs
      let paragraphs = text
        .split(/\n|\r\n|\.|:/)
        .map((p) => p.trim())
        .filter((p) => p.length > 20);

      if (paragraphs.length < 30) {
        return res.status(400).json({
          error: "Not enough content in PDF to generate 30 questions",
        });
      }

      // Shuffle paragraphs
      paragraphs = paragraphs.sort(() => 0.5 - Math.random());

      // Generate 30 questions
      const questions = [];

      // Easy questions (short, 2 marks)
      for (let i = 0; i < 10; i++) {
        questions.push({
          question: `Q${i + 1}: ${paragraphs[i].slice(0, 50)}?`,
          type: "easy",
          marks: 2,
        });
      }

      // Medium questions (medium, 3 marks)
      for (let i = 10; i < 20; i++) {
        questions.push({
          question: `Q${i + 1}: ${paragraphs[i].slice(0, 100)}?`,
          type: "medium",
          marks: 3,
        });
      }

      // Hard questions (long, 5 marks)
      for (let i = 20; i < 30; i++) {
        questions.push({
          question: `Q${i + 1}: ${paragraphs[i].slice(0, 200)}?`,
          type: "hard",
          marks: 5,
        });
      }

      // Save to DB
      const questionBank = await QuestionBank.create({ noteId, questions });

      res.status(201).json({
        success: true,
        message: "Question bank generated successfully (30 questions)",
        questionBank,
      });
    });
  } catch (error) {
    console.error("Question Bank Generation Error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

export const getQuestionBank = async (req, res) => {
  try {
    const { noteId } = req.params;
    const questionBank = await QuestionBank.findOne({ noteId });
    if (!questionBank)
      return res.status(404).json({ error: "No questions found" });

    res.status(200).json(questionBank);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};
