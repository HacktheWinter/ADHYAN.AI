import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";
import axios from "axios";
import { clearAuth, persistAuth } from "../utils/authStorage";

export default function Login() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    role: "teacher",
  });
  const [rememberMe, setRememberMe] = useState(false);

  const TEACHER_URL =
    import.meta.env.VITE_TEACHER_URL || "http://localhost:5174";
  const STUDENT_URL =
    import.meta.env.VITE_STUDENT_URL || "http://localhost:5173";

  const handleRoleClick = (role) => {
    // If target origin is this origin, just toggle role locally
    const target = role === "student" ? STUDENT_URL : TEACHER_URL;
    try {
      const targetOrigin = new URL(target).origin;
      if (window.location.origin === targetOrigin) {
        setFormData((p) => ({ ...p, role }));
        return;
      }
    } catch {
      // fallthrough to redirect
    }

    // Clear local user on this origin to avoid loops and do a single redirect
    clearAuth();
    window.location.replace(target);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Call actual backend API based on role
      const endpoint =
        formData.role === "teacher"
          ? "http://localhost:5000/api/teacher/login"
          : "http://localhost:5000/api/student/login";

      const response = await axios.post(endpoint, {
        email: formData.email,
        password: formData.password,
      });

      // Store token and user data from backend response
      const userData = {
        ...(response.data.student || response.data.teacher),
        role: formData.role,
      };

      persistAuth(response.data.token, userData, rememberMe);

      // Check if need to redirect to different frontend
      const target = formData.role === "teacher" ? TEACHER_URL : STUDENT_URL;
      const targetOrigin = new URL(target).origin;

      if (window.location.origin !== targetOrigin) {
        window.location.replace(target);
        return;
      }

      navigate("/");
    } catch (err) {
      setError(err.response?.data?.error || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid md:grid-cols-2 gap-8 items-center">
        {/* Left Side - Branding */}
        <div className="hidden md:block">
          <div className="text-center space-y-6">
            <a
              href="https://adhyanai-5eum.onrender.com/"
              className="flex items-center justify-center space-x-1 mb-8"
            >
              <div className="w-16 flex items-center justify-center">
                <img src="/logo02.png" alt="Logo"  />
              </div>
              <h1 className="text-4xl font-bold text-gray-900">ADHYAN.AI</h1>
            </a>

            <div className="space-y-4">
              <h2 className="text-3xl font-bold text-gray-800">
                Welcome Back! 👋
              </h2>
              <p className="text-lg text-gray-600">
                Continue your learning journey with AI-powered note-taking and
                course management
              </p>
            </div>

            <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-3xl p-8 text-white shadow-xl">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <span className="text-2xl">📚</span>
                  </div>
                  <div className="text-left">
                    <p className="font-semibold">Smart Notes</p>
                    <p className="text-sm text-purple-100">
                      AI-powered organization
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <span className="text-2xl">🎯</span>
                  </div>
                  <div className="text-left">
                    <p className="font-semibold">Track Progress</p>
                    <p className="text-sm text-purple-100">
                      Monitor your learning
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <span className="text-2xl">💬</span>
                  </div>
                  <div className="text-left">
                    <p className="font-semibold">Collaborate</p>
                    <p className="text-sm text-purple-100">
                      Connect with classmates
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full">
          <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-10">
            <div className="md:hidden text-center mb-6">
              <a
                href="https://adhyanai-5eum.onrender.com/"
                className="flex items-center justify-center space-x-2 mb-4"
              >
                <div className="w-10 h-10 bg-purple-700 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <span className="text-2xl font-bold text-gray-900">
                  ADHYAN.AI
                </span>
              </a>
            </div>

            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Sign In</h2>
              <p className="text-gray-600">
                Enter your credentials to access your account
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Role Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Login as
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleRoleClick("student")}
                    className={`p-3 border-2 rounded-xl transition-all cursor-pointer ${
                      formData.role === "student"
                        ? "border-purple-600 bg-purple-50 text-purple-600"
                        : "border-gray-300 hover:border-gray-400 text-gray-600"
                    }`}
                  >
                    <span className="text-sm font-medium">Student</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRoleClick("teacher")}
                    className={`p-3 border-2 rounded-xl transition-all cursor-pointer ${
                      formData.role === "teacher"
                        ? "border-purple-600 bg-purple-50 text-purple-600"
                        : "border-gray-300 hover:border-gray-400 text-gray-600"
                    }`}
                  >
                    <span className="text-sm font-medium">Teacher</span>
                  </button>
                </div>
              </div>

              {/* Email Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Enter your email"
                    required
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter your password"
                    required
                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500 cursor-pointer"
                  />
                  <span className="ml-2 text-sm text-gray-600">
                    Remember me
                  </span>
                </label>
                <Link
                  to="/forgot-password"
                  className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                >
                  Forgot Password?
                </Link>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white py-3 rounded-xl font-semibold hover:from-purple-700 hover:to-purple-800 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>

            {/* Sign Up Link */}
            <p className="text-center text-gray-600 mt-6">
              Don't have an account?{" "}
              <Link
                to="/signup"
                className="text-purple-600 hover:text-purple-700 font-semibold"
              >
                Sign Up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
