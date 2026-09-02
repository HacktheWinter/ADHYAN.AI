import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import User from "../models/User.js";
import Submission from "../models/Submission.js";
import { sendWelcomeEmail } from "../utils/emailNotifications.js";
import {
  checkCooldown,
  recordCooldown,
  trackBrowserLogin,
  sanitizeBrowserId,
} from "../middleware/browserCooldown.js";

dotenv.config();

export const registerStudent = async (req, res) => {
  try {
    const { name, email, password, course, specialization, section, erpId, semester } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: "All fields are required" });

    // Validate student-specific fields
    if (!course || !course.trim())
      return res.status(400).json({ error: "Course is required for students" });
    if (!section || !section.trim())
      return res.status(400).json({ error: "Section is required for students" });
    if (!erpId || !erpId.trim())
      return res.status(400).json({ error: "ERP ID is required for students" });
    if (!semester || !String(semester).trim())
      return res.status(400).json({ error: "Semester is required for students" });

    const existing = await User.findOne({ email });
    if (existing)
      return res.status(400).json({ error: "Email already exists" });

    // Check for duplicate ERP ID
    const existingErp = await User.findOne({ erpId: erpId.trim(), role: "student" });
    if (existingErp)
      return res.status(400).json({ error: "ERP ID already registered" });

    // ── Browser cooldown check (registration = auto-login) ──────────
    const browserId = sanitizeBrowserId(req.header("X-Browser-ID"));

    const hashed = await bcrypt.hash(password, 10);
    const student = await User.create({
      name,
      email,
      password: hashed,
      role: "student",
      course: course.trim(),
      specialization: (specialization || "").trim() || "None",
      section: section.trim().toUpperCase(),
      erpId: erpId.trim(),
      semester: String(semester).trim(),
    });

    // Check cooldown AFTER creating the user (we now have an ID to compare).
    // If cooldown blocks this new account, the account is still created but
    // the auto-login is denied. The student can login later after cooldown.
    if (browserId) {
      const cooldownResult = await checkCooldown(browserId, student._id.toString());
      if (!cooldownResult.allowed) {
        return res.status(429).json({
          error: "Account switching is temporarily restricted on this browser. Please try logging in after the cooldown period.",
          retryAfterSeconds: cooldownResult.retryAfterSeconds,
          cooldownActive: true,
        });
      }
      // Track this browser → account association
      await trackBrowserLogin(browserId, student._id.toString());
    }

    // Welcome email (non-blocking)
    void sendWelcomeEmail({ name: student.name, email: student.email, role: "student" })
      .catch((emailError) =>
        console.error("[Email] Student welcome email failed:", emailError.message)
      );

    // Generate JWT token for auto-login after signup
    const token = jwt.sign(
      { id: student._id, role: student.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.status(201).json({
      message: "Student registered successfully",
      token,
      student: {
        id: student._id,
        name: student.name,
        email: student.email,
        profilePhoto: student.profilePhoto,
        role: "student",
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const loginStudent = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log(`[Student Login] Attempt for email: ${email}`);

    if (!email || !password) {
      console.log(`[Student Login] Failed: Email or password missing`);
      return res.status(400).json({ error: "Email and password required" });
    }
      
    const student = await User.findOne({ email, role: "student" });
    console.log(`[Student Login] User exists: ${!!student}`);
    if (!student) return res.status(404).json({ error: "Student not found" });

    console.log(`[Student Login] Password hash exists: ${!!student.password}`);
    const isMatch = await bcrypt.compare(password, student.password);
    console.log(`[Student Login] bcrypt.compare() result: ${isMatch}`);
    if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });

    // ── Browser cooldown check ──────────────────────────────────────
    // AFTER credential validation — we don't reveal cooldown status to
    // unauthenticated/invalid requests.
    const browserId = sanitizeBrowserId(req.header("X-Browser-ID"));
    if (browserId) {
      const cooldownResult = await checkCooldown(browserId, student._id.toString());
      if (!cooldownResult.allowed) {
        console.log(
          `[Student Login] BLOCKED by browser cooldown. Browser: ${browserId.slice(0, 8)}... Retry after: ${cooldownResult.retryAfterSeconds}s`
        );
        return res.status(429).json({
          error: "Account switching is temporarily restricted on this browser. Please try again after the cooldown period.",
          retryAfterSeconds: cooldownResult.retryAfterSeconds,
          cooldownActive: true,
        });
      }
    }

    const token = jwt.sign(
      { id: student._id, role: student.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );
    console.log(`[Student Login] JWT generation success: ${!!token}`);

    // Track this browser → account association on successful login
    if (browserId) {
      await trackBrowserLogin(browserId, student._id.toString());
    }

    console.log(`[Student Login] Success: Sending final response`);
    res.status(200).json({
      message: "Student login successful",
      token,
      student: {
        id: student._id,
        name: student.name,
        email: student.email,
        profilePhoto: student.profilePhoto,
        role: "student",
      },
    });
  } catch (err) {
    console.error("Student Login Error:", err);
    res.status(500).json({
      error: "Server error during login",
      message: err.message,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined
    });
  }
};

export const logoutStudent = async (req, res) => {
  try {
    // ── Record browser cooldown on logout ────────────────────────────
    // req.user is populated by authMiddleware (JWT is validated server-side)
    const browserId = sanitizeBrowserId(req.header("X-Browser-ID"));
    const accountId = req.user?._id?.toString();

    if (browserId && accountId) {
      await recordCooldown(browserId, accountId);
      console.log(
        `[Student Logout] Cooldown recorded. Browser: ${browserId.slice(0, 8)}... Account: ${accountId}`
      );
    }

    res.status(200).json({ message: "Student logged out successfully" });
  } catch (err) {
    console.error("[Student Logout] Error recording cooldown:", err);
    // Still return success — logout should not fail from the user's perspective
    res.status(200).json({ message: "Student logged out successfully" });
  }
};
