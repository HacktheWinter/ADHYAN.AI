// Backend/services/judge0.service.js
// Low-level Judge0 API client.
// Responsible ONLY for communication with Judge0.
// Does NOT execute code directly — all execution goes through the Judge0 sandbox.

import axios from "axios";

const JUDGE0_URL = () => process.env.JUDGE0_URL || "http://localhost:2358";
const JUDGE0_AUTH_TOKEN = () => process.env.JUDGE0_AUTH_TOKEN || "";

// Submission polling configuration
const POLL_INTERVAL_MS = 500;       // Poll every 500ms
const MAX_POLL_ATTEMPTS = 60;       // Max ~30 seconds of polling
const SUBMISSION_TIMEOUT_MS = 30000; // 30-second hard timeout

/**
 * Build common headers for Judge0 requests.
 * Auth token is included only if configured.
 */
const getHeaders = () => {
  const headers = {
    "Content-Type": "application/json",
  };
  const token = JUDGE0_AUTH_TOKEN();
  if (token) {
    headers["X-Auth-Token"] = token;
  }
  return headers;
};

/**
 * Submit source code to Judge0 for execution.
 * Uses the synchronous-style submission with wait=false, then polls.
 *
 * @param {Object} params
 * @param {string} params.sourceCode - The source code to execute.
 * @param {number} params.languageId - Judge0 language ID.
 * @param {string} [params.stdin] - Standard input for the program.
 * @param {number} [params.cpuTimeLimit] - CPU time limit in seconds (default: 5).
 * @param {number} [params.wallTimeLimit] - Wall clock time limit in seconds (default: 10).
 * @param {number} [params.memoryLimit] - Memory limit in KB (default: 128000 = 128MB).
 * @param {number} [params.maxOutputSize] - Max output size in KB (default: 1024 = 1MB).
 * @returns {Object} Normalized Judge0 result.
 */
export const submitToJudge0 = async ({
  sourceCode,
  languageId,
  stdin = "",
  cpuTimeLimit = 5,
  wallTimeLimit = 10,
  memoryLimit = 128000,
  maxOutputSize = 1024,
}) => {
  const baseUrl = JUDGE0_URL();

  // Step 1: Create submission
  let token;
  try {
    const response = await axios.post(
      `${baseUrl}/submissions?base64_encoded=false&wait=false`,
      {
        source_code: sourceCode,
        language_id: languageId,
        stdin: stdin || "",
        cpu_time_limit: cpuTimeLimit,
        wall_time_limit: wallTimeLimit,
        memory_limit: memoryLimit,
        max_file_size: maxOutputSize,
      },
      {
        headers: getHeaders(),
        timeout: 10000, // 10s timeout for the submission request itself
      }
    );
    token = response.data?.token;
  } catch (error) {
    throw normalizeJudge0Error(error, "Failed to submit code to execution engine");
  }

  if (!token) {
    throw new Error("Execution engine returned no submission token.");
  }

  // Step 2: Poll for result
  return await pollSubmission(token);
};

/**
 * Poll Judge0 for the result of a submission.
 *
 * @param {string} token - The Judge0 submission token.
 * @returns {Object} Normalized submission result.
 */
