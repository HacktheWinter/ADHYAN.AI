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

/**
 * Get Gemini model with automatic key rotation
 */
const getModel = () => {
  const apiKey = API_KEYS[currentKeyIndex];
  const genAI = new GoogleGenerativeAI(apiKey);

  console.log(`Using API Key #${currentKeyIndex + 1}/${API_KEYS.length}`);

  return genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
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
  temperature: 1,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 8192,
  responseMimeType: "application/json",
};

/**
 * Generate Test Paper from text using Gemini AI
 */
export const generateTestPaperFromText = async (extractedText) => {
  let attempts = 0;

  while (attempts < MAX_RETRIES) {
    try {
      console.log("Preparing Gemini prompt for Test Paper...");

      const limitedText = extractedText.slice(0, 12000);

      const prompt = `
You are an expert exam question paper generator. Generate EXACTLY 11 questions with answer keys from the following educational content.

CONTENT:
${limitedText}

REQUIREMENTS:
1. Generate EXACTLY 11 questions in this structure:
   - 5 SHORT answer questions (2 marks each) - Answer in 2-3 lines
   - 4 MEDIUM answer questions (5 marks each) - Answer in 5-6 lines
   - 2 LONG answer questions (10 marks each) - Answer in 10-12 lines

2. Each question MUST have:
   - Clear question text
   - Question type (short/medium/long)
   - Marks allocation
   - Detailed answer key (model answer)
   - Guidelines for acceptable alternate answers

RESPONSE FORMAT (Valid JSON only):
{
  "questions": [
    {
      "question": "What is photosynthesis?",
      "type": "short",
      "marks": 2,
      "answerKey": "Photosynthesis is the process by which green plants convert light energy into chemical energy.",
      "answerGuidelines": "Accept: Any answer mentioning light energy conversion and glucose production"
    }
  ]
}

IMPORTANT: 
- Return ONLY valid JSON
- No markdown, no code blocks, no extra text
- Exactly 5 short + 4 medium + 2 long questions
`;

      console.log("Sending request to Gemini...");

      const model = getModel(); // Get current model

      const chatSession = model.startChat({
        generationConfig,
        history: [],
      });

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

      // Check if quota exceeded error
      if (
        error.message.includes("quota") ||
        error.message.includes("429") ||
        error.message.includes("RESOURCE_EXHAUSTED")
      ) {
        console.log(
          ` API Key #${currentKeyIndex + 1} quota exceeded. Rotating...`
        );
        rotateApiKey();

        if (attempts < MAX_RETRIES) {
          console.log(` Retrying with API Key #${currentKeyIndex + 1}...`);
          continue;
        }
      }

      throw error;
    }
  }

  throw new Error("All API keys exhausted. Please try again later.");
};

/**
 *  OPTIMIZED: Check answers for 1 STUDENT at a time with SHORT feedback
 * With automatic API key rotation
 */
export const checkAnswersWithAI = async (answerKeys, batchStudentAnswers) => {
  let attempts = 0;

  while (attempts < MAX_RETRIES) {
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

      // Check if quota exceeded error
      if (
        error.message.includes("quota") ||
        error.message.includes("429") ||
        error.message.includes("RESOURCE_EXHAUSTED")
      ) {
        console.log(
          `API Key #${currentKeyIndex + 1} quota exceeded. Rotating...`
        );
        rotateApiKey();

        if (attempts < MAX_RETRIES) {
          console.log(` Retrying with API Key #${currentKeyIndex + 1}...`);
          await new Promise((resolve) => setTimeout(resolve, 1000)); // 1 second delay
          continue;
        }
      }

      throw error;
    }
  }

  throw new Error("All API keys exhausted. Please try again later.");
};

export default { generateTestPaperFromText, checkAnswersWithAI };
