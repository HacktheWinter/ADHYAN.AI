// Backend/services/draftFinalizerCron.js
// Server-side background job that periodically finalizes expired quiz drafts.
// This handles the case where a student closes their tab or their system shuts down
// and the assessment timer expires — the frontend can't auto-submit, so the server does it.

import Quiz from "../models/Quiz.js";
import { finalizeExpiredDrafts } from "../controllers/quizSubmissionController.js";

const INTERVAL_MS = 2 * 60 * 1000; // Run every 2 minutes

/**
 * Finds all published quizzes whose endTime has passed (within last 24h)
 * or that have a duration set, then calls finalizeExpiredDrafts for each.
 */
const runFinalization = async () => {
  try {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Find quizzes that could have expired drafts:
    // 1. Published quizzes with endTime in the past (but not too old — within 24h)
    // 2. Published quizzes with a duration set (drafts may have timed out individually)
    const quizzes = await Quiz.find({
      status: "published",
      $or: [
        { endTime: { $lte: now, $gte: twentyFourHoursAgo } },
        { duration: { $gt: 0 } }
      ]
    }).select("_id");

    if (quizzes.length === 0) return;

    let finalizedCount = 0;
    for (const quiz of quizzes) {
      try {
        await finalizeExpiredDrafts(quiz._id);
        finalizedCount++;
      } catch (err) {
        console.error(`[DraftFinalizer] Error finalizing quiz ${quiz._id}:`, err.message);
      }
    }

    // Only log when there was work to do (avoid spamming logs)
    if (quizzes.length > 0) {
      console.log(`[DraftFinalizer] Checked ${quizzes.length} quizzes for expired drafts`);
    }
  } catch (error) {
    console.error("[DraftFinalizer] Cron error:", error.message);
  }
};

/**
 * Starts the draft finalizer background job.
 * Call this once during server startup.
 */
export const startDraftFinalizerCron = () => {
  console.log("[DraftFinalizer] Started — checking for expired drafts every 2 minutes");
  
  // Run once immediately on startup to catch any drafts that expired while server was down
  setTimeout(runFinalization, 10000); // 10s delay to let DB connections settle
  
  // Then run on interval
  setInterval(runFinalization, INTERVAL_MS);
};
