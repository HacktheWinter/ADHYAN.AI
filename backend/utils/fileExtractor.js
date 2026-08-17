// Backend/utils/fileExtractor.js
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");
import mammoth from "mammoth";
import XLSX from "xlsx";

// ─── Supported MIME types ───────────────────────────────────────────
export const ALLOWED_MIMETYPES = [
  "application/pdf",
  "application/msword",                                                          // .doc
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",      // .docx
  "application/vnd.ms-excel",                                                    // .xls
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",            // .xlsx
];

/**
 * Extract text from a file buffer based on its MIME type.
 * Returns the FULL extracted text — no truncation.
 */
export const extractTextFromFile = async (buffer, mimetype) => {
  console.log(`[FileExtractor] Extracting text from ${mimetype} (${buffer.length} bytes)`);

  if (mimetype === "application/pdf") {
    return await extractPDF(buffer);
  }

  if (
    mimetype === "application/msword" ||
    mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return await extractWord(buffer);
  }

  if (
    mimetype === "application/vnd.ms-excel" ||
    mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ) {
    return await extractExcel(buffer);
  }

  throw new Error(`Unsupported file type: ${mimetype}`);
};

// ─── PDF ────────────────────────────────────────────────────────────
async function extractPDF(buffer) {
  try {
    const data = await pdfParse(buffer, { max: 0 });
    console.log(`[FileExtractor] PDF: ${data.numpages} pages, ${data.text.length} chars`);
    return data.text;
  } catch (error) {
    throw new Error("Failed to extract text from PDF: " + error.message);
  }
}

// ─── Word (DOC / DOCX) ─────────────────────────────────────────────
async function extractWord(buffer) {
  try {
    const result = await mammoth.extractRawText({ buffer });
    console.log(`[FileExtractor] DOCX: ${result.value.length} chars`);
    return result.value;
  } catch (error) {
    throw new Error("Failed to extract text from Word document: " + error.message);
  }
}

// ─── Excel (XLS / XLSX) ────────────────────────────────────────────
async function extractExcel(buffer) {
  try {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    let allText = "";

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      // Convert each sheet to a readable CSV-like text
      const csv = XLSX.utils.sheet_to_csv(sheet, { blankrows: false });
      allText += `\n=== Sheet: ${sheetName} ===\n${csv}\n`;
    }

    console.log(`[FileExtractor] Excel: ${workbook.SheetNames.length} sheets, ${allText.length} chars`);
    return allText;
  } catch (error) {
    throw new Error("Failed to extract text from Excel file: " + error.message);
  }
}

/**
 * Clean text for AI processing.
 * Does NOT truncate — returns the full cleaned text.
 */
export const cleanTextFull = (text) => {
  if (!text || text.trim().length === 0) {
    throw new Error("No text content found in the file");
  }

  let cleaned = text
    .replace(/\s+/g, " ")
    .replace(/[^\x20-\x7E\s]/g, "") // Remove non-ASCII
    .trim();

  if (cleaned.length < 500) {
    throw new Error(
      `Not enough content. Only ${cleaned.length} characters found. Need at least 500 characters.`
    );
  }

  console.log(`[FileExtractor] Cleaned text length: ${cleaned.length} chars`);
  return cleaned;
};

/**
 * Validate if text has enough content for question generation
 */
export const validateTextContent = (text) => {
  if (!text || text.trim().length < 500) {
    return false;
  }
  const words = text.split(/\s+/).filter((w) => w.length > 3);
  return words.length >= 100;
};

// Keep backward-compat default export
export default { extractTextFromFile, cleanTextFull, validateTextContent, ALLOWED_MIMETYPES };
