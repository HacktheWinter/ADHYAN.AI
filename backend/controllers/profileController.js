import User from "../models/User.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import bcrypt from "bcryptjs";

// Configure multer for profile photo uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = "uploads/profiles";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "profile-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"));
  }
};

export const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: fileFilter,
});

// Get user profile
export const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select("-password");
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update user profile
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, dateOfBirth, gender, collegeName } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (dateOfBirth) updateData.dateOfBirth = dateOfBirth;
    if (gender) updateData.gender = gender;
    if (collegeName) updateData.collegeName = collegeName;

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({
      message: "Profile updated successfully",
      user,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Upload profile photo
export const uploadProfilePhoto = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Delete old profile photo if exists
    const user = await User.findById(userId);
    if (user.profilePhoto) {
      const oldPhotoPath = path.join(process.cwd(), user.profilePhoto);
      if (fs.existsSync(oldPhotoPath)) {
        fs.unlinkSync(oldPhotoPath);
      }
    }

    // Update user with new photo path
    const photoPath = `uploads/profiles/${req.file.filename}`;
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: { profilePhoto: photoPath } },
      { new: true }
    ).select("-password");

    res.status(200).json({
      message: "Profile photo uploaded successfully",
      user: updatedUser,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete profile photo
export const deleteProfilePhoto = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.profilePhoto) {
      const photoPath = path.join(process.cwd(), user.profilePhoto);
      if (fs.existsSync(photoPath)) {
        fs.unlinkSync(photoPath);
      }

      user.profilePhoto = "";
      await user.save();
    }

    res.status(200).json({
      message: "Profile photo deleted successfully",
      user: await User.findById(userId).select("-password"),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Change password
export const changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    // Validate inputs
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current password and new password are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters long" });
    }

    // Get user with password field
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    // Check if new password is same as current
    if (currentPassword === newPassword) {
      return res.status(400).json({ message: "New password must be different from current password" });
    }

    // Hash and update new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({
      message: "Password changed successfully",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Configure multer for background image uploads
const backgroundStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = "uploads/backgrounds";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "background-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const bgFileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"));
  }
};

export const backgroundUpload = multer({
  storage: backgroundStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: bgFileFilter,
});

// Upload background image
export const uploadBackgroundImage = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Delete old background image if exists
    const user = await User.findById(userId);
    if (user.backgroundImage) {
      const oldImagePath = path.join(process.cwd(), user.backgroundImage);
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }

    // Update user with new background image path
    const imagePath = `uploads/backgrounds/${req.file.filename}`;
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: { backgroundImage: imagePath, useCustomBackground: true } },
      { new: true }
    ).select("-password");

    res.status(200).json({
      message: "Background image uploaded successfully",
      user: updatedUser,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete background image
export const deleteBackgroundImage = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.backgroundImage) {
      const imagePath = path.join(process.cwd(), user.backgroundImage);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }

      user.backgroundImage = "";
      user.useCustomBackground = false;
      await user.save();
    }

    res.status(200).json({
      message: "Background image deleted successfully",
      user: await User.findById(userId).select("-password"),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Toggle background image usage
export const toggleBackgroundImage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { useCustomBackground } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: { useCustomBackground } },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({
      message: useCustomBackground ? "Switched to custom background" : "Switched to default background",
      user,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
