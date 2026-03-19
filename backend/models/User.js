import mongoose from "mongoose";

const userSchema = new mongoose.Schema({

  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  passwordResetToken: { type: String, default: null, select: false },
  passwordResetExpiresAt: { type: Date, default: null, select: false },

  role: { type: String, enum: ["teacher", "student", "principal"], required: true },
  
  // Device binding (anti-proxy attendance) - 1 mobile, 1 desktop max
  boundDevices: {
    mobile: { type: String, default: null },
    desktop: { type: String, default: null }
  },
  
  // Profile fields
  profilePhoto: { type: String, default: "" }, // URL or path to profile photo
  backgroundImage: { type: String, default: "" }, // URL or path to background image
  useCustomBackground: { type: Boolean, default: false }, // Toggle between custom and default background
  dateOfBirth: { type: Date },
  gender: { type: String, enum: ["male", "female", "other", "prefer-not-to-say", ""], default: "" },
  collegeName: { type: String, default: "" },
}, { timestamps: true });

export default mongoose.model("User", userSchema);
