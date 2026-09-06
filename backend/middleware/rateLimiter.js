/**
 * Simple in-memory rate limiter middleware.
 * Limits requests per IP to prevent brute-force and email flooding attacks.
 * 
 * For production at scale, consider replacing with redis-based rate limiting.
 */

const ipRequestCounts = new Map();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of ipRequestCounts) {
    if (now > entry.resetTime) {
      ipRequestCounts.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Creates a rate limiter middleware.
 * @param {Object} options
 * @param {number} options.windowMs - Time window in milliseconds (default: 60000 = 1 minute)
 * @param {number} options.maxRequests - Max requests per window per IP (default: 10)
 * @param {string} options.message - Error message when rate limited
 */
export const createRateLimiter = ({
  windowMs = 60 * 1000,
  maxRequests = 10,
  message = "Too many requests. Please try again later.",
} = {}) => {
  return (req, res, next) => {
    const ip = req.ip || req.connection?.remoteAddress || "unknown";
    const key = `${ip}:${req.baseUrl}${req.path}`;
    const now = Date.now();

    let entry = ipRequestCounts.get(key);

    if (!entry || now > entry.resetTime) {
      entry = { count: 0, resetTime: now + windowMs };
      ipRequestCounts.set(key, entry);
    }

    entry.count++;

    if (entry.count > maxRequests) {
      const retryAfterSeconds = Math.ceil((entry.resetTime - now) / 1000);
      res.set("Retry-After", String(retryAfterSeconds));
      return res.status(429).json({
        error: message,
        retryAfterSeconds,
      });
    }

    next();
  };
};

/**
 * Pre-configured rate limiters for common use cases
 */

// Auth endpoints: 10 attempts per minute
export const authRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 10,
  message: "Too many authentication attempts. Please wait before trying again.",
});

// Password reset: 5 attempts per 15 minutes
export const passwordResetRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 5,
  message: "Too many password reset requests. Please wait before trying again.",
});