const pollSubmission = async (token) => {
  const baseUrl = JUDGE0_URL();
  const startTime = Date.now();

  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    // Check hard timeout
    if (Date.now() - startTime > SUBMISSION_TIMEOUT_MS) {
      throw new Error("Code execution timed out. Please try again.");
    }

    try {
      // Base64 false without fields to ensure all required data is returned
      const response = await axios.get(
        `${baseUrl}/submissions/${token}?base64_encoded=false`,
        {
          headers: getHeaders(),
          timeout: 5000,
          validateStatus: () => true, // Do not throw on non-200 statuses so we can inspect the payload
        }
      );

      // Handle HTTP errors returned by Judge0 API
      if (response.status >= 300) {
        // Terminal infrastructure/API problems (e.g. 401 Unauthorized, 403 Forbidden, 404 Not Found)
        if (response.status === 401 || response.status === 403 || response.status === 404 || response.status === 422) {
          const err = new Error(`Judge0 API error: HTTP ${response.status}`);
          err.response = response;
          throw err;
        }

        // Transient server errors (5xx) or rate limits (429), retry
        if (attempt < MAX_POLL_ATTEMPTS - 1) {
          await sleep(POLL_INTERVAL_MS);
          continue;
        }

        const err = new Error(`Judge0 API error: HTTP ${response.status}`);
        err.response = response;
        throw err;
      }

      const data = response.data;
      const statusId = data?.status?.id ?? data?.status_id;

      // Status 1 = In Queue, Status 2 = Processing — keep polling
      if (statusId === 1 || statusId === 2) {
        await sleep(POLL_INTERVAL_MS);
        continue;
      }

      // Any other status is TERMINAL (>= 3). Return immediately.
      if (statusId !== undefined && statusId >= 3) {
        return normalizeResult(data);
      }
      
      // If we reach here, it's HTTP 200 but statusId is missing or invalid.
      // Maybe the response was malformed. Retry if possible.
      if (attempt < MAX_POLL_ATTEMPTS - 1) {
        await sleep(POLL_INTERVAL_MS);
        continue;
      }

      // Fallback if statusId is completely missing after all attempts
      return normalizeResult(data);

    } catch (error) {
      // If it's a known infrastructure error (401, 403, 404, 422) that we threw above, throw immediately without retrying
      if (error.response && (error.response.status === 401 || error.response.status === 403 || error.response.status === 404 || error.response.status === 422)) {
         throw normalizeJudge0Error(error, "Failed to retrieve execution result");
      }

      // For network errors (Axios timeout, connection refused) or other unexpected errors, retry
      if (attempt < MAX_POLL_ATTEMPTS - 1) {
        await sleep(POLL_INTERVAL_MS);
        continue;
      }
      throw normalizeJudge0Error(error, "Failed to retrieve execution result");
    }
  }

  throw new Error("Code execution timed out after maximum polling attempts.");
};

/**
 * Normalize a Judge0 result into a consistent internal format.
 *
 * Judge0 Status IDs:
 *  1 = In Queue
 *  2 = Processing
 *  3 = Accepted
 *  4 = Wrong Answer
 *  5 = Time Limit Exceeded
 *  6 = Compilation Error
 *  7 = Runtime Error (SIGSEGV)
 *  8 = Runtime Error (SIGXFSZ)
 *  9 = Runtime Error (SIGFPE)
 * 10 = Runtime Error (SIGABRT)
 * 11 = Runtime Error (NZEC)
 * 12 = Runtime Error (Other)
 * 13 = Internal Error
 * 14 = Exec Format Error
 *
 * @param {Object} data - Raw Judge0 response.
 * @returns {Object} Normalized result.
 */
const normalizeResult = (data) => {
  const statusId = data?.status?.id ?? data?.status_id ?? 0;
  const statusDescription = data?.status?.description ?? "Unknown";

  return {
    stdout: data?.stdout ?? null,
    stderr: data?.stderr ?? null,
    compileOutput: data?.compile_output ?? null,
    message: data?.message ?? null,
    statusId,
    statusDescription,
    time: data?.time ?? null,
    memory: data?.memory ?? null,
    isCompilationError: statusId === 6,
    isRuntimeError: statusId >= 7 && statusId <= 12,
    isTimeLimitExceeded: statusId === 5,
    isInternalError: statusId === 13 || statusId === 14,
    isAccepted: statusId === 3,
  };
};

/**
 * Normalize Judge0/Axios errors into user-friendly messages.
 * NEVER exposes auth tokens or internal infrastructure details.
 */
const normalizeJudge0Error = (error, fallbackMessage) => {
  // Connection refused — Judge0 is not running
  if (error.code === "ECONNREFUSED") {
    const err = new Error("Code execution service is temporarily unavailable. Please try again later.");
    err.isJudge0Unavailable = true;
    return err;
  }

  // Timeout
  if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
    return new Error("Code execution request timed out. Please try again.");
  }

  // HTTP errors from Judge0
  if (error.response) {
    const status = error.response.status;
    if (status === 401 || status === 403) {
      console.error("[Judge0] Authentication error — check JUDGE0_AUTH_TOKEN configuration.");
      return new Error("Code execution service configuration error. Please contact your administrator.");
    }
    if (status === 422) {
      return new Error("Invalid code submission. Please check your code and try again.");
    }
    if (status === 429) {
      return new Error("Too many code execution requests. Please wait a moment and try again.");
    }
    if (status >= 500) {
      return new Error("Code execution service encountered an internal error. Please try again later.");
    }
  }

  return new Error(fallbackMessage);
};

/**
 * Check if Judge0 is reachable. Used for health checks.
 * @returns {boolean}
 */
export const isJudge0Available = async () => {
  try {
    const response = await axios.get(`${JUDGE0_URL()}/statuses`, {
      headers: getHeaders(),
      timeout: 3000,
    });
    return response.status === 200;
  } catch {
    return false;
  }
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
