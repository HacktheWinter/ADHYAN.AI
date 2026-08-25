import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEYS = [
  process.env.GEN_API_KEY_1,
  process.env.GEN_API_KEY_2,
  process.env.GEN_API_KEY_3,
].filter(Boolean);

let currentKeyIndex = 0;

const getModel = () => {
  if (API_KEYS.length === 0) {
    console.warn("No Gemini API keys found in environment variables. Code execution will fail.");
    throw new Error("No Gemini API keys configured.");
  }
  const apiKey = API_KEYS[currentKeyIndex];
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({
    model: "gemini-3.1-flash-lite",
  });
};

const rotateApiKey = () => {
  if (API_KEYS.length > 0) {
    currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
    console.log(`Switched to Gemini API Key #${currentKeyIndex + 1}/${API_KEYS.length}`);
  }
};

/**
 * AI-powered Code Evaluation Engine
 * 
 * @param {string} language - The programming language of the code.
 * @param {string} code - The student's submitted code.
 * @param {Array} testCases - Array of test case objects { input, expectedOutput }.
 * @param {Object} questionDetails - Details about the question (title, description, constraints).
 * @returns {Array} Array of evaluation results for each test case.
 */
export const executeCode = async (language, code, testCases = [], questionDetails = {}) => {
  try {
    if (!testCases || testCases.length === 0) {
      return [];
    }

    const model = getModel();

    const prompt = `Implement an AI-powered Code Evaluation Engine using the Gemini API as a temporary replacement for a real compiler.

## Objective
The AI should evaluate student programming submissions as accurately as possible by reasoning through the code, simulating compilation and execution, and determining whether the provided test cases pass or fail.

This is NOT a chatbot. It should behave as an automated code evaluator.

------------------------------------
SUPPORTED LANGUAGES
------------------------------------
- C
- C++
- Java
- Python
- JavaScript

------------------------------------
SELECTED LANGUAGE
------------------------------------
The student has selected: ${language}

The AI MUST enforce this selection. The submitted code MUST be written in the selected language (${language}).

------------------------------------
INPUT
------------------------------------

1. Programming Question: ${questionDetails.title || "Coding Challenge"}
2. Problem Statement: ${questionDetails.description || "N/A"}
3. Constraints: ${questionDetails.constraints ? questionDetails.constraints.join(", ") : "N/A"}
4. Selected Language: ${language}
5. Student Source Code:
\`\`\`
${code}
\`\`\`
6. Multiple Test Cases:
${JSON.stringify(testCases, null, 2)}

------------------------------------
EVALUATION PROCESS
------------------------------------

The AI MUST follow these steps exactly.

Step 1
Read the entire source code carefully before making any judgement.

Step 2
Identify the actual programming language of the submitted code.

Step 3 — MANDATORY LANGUAGE VALIDATION
Compare the detected language with the selected language (${language}).

If the code is NOT written in the selected language (${language}):
- Set compileSuccess to false
- Set compileError to "Language Mismatch: You selected ${language} but your code appears to be written in [detected language]. Please write your code in ${language} or change the language selection."
- Set languageMismatch to true
- DO NOT execute any test cases
- Mark ALL test cases as FAIL
- Set finalVerdict to "Language Mismatch"
- STOP HERE — do not proceed to Step 4 or beyond

Language detection rules:
- Java code uses "public class", "System.out.println", "import java."
- C++ code uses "#include", "cout", "using namespace std"
- C code uses "#include <stdio.h>", "printf", does NOT use cout or class
- Python code uses "def ", "print(", indentation-based blocks, no semicolons or braces
- JavaScript code uses "console.log", "function ", "const ", "let ", "var ", "=>"

Be strict: if the student selected JavaScript but wrote Java code (or vice versa), this MUST be caught and rejected even if the code would produce correct output.

Step 4
If the language matches, mentally simulate the compilation process according to the selected language.

If there are syntax or compilation errors:
- stop execution
- report compile error
- no test cases should execute

Step 5
If compilation succeeds, simulate execution exactly according to the language specification.

While simulating execution detect:
- runtime errors
- divide by zero
- null pointer
- invalid indexing
- stack overflow (when obvious)
- infinite loops (when obvious)
- recursion issues
- logical mistakes

Step 6
Execute every test case independently.

For every test case:
- simulate program execution
- calculate actual output
- compare with expected output
- mark PASS or FAIL

Never skip any test case.

------------------------------------
STRICT RULES
------------------------------------

DO NOT explain the code.
DO NOT optimize the code.
DO NOT rewrite the solution.
DO NOT suggest improvements.
DO NOT give hints.
DO NOT behave like a tutor.
Behave like an automated online judge.
Never make assumptions.
Never guess outputs.
NEVER evaluate code that does not match the selected language.
If the result cannot be determined confidently, explicitly state that instead of inventing an answer.

------------------------------------
SCORING
------------------------------------

Return
- total test cases
- passed test cases
- failed test cases
- acceptance percentage
- final verdict

Verdicts:
Language Mismatch (when code language does not match selected language — this takes HIGHEST PRIORITY)
Accepted
Wrong Answer
Compilation Error
Runtime Error
Time Limit Exceeded (only when confidently inferable)
Memory Limit Exceeded (only when confidently inferable)
Unknown (when the result genuinely cannot be determined)

------------------------------------
OUTPUT FORMAT
------------------------------------

Return ONLY valid JSON.
No markdown.
No explanation.
No additional text.

JSON Schema:
{
  "language": "C++",
  "selectedLanguage": "${language}",
  "languageMismatch": false,
  "compileSuccess": true,
  "compileError": null,
  "runtimeError": null,
  "passed": 8,
  "failed": 2,
  "total": 10,
  "acceptancePercentage": 80,
  "results": [
    {
      "testCase": 1,
      "input": "...",
      "expected": "...",
      "actual": "...",
      "status": "PASS"
    }
  ],
  "finalVerdict": "Wrong Answer",
  "confidence": "High"
}

------------------------------------
IMPORTANT
------------------------------------

Accuracy is more important than speed.
Read the entire code before evaluating.
ALWAYS check language match FIRST before any other evaluation.
Follow the exact behavior of the selected programming language as closely as possible.
Never fabricate execution results.
If a result cannot be confidently inferred through reasoning alone, return "Unknown" instead of claiming that the program passes.
The response must always be valid JSON that can be parsed directly by the backend.
`;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1, // Low temperature for deterministic evaluation
        responseMimeType: "application/json",
      },
    });

    const responseText = result.response.text();
    
    let aiResponse;
    try {
      aiResponse = JSON.parse(responseText);
    } catch (e) {
      console.error("Failed to parse Gemini response as JSON:", responseText);
      throw new Error("Invalid response format from AI evaluator.");
    }

    // Handle language mismatch detected by AI
    if (aiResponse.languageMismatch) {
      const mismatchError = aiResponse.compileError || 
        `Language Mismatch: You selected ${language} but your code appears to be written in ${aiResponse.language || "a different language"}. Please write your code in ${language} or change the language selection.`;
      return testCases.map(tc => ({
        input: tc.input || "",
        expectedOutput: tc.expectedOutput || "",
        actualOutput: "",
        compileOutput: mismatchError,
        runError: "",
        exitCode: 1,
        passed: false
      }));
    }

    if (!aiResponse.compileSuccess || !aiResponse.results || aiResponse.results.length === 0) {
      return testCases.map(tc => ({
        input: tc.input || "",
        expectedOutput: tc.expectedOutput || "",
        actualOutput: "",
        compileOutput: aiResponse.compileError || "",
        runError: aiResponse.runtimeError || "",
        exitCode: 1,
        passed: false
      }));
    }

    return testCases.map((tc, index) => {
      const res = aiResponse.results[index];
      return {
        input: tc.input || "",
        expectedOutput: tc.expectedOutput || "",
        actualOutput: res ? (res.actual || "") : "",
        compileOutput: aiResponse.compileError || "",
        runError: aiResponse.runtimeError || "",
        exitCode: res && res.status === "PASS" ? 0 : 1,
        passed: res ? res.status === "PASS" : false
      };
    });

  } catch (error) {
    console.error("Gemini code execution error:", error);
    
    const status = error.status || (error.response && error.response.status);
    if (status === 429 || status === 503 || status === 500) {
      console.log("Rotating Gemini API key due to error status:", status);
      rotateApiKey();
    }

    const errorMsg = error.message || "Failed to evaluate code with AI";
      
    return testCases.map(tc => ({
      input: tc.input || "",
      expectedOutput: tc.expectedOutput || "",
      actualOutput: "",
      compileOutput: "",
      runError: `AI Evaluation Error: ${errorMsg}`,
      exitCode: 1,
      passed: false
    }));
  }
};
