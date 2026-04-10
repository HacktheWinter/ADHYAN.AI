import mongoose from "mongoose";
import Note from "../models/Note.js";
import QuestionBank from "../models/QuestionBank.js";
import { getBucket } from "../config/gridfs.js";
import { cleanText, extractTextFromPDF } from "../utils/pdfExtractor.js";
import {
  createHttpError,
  getAuthorizedClassroomForTeacher,
} from "../utils/accessControl.js";

const readFileFromGridFS = (bucket, fileId) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    const readstream = bucket.openDownloadStream(fileId);

    readstream.on("data", (chunk) => chunks.push(chunk));
    readstream.on("error", reject);
    readstream.on("end", () => resolve(Buffer.concat(chunks)));
  });

const buildQuestionSegments = (text) => {
  const sentenceSegments = text
    .split(/(?<=[.!?])\s+/)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length >= 40);

  if (sentenceSegments.length >= 30) {
    return sentenceSegments;
  }

  const words = text.split(/\s+/).filter(Boolean);
  const chunkSize = Math.max(35, Math.ceil(words.length / 30));
  const chunks = [];

  for (let index = 0; index < words.length; index += chunkSize) {
    const chunk = words.slice(index, index + chunkSize).join(" ").trim();
    if (chunk.length >= 40) {
      chunks.push(chunk);
    }
  }

  return chunks;
};

const toQuestionText = (segment, index) => {
  const promptPrefix =
    index < 10
      ? "Explain"
      : index < 20
      ? "Describe in detail"
      : "Analyse";

  return `${promptPrefix}: ${segment.replace(/\s+/g, " ").trim()}`;
};

export const generateQuestionBank = async (req, res) => {
  try {
    const { noteId } = req.body;
    if (!noteId) {
      throw createHttpError(400, "noteId is required");
    }

    const note = await Note.findById(noteId);
    if (!note) {
      throw createHttpError(404, "Note not found");
    }

    await getAuthorizedClassroomForTeacher(req, note.classroomId);

    const bucket = getBucket();
    if (!bucket) {
      return res
        .status(503)
        .json({ error: "Database connection not ready. Please try again." });
    }

    if (!mongoose.Types.ObjectId.isValid(note.fileId)) {
      throw createHttpError(400, "Invalid note file reference");
    }

    const buffer = await readFileFromGridFS(
      bucket,
      new mongoose.Types.ObjectId(note.fileId)
    );
    const extractedText = await extractTextFromPDF(buffer);
    const cleanedText = cleanText(extractedText, 2);
    const segments = buildQuestionSegments(cleanedText);

    if (segments.length < 30) {
      throw createHttpError(
        400,
        "Not enough content in PDF to generate 30 questions"
      );
    }

    const questions = segments.slice(0, 30).map((segment, index) => ({
      question: `Q${index + 1}: ${toQuestionText(segment, index)}?`,
      type: index < 10 ? "easy" : index < 20 ? "medium" : "hard",
      marks: index < 10 ? 2 : index < 20 ? 3 : 5,
    }));

    const questionBank = await QuestionBank.findOneAndUpdate(
      { noteId },
      { noteId, questions },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.status(201).json({
      success: true,
      message: "Question bank generated successfully (30 questions)",
      questionBank,
    });
  } catch (error) {
    console.error("Question Bank Generation Error:", error);
    res
      .status(error.statusCode || 500)
      .json({ error: error.message || "Server error" });
  }
};

export const getQuestionBank = async (req, res) => {
  try {
    const { noteId } = req.params;
    const note = await Note.findById(noteId);

    if (!note) {
      throw createHttpError(404, "Note not found");
    }

    await getAuthorizedClassroomForTeacher(req, note.classroomId);

    const questionBank = await QuestionBank.findOne({ noteId });
    if (!questionBank) {
      return res.status(404).json({ error: "No questions found" });
    }

    res.status(200).json(questionBank);
  } catch (error) {
    console.error(error);
    res
      .status(error.statusCode || 500)
      .json({ error: error.message || "Server error" });
  }
};
