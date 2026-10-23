// Backend/utils/quizLock.js

/**
 * Grace period in milliseconds added to the lock check.
 * Set to 0 for strict enforcement (server time is the authority).
 */
export const LOCK_GRACE_MS = 0;

/**
 * Validate lockAfterMinutes against the quiz duration.
 * @param {{ duration: number, lockAfterMinutes: number }} params
 * @returns {{ ok: boolean, max: number|null, error: string|null }}
 */
export const validateLockAfterMinutes = ({ duration, lockAfterMinutes }) => {
  if (lockAfterMinutes == null) {
    return { ok: true, max: null, error: null };
  }

  if (!Number.isInteger(lockAfterMinutes) || lockAfterMinutes < 1) {
    return { ok: false, max: null, error: "Lock time must be a positive integer (minutes)." };
  }

  if (!duration || duration < 2) {
    return { ok: false, max: null, error: "Lock is not available when the quiz duration is less than 2 minutes." };
  }

  const max = Math.floor(duration / 2);

  if (lockAfterMinutes > max) {
    return {
      ok: false,
      max,
      error: `Lock time can be at most ${max} minutes (half of the ${duration} min duration).`,
    };
  }

  return { ok: true, max, error: null };
};

/**
 * Compute the absolute lock-at Date from a startTime and lockAfterMinutes.
 * @param {Date|string} startTime
 * @param {number} lockAfterMinutes
 * @returns {Date}
 */
export const computeLockAt = (startTime, lockAfterMinutes) => {
  const start = new Date(startTime);
  return new Date(start.getTime() + lockAfterMinutes * 60000);
};

/**
 * Check whether the lock has passed (server time is the only authority).
 * @param {{ lockAt: Date|string|null }} quiz
 * @param {Date} now
 * @returns {boolean}
 */
export const isLockPassed = (quiz, now = new Date()) => {
  if (!quiz.lockAt) return false;
  return now.getTime() >= new Date(quiz.lockAt).getTime() + LOCK_GRACE_MS;
};
