// Backend/services/codeExecution.service.js
// High-level code execution service — drop-in replacement for geminiCodeExecutionService.js.
// Routes all code execution through Judge0. Never executes code directly in Node.js.

import { submitToJudge0 } from "./judge0.service.js";
import { getJudge0LanguageId, normalizeLanguage, isSupportedLanguage } from "./languageMap.js";

/**
 * Execute student code against test cases using Judge0.
 *
 * This function maintains the EXACT same signature and response contract
 * as the previous geminiCodeExecutionService.executeCode(), so the
 * quizSubmissionController and frontend require zero changes.
 *
 * @param {string} language - Programming language (e.g., "python", "cpp", "java").
 * @param {string} code - Student's source code.
 * @param {Array} testCases - Array of { input, expectedOutput }.
 * @param {Object} questionDetails - Question metadata (title, description, constraints). Unused by Judge0 but kept for API compatibility.
 * @returns {Array} Array of test case results: { input, expectedOutput, actualOutput, compileOutput, runError, exitCode, passed }
 */
export const executeCode = async (language, code, testCases = [], questionDetails = {}) => {
  try {
    // No test cases → nothing to execute
    if (!testCases || testCases.length === 0) {
      return [];
    }

    // Validate language
    if (!isSupportedLanguage(language)) {
      return testCases.map((tc) => ({
        input: tc.input || "",
        expectedOutput: tc.expectedOutput || "",
        actualOutput: "",
        compileOutput: `Unsupported language: "${language}". Supported languages: C, C++, Java, JavaScript, Python.`,
        runError: "",
        exitCode: 1,
        passed: false,
      }));
    }

    // Validate code is not empty
    if (!code || code.trim().length === 0) {
      return testCases.map((tc) => ({
        input: tc.input || "",
        expectedOutput: tc.expectedOutput || "",
        actualOutput: "",
        compileOutput: "",
        runError: "No code provided.",
        exitCode: 1,
        passed: false,
      }));
    }

    let finalCode = code;
    const codingDetails = questionDetails?.coding || questionDetails || {};
    let compilerOptions = codingDetails.compilerOptions || "";

    const executionMode = codingDetails.executionMode || "standard";

    if (executionMode === "function") {
      finalCode = buildFunctionModeSource(codingDetails, code, language);
      
      // Enforce return types strictly in Function Mode for C/C++
      const normLang = normalizeLanguage(language);
      if (normLang === "cpp" || normLang === "c") {
        compilerOptions = compilerOptions ? `${compilerOptions} -Werror=return-type` : "-Werror=return-type";
      }
    } else {
      // Standard mode: retain existing {{USER_CODE}} backward compatibility
      if (codingDetails.driverCode && Array.isArray(codingDetails.driverCode)) {
        const driverObj = codingDetails.driverCode.find(d => d.language === language);
        if (driverObj && driverObj.code && driverObj.code.includes("{{USER_CODE}}")) {
          finalCode = driverObj.code.replace("{{USER_CODE}}", code);
        }
      }
    }

    const languageId = getJudge0LanguageId(language);
    const results = [];

    // Execute test cases sequentially to avoid flooding Judge0
    for (let i = 0; i < testCases.length; i++) {
      const tc = testCases[i];
      const result = await executeSingleTestCase(finalCode, languageId, tc, compilerOptions);

      results.push(result);

      // Short-circuit on compilation error — no point running remaining test cases
      if (result.compileOutput && result.compileOutput.trim() !== "") {
        // Fill remaining test cases with the same compilation error
        for (let j = i + 1; j < testCases.length; j++) {
          results.push({
            input: testCases[j].input || "",
            expectedOutput: testCases[j].expectedOutput || "",
            actualOutput: "",
            compileOutput: result.compileOutput,
            runError: "",
            exitCode: 1,
            passed: false,
          });
        }
        break;
      }
    }

    return results;
  } catch (error) {
    console.error("[CodeExecution] Execution error:", error.message);

    // Return error for all test cases
    return testCases.map((tc) => ({
      input: tc.input || "",
      expectedOutput: tc.expectedOutput || "",
      actualOutput: "",
      compileOutput: "",
      runError: error.message || "Failed to execute code. Please try again.",
      exitCode: 1,
      passed: false,
    }));
  }
};

/**
 * Execute code against a single test case via Judge0.
 *
 * @param {string} code - Source code.
 * @param {number} languageId - Judge0 language ID.
 * @param {Object} testCase - { input, expectedOutput }.
 * @param {string} [compilerOptions] - Optional compiler options.
 * @returns {Object} Result: { input, expectedOutput, actualOutput, compileOutput, runError, exitCode, passed }
 */
