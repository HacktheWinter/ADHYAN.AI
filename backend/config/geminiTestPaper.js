// Backend/config/geminiTestPaper.js
import { GoogleGenerativeAI } from "@google/generative-ai";

// MULTIPLE API KEYS - Load Balancing
const API_KEYS = [
  process.env.GEN_API_KEY_1,
  process.env.GEN_API_KEY_2,
  process.env.GEN_API_KEY_3,
].filter(Boolean); // Remove undefined keys

let currentKeyIndex = 0;
let failedAttempts = 0;
const MAX_RETRIES = API_KEYS.length;
const TRANSIENT_ERROR_RETRY_MULTIPLIER = 3;
const MAX_TRANSIENT_RETRIES = Math.max(
  MAX_RETRIES,
  MAX_RETRIES * TRANSIENT_ERROR_RETRY_MULTIPLIER
);

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isQuotaOrRateLimitError = (error) => {
  const message = String(error?.message || "");
  const status = Number(error?.status);
  return (
    status === 429 ||
    message.includes("quota") ||
    message.includes("429") ||
    message.includes("RESOURCE_EXHAUSTED")
  );
};

const isTransientServiceError = (error) => {
  const message = String(error?.message || "").toLowerCase();
  const status = Number(error?.status);
  return (
    status === 503 ||
    status === 502 ||
    status === 504 ||
    message.includes("503") ||
    message.includes("service unavailable") ||
    message.includes("high demand") ||
    message.includes("temporarily unavailable") ||
    message.includes("unavailable")
  );
};

const getBackoffMs = (attempt) => Math.min(12000, 1500 * Math.max(1, attempt));

/**
 * Get Gemini model with automatic key rotation
 */
const getModel = () => {
  const apiKey = API_KEYS[currentKeyIndex];
  const genAI = new GoogleGenerativeAI(apiKey);

  console.log(`Using API Key #${currentKeyIndex + 1}/${API_KEYS.length}`);

  return genAI.getGenerativeModel({
    model: "gemini-3.1-flash-lite",
  });
};

/**
 * Rotate to next API key
 */
const rotateApiKey = () => {
  currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
  console.log(`Switched to API Key #${currentKeyIndex + 1}/${API_KEYS.length}`);
};

const generationConfig = {
  temperature: 0.7, // Lower temperature for more stable JSON
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 16384, // Increased tokens for long test papers
  responseMimeType: "application/json",
};

/**
 * Split text into chunks of approximately `size` characters,
 * breaking at a space boundary when possible.
 */
const chunkText = (text, size = 25000) => {
  if (text.length <= size) return [text];
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + size, text.length);
    // try to break at a space boundary
    if (end < text.length) {
      const spaceIdx = text.lastIndexOf(" ", end);
      if (spaceIdx > start) end = spaceIdx;
    }
    chunks.push(text.slice(start, end));
    start = end;
  }
  return chunks;
};

/**
 * Generate Test Paper from text using Gemini AI
 * Supports large documents via multi-turn chat chunking.
 * @param {string} extractedText - Content extracted from files
 * @param {object} config - Configuration for generation
 */
