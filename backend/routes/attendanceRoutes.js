import express from "express";
import crypto from "crypto";
import { authMiddleware, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

// GET /api/attendance/generate-token/:classId
// Protect route using existing teacher authentication middleware.
router.get(
  "/generate-token/:classId",
  authMiddleware,
  authorizeRoles("teacher"),
  (req, res) => {
    try {
      const { classId } = req.params;
      const qrSecretKey = process.env.QR_SECRET_KEY || "default_secret_key"; // fallback for safety, but should be in env

      // 3-second time window
      const timeWindow = Math.floor(Date.now() / 3000);

      // Generate SHA256 token
      const token = crypto
        .createHash("sha256")
        .update(classId + qrSecretKey + timeWindow)
        .digest("hex");

      res.status(200).json({ token });
    } catch (error) {
      console.error("Error generating attendance token:", error);
      res.status(500).json({ message: "Server Error", error: error.message });
    }
  }
);

export default router;
