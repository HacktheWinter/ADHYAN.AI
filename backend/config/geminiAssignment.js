// Backend/config/geminiAssignment.js
import { GoogleGenerativeAI } from "@google/generative-ai";

//  MULTIPLE API KEYS - Load Balancing
const API_KEYS = [
  process.env.GEN_API_KEY_1,
  process.env.GEN_API_KEY_2,
  process.env.GEN_API_KEY_3,
].filter(Boolean);

let currentKeyIndex = 0;
const MAX_RETRIES = API_KEYS.length;

/**
 * Get Gemini model from current API key
 */
const getModel = () => {
  const apiKey = API_KEYS[currentKeyIndex];
  const genAI = new GoogleGenerativeAI(apiKey);

  console.log(
    `Using Assignment API Key #${currentKeyIndex + 1}/${API_KEYS.length}`
  );

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
    `Switched to Assignment API Key #${currentKeyIndex + 1}/${API_KEYS.length}`
  );
};

const generationConfig = {
  temperature: 1,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 16384,
  responseMimeType: "application/json",
};

/**
 *  Generate Assignment (5 questions, 2 marks each = 10 total marks)
 */
export const generateAssignmentFromText = async (extractedText) => {
  let attempts = 0;

  while (attempts < MAX_RETRIES) {
    try {
      console.log(" Preparing Gemini prompt for Assignment...");

      const limitedText = extractedText.slice(0, 12000);

      const prompt = `
You are an expert assignment question generator. Generate EXACTLY 5 short-answer assignment questions from the following educational content.

CONTENT:
${limitedText}

CRITICAL JSON RULES:
1. Return ONLY valid JSON - no markdown, no extra text
2. Escape all special characters in strings
3. Keep questions concise and clear
4. Answer keys MUST be detailed and comprehensive (7-9 lines each)
5. Answer guidelines MUST be EXACTLY 4-5 words only (NOT MORE)
6. No line breaks in text (use spaces instead)

REQUIREMENTS:
1. Generate EXACTLY 5 questions
2. Each question is worth 2 marks
3. Questions should be direct and clear
4. Each question MUST have:
   - Question text (concise and clear)
   - Marks = 2
   - Detailed answer key (MUST be 7-9 lines, comprehensive explanation)
   - Very short guidelines (4-5 words ONLY)

ANSWER KEY REQUIREMENTS:
- MUST contain 7-9 lines of detailed explanation
- Include key concepts, definitions, and examples
- Cover all important points related to the question
- Be comprehensive enough for proper evaluation
- Use clear, educational language
- Provide context and detailed information

EXACT JSON FORMAT:
{
  "questions": [
    {
      "question": "Define photosynthesis and explain its importance",
      "marks": 2,
      "answerKey": "Photosynthesis is the biological process by which green plants, algae, and some bacteria convert light energy into chemical energy. This process occurs in chloroplasts, specifically in the chlorophyll molecules. During photosynthesis, plants absorb carbon dioxide from the atmosphere and water from the soil. Using sunlight as an energy source, they convert these raw materials into glucose (a simple sugar) and release oxygen as a byproduct. The process can be divided into two main stages: light-dependent reactions and light-independent reactions (Calvin cycle). Photosynthesis is crucial for life on Earth as it produces oxygen for respiration and forms the base of most food chains. It also helps regulate atmospheric carbon dioxide levels.",
      "answerGuidelines": "Define process clearly"
    },
    {
      "question": "Explain the difference between prokaryotic and eukaryotic cells",
      "marks": 2,
      "answerKey": "Prokaryotic and eukaryotic cells are the two main types of cells that differ significantly in their structure and complexity. Prokaryotic cells are simpler and smaller, typically 1-10 micrometers in size, and lack a membrane-bound nucleus. Their genetic material (DNA) floats freely in the cytoplasm in a region called the nucleoid. Examples include bacteria and archaea. Eukaryotic cells are larger and more complex, ranging from 10-100 micrometers. They contain a true nucleus enclosed by a nuclear membrane, which houses the genetic material. Eukaryotic cells also have membrane-bound organelles like mitochondria, endoplasmic reticulum, Golgi apparatus, and in plants, chloroplasts. These cells are found in animals, plants, fungi, and protists.",
      "answerGuidelines": "Compare both types"
    }
  ]
}

IMPORTANT:
- Return ONLY JSON, nothing else
- No markdown code blocks
- Answer keys: MUST be 7-9 lines long with detailed explanations
- Answer guidelines: EXACTLY 4-5 words (e.g., "Explain with examples", "Define key terms", "List main points")
- Keep everything properly formatted
`;

      console.log("Sending request to Gemini...");

      const model = getModel();
      const chatSession = model.startChat({ generationConfig, history: [] });

      const result = await chatSession.sendMessage(prompt);
      const response = result.response.text();

      console.log("Assignment response received");
      console.log("Raw response length:", response.length);
      console.log("First 200 chars:", response.substring(0, 200));
      console.log("Last 200 chars:", response.substring(response.length - 200));

      // Check if response seems truncated
      const trimmedResponse = response.trim();
      if (!trimmedResponse.endsWith("}") && !trimmedResponse.endsWith("]")) {
        console.warn("Response may be truncated!");
        throw new Error("Incomplete JSON response - response seems truncated");
      }

      // 🔹 IMPROVED JSON CLEANING
      let cleaned = response.trim();

      // Remove markdown code blocks
      cleaned = cleaned.replace(/```json\n?/gi, "").replace(/```/g, "");

      // Remove any text before first { and after last }
      const firstBrace = cleaned.indexOf("{");
      const lastBrace = cleaned.lastIndexOf("}");

      if (firstBrace === -1 || lastBrace === -1) {
        console.error(" No valid JSON object found in response");
        throw new Error("No valid JSON object found in response");
      }

      cleaned = cleaned.substring(firstBrace, lastBrace + 1);

      // Parse JSON with error handling
      let parsed;
      try {
        // First attempt: direct parse
        parsed = JSON.parse(cleaned);
        console.log("JSON parsed successfully on first attempt");
      } catch (firstError) {
        console.warn(" First parse failed, attempting repair...");
        console.error("Parse error:", firstError.message);

        try {
          // Attempt 2: Try to fix common issues
          let repaired = cleaned
            .replace(/\n/g, " ") // Replace newlines with spaces
            .replace(/\r/g, "") // Remove carriage returns
            .replace(/\t/g, " ") // Replace tabs with spaces
            .replace(/\s+/g, " "); // Normalize multiple spaces

          parsed = JSON.parse(repaired);
          console.log("JSON parsed successfully after repair");
        } catch (secondError) {
          console.error("JSON Parse Error (First):", firstError.message);
          console.error("JSON Parse Error (Second):", secondError.message);
          console.error(
            "Cleaned response (first 500 chars):",
            cleaned.substring(0, 500)
          );
          console.error(
            "Cleaned response (last 500 chars):",
            cleaned.substring(cleaned.length - 500)
          );
          throw new Error(
            "Invalid JSON from AI - unable to parse after repair attempts"
          );
        }
      }

      // Validate structure
      if (!parsed || typeof parsed !== "object") {
        throw new Error("Invalid format: Response is not an object");
      }

      if (!Array.isArray(parsed.questions)) {
        throw new Error("Invalid format: 'questions' array missing");
      }

      // Validate questions with answer key length check
      const validQuestions = parsed.questions.filter((q) => {
        const hasBasicFields =
          q.question &&
          typeof q.question === "string" &&
          q.marks === 2 &&
          q.answerKey &&
          typeof q.answerKey === "string";

        if (!hasBasicFields) return false;

        // Check answer key length (should be detailed - at least 200 characters)
        const answerKeyLength = q.answerKey.trim().length;
        if (answerKeyLength < 200) {
          console.warn(
            `Answer key too short (${answerKeyLength} chars) for question: "${q.question.substring(
              0,
              50
            )}..."`
          );
        }

        return true;
      });

      console.log(
        ` Found ${validQuestions.length} valid questions out of ${parsed.questions.length}`
      );

      if (validQuestions.length !== 5) {
        console.error(`Expected 5 questions, got ${validQuestions.length}`);
        throw new Error(
          `AI generated ${validQuestions.length} valid questions instead of 5`
        );
      }

      // Log answer key lengths for verification
      validQuestions.forEach((q, idx) => {
        console.log(
          ` Q${idx + 1} Answer Key Length: ${q.answerKey.length} characters`
        );
      });

      console.log(
        "Assignment Generated Successfully (5 questions × 2 marks = 10 marks)"
      );
      return validQuestions;
    } catch (error) {
      console.error(
        `Gemini Assignment Error (Key #${currentKeyIndex + 1}):`,
        error.message
      );

      attempts++;

      // Check for quota/rate limit errors
      if (
        error.message.includes("quota") ||
        error.message.includes("429") ||
        error.message.includes("RESOURCE_EXHAUSTED") ||
        error.message.includes("rate limit")
      ) {
        console.log(" Quota/Rate limit exceeded — rotating API key...");
        rotateApiKey();

        if (attempts < MAX_RETRIES) {
          console.log(
            `Retrying with next key (attempt ${attempts + 1}/${MAX_RETRIES})...`
          );
          continue;
        }
      }

      // If we've exhausted all retries, throw the error
      if (attempts >= MAX_RETRIES) {
        throw new Error(
          `Failed after ${MAX_RETRIES} attempts: ${error.message}`
        );
      }

      // For other errors, throw immediately
      throw error;
    }
  }

  throw new Error("All assignment API keys exhausted. Try again later.");
};

