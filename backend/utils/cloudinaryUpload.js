import cloudinary from "../config/cloudinary.js";

/**
 * Upload a face image buffer to Cloudinary for audit purposes.
 *
 * PRIVACY DESIGN:
 * - Images are ONLY uploaded when triggered by audit rules:
 *   1. Similarity score below threshold (failed match)
 *   2. Random 5% audit sample on successful matches
 *   3. Client-reported liveness failure
 * - Images are stored in an isolated "adhyan-audit" folder
 * - Returns the secure HTTPS URL for storage in MongoDB
 *
 * @param {Buffer|string} imageData - Raw image buffer or base64 string
 * @param {Object} options
 * @param {string} options.studentId - Student identifier for organizing uploads
 * @param {string} options.reason - Audit trigger reason
 * @returns {Promise<string>} Cloudinary secure_url
 */
export const uploadAuditImage = async (imageData, options = {}) => {
  const { studentId = "unknown", reason = "audit" } = options;

  try {
    // Convert buffer to base64 data URI if needed
    let uploadStr;
    if (Buffer.isBuffer(imageData)) {
      uploadStr = `data:image/jpeg;base64,${imageData.toString("base64")}`;
    } else if (typeof imageData === "string") {
      // Already base64 or data URI
      uploadStr = imageData.startsWith("data:")
        ? imageData
        : `data:image/jpeg;base64,${imageData}`;
    } else {
      throw new Error("Invalid image data type. Expected Buffer or base64 string.");
    }

    const result = await cloudinary.uploader.upload(uploadStr, {
      folder: "adhyan-audit",
      public_id: `${studentId}_${reason}_${Date.now()}`,
      resource_type: "image",
      overwrite: false,
      tags: ["audit", reason, studentId],
      // Transformation: Moderate compression to save space
      transformation: [
        { width: 480, height: 480, crop: "limit" },
        { quality: "auto:eco" },
      ],
    });

    return result.secure_url;
  } catch (error) {
    console.error("[AuditUpload] Cloudinary upload failed:", error.message);
    // Don't throw — audit image failure should not block attendance marking
    return null;
  }
};

/**
 * Determine whether an audit image should be captured.
 *
 * @param {number} similarityScore - Cosine similarity from Pinecone (0-1)
 * @param {number} threshold - Minimum score for a successful match
 * @param {number} auditRate - Random audit sampling rate (default 0.05 = 5%)
 * @returns {{ shouldAudit: boolean, reason: string|null }}
 */
export const shouldTriggerAudit = (similarityScore, threshold = 0.75, auditRate = 0.05) => {
  // Case 1: Failed match — always audit
  if (similarityScore < threshold) {
    return { shouldAudit: true, reason: "low_similarity" };
  }

  // Case 2: Successful match — random 5% sample
  if (Math.random() < auditRate) {
    return { shouldAudit: true, reason: "random_5pct" };
  }

  // No audit needed
  return { shouldAudit: false, reason: null };
};