const executeSingleTestCase = async (code, languageId, testCase, compilerOptions = "") => {
  const input = testCase.input || "";
  const expectedOutput = testCase.expectedOutput || "";

  try {
    const judge0Result = await submitToJudge0({
      sourceCode: code,
      languageId,
      stdin: input,
      compilerOptions,
    });

    return mapJudge0ResultToResponse(judge0Result, input, expectedOutput);
  } catch (error) {
    return {
      input,
      expectedOutput,
      actualOutput: "",
      compileOutput: "",
      runError: error.message || "Execution failed.",
      exitCode: 1,
      passed: false,
    };
  }
};

/**
 * Map a normalized Judge0 result to the frontend-expected response format.
 *
 * @param {Object} result - Normalized Judge0 result from judge0.service.js.
 * @param {string} input - Test case input.
 * @param {string} expectedOutput - Expected output for comparison.
 * @returns {Object} Frontend-compatible result object.
 */
const mapJudge0ResultToResponse = (result, input, expectedOutput) => {
  // Compilation Error
  if (result.isCompilationError) {
    return {
      input,
      expectedOutput,
      actualOutput: "",
      compileOutput: result.compileOutput || "Compilation failed.",
      runError: "",
      exitCode: 1,
      passed: false,
    };
  }

  // Runtime Error
  if (result.isRuntimeError) {
    const errorMessage = result.stderr || result.message || "Runtime error occurred.";
    return {
      input,
      expectedOutput,
      actualOutput: result.stdout || "",
      compileOutput: "",
      runError: errorMessage,
      exitCode: 1,
      passed: false,
    };
  }

  // Time Limit Exceeded
  if (result.isTimeLimitExceeded) {
    return {
      input,
      expectedOutput,
      actualOutput: "",
      compileOutput: "",
      runError: "Time Limit Exceeded. Your code took too long to execute.",
      exitCode: 1,
      passed: false,
    };
  }

  // Internal Error
  if (result.isInternalError) {
    return {
      input,
      expectedOutput,
      actualOutput: "",
      compileOutput: "",
      runError: "Internal execution error. Please try again.",
      exitCode: 1,
      passed: false,
    };
  }

  // Accepted or Wrong Answer — compare outputs
  const actualOutput = result.stdout || "";

  // Compare: trim both sides to handle trailing newlines/whitespace
  const passed = compareOutputs(actualOutput, expectedOutput);

  return {
    input,
    expectedOutput,
    actualOutput,
    compileOutput: "",
    runError: result.stderr || "",
    exitCode: passed ? 0 : 1,
    passed,
  };
};

/**
 * Compare actual output with expected output.
 * Handles trailing newlines/whitespace differences.
 * If expectedOutput is empty (custom input mode), always passes.
 *
 * @param {string} actual - Actual program output.
 * @param {string} expected - Expected output.
 * @returns {boolean}
 */
const compareOutputs = (actual, expected) => {
  // If no expected output (e.g., custom input run), consider it passed
  if (!expected || expected.trim() === "") {
    return true;
  }

  if (!actual) {
    return false;
  }

  // Trimmed comparison — handles trailing newlines and whitespace
  return actual.trim() === expected.trim();
};

/**
 * Build the executable source code for Function Mode.
 * Assumes the student ONLY submits the function body.
 * Injects the student's body into the trusted teacher driver code.
 *
 * @param {Object} questionDetails - The question schema object.
 * @param {string} studentBody - The body submitted by the student.
 * @param {string} language - The programming language.
 * @returns {string} The final composite source code.
 */
const buildFunctionModeSource = (codingDetails, studentBody, language) => {
  if (!codingDetails?.driverCode || !Array.isArray(codingDetails.driverCode)) {
    throw new Error("Function Mode configuration error: Missing trusted driver code.");
  }

  const driverObj = codingDetails.driverCode.find(d => d.language === language);
  if (!driverObj || !driverObj.code) {
    throw new Error(`Function Mode configuration error: Missing driver code for language "${language}".`);
  }

  const template = driverObj.code;
  const placeholder = "{{STUDENT_BODY}}";

  const placeholderCount = (template.match(new RegExp(placeholder, "g")) || []).length;

  if (placeholderCount === 0) {
    throw new Error(`Function Mode configuration error: Missing "${placeholder}" in trusted driver code.`);
  }

  if (placeholderCount > 1) {
    throw new Error(`Function Mode configuration error: Multiple "${placeholder}" found in trusted driver code. Only one is allowed.`);
  }

  // Inject the student body securely into the template
  return template.replace(placeholder, studentBody);
};
