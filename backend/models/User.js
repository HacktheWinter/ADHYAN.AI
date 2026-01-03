import mongoose from "mongoose";

const userSchema = new mongoose.Schema({

  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },

  role: { type: String, enum: ["teacher", "student"], required: true },
  
  // Profile fields
  profilePhoto: { type: String, default: "" }, // URL or path to profile photo
  dateOfBirth: { type: Date },
  gender: { type: String, enum: ["male", "female", "other", "prefer-not-to-say", ""], default: "" },
  collegeName: { type: String, default: "" },
}, { timestamps: true });

export default mongoose.model("User", userSchema);
