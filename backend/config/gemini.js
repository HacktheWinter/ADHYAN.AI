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
2. NO LITERAL NEWLINES inside JSON string values.
3. Escape all double quotes (\") within question or option text.
4. Each option and explanation must be a single-line string.

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
2. NO LITERAL NEWLINES inside JSON string values.
3. Escape all double quotes (\") within question or option text.
4. Each option and explanation must be a single-line string.

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
You are an expert programming challenge creator.
Generate exactly ${questionCount} coding challenge(s) based on the following topics.

CRITICAL JSON RULES:
1. Return ONLY valid JSON - No markdown snippets, no backticks, no "json" label.
2. NO LITERAL NEWLINES inside JSON string values. Use \\n for newlines within strings.
3. Escape all double quotes within text.

TOPICS:
${topicsText}

REQUIREMENTS:
1. Generate EXACTLY ${questionCount} coding challenge(s)
2. ${difficultyInstruction}
3. Each challenge must have a clear problem statement, examples, constraints, and test cases
4. Include both public and hidden test cases
5. Provide BOTH starterCode (boilerplate for student) AND driverCode (hidden main function that calls the student's code) for EXACTLY 5 languages: java, cpp, javascript, python, c. The driverCode must contain the placeholder "{{USER_CODE}}" where the student's function will be injected.
6. Problems should be well-defined, solvable, and educational
7. Ensure hidden test cases cover edge cases

RESPONSE FORMAT (Valid JSON only):
{
  "questions": [
    {
      "type": "coding",
      "marks": 5,
      "coding": {
        "title": "Two Sum",
        "description": "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
        "examples": [
          {
            "input": "nums = [2,7,11,15], target = 9",
            "output": "[0,1]",
            "explanation": "Because nums[0] + nums[1] == 9, we return [0, 1]."
          }
        ],
        "constraints": ["2 <= nums.length <= 10^4", "-10^9 <= nums[i] <= 10^9"],
        "allowedLanguages": ["java", "cpp", "javascript", "python", "c"],
        "starterCode": [
          { "language": "java", "code": "class Solution {\\n    public int[] twoSum(int[] nums, int target) {\\n        // Write your solution here\\n    }\\n}" },
          { "language": "cpp", "code": "class Solution {\\npublic:\\n    vector<int> twoSum(vector<int>& nums, int target) {\\n        // Write your solution here\\n    }\\n};" },
          { "language": "javascript", "code": "function twoSum(nums, target) {\\n    // Write your solution here\\n}" },
          { "language": "python", "code": "def twoSum(nums, target):\\n    # Write your solution here" },
          { "language": "c", "code": "int* twoSum(int* nums, int numsSize, int target, int* returnSize) {\\n    // Write your solution here\\n}" }
        ],
        "driverCode": [
          { "language": "java", "code": "import java.util.*;\\n\\n{{USER_CODE}}\\n\\npublic class Main {\\n    public static void main(String[] args) {\\n        // Parse input, call Solution.twoSum, print output\\n    }\\n}" },
          { "language": "cpp", "code": "#include <iostream>\\n#include <vector>\\nusing namespace std;\\n\\n{{USER_CODE}}\\n\\nint main() {\\n    // Parse input, call Solution::twoSum, print output\\n    return 0;\\n}" },
          { "language": "javascript", "code": "{{USER_CODE}}\\n\\n// Parse input, call twoSum, print output" },
          { "language": "python", "code": "import sys\\n\\n{{USER_CODE}}\\n\\nif __name__ == '__main__':\\n    # Parse input, call twoSum, print output" },
          { "language": "c", "code": "#include <stdio.h>\\n#include <stdlib.h>\\n\\n{{USER_CODE}}\\n\\nint main() {\\n    // Parse input, call twoSum, print output\\n    return 0;\\n}" }
        ],
        "testCases": [
          { "input": "2 7 11 15\\n9", "expectedOutput": "0 1" },
          { "input": "3 2 4\\n6", "expectedOutput": "1 2" },
          { "input": "3 3\\n6", "expectedOutput": "0 1" }
        ],
        "comparisonMode": "trimmed"
      }
    }
  ]
}

IMPORTANT:
- Return ONLY valid JSON
- No markdown, no code blocks, no extra text
- Exactly ${questionCount} coding challenge(s)
- Each challenge must have at least 3 test cases
- starterCode and driverCode MUST contain EXACTLY these 5 languages: "java", "cpp", "javascript", "python", "c".
`;

      console.log(" Sending request to Gemini for coding questions...");

      const model = getModel();
      const chatSession = model.startChat({
        generationConfig,
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
        throw new Error("Invalid JSON response from AI");
      }

      if (!parsedResponse.questions || !Array.isArray(parsedResponse.questions)) {
        throw new Error("Invalid response format (questions missing)");
      }

      const validQuestions = parsedResponse.questions.filter((q) => {
        return (
          q.type === "coding" &&
          q.coding &&
          q.coding.title &&
          q.coding.description &&
          Array.isArray(q.coding.testCases) &&
          q.coding.testCases.length > 0
        );
      });

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
        "input": "Example input",
        "output": "Example output",
        "explanation": "Explanation if any"
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
      { "language": "java", "code": "import java.util.*;\\n\\n{{USER_CODE}}\\n\\npublic class Main {\\n    public static void main(String[] args) {\\n        // Parse input, call Solution.twoSum, print output\\n    }\\n}" },
      { "language": "cpp", "code": "#include <iostream>\\n#include <vector>\\nusing namespace std;\\n\\n{{USER_CODE}}\\n\\nint main() {\\n    // Parse input, call Solution::twoSum, print output\\n    return 0;\\n}" },
      { "language": "javascript", "code": "{{USER_CODE}}\\n\\n// Parse input, call twoSum, print output" },
      { "language": "python", "code": "import sys\\n\\n{{USER_CODE}}\\n\\nif __name__ == '__main__':\\n    # Parse input, call twoSum, print output" },
      { "language": "c", "code": "#include <stdio.h>\\n#include <stdlib.h>\\n\\n{{USER_CODE}}\\n\\nint main() {\\n    // Parse input, call twoSum, print output\\n    return 0;\\n}" }
    ],
    "testCases": [
      { "input": "test input", "expectedOutput": "expected output" },
      { "input": "hidden input", "expectedOutput": "hidden output" }
    ],
    "comparisonMode": "trimmed"
  }
}
*Note for coding*: If explicit test cases aren't in the document, use the examples as testCases and generate at least one plausible additional testCase based on the problem description. You MUST also generate starterCode and driverCode for exactly 5 languages: java, cpp, javascript, python, c. driverCode should have {{USER_CODE}} as placeholder.

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

      console.log(`Extracted ${parsedResponse.length} questions`);
      return parsedResponse;
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