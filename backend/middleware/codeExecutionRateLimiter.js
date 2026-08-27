// Backend/middleware/codeExecutionRateLimiter.js
// Simple in-memory rate limiter for code execution endpoints.
// Prevents students from spamming the Judge0 execution engine.
// No external dependencies — uses a basic sliding-window approach.

const REQUEST_LIMIT = 10;          // Max requests per window
const WINDOW_MS = 60 * 1000;       // 1-minute window
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // Clean up stale entries every 5 minutes

// In-memory store: userId -> [timestamp1, timestamp2, ...]
const requestLog = new Map();

// Periodic cleanup of expired entries to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [userId, timestamps] of requestLog.entries()) {
    const valid = timestamps.filter((t) => now - t < WINDOW_MS);
    if (valid.length === 0) {
      requestLog.delete(userId);
    } else {
      requestLog.set(userId, valid);
    }
  }
}, CLEANUP_INTERVAL_MS);

/**
 * Rate limiter middleware for code execution routes.
 * Limits each authenticated user to REQUEST_LIMIT submissions per WINDOW_MS.
 */
export const codeExecutionRateLimiter = (req, res, next) => {
  const userId = req.user?._id?.toString();

  // If no user (shouldn't happen behind authMiddleware), skip rate limiting
  if (!userId) {
    return next();
  }

  const now = Date.now();
  const timestamps = requestLog.get(userId) || [];

  // Filter to only timestamps within the current window
  const recentRequests = timestamps.filter((t) => now - t < WINDOW_MS);

  if (recentRequests.length >= REQUEST_LIMIT) {
    const oldestRequest = recentRequests[0];
    const retryAfterSeconds = Math.ceil((WINDOW_MS - (now - oldestRequest)) / 1000);

    return res.status(429).json({
      error: `Too many code execution requests. Please wait ${retryAfterSeconds} seconds before trying again.`,
    });
  }

  // Record this request
  recentRequests.push(now);
  requestLog.set(userId, recentRequests);

  next();
};
