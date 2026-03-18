import bcrypt from "bcryptjs";
import crypto from "crypto";
import User from "../models/User.js";
import { sendPasswordResetEmail } from "../utils/emailNotifications.js";

const PASSWORD_RESET_TTL_MINUTES = Number(
  process.env.PASSWORD_RESET_TTL_MINUTES || 30
);

const frontendBaseUrls = {
  teacher:
    process.env.TEACHER_URL ||
    process.env.TEACHER_FRONTEND_URL ||
    "https://adhyanai-teacher.onrender.com",
  student:
    process.env.STUDENT_URL ||
    process.env.STUDENT_FRONTEND_URL ||
    "https://adhyanai-student.onrender.com",
  principal:
    process.env.PRINCIPAL_URL ||
    process.env.PRINCIPAL_FRONTEND_URL ||
    "https://adhyanai-principal.onrender.com",
};

const genericSuccessResponse = {
  success: true,
  message:
    "If an account exists for that email, a password reset link has been sent.",
};

const createResetToken = () => crypto.randomBytes(32).toString("hex");

const hashResetToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const buildResetUrl = ({ role, token, email }) => {
  const baseUrl = String(frontendBaseUrls[role] || "").replace(/\/+$/, "");
  const params = new URLSearchParams({
    token,
    email,
  });

  return `${baseUrl}/#/reset-password?${params.toString()}`;
};

const requestPasswordReset = async (req, res, role) => {
  try {
    const email = req.body.email?.trim();
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const user = await User.findOne({ email, role }).select(
      "name email role +passwordResetToken +passwordResetExpiresAt"
    );

    if (!user) {
      return res.status(200).json(genericSuccessResponse);
    }

    const rawToken = createResetToken();
    const hashedToken = hashResetToken(rawToken);
    const expiresAt = new Date(
      Date.now() + PASSWORD_RESET_TTL_MINUTES * 60 * 1000
    );

    user.passwordResetToken = hashedToken;
    user.passwordResetExpiresAt = expiresAt;
    await user.save();

    const resetUrl = buildResetUrl({ role, token: rawToken, email: user.email });

    try {
      const result = await sendPasswordResetEmail({
        name: user.name,
        email: user.email,
        role,
        resetUrl,
        expiresInMinutes: PASSWORD_RESET_TTL_MINUTES,
      });

      if (result?.skipped) {
        user.passwordResetToken = null;
        user.passwordResetExpiresAt = null;
        await user.save();
        return res
          .status(500)
          .json({ error: "Email service is not configured for password resets." });
      }
    } catch (emailError) {
      user.passwordResetToken = null;
      user.passwordResetExpiresAt = null;
      await user.save();
      console.error(`[Password Reset] Email send failed for ${role}:`, emailError.message);
      return res
        .status(500)
        .json({ error: "Unable to send reset email. Please try again later." });
    }

    return res.status(200).json(genericSuccessResponse);
  } catch (error) {
    console.error(`[Password Reset] Request failed for ${role}:`, error.message);
    return res.status(500).json({ error: "Unable to process reset request." });
  }
};

const resetPassword = async (req, res, role) => {
  try {
    const email = req.body.email?.trim();
    const token = req.body.token?.trim();
    const password = req.body.password;

    if (!email || !token || !password) {
      return res
        .status(400)
        .json({ error: "Email, token, and new password are required" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: "New password must be at least 6 characters long" });
    }

    const hashedToken = hashResetToken(token);
    const user = await User.findOne({
      email,
      role,
      passwordResetToken: hashedToken,
      passwordResetExpiresAt: { $gt: new Date() },
    }).select("+password +passwordResetToken +passwordResetExpiresAt");

    if (!user) {
      return res.status(400).json({ error: "Invalid or expired reset link" });
    }

    user.password = await bcrypt.hash(password, 10);
    user.passwordResetToken = null;
    user.passwordResetExpiresAt = null;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password reset successful. You can now log in.",
    });
  } catch (error) {
    console.error(`[Password Reset] Reset failed for ${role}:`, error.message);
    return res.status(500).json({ error: "Unable to reset password." });
  }
};

export const requestTeacherPasswordReset = (req, res) =>
  requestPasswordReset(req, res, "teacher");

export const requestStudentPasswordReset = (req, res) =>
  requestPasswordReset(req, res, "student");

export const requestPrincipalPasswordReset = (req, res) =>
  requestPasswordReset(req, res, "principal");

export const resetTeacherPassword = (req, res) =>
  resetPassword(req, res, "teacher");

export const resetStudentPassword = (req, res) =>
  resetPassword(req, res, "student");

export const resetPrincipalPassword = (req, res) =>
  resetPassword(req, res, "principal");
