import { executeCode } from "./codeExecution.service.js";

/**
 * Validates generated coding questions by structurally verifying their drivers
 * and securely dry-running their testcases on Judge0 using a deterministic reference solution.
 * Automatically overrides hallucinated `expectedOutput` values with verified truth.
 *
 * @param {Array} questions - Array of AI-generated coding question objects
 * @returns {Promise<Array>} - Array of verified coding question objects
 * @throws {Error} - If a question is invalid or fails execution, triggering a generation retry.
 */
export const validateAndVerifyCodingQuestions = async (questions) => {
  if (!questions || !Array.isArray(questions)) {
    throw new Error("Invalid question format provided to validator.");
  }

  const verifiedQuestions = [];

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];

    // Ensure it's a coding question
    if (q.type !== "coding" || !q.coding) {
      verifiedQuestions.push(q);
      continue;
    }

    const { coding } = q;
    
    // 1. Structural Validation
    if (!coding.referenceSolution || !coding.referenceSolution.trim()) {
      throw new Error(`Question ${i + 1} missing a valid C++ referenceSolution.`);
    }
    
    const testCases = coding.testCases || coding.hiddenTestCases || [];
    if (testCases.length === 0) {
      throw new Error(`Question ${i + 1} generated with zero test cases.`);
    }

    // Ensure C++ driver exists and has {{STUDENT_BODY}} placeholder
    const cppDriver = coding.driverCode?.find(d => d.language === "cpp" || d.language === "c++");
    if (!cppDriver || !cppDriver.code || !cppDriver.code.includes("{{STUDENT_BODY}}")) {
      throw new Error(`Question ${i + 1} missing valid C++ Function Mode driver with {{STUDENT_BODY}} placeholder.`);
    }
    
    const driverStr = cppDriver.code;
    const isDynamic = driverStr.includes("cin") || driverStr.includes("scanf");
    if (!isDynamic) {
      throw new Error(`Question ${i + 1} generated a static driver that does not dynamically parse inputs.`);
    }

    // 2. Execution Validation via Judge0
    // We execute the reference solution in C++ using the "function" execution mode to utilize the generated driver.
    // The reference solution is treated as if it were the student's code.
    try {
      const results = await executeCode(
        "AI_VALIDATOR", 
        "cpp", 
        coding.referenceSolution, 
        testCases, 
        { coding: { ...coding, executionMode: "function" } }
      );

      if (!results || results.length !== testCases.length) {
        throw new Error(`Question ${i + 1} execution failed to return results for all test cases.`);
      }

      const verifiedTestCases = [];

      // 3. Override hallucinated expectedOutputs
      for (let j = 0; j < results.length; j++) {
        const res = results[j];
        
        if (res.compileOutput && res.compileOutput.trim() !== "") {
          console.error("Reference Solution Compilation Failed:", res.compileOutput);
          throw new Error(`Question ${i + 1} reference solution failed to compile.`);
        }
        
        if (res.runError && res.runError.trim() !== "") {
          console.error("Reference Solution Runtime Error:", res.runError);
          throw new Error(`Question ${i + 1} reference solution threw runtime error.`);
        }

        if (res.actualOutput === undefined || res.actualOutput === null) {
          throw new Error(`Question ${i + 1} execution returned null output.`);
        }
        
        const trueOutput = res.actualOutput.trim();
        
        // Override the testcase
        verifiedTestCases.push({
          input: testCases[j].input,
          expectedOutput: trueOutput, // Use verified truth
          explanation: testCases[j].explanation || ""
        });
      }

      // Replace old test cases with mathematically verified ones
      q.coding.testCases = verifiedTestCases;
      delete q.coding.hiddenTestCases;
      delete q.coding.publicTestCases;
    } catch (execError) {
      // If Judge0 is unavailable (connection refused, timeout, etc.),
      // gracefully skip execution verification and keep AI-generated outputs.
      const isConnError =
        execError.message.includes("ECONNREFUSED") ||
        execError.message.includes("ETIMEDOUT") ||
        execError.message.includes("ENOTFOUND") ||
        execError.message.includes("timeout") ||
        execError.code === "ECONNREFUSED" ||
        execError.code === "ETIMEDOUT";

      if (isConnError) {
        console.warn(
          `Judge0 unavailable — skipping execution verification for question ${i + 1}. AI-generated expected outputs will be used as-is.`
        );
      } else {
        // Non-connectivity error (compilation failure, runtime error, etc.) — propagate
        throw execError;
      }
    }
    
    // Strip referenceSolution to prevent DB bloat
    delete q.coding.referenceSolution;
    
    verifiedQuestions.push(q);
  }

  return verifiedQuestions;
};