/**
 * Check Assignment Answers with AI (ONE BY ONE - Batch size = 1)
 */
export const checkAssignmentWithAI = async (answerKeys, studentAnswers) => {
  let attempts = 0;

  while (attempts < MAX_RETRIES) {
    try {
      console.log("Checking assignment answers (one by one)...");
      console.log(`Total answers to check: ${studentAnswers.length}`);

      // 🔹 Process answers ONE BY ONE to avoid overwhelming the API
      const checkedAnswers = [];

      for (let i = 0; i < studentAnswers.length; i++) {
        const singleAnswer = studentAnswers[i];
        const correspondingKey = answerKeys.find(
          (key) => key.questionId === singleAnswer.questionId
        );

        if (!correspondingKey) {
          console.warn(
            ` No answer key found for question ${singleAnswer.questionId}`
          );
          checkedAnswers.push({
            questionId: singleAnswer.questionId,
            marksAwarded: 0,
            reason: "No answer key available",
            feedback: "Cannot evaluate",
          });
          continue;
        }

        const prompt = `
You are an expert examiner. Compare this student's answer with the detailed answer key and award marks (0 to 2 marks).

CRITICAL RULES:
1. Return ONLY valid JSON
2. No markdown, no extra text
3. Keep feedback brief (under 40 words)
4. Accept synonyms and alternate phrasings
5. Give partial marks (0.5, 1, 1.5, 2) for partially correct answers
6. Be fair but rigorous
7. The answer key is comprehensive - student doesn't need to cover everything to get full marks
8. Award marks based on key concepts covered, not length

QUESTION:
${correspondingKey.question}

DETAILED ANSWER KEY (Reference for evaluation):
${correspondingKey.answerKey}

GUIDELINES:
${correspondingKey.answerGuidelines || "Evaluate fairly"}

MAX MARKS: 2

STUDENT'S ANSWER:
${singleAnswer.studentAnswer || "No answer provided"}

EVALUATION CRITERIA:
- Full marks (2.0): Covers main concepts accurately
- Good (1.5): Covers most concepts with minor gaps
- Partial (1.0): Basic understanding shown
- Minimal (0.5): Some relevant points mentioned
- No marks (0): Incorrect or no answer

OUTPUT FORMAT (return only this JSON):
{
  "questionId": "${singleAnswer.questionId}",
  "marksAwarded": 0,
  "reason": "Brief reason for marks awarded",
  "feedback": "Brief constructive feedback"
}

IMPORTANT: marksAwarded must be a number between 0 and 2.
`;

        try {
          const model = getModel();
          const chatSession = model.startChat({
            generationConfig,
            history: [],
          });

          const result = await chatSession.sendMessage(prompt);
          const response = result.response.text();

          console.log(`Response received for question ${i + 1}`);

          // Clean JSON
          let cleaned = response.trim();
          cleaned = cleaned.replace(/```json\n?/gi, "").replace(/```/g, "");

          // Extract JSON object
          const firstBrace = cleaned.indexOf("{");
          const lastBrace = cleaned.lastIndexOf("}");

          if (firstBrace === -1 || lastBrace === -1) {
            throw new Error("No valid JSON object found");
          }

          cleaned = cleaned.substring(firstBrace, lastBrace + 1);

          const parsed = JSON.parse(cleaned);

          // Ensure marksAwarded is a valid number
          let marksAwarded = parseFloat(parsed.marksAwarded) || 0;
          if (marksAwarded < 0) marksAwarded = 0;
          if (marksAwarded > 2) marksAwarded = 2;

          checkedAnswers.push({
            questionId: parsed.questionId || singleAnswer.questionId,
            marksAwarded: marksAwarded,
            reason: parsed.reason || "Evaluated",
            feedback: parsed.feedback || "No feedback",
          });

          console.log(
            `Checked question ${i + 1}/${
              studentAnswers.length
            } - Marks: ${marksAwarded}/2`
          );

          // Small delay between requests to avoid rate limiting
          if (i < studentAnswers.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 1000)); // 1 second delay
          }
        } catch (error) {
          console.error(`Error checking question ${i + 1}:`, error.message);
          checkedAnswers.push({
            questionId: singleAnswer.questionId,
            marksAwarded: 0,
            reason: "Error during evaluation",
            feedback: "Could not evaluate - please check manually",
          });

          // Continue with next question even if this one fails
          continue;
        }
      }

      console.log("Assignment Checked Successfully");
      console.log(
        `Total marks awarded: ${checkedAnswers.reduce(
          (sum, a) => sum + a.marksAwarded,
          0
        )}/10`
      );

      return checkedAnswers;
    } catch (error) {
      console.error(
        `Assignment Checking Error (Key #${currentKeyIndex + 1}):`,
        error.message
      );
      attempts++;

      if (
        error.message.includes("quota") ||
        error.message.includes("429") ||
        error.message.includes("RESOURCE_EXHAUSTED")
      ) {
        console.log("Quota exceeded — rotating API key...");
        rotateApiKey();

        if (attempts < MAX_RETRIES) {
          console.log(
            `Retrying with next key (attempt ${attempts + 1}/${MAX_RETRIES})...`
          );
          continue;
        }
      }

      if (attempts >= MAX_RETRIES) {
        throw new Error(
          `Failed after ${MAX_RETRIES} attempts: ${error.message}`
        );
      }

      throw error;
    }
  }

  throw new Error("All API keys exhausted for assignment checking.");
};

export default { generateAssignmentFromText, checkAssignmentWithAI };
