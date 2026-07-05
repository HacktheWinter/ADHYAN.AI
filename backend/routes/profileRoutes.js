import express from "express";
import {
  getProfile,
  updateProfile,
  uploadProfilePhoto,
  deleteProfilePhoto,
  changePassword,
  uploadBackgroundImage,
  deleteBackgroundImage,
  toggleBackgroundImage,
  backgroundUpload,
  upload,
  updateUserSettings,
  deactivateUserAccount,
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

// Upload background image
router.post("/background", authMiddleware, backgroundUpload.single("backgroundImage"), uploadBackgroundImage);

// Delete background image
router.delete("/background", authMiddleware, deleteBackgroundImage);

// Toggle background image usage
router.post("/background/toggle", authMiddleware, toggleBackgroundImage);

// Update user settings preferences
router.put("/settings", authMiddleware, updateUserSettings);

// Safe account deactivation
router.post("/deactivate", authMiddleware, deactivateUserAccount);

export default router;