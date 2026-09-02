import mongoose from "mongoose";

/**
 * BrowserCooldown — tracks browser-bound account-switching cooldowns.
 *
 * When a student logs out, a record is upserted with:
 *   - browserId: opaque random UUID from the client (X-Browser-ID header)
 *   - lastAccountId: the user who just logged out
 *   - cooldownUntil: server-calculated expiry (now + COOLDOWN_MS)
 *
 * On next login attempt:
 *   - If cooldownUntil > now AND requested account ≠ lastAccountId → REJECT
 *   - If same account → ALLOW
 *   - If cooldown expired → ALLOW
 *
 * The TTL index on `cooldownUntil` auto-deletes expired documents.
 */
const browserCooldownSchema = new mongoose.Schema(
  {
    browserId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    lastAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    cooldownUntil: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

// TTL index — MongoDB automatically removes documents once cooldownUntil has passed.
// The `expireAfterSeconds: 0` means "delete when the field value is in the past".
browserCooldownSchema.index({ cooldownUntil: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("BrowserCooldown", browserCooldownSchema);
