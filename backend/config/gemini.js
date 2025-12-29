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

/**
 * Get Gemini model using current API key
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
  console.log(
    ` Switched to API Key #${currentKeyIndex + 1}/${API_KEYS.length}`
  );
};

const generationConfig = {
  temperature: 1,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 8192,
  responseMimeType: "application/json",
};

/**
 *  Generate MCQ Quiz from PDF Text
 */
export const generateQuizFromText = async (extractedText) => {
  let attempts = 0;

  while (attempts < MAX_RETRIES) {
    try {
      console.log("🤖 Preparing Gemini prompt for MCQ Quiz...");

      // Limit text to avoid token overflow
      const limitedText = extractedText.slice(0, 10000);

      const prompt = `
You are an expert quiz generator. Generate exactly 20 multiple-choice questions from the following educational content.

CONTENT:
${limitedText}

REQUIREMENTS:
1. Generate EXACTLY 20 questions
2. Each question MUST have exactly 4 options (A, B, C, D)
3. One option must be the correct answer
4. Questions should be clear and unambiguous
5. Cover different topics from the content
6. Mix difficulty levels (easy, medium, hard)
7. Ensure options are distinct and plausible

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
- Exactly 20 questions
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

      console.log(`Generated ${validQuestions.length} valid MCQs`);
      return validQuestions;
    } catch (error) {
      console.error(
        `Gemini API Error (Key #${currentKeyIndex + 1}):`,
        error.message
      );

      attempts++;

      // If quota exceeded → rotate
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
          console.log("Retrying with next API key...");
          continue;
        }
      }

      throw error;
    }
  }

  throw new Error("All API keys exhausted. Try again later.");
};

export default { generateQuizFromText };
