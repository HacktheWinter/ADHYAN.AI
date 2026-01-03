import express from "express";
import {
  getProfile,
  updateProfile,
  uploadProfilePhoto,
  deleteProfilePhoto,
  upload,
  changePassword,
} from "../controllers/profileController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

// Get user profile (both teacher and student)
router.get("/", authMiddleware, getProfile);

// Update user profile
router.put("/", authMiddleware, updateProfile);

// Upload profile photo
router.post("/photo", authMiddleware, upload.single("profilePhoto"), uploadProfilePhoto);

// Delete profile photo
router.delete("/photo", authMiddleware, deleteProfilePhoto);

// Change password
router.post("/change-password", authMiddleware, changePassword);

export default router;
