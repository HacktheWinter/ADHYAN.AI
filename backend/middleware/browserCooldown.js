import BrowserCooldown from "../models/BrowserCooldown.js";

// Default: 10 minutes. Override via ACCOUNT_SWITCH_COOLDOWN_MS env variable.
const getCooldownMs = () =>
  parseInt(process.env.ACCOUNT_SWITCH_COOLDOWN_MS, 10) || 10 * 60 * 1000;

/**
 * Validate a browser ID string.
 * Must be a non-empty string, max 128 chars, no control characters.
 * Returns the trimmed ID or null if invalid.
 */
const sanitizeBrowserId = (raw) => {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim().slice(0, 128);
  // Reject if empty or contains control characters
  if (!trimmed || /[\x00-\x1f]/.test(trimmed)) return null;
  return trimmed;
};

/**
 * Check if a browser is under an active account-switching cooldown.
 *
 * @param {string} browserId - Opaque browser identifier from X-Browser-ID header
 * @param {string} requestedAccountId - The account ID attempting to log in
 * @returns {Object} { allowed: boolean, retryAfterSeconds?: number }
 */
export const checkCooldown = async (browserId, requestedAccountId) => {
  if (!browserId) {
    // No browser ID provided — can't enforce cooldown, allow login.
    // This is equivalent to a new/unknown browser.
    return { allowed: true };
  }

  const record = await BrowserCooldown.findOne({ browserId }).lean();

  if (!record) {
    return { allowed: true };
  }

  const now = new Date();

  // Cooldown expired?
  if (record.cooldownUntil <= now) {
    return { allowed: true };
  }

  // Same account re-login? Allow.
  if (record.lastAccountId.toString() === requestedAccountId.toString()) {
    return { allowed: true };
  }

  // Different account + cooldown active → BLOCK
  const remainingMs = record.cooldownUntil.getTime() - now.getTime();
  const retryAfterSeconds = Math.ceil(remainingMs / 1000);

  return {
    allowed: false,
    retryAfterSeconds,
  };
};

/**
 * Record a browser cooldown on logout.
 * Uses findOneAndUpdate with upsert for atomic operation (prevents race conditions).
 *
 * @param {string} browserId - Opaque browser identifier
 * @param {string} accountId - The account that just logged out
 */
export const recordCooldown = async (browserId, accountId) => {
  if (!browserId || !accountId) return;

  const cooldownMs = getCooldownMs();
  const cooldownUntil = new Date(Date.now() + cooldownMs);

  await BrowserCooldown.findOneAndUpdate(
    { browserId },
    {
      $set: {
        lastAccountId: accountId,
        cooldownUntil,
      },
    },
    { upsert: true, new: true }
  );
};

/**
 * Update the browser tracking record on successful login (without setting a cooldown).
 * This ensures the browser ID is associated with the current account,
 * so the NEXT logout from this browser will create a valid cooldown record.
 *
 * @param {string} browserId - Opaque browser identifier
 * @param {string} accountId - The account that just logged in
 */
export const trackBrowserLogin = async (browserId, accountId) => {
  if (!browserId || !accountId) return;

  // Only update lastAccountId, do NOT extend cooldownUntil.
  // If no record exists, create one with cooldownUntil in the past (no active cooldown).
  await BrowserCooldown.findOneAndUpdate(
    { browserId },
    {
      $set: {
        lastAccountId: accountId,
      },
      $setOnInsert: {
        cooldownUntil: new Date(0), // epoch = no active cooldown
      },
    },
    { upsert: true }
  );
};

export { sanitizeBrowserId, getCooldownMs };
