import express from "express";
import {
  getProfile,
  updateProfile,
  uploadProfilePhoto,
  deleteProfilePhoto,
  upload,
  uploadBackground,
  uploadBackgroundImage,
  toggleBackground,
  deleteBackgroundImage,
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

// Upload background image
router.post("/background", authMiddleware, uploadBackground.single("backgroundImage"), uploadBackgroundImage);

// Toggle background (use custom or default)
router.post("/background/toggle", authMiddleware, toggleBackground);

// Delete background image
router.delete("/background", authMiddleware, deleteBackgroundImage);

// Change password
router.post("/change-password", authMiddleware, changePassword);

export default router;
