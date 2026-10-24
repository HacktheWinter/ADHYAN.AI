// Backend/services/__tests__/loadTest.js
// Standalone load test runner for ADHYAN.AI code execution queue.
// Loads .env automatically and tests single, 10, 50, or 500 concurrent student executions.
// Run with: node backend/services/__tests__/loadTest.js [concurrency]

import "dotenv/config";
import { executeCode, getQueueMetrics, _clearCooldownsForTesting } from "../codeExecution.service.js";
import { isJudge0Available } from "../judge0.service.js";

const parseConcurrency = () => {
  const arg = process.argv[2];
  const num = parseInt(arg, 10);
  return isNaN(num) || num <= 0 ? 500 : num;
};

const calculatePercentile = (sortedArray, percentile) => {
  if (sortedArray.length === 0) return 0;
  const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
  return sortedArray[Math.max(0, Math.min(index, sortedArray.length - 1))];
};

export const runLoadTest = async (studentCount = parseConcurrency()) => {
  console.log(`\n======================================================`);
  console.log(`  ADHYAN.AI Judge0 Execution Load Test (${studentCount} Students)`);
  console.log(`======================================================`);

  const initialMetrics = getQueueMetrics();
  console.log(`Initial Queue Config: maxActive=${initialMetrics.maxActive}, maxQueue=${initialMetrics.maxQueue}`);
  console.log(`Initial Queue State : activeExecutions=${initialMetrics.activeExecutions}, queueLength=${initialMetrics.queueLength}\n`);

  // Verify Judge0 connectivity
  const judge0Up = await isJudge0Available();
  if (!judge0Up) {
    console.warn(`[WARNING] Judge0 is NOT reachable at process.env.JUDGE0_URL (${process.env.JUDGE0_URL || "http://localhost:2358"}).`);
    console.warn(`If Judge0 is offline, submissions will fail with service unavailable or timeout.`);
  } else {
    console.log(`[OK] Judge0 health check passed.`);
  }

  _clearCooldownsForTesting();

  // Test case payload: Standard Python addition program
  const sourceCode = `import sys\na, b = map(int, sys.stdin.read().split())\nprint(a + b)`;
  const testCases = [
    { input: "10 20\n", expectedOutput: "30" },
    { input: "5 7\n", expectedOutput: "12" },
  ];
  const questionDetails = { coding: { executionMode: "standard" } };

  console.log(`Submitting ${studentCount} concurrent student code executions...`);
  const startTime = Date.now();
  const latencies = [];
  let queueFullCount = 0;
  let passedCount = 0;
  let failedCount = 0;
  const errorMap = new Map();

  const runStudent = async (studentIndex) => {
    const studentId = `load_test_student_${studentIndex}_${Date.now()}`;
    const studentStart = Date.now();

    try {
      const results = await executeCode(
        studentId,
        "python",
        sourceCode,
        testCases,
        questionDetails
      );

      const studentLatency = Date.now() - studentStart;
      latencies.push(studentLatency);

      const allPassed = Array.isArray(results) && results.length > 0 && results.every((tc) => tc.passed === true);

      if (allPassed) {
        passedCount++;
      } else {
        failedCount++;
        const firstError = results?.[0]?.runError || results?.[0]?.compileOutput || "Unknown execution failure";
        if (firstError.includes("Execution queue is full")) {
          queueFullCount++;
        }
        errorMap.set(firstError, (errorMap.get(firstError) || 0) + 1);
      }
    } catch (err) {
      const studentLatency = Date.now() - studentStart;
      latencies.push(studentLatency);
      failedCount++;

      const message = err.message || String(err);
      if (message.includes("Execution queue is full")) {
        queueFullCount++;
      }
      errorMap.set(message, (errorMap.get(message) || 0) + 1);
    }
  };

  // Launch all students concurrently
  const promises = [];
  for (let i = 1; i <= studentCount; i++) {
    promises.push(runStudent(i));
  }

  await Promise.all(promises);

  const totalExecutionTime = Date.now() - startTime;
  latencies.sort((a, b) => a - b);

  const medianLatency = calculatePercentile(latencies, 50);
  const p95Latency = calculatePercentile(latencies, 95);
  const p99Latency = calculatePercentile(latencies, 99);
  const minLatency = latencies[0] || 0;
  const maxLatency = latencies[latencies.length - 1] || 0;

  console.log(`\n------------------ Test Results ------------------`);
  console.log(`Attempted        : ${studentCount}`);
  console.log(`Passed           : ${passedCount}`);
  console.log(`Failed           : ${failedCount}`);
  console.log(`Queue-Full Errors: ${queueFullCount}`);
  console.log(`Total Wall Time  : ${totalExecutionTime} ms (${(totalExecutionTime / 1000).toFixed(2)} s)`);
  console.log(`Throughput       : ${(studentCount / (totalExecutionTime / 1000 || 1)).toFixed(2)} req/sec`);
  console.log(`\n---------------- Latency Metrics -----------------`);
  console.log(`Min Latency      : ${minLatency} ms`);
  console.log(`Median (P50)     : ${medianLatency} ms`);
  console.log(`P95 Latency      : ${p95Latency} ms`);
  console.log(`P99 Latency      : ${p99Latency} ms`);
  console.log(`Max Latency      : ${maxLatency} ms`);

  if (errorMap.size > 0) {
    console.log(`\n---------------- Error Breakdown -----------------`);
    for (const [errText, count] of errorMap.entries()) {
      console.log(`  [${count}x]: ${errText}`);
    }
  }

  const finalMetrics = getQueueMetrics();
  console.log(`\nFinal Queue State: activeExecutions=${finalMetrics.activeExecutions}, queueLength=${finalMetrics.queueLength}`);
  console.log(`======================================================\n`);

  return {
    attempted: studentCount,
    passed: passedCount,
    failed: failedCount,
    queueFullCount,
    totalExecutionTime,
    medianLatency,
    p95Latency,
    p99Latency,
  };
};

// Auto-run if executed directly
if (process.argv[1] && process.argv[1].endsWith("loadTest.js")) {
  runLoadTest().catch((err) => {
    console.error("Load test fatal error:", err);
    process.exit(1);
  });
}
