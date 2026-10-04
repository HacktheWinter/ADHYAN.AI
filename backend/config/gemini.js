// Backend/config/gemini.js
import { GoogleGenerativeAI } from "@google/generative-ai";

// MULTIPLE API KEYS - Load Balancing
const API_KEYS = [
  process.env.GEN_API_KEY_1,
  process.env.GEN_API_KEY_2,
  process.env.GEN_API_KEY_3,
].filter(Boolean); // Remove undefined keys

let currentKeyIndex = 0;
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
 * Format single line code to properly indented multi-line code
 */
const formatSingleLineCode = (code, language) => {
  if (!code || code.trim().length === 0) return code;
  
  const isPython = language === "python";
  let result = [];
  let indent = 0;
  const indentStr = "    "; // 4 spaces
  
  if (isPython) {
    const parts = code.split(/\s*(?=(?:import |from |def |class |if |elif |else:|for |while |return |print|pass|#))/g);
    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      
      if (trimmed.startsWith("def ") || trimmed.startsWith("class ") || 
          trimmed.startsWith("if ") || trimmed.startsWith("for ") || 
          trimmed.startsWith("while ") || trimmed.startsWith("elif ") ||
          trimmed === "else:") {
        result.push(indentStr.repeat(indent) + trimmed);
        if (trimmed.endsWith(":")) indent++;
      } else if (trimmed.startsWith("return ") || trimmed.startsWith("pass") || trimmed.startsWith("print")) {
        result.push(indentStr.repeat(Math.max(indent, 1)) + trimmed);
      } else if (trimmed.startsWith("import ") || trimmed.startsWith("from ")) {
        result.push(trimmed); // top-level imports
      } else if (trimmed.startsWith("#")) {
        result.push(indentStr.repeat(Math.max(indent, 1)) + trimmed);
      } else {
        result.push(indentStr.repeat(indent) + trimmed);
      }
    }
    return result.join("\n");
  }
  
  let i = 0;
  let current = "";
  
  const flush = () => {
    const trimmed = current.trim();
    if (trimmed) {
      result.push(indentStr.repeat(indent) + trimmed);
    }
    current = "";
  };
  
  while (i < code.length) {
    const ch = code[i];
    const remaining = code.substring(i);
    
    if (ch === '"' || ch === "'") {
      const quote = ch;
      current += ch;
      i++;
      while (i < code.length && code[i] !== quote) {
        if (code[i] === '\\\\') { current += code[i]; i++; } // escaped char
        current += code[i];
        i++;
      }
      if (i < code.length) { current += code[i]; i++; } // closing quote
      continue;
    }
    
    if (remaining.match(/^#include\s/)) {
      flush();
      const end = code.indexOf(">", i);
      const endAlt = code.indexOf("\n", i);
      let lineEnd;
      if (end !== -1 && (endAlt === -1 || end < endAlt)) {
        lineEnd = end + 1;
      } else {
        const spaceEnd = code.indexOf(" ", i + 9);
        lineEnd = spaceEnd !== -1 ? spaceEnd : code.length;
      }
      result.push(code.substring(i, lineEnd).trim());
      i = lineEnd;
      continue;
    }
    
    if (remaining.match(/^import\s/) && !current.trim()) {
      flush();
      const semicolonEnd = code.indexOf(";", i);
      if (semicolonEnd !== -1) {
        result.push(code.substring(i, semicolonEnd + 1).trim());
        i = semicolonEnd + 1;
      } else {
        current += ch;
        i++;
      }
      continue;
    }
    
    if (remaining.match(/^using\s/) && !current.trim()) {
      flush();
      const semicolonEnd = code.indexOf(";", i);
      if (semicolonEnd !== -1) {
        result.push(code.substring(i, semicolonEnd + 1).trim());
        i = semicolonEnd + 1;
      } else {
        current += ch;
        i++;
      }
      continue;
    }
    
    if (ch === '{') {
      current += ' {';
      flush();
      indent++;
      i++;
      continue;
    }
    
    if (ch === '}') {
      flush();
      indent = Math.max(0, indent - 1);
      const afterBrace = code.substring(i + 1).trimStart();
      if (afterBrace.startsWith("else") || afterBrace.startsWith("catch") || afterBrace.startsWith("finally")) {
        current = indentStr.repeat(indent) + "}";
        i++;
        continue;
      }
      result.push(indentStr.repeat(indent) + "}");
      if (indent === 0 && i + 1 < code.length) {
        result.push("");
      }
      i++;
      continue;
    }
    
    if (ch === ';') {
      current += ';';
      flush();
      i++;
      continue;
    }
    
    current += ch;
    i++;
  }
  
  flush();
  
  return result
    .map(line => line.trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

const normalizeCodeString = (code, language) => {
  if (!code || typeof code !== "string") return code;
  let normalized = code.replace(/\\n/g, "\n");
  normalized = normalized.replace(/\\\\n/g, "\n");
  const lines = normalized.split("\n").filter(l => l.trim().length > 0);
  if (lines.length >= 3) {
    return normalized;
  }
  let flat = normalized.replace(/\n/g, " ").replace(/\s+/g, " ").trim();
  return formatSingleLineCode(flat, language);
};

const normalizeCodeFormatting = (questions) => {
  return questions.map(q => {
    if (q.question && typeof q.question === "string") {
      q.question = q.question.replace(/\\n/g, "\n");
    }
    if (Array.isArray(q.options)) {
      q.options = q.options.map(opt => (typeof opt === "string" ? opt.replace(/\\n/g, "\n") : opt));
    }
    if (q.type === "coding" && q.coding) {
      if (q.coding.description && typeof q.coding.description === "string") {
        q.coding.description = q.coding.description.replace(/\\n/g, "\n");
      }
      if (Array.isArray(q.coding.starterCode)) {
        q.coding.starterCode = q.coding.starterCode.map(sc => ({
          ...sc,
          code: normalizeCodeString(sc.code, sc.language || "javascript")
        }));
      }
      if (Array.isArray(q.coding.driverCode)) {
        q.coding.driverCode = q.coding.driverCode.map(dc => ({
          ...dc,
          code: normalizeCodeString(dc.code, dc.language || "javascript")
        }));
      }
    }
    return q;
  });
};

/**
 * Get Gemini model using current API key
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
  console.log(
    ` Switched to API Key #${currentKeyIndex + 1}/${API_KEYS.length}`
  );
};

const generationConfig = {
  temperature: 0.7,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 16384,
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
 * Generate MCQ Quiz from text (supports large docs via multi-turn chat chunking)
 * @param {string} extractedText - Text extracted from files
 * @param {object} config - Quiz configuration
 */
export const generateQuizFromText = async (extractedText, config = {}) => {
  const questionCount = config.questionCount || 20;
  const marksPerQuestion = config.marksPerQuestion || 1;
  const difficulty = config.difficulty || "mixed";
  const excludeQuestions = config.excludeQuestions || [];

  let attempts = 0;

  while (attempts < MAX_TRANSIENT_RETRIES) {
    try {
      console.log("Preparing Gemini prompt for MCQ Quiz...");
      console.log(`Config: ${questionCount} questions, ${marksPerQuestion} marks each, difficulty: ${difficulty}`);
      console.log(`Full text length: ${extractedText.length} chars`);

      const textChunks = chunkText(extractedText);
      console.log(`Split into ${textChunks.length} chunk(s)`);

      const difficultyInstruction = difficulty === "mixed"
        ? "Mix difficulty levels (easy, medium, hard)"
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
You are an expert quiz generator.

DYNAMIC GENERATION RULE:
1. Check the CONTENT provided below. If the CONTENT already contains explicit multiple-choice questions or questions that can easily be converted to MCQs, you MUST extract those EXACT questions and use them as much as possible.
2. If the CONTENT is just study material without explicit questions, then generate completely new questions based on the concepts.
Generate exactly ${questionCount} multiple-choice questions.

${excludeInstruction}

CRITICAL JSON RULES:
1. Return ONLY valid JSON - No markdown snippets, no backticks, no "json" label.
2. PRESERVE ALL ORIGINAL FORMATTING: Do NOT combine lines or strip line breaks. If a question, option, or code snippet has multiple lines, you MUST preserve them using \\n in the JSON string.
3. Escape all double quotes (\") within question or option text.

${contentHeader}

REQUIREMENTS:
1. Generate EXACTLY ${questionCount} questions
2. Each question MUST have exactly 4 options (A, B, C, D)
3. One option must be the correct answer
4. Questions should be clear and unambiguous
5. Cover different topics from the content
6. ${difficultyInstruction}
7. Ensure options are distinct and plausible
8. Each question is worth ${marksPerQuestion} mark(s)

RESPONSE FORMAT (Valid JSON only):
{
  "questions": [
    {
      "question": "What is photosynthesis?",
      "options": [
        "Process of making food using sunlight",
        "Process of respiration in plants",
        "Process of water absorption",
        "Process of nutrient transport"
      ],
      "correctAnswer": "Process of making food using sunlight"
    }
  ]
}

IMPORTANT: 
- Return ONLY valid JSON
- No markdown, no code blocks, no extra text
- Exactly ${questionCount} questions
- correctAnswer must EXACTLY match one of the options
`;

      console.log("Sending final generation prompt to Gemini...");

      const result = await chatSession.sendMessage(prompt);
      const response = result.response.text();

      console.log("Received response from Gemini");

      // Cleanup
      let cleanedResponse = response.trim();
      if (cleanedResponse.startsWith("```json")) {
        cleanedResponse = cleanedResponse
          .replace(/```json\n?/g, "")
          .replace(/```\n?/g, "");
      }
      if (cleanedResponse.startsWith("```")) {
        cleanedResponse = cleanedResponse.replace(/```\n?/g, "");
      }

      // Parse JSON
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(cleanedResponse);
      } catch (err) {
        console.error("JSON Parse Error:", err.message);
        throw new Error("Invalid JSON response from AI");
      }

      if (
        !parsedResponse.questions ||
        !Array.isArray(parsedResponse.questions)
      ) {
        throw new Error("Invalid response format (questions missing)");
      }

      // Validate
      const validQuestions = parsedResponse.questions.filter((q) => {
        return (
          q.question &&
          Array.isArray(q.options) &&
          q.options.length === 4 &&
          q.correctAnswer &&
          q.options.includes(q.correctAnswer)
        );
      });

      if (validQuestions.length === 0) {
        throw new Error("No valid MCQs generated");
      }

      console.log(`Generated ${validQuestions.length} valid MCQs`);
      return validQuestions;
    } catch (error) {
      console.error(
        `Gemini API Error (Key #${currentKeyIndex + 1}):`,
        error.message
      );

      attempts++;

      if (isQuotaOrRateLimitError(error)) {
        console.log(
          ` API Key #${currentKeyIndex + 1} quota exceeded. Rotating...`
        );
        rotateApiKey();

        if (attempts < MAX_TRANSIENT_RETRIES) {
          console.log("Retrying with next API key...");
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
 *  Generate MCQ Quiz from Topics (without PDF)
 * @param {string[]} topics - Array of topics
 * @param {object} config - Quiz configuration
 * @param {number} config.questionCount - Number of questions to generate (default 20)
 * @param {number} config.marksPerQuestion - Marks per question (default 1)
 * @param {string} config.difficulty - Difficulty level: easy, medium, hard, mixed (default mixed)
 * @param {string[]} config.excludeQuestions - List of existing questions to avoid
 */
export const generateQuizFromTopics = async (topics, config = {}) => {
  const questionCount = config.questionCount || 20;
  const marksPerQuestion = config.marksPerQuestion || 1;
  const difficulty = config.difficulty || "mixed";
  const excludeQuestions = config.excludeQuestions || [];

  let attempts = 0;

  while (attempts < MAX_TRANSIENT_RETRIES) {
    try {
      console.log("🤖 Preparing Gemini prompt for MCQ Quiz from topics...");
      console.log("Topics:", topics);
      console.log(`Config: ${questionCount} questions, ${marksPerQuestion} marks each, difficulty: ${difficulty}`);

      const topicsText = Array.isArray(topics) ? topics.join(", ") : topics;

      const difficultyInstruction = difficulty === "mixed"
        ? "Mix difficulty levels (easy, medium, hard)"
        : `All questions should be ${difficulty.toUpperCase()} difficulty level`;

      const excludeInstruction = excludeQuestions.length > 0 
        ? `\nDO NOT repeat or generate questions similar to these existing ones:\n- ${excludeQuestions.join('\n- ')}\n`
        : "";

      const prompt = `
You are an expert quiz generator. Generate exactly ${questionCount} multiple-choice questions based on the following topics.

${excludeInstruction}

CRITICAL JSON RULES:
1. Return ONLY valid JSON - No markdown snippets, no backticks, no "json" label.
2. PRESERVE ALL ORIGINAL FORMATTING: Do NOT combine lines or strip line breaks. If a question, option, or code snippet has multiple lines, you MUST preserve them using \\n in the JSON string.
3. Escape all double quotes (\") within question or option text.

TOPICS:
${topicsText}

REQUIREMENTS:
1. Generate EXACTLY ${questionCount} questions
2. Each question MUST have exactly 4 options (A, B, C, D)
3. One option must be the correct answer
4. Questions should be clear and unambiguous
5. Cover different aspects of the given topics
6. ${difficultyInstruction}
7. Ensure options are distinct and plausible
8. Questions should be educational and test understanding
9. Each question is worth ${marksPerQuestion} mark(s)

RESPONSE FORMAT (Valid JSON only):
{
  "questions": [
    {
      "question": "What is photosynthesis?",
      "options": [
        "Process of making food using sunlight",
        "Process of respiration in plants",
        "Process of water absorption",
        "Process of nutrient transport"
      ],
      "correctAnswer": "Process of making food using sunlight"
    }
  ]
}

IMPORTANT: 
- Return ONLY valid JSON
- No markdown, no code blocks, no extra text
- Exactly ${questionCount} questions
- correctAnswer must EXACTLY match one of the options
`;

      console.log(" Sending request to Gemini...");

      const model = getModel();

      const chatSession = model.startChat({
        generationConfig,
        history: [],
      });

      const result = await chatSession.sendMessage(prompt);
      const response = result.response.text();

      console.log(" Received response from Gemini");

      // Cleanup
      let cleanedResponse = response.trim();
      if (cleanedResponse.startsWith("```json")) {
        cleanedResponse = cleanedResponse
          .replace(/```json\n?/g, "")
          .replace(/```\n?/g, "");
      }
      if (cleanedResponse.startsWith("```")) {
        cleanedResponse = cleanedResponse.replace(/```\n?/g, "");
      }

      // Parse JSON
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(cleanedResponse);
      } catch (err) {
        console.error("❌ JSON Parse Error:", err.message);
        throw new Error("Invalid JSON response from AI");
      }

      if (
        !parsedResponse.questions ||
        !Array.isArray(parsedResponse.questions)
      ) {
        throw new Error("Invalid response format (questions missing)");
      }

      // Validate
      const validQuestions = parsedResponse.questions.filter((q) => {
        return (
          q.question &&
          Array.isArray(q.options) &&
          q.options.length === 4 &&
          q.correctAnswer &&
          q.options.includes(q.correctAnswer)
        );
      });

      if (validQuestions.length === 0) {
        throw new Error("No valid MCQs generated");
      }

      console.log(`Generated ${validQuestions.length} valid MCQs from topics`);
      return validQuestions;
    } catch (error) {
      console.error(
        `Gemini API Error (Key #${currentKeyIndex + 1}):`,
        error.message
      );

      attempts++;

      if (isQuotaOrRateLimitError(error)) {
        console.log(
          ` API Key #${currentKeyIndex + 1} quota exceeded. Rotating...`
        );
        rotateApiKey();

        if (attempts < MAX_TRANSIENT_RETRIES) {
          console.log("Retrying with next API key...");
          continue;
        }
      }

      if (isTransientServiceError(error)) {
        const backoffMs = getBackoffMs(attempts);
        console.log(
          ` Gemini service is temporarily busy (attempt ${attempts}/${MAX_TRANSIENT_RETRIES}). Retrying in ${backoffMs}ms...`
        );

        // Rotate key to spread request load even for transient spikes.
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
 * Generate Coding Challenge Questions from Topics (without PDF)
 * @param {string[]} topics - Array of topics
 * @param {object} config - Generation configuration
 * @param {number} config.questionCount - Number of coding questions to generate (default 3)
 * @param {string} config.difficulty - Difficulty level: easy, medium, hard, mixed (default mixed)
 */
export const generateCodingFromTopics = async (topics, config = {}) => {
  const questionCount = config.questionCount || 3;
  const difficulty = config.difficulty || "mixed";

  const REQUIRED_LANGUAGES = ["java", "cpp", "javascript", "python", "c"];

  let attempts = 0;

  while (attempts < MAX_TRANSIENT_RETRIES) {
    try {
      console.log("Preparing Gemini prompt for Coding Questions from topics...");
      console.log("Topics:", topics);
      console.log(`Config: ${questionCount} coding questions, difficulty: ${difficulty}`);

      const topicsText = Array.isArray(topics) ? topics.join(", ") : topics;

      const difficultyInstruction = difficulty === "mixed"
        ? "Mix difficulty levels (easy, medium, hard)"
        : `All questions should be ${difficulty.toUpperCase()} difficulty level`;

      const prompt = `
You are an expert competitive-programming problem setter.
Generate exactly ${questionCount} coding challenge(s) on these topics: ${topicsText}

${difficultyInstruction}

RETURN FORMAT — strict JSON, no markdown, no backticks.
The response MUST be: { "questions": [ ... ] }

Each element of "questions" MUST have this EXACT shape:
{
  "type": "coding",
  "marks": 5,
  "coding": {
    "title": "<short title>",
    "description": "<full problem statement, at least 2-3 sentences>",
    "examples": [
      { "input": "<human-readable input description>", "output": "<expected output>", "explanation": "<step-by-step explanation>" }
    ],
    "constraints": ["<constraint 1>", "<constraint 2>"],
    "starterCode": [
      { "language": "java", "code": "<java starter>" },
      { "language": "cpp", "code": "<cpp starter>" },
      { "language": "javascript", "code": "<js starter>" },
      { "language": "python", "code": "<python starter>" },
      { "language": "c", "code": "<c starter>" }
    ],
    "driverCode": [
      { "language": "java", "code": "<java driver>" },
      { "language": "cpp", "code": "<cpp driver>" },
      { "language": "javascript", "code": "<js driver>" },
      { "language": "python", "code": "<python driver>" },
      { "language": "c", "code": "<c driver>" }
    ],
    "testCases": [
      { "input": "<raw stdin text>", "expectedOutput": "<raw expected stdout>" }
    ],
    "comparisonMode": "trimmed"
  }
}

RULES FOR STARTER CODE:
- Contains ONLY the function/class signature with an empty body and a comment "// Write your solution here" (or # for Python).
- Java: class Solution with a public method.
- C++: class Solution with a public method.
- JavaScript: a standalone function.
- Python: a standalone function using def.
- C: a standalone function.
- The student fills in the body. Do NOT include a main function in starter code.

RULES FOR DRIVER CODE (CRITICAL — FOLLOW EXACTLY):
- Every driver code string MUST contain the literal text {{STUDENT_BODY}} — this is where the student's code is injected at runtime.
- The driver code wraps {{STUDENT_BODY}} with imports, a main function that reads ALL inputs from stdin, calls the student's function, and prints the result to stdout.
- NEVER hardcode test inputs. The driver MUST read from stdin dynamically so it works for every test case.
- Language specifics:
  * C++: use cin/getline. Include <iostream>, <vector>, <string>, <sstream>, <algorithm> as needed.
  * Java: use Scanner. The class containing main MUST be named Main. {{STUDENT_BODY}} goes BEFORE public class Main.
  * JavaScript: use require('fs').readFileSync(0,'utf8'). {{STUDENT_BODY}} goes at the top.
  * Python: use sys.stdin or input(). {{STUDENT_BODY}} goes at the top, then if __name__=='__main__' block.
  * C: use scanf/fgets. Include <stdio.h>, <stdlib.h>, <string.h> as needed.

RULES FOR TEST CASES:
- At least 3 test cases per question.
- "input" is the raw text fed to stdin. Use \\n for newlines inside the string.
- "expectedOutput" is the exact text the program should print to stdout.
- Include edge cases (empty input, single element, large values, etc.)
- Make sure expectedOutput is mathematically correct. Double-check your arithmetic.

RULES FOR EXAMPLES:
- At least 1 example per question.
- "input" should be human-readable (e.g. "nums = [2,7,11,15], target = 9").
- "output" should show the expected result (e.g. "[0,1]").
- "explanation" should walk through the logic step by step.
- CRITICAL: Use 0-based indexing for all arrays and strings. NEVER use 1-based indexing.
- CRITICAL: "input" MUST explicitly include ALL function parameters (e.g. for binary search, include BOTH the array and the target).

RULES FOR CONSTRAINTS:
- At least 2 constraints per question.
- Use standard competitive-programming notation (e.g. "1 <= n <= 10^5").

CODE FORMATTING:
- Use \\n for newlines inside JSON string values.
- Use spaces (4 per level) for indentation after each \\n.
- Every code value MUST be multi-line. NEVER put an entire function on one line.

COMPLETE WORKING EXAMPLE (follow this pattern exactly):
{
  "questions": [
    {
      "type": "coding",
      "marks": 5,
      "coding": {
        "title": "Two Sum",
        "description": "Given an array of integers nums and an integer target, return the indices of the two numbers that add up to target. Each input has exactly one solution. You may not use the same element twice. Return the answer in ascending order.",
        "examples": [
          {
            "input": "nums = [2,7,11,15], target = 9",
            "output": "[0, 1]",
            "explanation": "nums[0] + nums[1] = 2 + 7 = 9, so we return [0, 1]."
          },
          {
            "input": "nums = [3,2,4], target = 6",
            "output": "[1, 2]",
            "explanation": "nums[1] + nums[2] = 2 + 4 = 6, so we return [1, 2]."
          }
        ],
        "constraints": ["2 <= nums.length <= 10^4", "-10^9 <= nums[i] <= 10^9", "Exactly one valid answer exists."],
        "starterCode": [
          { "language": "java", "code": "class Solution {\\n    public int[] twoSum(int[] nums, int target) {\\n        // Write your solution here\\n        return new int[]{};\\n    }\\n}" },
          { "language": "cpp", "code": "#include <vector>\\nusing namespace std;\\n\\nclass Solution {\\npublic:\\n    vector<int> twoSum(vector<int>& nums, int target) {\\n        // Write your solution here\\n        return {};\\n    }\\n};" },
          { "language": "javascript", "code": "function twoSum(nums, target) {\\n    // Write your solution here\\n    return [];\\n}" },
          { "language": "python", "code": "def twoSum(nums, target):\\n    # Write your solution here\\n    pass" },
          { "language": "c", "code": "#include <stdlib.h>\\n\\nint* twoSum(int* nums, int numsSize, int target, int* returnSize) {\\n    // Write your solution here\\n    *returnSize = 0;\\n    return NULL;\\n}" }
        ],
        "driverCode": [
          { "language": "java", "code": "import java.util.*;\\n\\n{{STUDENT_BODY}}\\n\\npublic class Main {\\n    public static void main(String[] args) {\\n        Scanner sc = new Scanner(System.in);\\n        int n = sc.nextInt();\\n        int[] nums = new int[n];\\n        for (int i = 0; i < n; i++) nums[i] = sc.nextInt();\\n        int target = sc.nextInt();\\n        Solution sol = new Solution();\\n        int[] result = sol.twoSum(nums, target);\\n        System.out.println(result[0] + \\" \\" + result[1]);\\n    }\\n}" },
          { "language": "cpp", "code": "#include <iostream>\\n#include <vector>\\nusing namespace std;\\n\\n{{STUDENT_BODY}}\\n\\nint main() {\\n    int n;\\n    cin >> n;\\n    vector<int> nums(n);\\n    for (int i = 0; i < n; i++) cin >> nums[i];\\n    int target;\\n    cin >> target;\\n    Solution sol;\\n    vector<int> result = sol.twoSum(nums, target);\\n    cout << result[0] << \\" \\" << result[1] << endl;\\n    return 0;\\n}" },
          { "language": "javascript", "code": "const fs = require('fs');\\nconst input = fs.readFileSync(0, 'utf8').trim().split('\\\\n');\\n\\n{{STUDENT_BODY}}\\n\\nconst n = parseInt(input[0]);\\nconst nums = input[1].split(' ').map(Number);\\nconst target = parseInt(input[2]);\\nconst result = twoSum(nums, target);\\nconsole.log(result.join(' '));" },
          { "language": "python", "code": "import sys\\n\\n{{STUDENT_BODY}}\\n\\nif __name__ == '__main__':\\n    data = sys.stdin.read().split()\\n    n = int(data[0])\\n    nums = list(map(int, data[1:n+1]))\\n    target = int(data[n+1])\\n    result = twoSum(nums, target)\\n    print(*result)" },
          { "language": "c", "code": "#include <stdio.h>\\n#include <stdlib.h>\\n\\n{{STUDENT_BODY}}\\n\\nint main() {\\n    int n;\\n    scanf(\\"%d\\", &n);\\n    int* nums = (int*)malloc(n * sizeof(int));\\n    for (int i = 0; i < n; i++) scanf(\\"%d\\", &nums[i]);\\n    int target;\\n    scanf(\\"%d\\", &target);\\n    int returnSize;\\n    int* result = twoSum(nums, n, target, &returnSize);\\n    printf(\\"%d %d\\\\n\\", result[0], result[1]);\\n    free(nums);\\n    free(result);\\n    return 0;\\n}" }
        ],
        "testCases": [
          { "input": "4\\n2 7 11 15\\n9", "expectedOutput": "0 1" },
          { "input": "3\\n3 2 4\\n6", "expectedOutput": "1 2" },
          { "input": "2\\n3 3\\n6", "expectedOutput": "0 1" }
        ],
        "comparisonMode": "trimmed"
      }
    }
  ]
}

DO NOT include the above Two Sum example in your output — it is only shown to demonstrate the exact format. Generate ORIGINAL challenges on the requested topics.

Now generate exactly ${questionCount} ORIGINAL coding challenge(s). Return ONLY the JSON object.`;

      console.log(" Sending request to Gemini for coding questions...");

      const model = getModel();
      const chatSession = model.startChat({
        generationConfig: {
          ...generationConfig,
          maxOutputTokens: 32768, // Coding questions need more tokens
        },
        history: [],
      });

      const result = await chatSession.sendMessage(prompt);
      const response = result.response.text();

      console.log(" Received coding questions response from Gemini");

      let cleanedResponse = response.trim();
      if (cleanedResponse.startsWith("\`\`\`json")) {
        cleanedResponse = cleanedResponse.replace(/\`\`\`json\\n?/g, "").replace(/\`\`\`\\n?/g, "");
      }
      if (cleanedResponse.startsWith("\`\`\`")) {
        cleanedResponse = cleanedResponse.replace(/\`\`\`\\n?/g, "");
      }

      let parsedResponse;
      try {
        parsedResponse = JSON.parse(cleanedResponse);
      } catch (err) {
        console.error("JSON Parse Error:", err.message);
        console.error("Response preview:", cleanedResponse.substring(0, 500));
        throw new Error("Invalid JSON response from AI");
      }

      if (!parsedResponse.questions || !Array.isArray(parsedResponse.questions)) {
        throw new Error("Invalid response format (questions missing)");
      }

      // ── Post-process and sanitize every question ────────────────
      const sanitizedQuestions = [];

      for (const q of parsedResponse.questions) {
        if (q.type !== "coding" || !q.coding) continue;
        const c = q.coding;

        // Must have title and description
        if (!c.title || !c.description) continue;

        // Ensure examples array
        if (!Array.isArray(c.examples) || c.examples.length === 0) {
          c.examples = [{ input: "", output: "", explanation: "" }];
        }

        // Ensure constraints array
        if (!Array.isArray(c.constraints) || c.constraints.length === 0) {
          c.constraints = ["No constraints specified"];
        }

        // Ensure testCases array with proper shape
        const rawTestCases = c.testCases || c.hiddenTestCases || c.publicTestCases || [];
        c.testCases = rawTestCases
          .filter(tc => tc && (tc.input !== undefined))
          .map(tc => ({
            input: String(tc.input || ""),
            expectedOutput: String(tc.expectedOutput || tc.expected_output || tc.output || ""),
          }));
        if (c.testCases.length === 0) {
          c.testCases = [{ input: "", expectedOutput: "" }];
        }
        delete c.hiddenTestCases;
        delete c.publicTestCases;

        // Ensure starterCode has all 5 languages
        if (!Array.isArray(c.starterCode)) c.starterCode = [];
        for (const lang of REQUIRED_LANGUAGES) {
          const exists = c.starterCode.find(s => s.language === lang);
          if (!exists) {
            const placeholder = lang === "python"
              ? `def solution():\\n    # Write your solution here\\n    pass`
              : lang === "java"
              ? `class Solution {\\n    // Write your solution here\\n}`
              : lang === "cpp"
              ? `class Solution {\\npublic:\\n    // Write your solution here\\n};`
              : lang === "c"
              ? `// Write your solution here`
              : `function solution() {\\n    // Write your solution here\\n}`;
            c.starterCode.push({ language: lang, code: placeholder });
          }
        }

        // Ensure driverCode has all 5 languages with {{STUDENT_BODY}}
        if (!Array.isArray(c.driverCode)) c.driverCode = [];
        for (const lang of REQUIRED_LANGUAGES) {
          const entry = c.driverCode.find(d => d.language === lang);
          if (entry) {
            // Fix if AI used {{USER_CODE}} instead of {{STUDENT_BODY}}
            if (entry.code && !entry.code.includes("{{STUDENT_BODY}}")) {
              entry.code = entry.code.replace(/\{\{USER_CODE\}\}/g, "{{STUDENT_BODY}}");
            }
            // If still missing, prepend it
            if (entry.code && !entry.code.includes("{{STUDENT_BODY}}")) {
              entry.code = "{{STUDENT_BODY}}\\n\\n" + entry.code;
            }
          } else {
            // Add a minimal placeholder driver
            const placeholder = lang === "python"
              ? `import sys\\n\\n{{STUDENT_BODY}}\\n\\nif __name__ == '__main__':\\n    pass`
              : lang === "java"
              ? `import java.util.*;\\n\\n{{STUDENT_BODY}}\\n\\npublic class Main {\\n    public static void main(String[] args) {\\n        // TODO: Read input, call solution, print output\\n    }\\n}`
              : lang === "cpp"
              ? `#include <iostream>\\nusing namespace std;\\n\\n{{STUDENT_BODY}}\\n\\nint main() {\\n    // TODO: Read input, call solution, print output\\n    return 0;\\n}`
              : lang === "javascript"
              ? `const fs = require('fs');\\nconst input = fs.readFileSync(0, 'utf8').trim().split('\\\\n');\\n\\n{{STUDENT_BODY}}\\n\\n// TODO: Parse input, call function, print output`
              : `#include <stdio.h>\\n#include <stdlib.h>\\n\\n{{STUDENT_BODY}}\\n\\nint main() {\\n    // TODO: Read input, call function, print output\\n    return 0;\\n}`;
            c.driverCode.push({ language: lang, code: placeholder });
          }
        }

        // Set comparisonMode
        c.comparisonMode = c.comparisonMode || "trimmed";

        // Set allowedLanguages
        c.allowedLanguages = REQUIRED_LANGUAGES;

        // Strip referenceSolution (not needed without Judge0 validation)
        delete c.referenceSolution;

        sanitizedQuestions.push({
          type: "coding",
          marks: q.marks || 5,
          coding: c,
        });
      }

      // Apply code formatting normalization
      const validQuestions = normalizeCodeFormatting(sanitizedQuestions);

      if (validQuestions.length === 0) {
        throw new Error("No valid coding questions generated");
      }

      console.log(`Generated ${validQuestions.length} valid coding questions from topics`);
      return validQuestions;
    } catch (error) {
      console.error(`Gemini API Error (Key #${currentKeyIndex + 1}):`, error.message);
      attempts++;

      if (isQuotaOrRateLimitError(error)) {
        rotateApiKey();
        if (attempts < MAX_TRANSIENT_RETRIES) continue;
      }

      if (isTransientServiceError(error)) {
        const backoffMs = getBackoffMs(attempts);
        rotateApiKey();
        if (attempts < MAX_TRANSIENT_RETRIES) {
          await wait(backoffMs);
          continue;
        }
      }

      // Retry on AI output quality issues (bad JSON, missing fields, etc.)
      const isOutputQualityError =
        error.message.includes("Invalid JSON") ||
        error.message.includes("questions missing") ||
        error.message.includes("No valid coding");

      if (isOutputQualityError && attempts < MAX_TRANSIENT_RETRIES) {
        console.log(` AI produced unusable output (attempt ${attempts}/${MAX_TRANSIENT_RETRIES}). Retrying...`);
        rotateApiKey();
        await wait(1500);
        continue;
      }

      throw error;
    }
  }

  throw new Error(
    "Gemini service is busy right now after multiple retries. Please try again in a minute."
  );
};

/**
 *  Generate Smart Quiz Title from Topics
 */
export const generateQuizTitle = async (topics) => {
  let attempts = 0;

  while (attempts < MAX_RETRIES) {
    try {
      const topicText = Array.isArray(topics) ? topics.join(", ") : topics;
      
      console.log("🤖 Generating quiz title from topics...");
      console.log("Input topics:", topicText);

      const prompt = `Based on these quiz topics/requirements, generate a SHORT, concise quiz title (maximum 40 characters).

Topics: ${topicText}

Requirements:
- Maximum 40 characters
- Professional and clear
- No "Quiz:" prefix (we'll add that automatically)
- Just the subject/topic name
- Focus on the main subject, ignore instructions like "create questions" or "tough questions"

Examples:
Topics: "create questions about Python loops and functions"
Title: Python Loops & Functions

Topics: "java inheritance and polymorphism, make it tough"
Title: Java OOP Concepts

Topics: "create question from java from inheritence topic and most of the question from coding and question should be tough"
Title: Java Inheritance

Generate ONLY the title text, nothing else:`;

      const model = getModel();

      const result = await model.generateContent(prompt);
      const titleText = result.response.text().trim();
      
      // Clean up any quotes or extra formatting
      const cleanTitle = titleText.replace(/['"]/g, '').trim();
      
      // Limit to 40 characters max
      const finalTitle = cleanTitle.length > 40 
        ? cleanTitle.substring(0, 40).trim() 
        : cleanTitle;

      console.log(`✅ Generated title: "${finalTitle}"`);
      
      return `Quiz: ${finalTitle}`;
    } catch (error) {
      console.error(
        `Title Generation Error (Key #${currentKeyIndex + 1}):`,
        error.message
      );

      attempts++;

      if (isQuotaOrRateLimitError(error)) {
        console.log(
          ` API Key #${currentKeyIndex + 1} quota exceeded. Rotating...`
        );
        rotateApiKey();

        if (attempts < MAX_RETRIES) {
          console.log("Retrying with next API key...");
          continue;
        }
      }

      if (isTransientServiceError(error)) {
        const backoffMs = getBackoffMs(attempts);
        console.log(
          ` Title generation hit temporary service load. Retrying in ${backoffMs}ms...`
        );
        rotateApiKey();

        if (attempts < MAX_RETRIES) {
          await wait(backoffMs);
          continue;
        }
      }

      // Fallback: Use simple extraction
      console.log("⚠️ Falling back to simple title generation");
      const topicArray = Array.isArray(topics) ? topics : [topics];
      const firstTopic = topicArray[0] || "Quiz";
      
      // Extract meaningful words (remove common instruction words)
      const cleanedTopic = firstTopic
        .replace(/create|question|questions|from|make|it|tough|hard|easy/gi, '')
        .trim();
      
      const fallbackTitle = cleanedTopic.substring(0, 40).trim() || "General Quiz";
      return `Quiz: ${fallbackTitle}`;
    }
  }

  // Final fallback
  const topicArray = Array.isArray(topics) ? topics : [topics];
  const firstTopic = topicArray[0] || "Quiz";
  return `Quiz: ${firstTopic.substring(0, 40)}`;
};

/**
 * Extracts exact questions from a provided text document.
 * Handles both Multiple Choice Questions (MCQs) and Coding Challenges.
 * @param {string} extractedText - Text extracted from the uploaded file
 */
export const extractExactQuestions = async (extractedText) => {
  let attempts = 0;

  while (attempts < MAX_TRANSIENT_RETRIES) {
    try {
      console.log("Preparing Gemini prompt for Exact Question Extraction...");
      console.log(`Full text length: ${extractedText.length} chars`);

      const textChunks = chunkText(extractedText);
      console.log(`Split into ${textChunks.length} chunk(s)`);

      const model = getModel();
      const chatSession = model.startChat({
        generationConfig,
        history: [],
      });

      if (textChunks.length > 1) {
        for (let i = 0; i < textChunks.length - 1; i++) {
          const chunkMsg = `I am providing a document in multiple parts. This is Part ${i + 1} of ${textChunks.length}. Read and memorize this content. Do NOT generate anything yet — just reply with the single word "Understood".\n\nCONTENT PART ${i + 1}:\n${textChunks[i]}`;
          await chatSession.sendMessage(chunkMsg);
        }
      }

      const lastChunk = textChunks[textChunks.length - 1];
      const contentHeader = textChunks.length > 1
        ? `This is the FINAL Part ${textChunks.length} of ${textChunks.length}. Now you have the complete document. Extract the exact questions from ALL parts combined.\n\nFINAL CONTENT PART:\n${lastChunk}`
        : `DOCUMENT CONTENT:\n${lastChunk}`;

      const prompt = `
You are an expert educational content parser.
I am providing you with a document that contains questions (either Multiple Choice Questions, Coding Challenges, or a mix of both).
Your task is to extract EVERY question exactly as it appears and convert it into a strictly formatted JSON array.

CRITICAL JSON RULES:
1. Return ONLY valid JSON - No markdown snippets (e.g., no \`\`\`json), no extra text.
2. The output MUST be a JSON array of objects.
3. PRESERVE ALL ORIGINAL FORMATTING: Do NOT combine lines or strip line breaks. If a question, option, or code snippet has multiple lines, you MUST preserve them using \\n in the JSON string.

Identify the type of each question and format it accordingly:

For Multiple Choice Questions (MCQ):
{
  "type": "mcq",
  "marks": 1,
  "question": "The exact question text",
  "options": ["Option A text", "Option B text", "Option C text", "Option D text"],
  "correctOptionIndex": 0 // Integer 0-3 indicating which option is correct. If you cannot determine the answer, default to 0.
}

For Coding Challenges:
{
  "type": "coding",
  "marks": 5, // Default to 5 if not specified
  "coding": {
    "title": "Short descriptive title extracted or inferred",
    "description": "Full problem description",
    "examples": [
      {
        "input": "Example input (MUST include ALL required parameters, e.g., nums=[1,2], target=3)",
        "output": "Example output",
        "explanation": "Explanation if any (CRITICAL: Use 0-based indexing for all array/string positions)"
      }
    ],
    "constraints": ["Constraint 1", "Constraint 2"], // If none found, provide ["N/A"]
    "allowedLanguages": ["java", "cpp", "javascript", "python", "c"],
    "starterCode": [
      { "language": "java", "code": "class Solution {\\n    public int[] twoSum(int[] nums, int target) {\\n        // Write your solution here\\n    }\\n}" },
      { "language": "cpp", "code": "class Solution {\\npublic:\\n    vector<int> twoSum(vector<int>& nums, int target) {\\n        // Write your solution here\\n    }\\n};" },
      { "language": "javascript", "code": "function twoSum(nums, target) {\\n    // Write your solution here\\n}" },
      { "language": "python", "code": "def twoSum(nums, target):\\n    # Write your solution here" },
      { "language": "c", "code": "int* twoSum(int* nums, int numsSize, int target, int* returnSize) {\\n    // Write your solution here\\n}" }
    ],
    "driverCode": [
      { "language": "java", "code": "import java.util.*;\\n\\n{{STUDENT_BODY}}\\n\\npublic class Main {\\n    public static void main(String[] args) {\\n        // Parse input, call Solution.twoSum, print output\\n    }\\n}" },
      { "language": "cpp", "code": "#include <iostream>\\n#include <vector>\\nusing namespace std;\\n\\n{{STUDENT_BODY}}\\n\\nint main() {\\n    // Parse input, call Solution::twoSum, print output\\n    return 0;\\n}" },
      { "language": "javascript", "code": "{{STUDENT_BODY}}\\n\\n// Parse input, call twoSum, print output" },
      { "language": "python", "code": "import sys\\n\\n{{STUDENT_BODY}}\\n\\nif __name__ == '__main__':\\n    # Parse input, call twoSum, print output" },
      { "language": "c", "code": "#include <stdio.h>\\n#include <stdlib.h>\\n\\n{{STUDENT_BODY}}\\n\\nint main() {\\n    // Parse input, call twoSum, print output\\n    return 0;\\n}" }
    ],
    "testCases": [
      { "input": "test input", "expectedOutput": "expected output" },
      { "input": "hidden input", "expectedOutput": "hidden output" }
    ],
    "comparisonMode": "trimmed"
  }
}
*Note for coding*: If explicit test cases aren't in the document, use the examples as testCases and generate at least one plausible additional testCase based on the problem description. You MUST also generate starterCode and driverCode for exactly 5 languages: java, cpp, javascript, python, c. driverCode should have {{STUDENT_BODY}} as placeholder.

${contentHeader}

Extract all questions and return the JSON array:`;

      console.log("Sending final extraction prompt to Gemini...");

      const result = await chatSession.sendMessage(prompt);
      const response = result.response.text();

      console.log("Received response from Gemini");

      let cleanedResponse = response.trim();
      if (cleanedResponse.startsWith("\`\`\`json")) {
        cleanedResponse = cleanedResponse.replace(/\`\`\`json\n?/g, "").replace(/\`\`\`\n?/g, "");
      }
      if (cleanedResponse.startsWith("\`\`\`")) {
        cleanedResponse = cleanedResponse.replace(/\`\`\`\n?/g, "");
      }

      let parsedResponse;
      try {
        parsedResponse = JSON.parse(cleanedResponse);
      } catch (err) {
        console.error("JSON Parse Error:", err.message);
        throw new Error("Invalid JSON response from AI");
      }

      if (!Array.isArray(parsedResponse)) {
        if (parsedResponse.questions && Array.isArray(parsedResponse.questions)) {
          parsedResponse = parsedResponse.questions;
        } else {
          throw new Error("Invalid response format (expected an array)");
        }
      }

      if (parsedResponse.length === 0) {
        throw new Error("No questions extracted");
      }

      const validQuestions = normalizeCodeFormatting(parsedResponse);
      
      console.log(`Extracted ${validQuestions.length} questions`);
      return validQuestions;
    } catch (error) {
      console.error(`Gemini API Error (Key #${currentKeyIndex + 1}):`, error.message);
      attempts++;

      if (isQuotaOrRateLimitError(error) || isTransientServiceError(error)) {
        rotateApiKey();
        if (attempts < MAX_TRANSIENT_RETRIES) {
          const backoffMs = getBackoffMs(attempts);
          await wait(backoffMs);
          continue;
        }
      }
      throw error;
    }
  }

  throw new Error("Gemini service is busy right now after multiple retries. Please try again in a minute.");
};

export default { generateQuizFromText, generateQuizFromTopics, generateCodingFromTopics, generateQuizTitle, extractExactQuestions };
