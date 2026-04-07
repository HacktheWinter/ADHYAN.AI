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
  temperature: 0.7,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 16384,
  responseMimeType: "application/json",
};

/**
 *  Generate Assignment from text using Gemini AI
 * @param {string} extractedText - Content extracted from PDFs
 * @param {object} config - Configuration for generation
 * @param {number} config.questionCount - Number of questions (default 5)
 * @param {number} config.marksPerQuestion - Marks per question (default 2)
 * @param {string} config.difficulty - easy, medium, hard, mixed (default mixed)
 * @param {string[]} config.excludeQuestions - List of existing questions to avoid
 */
export const generateAssignmentFromText = async (extractedText, config = {}) => {
  const questionCount = config.questionCount || 5;
  const marksPerQuestion = config.marksPerQuestion || 2;
  const difficulty = config.difficulty || "mixed";
  const excludeQuestions = config.excludeQuestions || [];

  let attempts = 0;

  while (attempts < MAX_RETRIES) {
    try {
      console.log(` Preparing Gemini prompt for Assignment (${questionCount} Qs)...`);
      console.log(`Config: ${questionCount} questions, ${marksPerQuestion} marks each, difficulty: ${difficulty}`);

      const limitedText = extractedText.slice(0, 12000);

      const difficultyInstruction = difficulty === "mixed"
        ? "Mix difficulty levels among the questions"
        : `All questions should be ${difficulty.toUpperCase()} difficulty level`;

      const excludeInstruction = excludeQuestions.length > 0
        ? `\nDO NOT repeat or generate questions similar to these existing ones:\n- ${excludeQuestions.join('\n- ')}\n`
        : "";

      const prompt = `
You are an expert assignment question generator. Generate EXACTLY ${questionCount} short-answer assignment questions from the following educational content.

${excludeInstruction}

CONTENT:
${limitedText}

CRITICAL JSON RULES:
1. Return ONLY valid JSON - No markdown snippets, no backticks, no "json" label.
2. NO LITERAL NEWLINES inside JSON string values. Use spaces or /n instead.
3. Escape all double quotes (\") within question or answer text.
4. Total answer keys MUST be detailed (7-9 lines) but must be a SINGLE-LINE string with no breaks.
5. Answer guidelines MUST be EXACTLY 4-5 words only.

REQUIREMENTS:
1. Generate EXACTLY ${questionCount} questions
2. Each question is worth ${marksPerQuestion} mark(s)
3. Questions should be direct and clear
4. ${difficultyInstruction}
5. Each question MUST have:
   - Question text (concise and clear)
   - Marks = ${marksPerQuestion}
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
      "marks": ${marksPerQuestion},
      "answerKey": "Photosynthesis is the biological process... (7-9 lines of text)",
      "answerGuidelines": "Define process clearly"
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

      // 🔹 ROBUST JSON CLEANING & HEALING
      let cleaned = response.trim();

      // 1. Remove markdown code blocks if present
      cleaned = cleaned.replace(/```json\n?/gi, "").replace(/```\n?/g, "");

      // 2. Clear junk text outside the JSON structure
      const firstBrace = cleaned.indexOf("{");
      const lastBrace = cleaned.lastIndexOf("}");
      if (firstBrace === -1 || lastBrace === -1) {
        throw new Error("No valid JSON structure found in AI response");
      }
      cleaned = cleaned.substring(firstBrace, lastBrace + 1);

      // 3. SMART HEALING: Escape unescaped quotes within text while protecting keys and key-delimiters
      // This regex attempts to find quotes inside JSON string values and escapes them.
      const healed = cleaned
        .replace(/:\s*"(.*)"\s*(,?)\s*(\n|}|,)/g, (match, p1, p2, p3) => {
          // Escape quotes within the captured content, then restore the surrounding structure
          const escapedContent = p1.replace(/"/g, '\\"');
          return `: "${escapedContent}"${p2}${p3}`;
        })
        // Remove literal newlines within values that occasionally break parsers
        .replace(/\r?\n|\r/g, " ");

      let parsed;
      try {
        parsed = JSON.parse(healed);
        console.log("JSON successfully healed and parsed!");
      } catch (parseError) {
        console.error(" Healer failed, attempting direct parse as fallback...");
        try {
          parsed = JSON.parse(cleaned);
        } catch (f) {
          console.error("All parse attempts failed. Problematic JSON segment:");
          console.error(cleaned.substring(0, 500));
          throw new Error(`JSON Structure Error: ${parseError.message}`);
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

      if (validQuestions.length < questionCount) {
        console.error(`Expected ${questionCount} questions, got ${validQuestions.length}`);
        throw new Error(
          `AI generated only ${validQuestions.length} valid questions instead of ${questionCount}`
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

/**
 * Check Multiple PDF Submissions using Gemini Context Window
 */
export const checkPDFSubmissionsBatch = async (submissions, answerKeys) => {
  const results = [];

  for (const sub of submissions) {
    let attempts = 0;
    let subResult = null;

    const answerKeysText = answerKeys.map(k => `
Question ID: ${k.questionId}
Question: ${k.question}
Answer Key: ${k.answerKey}
Guidelines: ${k.answerGuidelines || "Evaluate fairly"}
Max Marks: ${k.marks}
`).join('\n---\n');

    const promptParts = [
      { text: `STUDENT: ${sub.studentName || 'Unknown'} (submissionId: ${sub.submissionId})` },
      { inlineData: { mimeType: 'application/pdf', data: sub.pdfBase64 } },
      { text: `
You are an expert examiner. Read this student's handwritten PDF and evaluate their answers.

ANSWER KEYS FOR EVALUATION:
${answerKeysText}

CRITICAL RULES:
1. Return ONLY valid JSON, no markdown, no extra text.
2. Read the student's PDF carefully and identify what they wrote for each question.
3. For studentAnswerPoints: write a concise bullet-point summary (• Point 1 • Point 2 ...) of what the student actually wrote — NOT the expected answer.
4. Award marks from 0 to max marks (partial points like 0.5, 1.0, 1.5 allowed).
5. Keep feedback to 1-2 sentences.
6. If a student left a question blank, set studentAnswerPoints to "Not attempted" and marksAwarded to 0.

EXACT OUTPUT FORMAT (return only this JSON):
{
  "results": [
    {
      "submissionId": "${sub.submissionId}",
      "checkedAnswers": [
        {
          "questionId": "<exact questionId>",
          "studentAnswerPoints": "<bullet-point summary of student's actual answer>",
          "marksAwarded": <number>,
          "feedback": "<1-2 sentence feedback>"
        }
      ]
    }
  ]
}

Ensure EVERY questionId from the answer keys appears in checkedAnswers.
` }
    ];

    while (attempts < MAX_RETRIES) {
      try {
        console.log(`Checking PDF for: ${sub.studentName} (attempt ${attempts + 1})`);

        const model = getModel();
        const chatSession = model.startChat({
          generationConfig: {
            ...generationConfig,
            temperature: 0.2,
            maxOutputTokens: 8192,
          },
          history: [],
        });

        const result = await chatSession.sendMessage(promptParts);
        const response = result.response.text();

        let cleaned = response.trim().replace(/```json\n?/gi, "").replace(/```/g, "");
        const firstBrace = cleaned.indexOf("{");
        const lastBrace = cleaned.lastIndexOf("}");
        if (firstBrace === -1 || lastBrace === -1) throw new Error("No valid JSON found");
        cleaned = cleaned.substring(firstBrace, lastBrace + 1);

        const parsed = JSON.parse(cleaned);
        if (!parsed || !Array.isArray(parsed.results)) throw new Error("Invalid format: 'results' array missing");

        subResult = parsed.results[0];
        console.log(`PDF checked successfully: ${sub.studentName}`);
        break;
      } catch (error) {
        console.error(`PDF check error (Key #${currentKeyIndex + 1}):`, error.message);
        attempts++;
        if (error.message.includes("quota") || error.message.includes("429") || error.message.includes("RESOURCE_EXHAUSTED")) {
          rotateApiKey();
        }
        if (attempts >= MAX_RETRIES) {
          console.error(`Failed to check PDF for ${sub.studentName} after ${MAX_RETRIES} attempts`);
          break;
        }
        await new Promise(r => setTimeout(r, 3000));
      }
    }

    if (subResult) results.push(subResult);
    // Small delay between students
    if (submissions.indexOf(sub) < submissions.length - 1) {
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  return results;
};


export default { generateAssignmentFromText, checkAssignmentWithAI, checkPDFSubmissionsBatch };
