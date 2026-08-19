import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock, Sparkles, BarChart3, Users, ArrowRight } from "lucide-react";
import axios from "axios";
import { clearAuth, persistAuth } from "../utils/authStorage";
import API_BASE_URL, {
  LANDING_PAGE_URL,
  STUDENT_FRONTEND_URL,
  TEACHER_FRONTEND_URL,
} from "../config";

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

  const TEACHER_URL = TEACHER_FRONTEND_URL;
  const STUDENT_URL = STUDENT_FRONTEND_URL;

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
          ? `${API_BASE_URL}/teacher/login`
          : `${API_BASE_URL}/student/login`;

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
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

        .auth-page { font-family: 'Inter', system-ui, sans-serif; }

        @keyframes float-slow {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(3deg); }
        }
        @keyframes float-medium {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-14px) rotate(-2deg); }
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.05); }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .float-slow { animation: float-slow 6s ease-in-out infinite; }
        .float-medium { animation: float-medium 4.5s ease-in-out infinite; }
        .pulse-glow { animation: pulse-glow 3s ease-in-out infinite; }
        .slide-up { animation: slide-up 0.6s ease-out forwards; }
        .fade-in { animation: fade-in 0.8s ease-out forwards; }

        .feature-card {
          backdrop-filter: blur(12px);
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.12);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .feature-card:hover {
          background: rgba(255, 255, 255, 0.15);
          border-color: rgba(255, 255, 255, 0.25);
          transform: translateX(4px);
        }

        .auth-input {
          transition: all 0.25s ease;
          background: #fafafe;
        }
        .auth-input:focus {
          background: #fff;
          box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.12), 0 2px 8px rgba(124, 58, 237, 0.06);
        }

        .submit-btn {
          background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 50%, #5b21b6 100%);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }
        .submit-btn::before {
          content: '';
          position: absolute;
          top: 0; left: -100%; width: 100%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
          transition: left 0.5s;
        }
        .submit-btn:hover::before { left: 100%; }
        .submit-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 25px -5px rgba(124, 58, 237, 0.45); }
        .submit-btn:active { transform: translateY(0); }

        .glass-card {
          background: rgba(255, 255, 255, 0.92);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.6);
        }
      `}</style>

      <div className="auth-page min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #f5f0ff 0%, #faf8ff 25%, #f0e8ff 50%, #faf5ff 75%, #f5f0ff 100%)' }}>
        {/* Decorative background blobs */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full pulse-glow" style={{ background: 'radial-gradient(circle, rgba(167,139,250,0.2) 0%, transparent 70%)' }} />
          <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] rounded-full pulse-glow" style={{ background: 'radial-gradient(circle, rgba(196,181,253,0.15) 0%, transparent 70%)', animationDelay: '1.5s' }} />
          <div className="absolute top-1/3 right-1/4 w-64 h-64 rounded-full pulse-glow" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)', animationDelay: '0.8s' }} />
        </div>

        <div className="w-full max-w-[1100px] grid md:grid-cols-2 gap-6 lg:gap-10 items-center relative z-10">
          {/* Left Side - Branding Panel */}
          <div className="hidden md:flex flex-col slide-up">
            <div className="sticky top-8">
              {/* Logo & Title */}
              <a href={LANDING_PAGE_URL} className="flex items-center gap-3 mb-8 group">
                <div className="w-14 h-14 flex items-center justify-center rounded-2xl overflow-hidden shadow-lg shadow-purple-200/50 group-hover:shadow-purple-300/60 transition-shadow duration-300">
                  <img src="/logo02.png" alt="ADHYAN.AI Logo" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">ADHYAN.AI</h1>
                  <p className="text-xs font-medium text-purple-500 tracking-widest uppercase">Learning Platform</p>
                </div>
              </a>

              {/* Welcome text */}
              <div className="mb-8">
                <h2 className="text-3xl lg:text-4xl font-extrabold text-gray-900 leading-tight mb-3">
                  Welcome back,<br />
                  <span className="bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent">Educator!</span> 👋
                </h2>
                <p className="text-gray-500 text-base leading-relaxed max-w-md">
                  Continue shaping minds with AI-powered tools for note generation, quiz creation, and course management.
                </p>
              </div>

              {/* Feature Cards */}
              <div className="rounded-[24px] p-6 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 40%, #5b21b6 100%)' }}>
                {/* Decorative circles */}
                <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full float-slow" style={{ background: 'rgba(255,255,255,0.06)' }} />
                <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full float-medium" style={{ background: 'rgba(255,255,255,0.04)', animationDelay: '1s' }} />

                <div className="space-y-3 relative z-10">
                  <div className="feature-card rounded-2xl p-4 flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.15)' }}>
                      <Sparkles className="w-5 h-5 text-purple-100" />
                    </div>
                    <div>
                      <p className="font-semibold text-white text-sm">AI-Powered Notes</p>
                      <p className="text-xs text-purple-200/80 mt-0.5">Auto-generate & organize content</p>
                    </div>
                  </div>

                  <div className="feature-card rounded-2xl p-4 flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.15)' }}>
                      <BarChart3 className="w-5 h-5 text-purple-100" />
                    </div>
                    <div>
                      <p className="font-semibold text-white text-sm">Progress Tracking</p>
                      <p className="text-xs text-purple-200/80 mt-0.5">Monitor student performance</p>
                    </div>
                  </div>

                  <div className="feature-card rounded-2xl p-4 flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.15)' }}>
                      <Users className="w-5 h-5 text-purple-100" />
                    </div>
                    <div>
                      <p className="font-semibold text-white text-sm">Collaboration Hub</p>
                      <p className="text-xs text-purple-200/80 mt-0.5">Connect with your students</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Login Form */}
          <div className="w-full fade-in" style={{ animationDelay: '0.2s' }}>
            <div className="glass-card rounded-[28px] shadow-xl shadow-purple-100/30 p-7 md:p-9">
              {/* Mobile Logo */}
              <div className="md:hidden text-center mb-6">
                <a href={LANDING_PAGE_URL} className="inline-flex items-center gap-2.5 mb-2">
                  <img src="/logo02.png" alt="ADHYAN.AI Logo" className="w-10 h-10 object-contain" />
                  <span className="text-xl font-extrabold text-gray-900 tracking-tight">ADHYAN.AI</span>
                </a>
              </div>

              <div className="text-center mb-7">
                <h2 className="text-2xl md:text-[28px] font-extrabold text-gray-900 mb-1.5">Sign In</h2>
                <p className="text-sm text-gray-500">Enter your credentials to access your account</p>
              </div>

              {error && (
                <div className="mb-5 p-3.5 rounded-xl text-sm font-medium flex items-center gap-2" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}>
                  <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/></svg>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Email */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-[18px] h-[18px]" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="your@email.com"
                      required
                      className="auth-input w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm text-gray-800 placeholder-gray-400"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-[18px] h-[18px]" />
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Enter your password"
                      required
                      className="auth-input w-full pl-11 pr-12 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm text-gray-800 placeholder-gray-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-purple-500 transition-colors p-0.5"
                    >
                      {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                    </button>
                  </div>
                </div>

                {/* Remember & Forgot */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500 cursor-pointer"
                    />
                    <span className="text-sm text-gray-500 group-hover:text-gray-700 transition-colors">Remember me</span>
                  </label>
                  <Link to="/forgot-password" className="text-sm text-purple-600 hover:text-purple-700 font-semibold transition-colors">
                    Forgot Password?
                  </Link>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="submit-btn w-full text-white py-3.5 rounded-xl font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign In
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
                <div className="relative flex justify-center"><span className="bg-white px-3 text-xs text-gray-400 uppercase tracking-wider">or</span></div>
              </div>

              {/* Sign Up Link */}
              <p className="text-center text-sm text-gray-500">
                Don't have an account?{" "}
                <Link to="/signup" className="text-purple-600 hover:text-purple-700 font-bold transition-colors">
                  Create Account
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
