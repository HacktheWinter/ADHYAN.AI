import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import User from "../models/User.js";
import Submission from "../models/Submission.js";
import { sendWelcomeEmail } from "../utils/emailNotifications.js";

dotenv.config();

export const registerStudent = async (req, res) => {
  try {
    const { name, email, password, course, section, erpId, semester } = req.body;
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

    const hashed = await bcrypt.hash(password, 10);
    const student = await User.create({
      name,
      email,
      password: hashed,
      role: "student",
      course: course.trim(),
      section: section.trim().toUpperCase(),
      erpId: erpId.trim(),
      semester: String(semester).trim(),
    });

    // Welcome email (non-blocking)
    void sendWelcomeEmail({ name: student.name, email: student.email, role: "student" })
      .catch((emailError) =>
        console.error("[Email] Student welcome email failed:", emailError.message)
      );

    res
      .status(201)
      .json({ message: "Student registered successfully", student });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const loginStudent = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "Email and password required" });
      
    const student = await User.findOne({ email, role: "student" });
    if (!student) return res.status(404).json({ error: "Student not found" });

    const isMatch = await bcrypt.compare(password, student.password);
    if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });

    const token = jwt.sign(
      { id: student._id, role: student.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

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
    res.status(500).json({ error: err.message });
  }
};

export const logoutStudent = async (req, res) => {
  res.status(200).json({ message: "Student logged out successfully" });
};
