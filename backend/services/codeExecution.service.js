// Backend/services/codeExecution.service.js
// High-level code execution service — drop-in replacement for geminiCodeExecutionService.js.
// Routes all code execution through Judge0. Never executes code directly in Node.js.

import { submitToJudge0 } from "./judge0.service.js";
import { getJudge0LanguageId, normalizeLanguage, isSupportedLanguage } from "./languageMap.js";

const MAX_ACTIVE_EXECUTIONS = 8;
const MAX_EXECUTION_QUEUE = 50;
const RUN_CODE_COOLDOWN_SECONDS = 5;

let activeExecutions = 0;
const executionQueue = [];
const userCooldowns = new Map();

const processQueue = () => {
  if (executionQueue.length === 0 || activeExecutions >= MAX_ACTIVE_EXECUTIONS) {
    return;
  }
  activeExecutions++;
  const task = executionQueue.shift();
  task();
};

/**
 * Execute student code against test cases using Judge0.
 *
 * This function maintains the EXACT same signature and response contract
 * as the previous geminiCodeExecutionService.executeCode(), so the
 * quizSubmissionController and frontend require zero changes.
 *
 * @param {string} studentId - The ID of the student running the code, for cooldown tracking.
 * @param {string} language - Programming language (e.g., "python", "cpp", "java").
 * @param {string} code - Student's source code.
 * @param {Array} testCases - Array of { input, expectedOutput }.
 * @param {Object} questionDetails - Question metadata (title, description, constraints). Unused by Judge0 but kept for API compatibility.
 * @returns {Array} Array of test case results: { input, expectedOutput, actualOutput, compileOutput, runError, exitCode, passed }
 */
