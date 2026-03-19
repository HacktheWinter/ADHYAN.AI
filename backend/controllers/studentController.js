import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import User from "../models/User.js";
import Submission from "../models/Submission.js";
import { sendWelcomeEmail } from "../utils/emailNotifications.js";

dotenv.config();

export const registerStudent = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: "All fields are required" });

    const existing = await User.findOne({ email });
    if (existing)
      return res.status(400).json({ error: "Email already exists" });

    const hashed = await bcrypt.hash(password, 10);
    const student = await User.create({
      name,
      email,
      password: hashed,
      role: "student",
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
    const { email, password, deviceId } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "Email and password required" });
      
    if (!deviceId)
      return res.status(400).json({ error: "Device identification is missing. Please clear site data and try again." });

    const student = await User.findOne({ email, role: "student" });
    if (!student) return res.status(404).json({ error: "Student not found" });

    const isMatch = await bcrypt.compare(password, student.password);
    if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });

    // Determine device type from User-Agent
    const userAgent = req.headers["user-agent"] || "";
    const isMobile = /Mobile|Android|iP(ad|hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/i.test(userAgent);
    const deviceType = isMobile ? "mobile" : "desktop";

    // Strict Device Slot Binding Logic
    if (student.boundDevices[deviceType] === deviceId) {
      // Already bound to this exact device, allow login
    } else if (!student.boundDevices[deviceType]) {
      // Slot is empty, bind it!
      student.boundDevices[deviceType] = deviceId;
      await student.save();
    } else {
      // Slot is occupied by another device
      return res.status(403).json({ 
        error: `Proxy login attempt detected: You have already registered a ${deviceType} device. You cannot log in from a second ${deviceType}.` 
      });
    }

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
