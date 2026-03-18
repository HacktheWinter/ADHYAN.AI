import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { sendWelcomeEmail } from "../utils/emailNotifications.js";

export const registerPrincipal = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ error: "Name, email, and password are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const principal = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "principal",
    });

    void sendWelcomeEmail({
      name: principal.name,
      email: principal.email,
      role: "principal",
    }).catch((emailError) =>
      console.error("[Email] Principal welcome email failed:", emailError.message)
    );

    res.status(201).json({
      message: "Principal registered successfully",
      principal: {
        id: principal._id,
        name: principal.name,
        email: principal.email,
        role: principal.role,
      },
    });
  } catch (error) {
    console.error("Principal Register Error:", error);
    res.status(500).json({ error: "Server error during principal registration" });
  }
};

export const loginPrincipal = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const principal = await User.findOne({ email, role: "principal" });
    if (!principal) {
      return res.status(404).json({ error: "Principal not found" });
    }

    const isMatch = await bcrypt.compare(password, principal.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: principal._id, role: principal.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.status(200).json({
      message: "Principal login successful",
      token,
      principal: {
        id: principal._id,
        name: principal.name,
        email: principal.email,
        profilePhoto: principal.profilePhoto,
        role: principal.role,
      },
    });
  } catch (error) {
    console.error("Principal Login Error:", error);
    res.status(500).json({ error: "Server error during principal login" });
  }
};

export const logoutPrincipal = async (_req, res) => {
  res.status(200).json({ message: "Principal logged out successfully" });
};
