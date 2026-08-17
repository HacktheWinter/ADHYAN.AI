import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import User from "../models/User.js";
import Document from "../models/Note.js";
import { sendWelcomeEmail } from "../utils/emailNotifications.js";

dotenv.config();

export const registerTeacher = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ error: "Name, email, and password are required" });
    }

    // Check if teacher already exists
    const existing = await User.findOne({ email });
    if (existing)
      return res.status(400).json({ error: "Email already exists" });

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log("Hashed Password:", hashedPassword);

    // Create teacher
    const teacher = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "teacher",
    });

    // Welcome email (non-blocking)
    void sendWelcomeEmail({ name: teacher.name, email: teacher.email, role: "teacher" })
      .catch((emailError) =>
        console.error("[Email] Teacher welcome email failed:", emailError.message)
      );

    // Generate JWT token for auto-login after signup
    const token = jwt.sign(
      { id: teacher._id, role: teacher.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.status(201).json({
      message: "Teacher registered successfully",
      token,
      teacher: {
        id: teacher._id,
        name: teacher.name,
        email: teacher.email,
        profilePhoto: teacher.profilePhoto,
        role: "teacher",
      },
    });
  } catch (err) {
    console.error("Register Error:", err);
    res.status(500).json({ error: "Server error during registration" });
  }
};

export const loginTeacher = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log(`[Teacher Login] Attempt for email: ${email}`);

    if (!email || !password) {
      console.log(`[Teacher Login] Failed: Email or password missing`);
      return res.status(400).json({ error: "Email and password are required" });
    }

    const teacher = await User.findOne({ email, role: "teacher" });
    console.log(`[Teacher Login] User exists: ${!!teacher}`);
    if (!teacher) return res.status(404).json({ error: "Teacher not found" });

    if (teacher.status === "inactive") {
      console.log(`[Teacher Login] Failed: Account inactive`);
      return res.status(403).json({ error: "This account has been deactivated." });
    }

    console.log(`[Teacher Login] Password hash exists: ${!!teacher.password}`);
    if (!teacher.password) {
      return res.status(400).json({
        error: "Password is not set for this teacher. Please re-register.",
      });
    }

    const isMatch = await bcrypt.compare(password, teacher.password);
    console.log(`[Teacher Login] bcrypt.compare() result: ${isMatch}`);
    if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });

    const token = jwt.sign(
      { id: teacher._id, role: teacher.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );
    console.log(`[Teacher Login] JWT generation success: ${!!token}`);

    console.log(`[Teacher Login] Success: Sending final response`);
    res.status(200).json({
      message: "Teacher login successful",
      token,
      teacher: {
        id: teacher._id,
        name: teacher.name,
        email: teacher.email,
        profilePhoto: teacher.profilePhoto,
        role: "teacher",
      },
    });
  } catch (err) {
    console.error("Teacher Login Error:", err);
    res.status(500).json({
      error: "Server error during login",
      message: err.message,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined
    });
  }
};

export const logoutTeacher = async (req, res) => {
  try {
    // JWT is stateless; logout can just respond
    res.status(200).json({ message: "Teacher logged out successfully" });
  } catch (err) {
    console.error("Logout Error:", err);
    res.status(500).json({ error: "Server error during logout" });
  }
};
