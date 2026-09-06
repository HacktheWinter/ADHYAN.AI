// Backend/controllers/proctorController.js
import cloudinary from "../config/cloudinary.js";

/**
 * Upload a webcam snapshot to Cloudinary
 * POST /api/proctor/upload-snapshot
 * Body: { image: "data:image/jpeg;base64,...", quizId?: string, studentId?: string }
 */
export const uploadSnapshot = async (req, res) => {
  try {
    const { image, quizId, studentId } = req.body;

    if (!image) {
      return res.status(400).json({ error: "No image data provided" });
    }

    // Build a descriptive folder path for Cloudinary
    const folder = quizId
      ? `adhyanai/proctor-snapshots/${quizId}`
      : "adhyanai/proctor-snapshots";

    // Build a meaningful public_id so photos are easy to find
    const timestamp = Date.now();
    const publicId = studentId
      ? `student_${studentId}_${timestamp}`
      : `snapshot_${timestamp}`;

    // Upload base64 image to Cloudinary
    const result = await cloudinary.uploader.upload(image, {
      folder,
      public_id: publicId,
      resource_type: "image",
      transformation: [
        { width: 640, height: 480, crop: "limit" },
        { quality: "auto:low" },
      ],
    });

    console.log("Proctor snapshot uploaded:", result.public_id);

    res.status(200).json({
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Proctor snapshot upload error:", error);
    res.status(500).json({
      error: "Failed to upload proctor snapshot",
      details: error.message,
    });
  }
};
