// Backend/utils/pdfExtractor.js
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

/**
 * Extract text from PDF buffer with better error handling
 * @param {Buffer} buffer - PDF file buffer
 * @returns {Promise<string>} - Extracted text
 */
export const extractTextFromPDF = async (buffer) => {
  try {
    console.log("Extracting text from PDF...");
    console.log("Buffer size:", buffer.length, "bytes");

    const data = await pdfParse(buffer, {
      max: 0, // Extract all pages
    });

    console.log("Text extracted successfully");
    console.log("Pages:", data.numpages);
    console.log("Characters:", data.text.length);

    return data.text;
  } catch (error) {
    console.error("PDF extraction error:", error);
    throw new Error("Failed to extract text from PDF: " + error.message);
  }
};

/**
 * Clean and limit text for AI processing
 * @param {string} text - Raw extracted text
 * @param {number} maxChars - Maximum characters to keep
 * @returns {string} - Cleaned text
 */
export const cleanText = (text, maxChars = 15000) => {
  if (!text || text.trim().length === 0) {
    throw new Error("No text content found in PDF");
  }

  console.log("Cleaning text...");
  console.log("Original length:", text.length);

  // Remove multiple spaces, tabs, newlines
  let cleaned = text
    .replace(/\s+/g, " ")
    .replace(/[^\x20-\x7E\s]/g, "") // Remove non-ASCII characters
    .trim();

  // Limit to maxChars
  if (cleaned.length > maxChars) {
    cleaned = cleaned.slice(0, maxChars);
    console.log("Text truncated to", maxChars, "characters");
  }

  console.log("Final text length:", cleaned.length);

  // Minimum content check
  if (cleaned.length < 500) {
    throw new Error(
      `Not enough content. Only ${cleaned.length} characters found. Need at least 500 characters.`
    );
  }

  return cleaned;
};

/**
 * Validate if text has enough content for quiz generation
 * @param {string} text - Text to validate
 * @returns {boolean} - Is valid
 */
export const validateTextContent = (text) => {
  if (!text || text.trim().length < 500) {
    return false;
  }

  // Check if text has meaningful words
  const words = text.split(/\s+/).filter((w) => w.length > 3);
  return words.length >= 100; // At least 100 meaningful words
};
