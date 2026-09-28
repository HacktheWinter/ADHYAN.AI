// Backend/utils/fileExtractor.js
import { createRequire } from "module";
const require = createRequire(import.meta.url);

// IMPORTANT: Import from pdf-parse/lib/pdf-parse.js directly to bypass the
// buggy index.js which tries to require('./test/data/05-versions-space.pdf')
// that doesn't exist in production deployments. This is a well-known pdf-parse bug.
let pdfParse;
try {
  pdfParse = require("pdf-parse/lib/pdf-parse.js");
} catch (_) {
  // Fallback to default import if the direct path doesn't resolve
  pdfParse = require("pdf-parse");
}

import mammoth from "mammoth";
import XLSX from "xlsx";

// ─── Config ─────────────────────────────────────────────────────────
const PDF_MAX_RETRIES = 3;
const PDF_RETRY_DELAY_MS = 1000; // 1 second base delay

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

// ─── PDF (with retry logic for VPS reliability) ─────────────────────
async function extractPDF(buffer) {
  let lastError;

  for (let attempt = 1; attempt <= PDF_MAX_RETRIES; attempt++) {
    try {
      // Disable the pdf.js worker to prevent silent worker crashes on
      // low-resource VPS environments. The "pagerender" option set to a
      // custom function avoids worker-related failures.
      const options = {
        max: 0,  // Parse all pages
        // Disable workers — on VPS with limited resources, the worker
        // process can fail silently causing intermittent 500 errors.
        pagerender: function (pageData) {
          return pageData.getTextContent().then(function (textContent) {
            let lastY, text = '';
            for (const item of textContent.items) {
              if (lastY !== item.transform[5] && lastY !== undefined) {
                text += '\n';
              }
              text += item.str;
              lastY = item.transform[5];
            }
            return text;
          });
        }
      };

      const data = await pdfParse(buffer, options);
      console.log(`[FileExtractor] PDF: ${data.numpages} pages, ${data.text.length} chars`);

      if (!data.text || data.text.trim().length === 0) {
        throw new Error("PDF parsing returned empty text (possibly a scanned/image PDF)");
      }

      return data.text;
    } catch (error) {
      lastError = error;
      console.error(`[FileExtractor] PDF extraction attempt ${attempt}/${PDF_MAX_RETRIES} failed: ${error.message}`);

      if (attempt < PDF_MAX_RETRIES) {
        const delay = PDF_RETRY_DELAY_MS * attempt; // linear backoff
        console.log(`[FileExtractor] Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error("Failed to extract text from PDF after " + PDF_MAX_RETRIES + " attempts: " + lastError.message);
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
    .replace(/[ \t]+/g, " ") // Collapse multiple spaces/tabs into a single space
    .replace(/\n\s*\n+/g, "\n\n") // Collapse 3+ newlines into 2 newlines to keep paragraphs
    .replace(/[^\x20-\x7E\n\r]/g, "") // Remove non-ASCII characters but keep newlines/returns
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