export const executeCode = async (studentId, language, code, testCases = [], questionDetails = {}) => {
  try {
    // Check cooldown
    if (studentId) {
      const lastExecutionTime = userCooldowns.get(studentId);
      if (lastExecutionTime) {
        const timeSinceLastExecution = (Date.now() - lastExecutionTime) / 1000;
        if (timeSinceLastExecution < RUN_CODE_COOLDOWN_SECONDS) {
          const waitTime = Math.ceil(RUN_CODE_COOLDOWN_SECONDS - timeSinceLastExecution);
          throw new Error(`Please wait ${waitTime} seconds before running code again.`);
        }
      }
      userCooldowns.set(studentId, Date.now());
    }

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

    const codingDetails = questionDetails?.coding || questionDetails || {};
    const executionMode = codingDetails.executionMode || "standard";
    const finalCodeInput = code || "";

    // Validate code is not empty for standard mode
    if (executionMode !== "function" && finalCodeInput.trim().length === 0) {
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

    return await new Promise((resolve, reject) => {
      if (executionQueue.length >= MAX_EXECUTION_QUEUE) {
        return reject(new Error("Execution queue is full. Please try again in a few moments."));
      }

      const enqueueTime = Date.now();
      const task = async () => {
        const queueWaitTime = Date.now() - enqueueTime;
        const executionStartTime = Date.now();
        let judge0ExecutionTime = 0;

        try {
          let finalCode = finalCodeInput;
          let compilerOptions = codingDetails.compilerOptions || "";

          let offset = 0;
          let studentLinesCount = (finalCodeInput.match(/\n/g) || []).length + 1;

          if (executionMode === "function") {
            const buildRes = buildFunctionModeSource(codingDetails, finalCodeInput, language);
            finalCode = buildRes.finalCode;
            offset = buildRes.offset;
            
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
                const lines = driverObj.code.split('\n');
                offset = lines.findIndex(line => line.includes("{{USER_CODE}}"));
                if (offset === -1) offset = 0;
                finalCode = driverObj.code.replace("{{USER_CODE}}", finalCodeInput);
              }
            }
          }

          const languageId = getJudge0LanguageId(language);
          const results = [];

          // Execute test cases sequentially to avoid flooding Judge0
          for (let i = 0; i < testCases.length; i++) {
            const tc = testCases[i];
            
            const tcStart = Date.now();
            const result = await executeSingleTestCase(finalCode, languageId, tc, compilerOptions, offset, studentLinesCount, language);
            judge0ExecutionTime += (Date.now() - tcStart);

            results.push(result);

            // Short-circuit on compilation error — no point running remaining test cases
            if (result.compileOutput && result.compileOutput.trim() !== "") {
              // Fill remaining test cases with the same compilation error
              for (let j = i + 1; j < testCases.length; j++) {
                results.push({
                  input: testCases[j].input || "",
                  expectedOutput: testCases[j].expectedOutput || "",
                  actualOutput: "",
                  compileOutput: rewriteErrorLines(result.compileOutput, offset, studentLinesCount),
                  runError: "",
                  exitCode: 1,
                  passed: false,
                });
              }
              break;
            }
          }
          
          const totalExecutionTime = Date.now() - executionStartTime;
          console.info(`[Metrics] Code Execution: queueWaitTime=${queueWaitTime}ms, judge0ExecutionTime=${judge0ExecutionTime}ms, totalExecutionTime=${totalExecutionTime}ms`);

          resolve(results);
        } catch (err) {
          reject(err);
        } finally {
          activeExecutions--;
          processQueue();
        }
      };

      if (activeExecutions < MAX_ACTIVE_EXECUTIONS) {
        activeExecutions++;
        task();
      } else {
        executionQueue.push(task);
      }
    });

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
const executeSingleTestCase = async (code, languageId, testCase, compilerOptions = "", offset = 0, studentLinesCount = 0, language = "") => {
  const input = testCase.input || "";
  const expectedOutput = testCase.expectedOutput || "";

  try {
    const judge0Result = await submitToJudge0({
      sourceCode: code,
      languageId,
      stdin: input,
      compilerOptions,
    });

    return mapJudge0ResultToResponse(judge0Result, input, expectedOutput, offset, studentLinesCount, language);
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

const rewriteErrorLines = (errorString, offset, studentLinesCount) => {
  if (!errorString || offset === 0) return errorString;

  const replacer = (match, p1, p2) => {
    const lineNum = parseInt(p2, 10);
    if (isNaN(lineNum)) return match;

    if (lineNum <= offset) {
      return `${p1}[Driver Code Error (Teacher Side)]`;
    } else if (lineNum > offset && lineNum <= offset + studentLinesCount) {
      return `${p1}${lineNum - offset}`;
    } else {
      return `${p1}[Driver Code Error (Teacher Side)]`;
    }
  };

  let result = errorString;
  result = result.replace(/(line\s+)(\d+)/gi, replacer);
  result = result.replace(/([a-zA-Z0-9_-]+\.[a-zA-Z0-9]+:)(\d+)/g, replacer);
  return result;
};

/**
 * Map a normalized Judge0 result to the frontend-expected response format.
 *
 * @param {Object} result - Normalized Judge0 result from judge0.service.js.
 * @param {string} input - Test case input.
 * @param {string} expectedOutput - Expected output for comparison.
 * @returns {Object} Frontend-compatible result object.
 */
const mapJudge0ResultToResponse = (result, input, expectedOutput, offset = 0, studentLinesCount = 0, language = "") => {
  // Compilation Error
  if (result.isCompilationError) {
    return {
      input,
      expectedOutput,
      actualOutput: "",
      compileOutput: rewriteErrorLines(result.compileOutput || "Compilation failed.", offset, studentLinesCount),
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
      runError: rewriteErrorLines(errorMessage, offset, studentLinesCount),
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
    runError: rewriteErrorLines(result.stderr || "", offset, studentLinesCount),
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

  const lines = template.split('\n');
  const offset = lines.findIndex(line => line.includes(placeholder));

  // Inject the student body securely into the template
  const finalCode = template.replace(placeholder, studentBody);
  return { finalCode, offset: offset !== -1 ? offset : 0 };
};
