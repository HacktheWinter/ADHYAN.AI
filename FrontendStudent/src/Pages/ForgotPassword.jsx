import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";
import axios from "axios";
import API_BASE_URL, { STUDENT_FRONTEND_URL, TEACHER_FRONTEND_URL } from "../config";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("student");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const TEACHER_URL = `${TEACHER_FRONTEND_URL}/forgot-password`;
  const STUDENT_URL = `${STUDENT_FRONTEND_URL}/forgot-password`;

  const handleRoleClick = (selectedRole) => {
    const target = selectedRole === "student" ? STUDENT_URL : TEACHER_URL;
    try {
      const targetOrigin = new URL(target).origin;
      if (window.location.origin === targetOrigin) {
        setRole(selectedRole);
        return;
      }
    } catch {}

    window.location.replace(target);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      const endpoint = `${API_BASE_URL}/${role}/forgot-password`;
      
      await axios.post(endpoint, { email });
      
      setSuccess(true);
      setEmail("");
    } catch (err) {
      setError(
        err.response?.data?.error || 
        "Failed to send email. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-10">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center space-x-2 mb-6">
              <div className="w-12 h-12 bg-purple-700 rounded-xl flex items-center justify-center">
                <svg
                  className="w-7 h-7 text-white"
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
            </div>
            
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Forgot Password?
            </h2>
            <p className="text-gray-600">
              Enter your email and we'll send you your password
            </p>
          </div>

          {/* Success Message */}
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-green-800">
                    Email sent successfully!
                  </p>
                  <p className="text-sm text-green-700 mt-1">
                    Please check your inbox for your password.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Role Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Account Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleRoleClick("student")}
                  className={`p-3 border-2 rounded-xl transition-all ${
                    role === "student"
                      ? "border-purple-600 bg-purple-50 text-purple-600"
                      : "border-gray-300 hover:border-gray-400 text-gray-600"
                  }`}
                >
                  <span className="text-sm font-medium">Student</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleRoleClick("teacher")}
                  className={`p-3 border-2 rounded-xl transition-all ${
                    role === "teacher"
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white py-3 rounded-xl font-semibold hover:from-purple-700 hover:to-purple-800 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Sending..." : "Send Password"}
            </button>
          </form>

          {/* Back to Login */}
          <Link
            to="/login"
            className="flex items-center justify-center space-x-2 text-purple-600 hover:text-purple-700 font-medium mt-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Login</span>
          </Link>
        </div>

        {/* Additional Help */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-600">
            Still having trouble?{" "}
            <a
              href="mailto:support@adhyan.ai"
              className="text-purple-600 hover:text-purple-700 font-medium"
            >
              Contact Support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}