export const generateTestPaperFromText = async (extractedText, config = {}) => {
  const counts = config.counts || { 
    short: { count: 5, optional: 0 }, 
    medium: { count: 4, optional: 0 }, 
    long: { count: 2, optional: 0 } 
  };
  const difficulty = config.difficulty || "mixed";
  const excludeQuestions = config.excludeQuestions || [];

  const getCount = (section, key, fallback) => {
    const raw = counts?.[section]?.[key];
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(0, parsed);
  };

  const shortCount = getCount("short", "count", 5);
  const shortOptional = getCount("short", "optional", 0);
  const mediumCount = getCount("medium", "count", 4);
  const mediumOptional = getCount("medium", "optional", 0);
  const longCount = getCount("long", "count", 2);
  const longOptional = getCount("long", "optional", 0);
  
  const totalShort = shortCount + shortOptional;
  const totalMedium = mediumCount + mediumOptional;
  const totalLong = longCount + longOptional;
  
  const directShort = Math.max(0, shortCount - shortOptional);
  const directMedium = Math.max(0, mediumCount - mediumOptional);
  const directLong = Math.max(0, longCount - longOptional);
  const totalQuestions = totalShort + totalMedium + totalLong;

  let attempts = 0;

  while (attempts < MAX_TRANSIENT_RETRIES) {
    try {
      console.log(`Preparing Gemini prompt for Test Paper (Total ${totalQuestions} Qs)...`);
      console.log(`Config: ${totalShort}S, ${totalMedium}M, ${totalLong}L, difficulty: ${difficulty}`);
      console.log(`Full text length: ${extractedText.length} chars`);

      const textChunks = chunkText(extractedText);
      console.log(`Split into ${textChunks.length} chunk(s)`);

      const difficultyInstruction = difficulty === "mixed"
        ? "Mix difficulty levels for each category"
        : `All questions should be ${difficulty.toUpperCase()} difficulty level`;

      const excludeInstruction = excludeQuestions.length > 0
        ? `\nDO NOT repeat or generate questions similar to these existing ones:\n- ${excludeQuestions.join('\n- ')}\n`
        : "";

      const model = getModel();

      const chatSession = model.startChat({
        generationConfig,
        history: [],
      });

      // ── Feed chunks to the model ──────────────────────────────
      if (textChunks.length > 1) {
        for (let i = 0; i < textChunks.length - 1; i++) {
          const chunkMsg = `I am providing study material in multiple parts. This is Part ${i + 1} of ${textChunks.length}. Read and memorize this content. Do NOT generate anything yet — just reply with the single word "Understood".\n\nCONTENT PART ${i + 1}:\n${textChunks[i]}`;
          console.log(`  Sending chunk ${i + 1}/${textChunks.length} (${textChunks[i].length} chars)...`);
          await chatSession.sendMessage(chunkMsg);
        }
      }

      // ── Final prompt (includes the last chunk) ────────────────
      const lastChunk = textChunks[textChunks.length - 1];
      const contentHeader = textChunks.length > 1
        ? `This is the FINAL Part ${textChunks.length} of ${textChunks.length} of the study material. Now you have the complete content. Generate questions from ALL parts combined.\n\nFINAL CONTENT PART:\n${lastChunk}`
        : `CONTENT:\n${lastChunk}`;

      const prompt = `
You are an expert exam question paper generator.

DYNAMIC GENERATION RULE:
1. Check the CONTENT provided below. If the CONTENT already contains a list of explicit questions (e.g. it is a previous question paper, a worksheet, or a test), you MUST extract those EXACT questions and use them, generating appropriate answer keys for them. Do not create new questions if sufficient questions already exist in the text.
2. If the CONTENT is just study material or notes without a sufficient set of explicit questions, then generate completely new questions based on the concepts in the CONTENT.

${contentHeader}

${excludeInstruction}

CRITICAL JSON RULES:
1. Return ONLY valid JSON - No markdown snippets, no backticks, no "json" label.
2. NO LITERAL NEWLINES inside JSON string values. Use spaces or /n instead.
3. Escape all double quotes (\") within question or answer text.
4. Each answerKey MUST be detailed (7-9 lines) but formatted as a SINGLE-LINE string with no literal line breaks.

STRUCTURE RULE (Repeat for Section A, B, and C):
1. For a section with R Required and O Optional questions:
   - Generate (R-O) Direct Questions (Numbered normally).
   - Generate O Internal Choice Pairs (e.g., "Question 4(a) OR 4(b)").
2. For this specific paper:
  - Section A: ${directShort} direct questions + ${shortOptional} internal choice pairs.
  - Section B: ${directMedium} direct questions + ${mediumOptional} internal choice pairs.
  - Section C: ${directLong} direct questions + ${longOptional} internal choice pairs.

REQUIREMENTS:
1. CONTINUOUS NUMBERING: Use a single global sequence (1, 2, 3... N) for the entire paper. 
   - If Section A has 5 items, Section B MUST start at Question 6. 
   - NEVER reset numbering for a new section.
2. Format Paired Questions: Use "Q[GlobalNumber](a)" and "Q[GlobalNumber](b)" in the choiceLabel field.
3. Link Pairs: Paired questions MUST share the same choiceGroup (e.g., "group_sectionA_6").
4. Separator: Include the text "[OR]" between the question text of internal choice pairs.
5. Each question MUST include: question, type, marks, section, choiceLabel, choiceGroup, answerKey, answerGuidelines.

RESPONSE FORMAT (Valid JSON only):
{
  "questions": [
    {
      "question": "Direct question text...",
      "type": "short", "marks": 2, "section": "Section A", "choiceLabel": "", "choiceGroup": "",
      "answerKey": "Detailed 7-9 line explanation on a single line.", "answerGuidelines": "4-5 words only"
    }
  ]
}

IMPORTANT: 
- Total unique items generated: ${totalQuestions}
- EXACTLY match the Direct + Pair structure for ALL sections.
`;

      console.log("Sending final generation prompt to Gemini...");

      const result = await chatSession.sendMessage(prompt);
      const response = result.response.text();

      console.log("Received response from Gemini");

      // Clean response
      let cleanedResponse = response.trim();
      if (cleanedResponse.startsWith("```json")) {
        cleanedResponse = cleanedResponse
          .replace(/```json\n?/g, "")
          .replace(/```\n?/g, "");
      }
      if (cleanedResponse.startsWith("```")) {
        cleanedResponse = cleanedResponse.replace(/```\n?/g, "");
      }

      let parsedResponse;
      try {
        parsedResponse = JSON.parse(cleanedResponse);
      } catch (parseError) {
        console.error("JSON Parse Error:", parseError.message);
        throw new Error("Invalid JSON response from AI");
      }

      if (
        !parsedResponse.questions ||
        !Array.isArray(parsedResponse.questions)
      ) {
        throw new Error("Invalid response format from AI");
      }

      const validQuestions = parsedResponse.questions.filter((q) => {
        return (
          q.question &&
          q.type &&
          ["short", "medium", "long"].includes(q.type) &&
          q.marks &&
          q.answerKey
        );
      });

      if (validQuestions.length === 0) {
        throw new Error("No valid questions generated");
      }

      console.log(`Generated ${validQuestions.length} valid questions`);

      return validQuestions;
    } catch (error) {
      console.error(
        ` Gemini API Error (Key #${currentKeyIndex + 1}):`,
        error.message
      );

      attempts++;

      if (isQuotaOrRateLimitError(error)) {
        console.log(
          ` API Key #${currentKeyIndex + 1} quota exceeded. Rotating...`
        );
        rotateApiKey();

        if (attempts < MAX_TRANSIENT_RETRIES) {
          console.log(` Retrying with API Key #${currentKeyIndex + 1}...`);
          continue;
        }
      }

      if (isTransientServiceError(error)) {
        const backoffMs = getBackoffMs(attempts);
        console.log(
          ` Gemini service is temporarily busy (attempt ${attempts}/${MAX_TRANSIENT_RETRIES}). Retrying in ${backoffMs}ms...`
        );
        rotateApiKey();

        if (attempts < MAX_TRANSIENT_RETRIES) {
          await wait(backoffMs);
          continue;
        }
      }

      throw error;
    }
  }

};


/**
 * Generate Test Paper from topics using Gemini AI
 * @param {string[]} topics - List of topics to generate test from
 * @param {object} config - Configuration for generation
 */
export const generateTestPaperFromTopics = async (topics, config = {}) => {
  const counts = config.counts || { 
    short: { count: 5, optional: 0 }, 
    medium: { count: 4, optional: 0 }, 
    long: { count: 2, optional: 0 } 
  };
  const difficulty = config.difficulty || "mixed";
  const excludeQuestions = config.excludeQuestions || [];

  const getCount = (section, key, fallback) => {
    const raw = counts?.[section]?.[key];
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(0, parsed);
  };

  const shortCount = getCount("short", "count", 5);
  const shortOptional = getCount("short", "optional", 0);
  const mediumCount = getCount("medium", "count", 4);
  const mediumOptional = getCount("medium", "optional", 0);
  const longCount = getCount("long", "count", 2);
  const longOptional = getCount("long", "optional", 0);
  
  const totalShort = shortCount + shortOptional;
  const totalMedium = mediumCount + mediumOptional;
  const totalLong = longCount + longOptional;
  
  const directShort = Math.max(0, shortCount - shortOptional);
  const directMedium = Math.max(0, mediumCount - mediumOptional);
  const directLong = Math.max(0, longCount - longOptional);
  const totalQuestions = totalShort + totalMedium + totalLong;

  let attempts = 0;

  while (attempts < MAX_TRANSIENT_RETRIES) {
    try {
      console.log(`🤖 Preparing Gemini prompt for Test Paper from topics (Total ${totalQuestions} Qs)...`);
      console.log("Topics:", topics);
      console.log(`Config: ${totalShort}S, ${totalMedium}M, ${totalLong}L, difficulty: ${difficulty}`);

      const topicsText = Array.isArray(topics) ? topics.join(", ") : topics;

      const difficultyInstruction = difficulty === "mixed"
        ? "Mix difficulty levels for each category"
        : `All questions should be ${difficulty.toUpperCase()} difficulty level`;

      const excludeInstruction = excludeQuestions.length > 0
        ? `\nDO NOT repeat or generate questions similar to these existing ones:\n- ${excludeQuestions.join('\n- ')}\n`
        : "";

      const prompt = `
You are an expert exam question paper generator. Generate questions with answer keys grouped by sections based on the following topics.

TOPICS:
${topicsText}

${excludeInstruction}

CRITICAL JSON RULES:
1. Return ONLY valid JSON - No markdown snippets, no backticks, no "json" label.
2. NO LITERAL NEWLINES inside JSON string values. Use spaces or /n instead.
3. Escape all double quotes (\") within question or answer text.
4. Each answerKey MUST be detailed (7-9 lines) but formatted as a SINGLE-LINE string with no literal line breaks.

STRUCTURE RULE (Repeat for Section A, B, and C):
1. For a section with R Required and O Optional questions:
   - Generate (R-O) Direct Questions (Numbered normally).
   - Generate O Internal Choice Pairs (e.g., "Question 4(a) OR 4(b)").
2. For this specific paper:
  - Section A: ${directShort} direct questions + ${shortOptional} internal choice pairs.
  - Section B: ${directMedium} direct questions + ${mediumOptional} internal choice pairs.
  - Section C: ${directLong} direct questions + ${longOptional} internal choice pairs.

REQUIREMENTS:
1. CONTINUOUS NUMBERING: Use a single global sequence (1, 2, 3... N) for the entire paper. 
   - If Section A has 5 items, Section B MUST start at Question 6. 
   - NEVER reset numbering for a new section.
2. Format Paired Questions: Use "Q[GlobalNumber](a)" and "Q[GlobalNumber](b)" in the choiceLabel field.
3. Link Pairs: Paired questions MUST share the same choiceGroup (e.g., "group_sectionA_6").
4. Separator: Include the text "[OR]" between the question text of internal choice pairs.
5. Each question MUST include: question, type, marks, section, choiceLabel, choiceGroup, answerKey, answerGuidelines.

RESPONSE FORMAT (Valid JSON only):
{
  "questions": [
    {
      "question": "Direct question text...",
      "type": "short", "marks": 2, "section": "Section A", "choiceLabel": "", "choiceGroup": "",
      "answerKey": "Detailed 7-9 line explanation on a single line.", "answerGuidelines": "4-5 words only"
    }
  ]
}

IMPORTANT: 
- Total unique items generated: ${totalQuestions}
- EXACTLY match the Direct + Pair structure for ALL sections.
`;

      console.log("Sending request to Gemini...");

      const model = getModel();

      const chatSession = model.startChat({
        generationConfig,
        history: [],
      });

      const result = await chatSession.sendMessage(prompt);
      const response = result.response.text();

      console.log("Received response from Gemini");

      let cleanedResponse = response.trim();
      if (cleanedResponse.startsWith("```json")) {
        cleanedResponse = cleanedResponse
          .replace(/```json\n?/g, "")
          .replace(/```\n?/g, "");
      }
      if (cleanedResponse.startsWith("```")) {
        cleanedResponse = cleanedResponse.replace(/```\n?/g, "");
      }

      let parsedResponse;
      try {
        parsedResponse = JSON.parse(cleanedResponse);
      } catch (parseError) {
        console.error("JSON Parse Error:", parseError.message);
        throw new Error("Invalid JSON response from AI");
      }

      if (
        !parsedResponse.questions ||
        !Array.isArray(parsedResponse.questions)
      ) {
        throw new Error("Invalid response format from AI");
      }

      const validQuestions = parsedResponse.questions.filter((q) => {
        return (
          q.question &&
          q.type &&
          ["short", "medium", "long"].includes(q.type) &&
          q.marks &&
          q.answerKey
        );
      });

      if (validQuestions.length === 0) {
        throw new Error("No valid questions generated");
      }

      console.log(`Generated ${validQuestions.length} valid questions`);

      return validQuestions;
    } catch (error) {
      console.error(
        ` Gemini API Error (Key #${currentKeyIndex + 1}):`,
        error.message
      );

      attempts++;

      if (isQuotaOrRateLimitError(error)) {
        console.log(
          ` API Key #${currentKeyIndex + 1} quota exceeded. Rotating...`
        );
        rotateApiKey();

        if (attempts < MAX_TRANSIENT_RETRIES) {
          console.log(` Retrying with API Key #${currentKeyIndex + 1}...`);
          continue;
        }
      }

      if (isTransientServiceError(error)) {
        const backoffMs = getBackoffMs(attempts);
        console.log(
          ` Gemini service is temporarily busy (attempt ${attempts}/${MAX_TRANSIENT_RETRIES}). Retrying in ${backoffMs}ms...`
        );
        rotateApiKey();

        if (attempts < MAX_TRANSIENT_RETRIES) {
          await wait(backoffMs);
          continue;
        }
      }

      throw error;
    }
  }

  throw new Error(
    "Gemini service is busy right now after multiple retries. Please try again in a minute."
  );
};

/**
 *  OPTIMIZED: Check answers for 1 STUDENT at a time with SHORT feedback
 * With automatic API key rotation
 */
export const checkAnswersWithAI = async (answerKeys, batchStudentAnswers) => {
  let attempts = 0;

  while (attempts < MAX_TRANSIENT_RETRIES) {
    try {
      console.log(
        ` Checking answers for ${batchStudentAnswers.length} student with AI...`
      );

      const prompt = `
You are an expert teacher checking exam answers for 1 STUDENT. Be fair and give partial marks.

ANSWER KEYS:
${JSON.stringify(answerKeys, null, 2)}

STUDENT TO CHECK:
${JSON.stringify(batchStudentAnswers, null, 2)}

INSTRUCTIONS:
1. Check all answers for this student
2. Award marks based on correctness and completeness
3. Accept synonyms and alternate phrasings
4. Give partial marks for incomplete answers

CRITICAL: Keep feedback EXTREMELY SHORT (maximum 5-7 words only!)

RESPONSE FORMAT (Valid JSON only):
{
  "results": [
    {
      "submissionId": "<<exact submissionId from input>>",
      "checkedAnswers": [
        {
          "questionId": "<<exact questionId>>",
          "marksAwarded": 2,
          "feedback": "Correct concept explained well"
        }
      ]
    }
  ]
}

FEEDBACK EXAMPLES (5-7 words max):
"Correct, all key points covered"
"Partially correct, missing details"
"Incorrect approach, wrong concept"
"Excellent answer with examples"
DO NOT write long feedback like "You have explained the concept very well with proper examples and details"

CRITICAL REQUIREMENTS:
- Return result for submissionId: ${batchStudentAnswers[0].submissionId}
- Student name: ${batchStudentAnswers[0].studentName}
- Feedback must be 5-7 words maximum
- Return ONLY valid JSON, NO markdown, NO extra text
`;

      const model = getModel(); // Get current model

      const chatSession = model.startChat({
        generationConfig: {
          ...generationConfig,
          maxOutputTokens: 8192,
        },
        history: [],
      });

      const result = await chatSession.sendMessage(prompt);
      const response = result.response.text();

      // Clean response
      let cleanedResponse = response.trim();
      if (cleanedResponse.startsWith("```json")) {
        cleanedResponse = cleanedResponse
          .replace(/```json\n?/g, "")
          .replace(/```\n?/g, "");
      }
      if (cleanedResponse.startsWith("```")) {
        cleanedResponse = cleanedResponse.replace(/```\n?/g, "");
      }

      let parsedResponse;
      try {
        parsedResponse = JSON.parse(cleanedResponse);
      } catch (parseError) {
        console.error("❌ JSON Parse Error:", parseError.message);
        console.error("Raw response:", cleanedResponse.substring(0, 500));
        throw new Error("Invalid JSON response from AI");
      }

      if (!parsedResponse.results || !Array.isArray(parsedResponse.results)) {
        throw new Error(
          "Invalid batch response format from AI - missing 'results' array"
        );
      }

      if (parsedResponse.results.length !== batchStudentAnswers.length) {
        console.warn(
          `Expected ${batchStudentAnswers.length} results, got ${parsedResponse.results.length}`
        );
      }

      console.log(
        `AI checking completed for ${parsedResponse.results.length} students`
      );

      return parsedResponse.results;
    } catch (error) {
      console.error(
        `AI Checking Error (Key #${currentKeyIndex + 1}):`,
        error.message
      );

      attempts++;

      if (isQuotaOrRateLimitError(error)) {
        console.log(
          `API Key #${currentKeyIndex + 1} quota exceeded. Rotating...`
        );
        rotateApiKey();

        if (attempts < MAX_TRANSIENT_RETRIES) {
          console.log(` Retrying with API Key #${currentKeyIndex + 1}...`);
          await wait(1000);
          continue;
        }
      }

      if (isTransientServiceError(error)) {
        const backoffMs = getBackoffMs(attempts);
        console.log(
          ` Gemini service is temporarily busy while checking answers (attempt ${attempts}/${MAX_TRANSIENT_RETRIES}). Retrying in ${backoffMs}ms...`
        );
        rotateApiKey();

        if (attempts < MAX_TRANSIENT_RETRIES) {
          await wait(backoffMs);
          continue;
        }
      }

      throw error;
    }
  }

  throw new Error(
    "Gemini service is busy right now after multiple retries. Please try again in a minute."
  );
};

export default { generateTestPaperFromText, generateTestPaperFromTopics, checkAnswersWithAI };
