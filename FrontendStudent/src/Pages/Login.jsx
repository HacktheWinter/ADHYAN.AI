import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock, Sparkles, BarChart3, Users, ArrowRight, ShieldAlert } from "lucide-react";
import axios from "axios";
import { clearAuth, persistAuth, getBrowserId } from "../utils/authStorage";
import API_BASE_URL, {
  LANDING_PAGE_URL,
  STUDENT_FRONTEND_URL,
  TEACHER_FRONTEND_URL,
} from "../config";

/* ─── shared styles ─── */
const sharedCSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
.auth-page{font-family:'Inter',system-ui,sans-serif}
@keyframes float-slow{0%,100%{transform:translateY(0) rotate(0)}50%{transform:translateY(-20px) rotate(3deg)}}
@keyframes float-medium{0%,100%{transform:translateY(0) rotate(0)}50%{transform:translateY(-14px) rotate(-2deg)}}
@keyframes pulse-glow{0%,100%{opacity:.4;transform:scale(1)}50%{opacity:.7;transform:scale(1.05)}}
@keyframes slide-up{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
@keyframes fade-in{from{opacity:0}to{opacity:1}}
.float-slow{animation:float-slow 6s ease-in-out infinite}
.float-medium{animation:float-medium 4.5s ease-in-out infinite}
.pulse-glow{animation:pulse-glow 3s ease-in-out infinite}
.slide-up{animation:slide-up .6s ease-out forwards}
.fade-in{animation:fade-in .8s ease-out forwards}
.feature-card{backdrop-filter:blur(12px);background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);transition:all .3s cubic-bezier(.4,0,.2,1)}
.feature-card:hover{background:rgba(255,255,255,.15);border-color:rgba(255,255,255,.25);transform:translateX(4px)}
.auth-input{transition:all .25s ease;background:#fafafe}
.auth-input:focus{background:#fff;box-shadow:0 0 0 3px rgba(124,58,237,.12),0 2px 8px rgba(124,58,237,.06)}
.submit-btn{background:linear-gradient(135deg,#7c3aed 0%,#6d28d9 50%,#5b21b6 100%);transition:all .3s cubic-bezier(.4,0,.2,1);position:relative;overflow:hidden}
.submit-btn::before{content:'';position:absolute;top:0;left:-100%;width:100%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.15),transparent);transition:left .5s}
.submit-btn:hover::before{left:100%}
.submit-btn:hover{transform:translateY(-2px);box-shadow:0 8px 25px -5px rgba(124,58,237,.45)}
.submit-btn:active{transform:translateY(0)}
.glass-card{background:rgba(255,255,255,.92);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.6)}
@media(max-width:767px){
  .glass-card{background:transparent;backdrop-filter:none;border:none;box-shadow:none !important;border-radius:0 !important}
  .auth-page{background:#fff !important}
}
`;

export default function Login() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({ email: "", password: "", role: "student" });
  const [rememberMe, setRememberMe] = useState(false);

  // ── Cooldown state ──
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const cooldownTimerRef = useRef(null);

  // Countdown timer
  useEffect(() => {
    if (cooldownSeconds <= 0) {
      if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
      return;
    }
    cooldownTimerRef.current = setInterval(() => {
      setCooldownSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownTimerRef.current);
          setError("");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(cooldownTimerRef.current);
  }, [cooldownSeconds > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  const formatCooldown = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const handleRoleClick = (role) => { setFormData((p) => ({ ...p, role })); };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const browserId = getBrowserId();
      const endpoint = formData.role === "teacher" ? `${API_BASE_URL}/teacher/login` : `${API_BASE_URL}/student/login`;
      const response = await axios.post(
        endpoint,
        { email: formData.email, password: formData.password },
        { headers: { "X-Browser-ID": browserId } }
      );
      const userData = { ...(response.data.student || response.data.teacher), role: formData.role };
      persistAuth(response.data.token, userData, rememberMe);
      const targetUrl = formData.role === "teacher" ? TEACHER_FRONTEND_URL : STUDENT_FRONTEND_URL;
      try {
        if (window.location.origin !== new URL(targetUrl).origin) { window.location.replace(targetUrl); return; }
      } catch (urlError) { console.error("URL parse error:", urlError); }
      navigate("/");
    } catch (err) {
      const data = err.response?.data;
      if (data?.cooldownActive && data?.retryAfterSeconds) {
        setCooldownSeconds(data.retryAfterSeconds);
        setError(data.error || "Account switching is temporarily restricted on this browser.");
      } else {
        setError(data?.error || "Invalid email or password");
      }
    } finally { setLoading(false); };
  };

  return (
    <>
      <style>{sharedCSS}</style>
      <div className="auth-page min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #f5f0ff 0%, #faf8ff 25%, #f0e8ff 50%, #faf5ff 75%, #f5f0ff 100%)' }}>

        {/* Background blobs — desktop only */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none hidden md:block">
          <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full pulse-glow" style={{ background: 'radial-gradient(circle, rgba(167,139,250,0.2) 0%, transparent 70%)' }} />
          <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] rounded-full pulse-glow" style={{ background: 'radial-gradient(circle, rgba(196,181,253,0.15) 0%, transparent 70%)', animationDelay: '1.5s' }} />
          <div className="absolute top-1/3 right-1/4 w-64 h-64 rounded-full pulse-glow" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)', animationDelay: '0.8s' }} />
        </div>

        <div className="w-full max-w-[1100px] grid md:grid-cols-2 gap-6 lg:gap-10 items-center relative z-10 px-1 md:px-0">
          {/* ── Left Branding ── */}
          <div className="hidden md:flex flex-col slide-up">
            <div className="sticky top-8">
              <a href={LANDING_PAGE_URL} className="flex items-center gap-3 mb-8 group">
                <div className="w-14 h-14 flex items-center justify-center rounded-2xl overflow-hidden shadow-lg shadow-purple-200/50 group-hover:shadow-purple-300/60 transition-shadow duration-300">
                  <img src="/logo02.png" alt="ADHYAN.AI Logo" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">ADHYAN.AI</h1>
                  <p className="text-xs font-medium text-purple-500 tracking-widest uppercase">Student Portal</p>
                </div>
              </a>

              <div className="mb-8">
                <h2 className="text-3xl lg:text-4xl font-extrabold text-gray-900 leading-tight mb-3">
                  Welcome back,<br />
                  <span className="bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent">Student!</span> 👋
                </h2>
                <p className="text-gray-500 text-base leading-relaxed max-w-md">
                  Continue your learning journey with AI-powered note-taking, quizzes, and course management.
                </p>
              </div>

              <div className="rounded-[24px] p-6 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 40%, #5b21b6 100%)' }}>
                <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full float-slow" style={{ background: 'rgba(255,255,255,0.06)' }} />
                <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full float-medium" style={{ background: 'rgba(255,255,255,0.04)', animationDelay: '1s' }} />
                <div className="space-y-3 relative z-10">
                  {[
                    { icon: <Sparkles className="w-5 h-5 text-purple-100" />, title: "Smart Notes", desc: "AI-powered organization" },
                    { icon: <BarChart3 className="w-5 h-5 text-purple-100" />, title: "Track Progress", desc: "Monitor your learning" },
                    { icon: <Users className="w-5 h-5 text-purple-100" />, title: "Collaborate", desc: "Connect with classmates" },
                  ].map((f, i) => (
                    <div key={i} className="feature-card rounded-2xl p-4 flex items-center gap-4">
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.15)' }}>{f.icon}</div>
                      <div>
                        <p className="font-semibold text-white text-sm">{f.title}</p>
                        <p className="text-xs text-purple-200/80 mt-0.5">{f.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── Right Form ── */}
          <div className="w-full fade-in" style={{ animationDelay: '0.2s' }}>
            <div className="glass-card rounded-[28px] shadow-xl shadow-purple-100/30 p-0 md:p-9">
              {/* Mobile logo */}
              <div className="md:hidden flex items-center justify-center gap-2 mb-5">
                <a href={LANDING_PAGE_URL} className="inline-flex items-center gap-2">
                  <img src="/logo02.png" alt="Logo" className="w-9 h-9 object-contain" />
                  <span className="text-lg font-extrabold text-gray-900 tracking-tight">ADHYAN.AI</span>
                </a>
              </div>

              <div className="text-center mb-5 md:mb-7">
                <h2 className="text-[22px] md:text-[28px] font-extrabold text-gray-900 mb-1">Sign In</h2>
                <p className="text-[13px] md:text-sm text-gray-500">Enter your credentials to access your account</p>
              </div>

              {cooldownSeconds > 0 && (
                <div className="mb-5 p-4 rounded-xl text-sm" style={{ background: 'linear-gradient(135deg, #fef3c7 0%, #fef9c3 100%)', border: '1px solid #fbbf24' }}>
                  <div className="flex items-center gap-2.5 mb-2">
                    <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0" />
                    <span className="font-bold text-amber-800">Account Switching Restricted</span>
                  </div>
                  <p className="text-amber-700 text-xs leading-relaxed mb-3">
                    For attendance security, switching to a different account is temporarily restricted after logout. You can still log back into your own account.
                  </p>
                  <div className="flex items-center justify-center gap-2 bg-amber-100 rounded-lg py-2 px-3">
                    <span className="text-amber-800 text-xs font-medium">Try again in</span>
                    <span className="text-amber-900 font-mono font-bold text-lg">{formatCooldown(cooldownSeconds)}</span>
                  </div>
                </div>
              )}

              {error && cooldownSeconds <= 0 && (
                <div className="mb-5 p-3.5 rounded-xl text-sm font-medium flex items-center gap-2" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}>
                  <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/></svg>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4 md:space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-[18px] h-[18px]" />
                    <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="your@email.com" required className="auth-input w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm text-gray-800 placeholder-gray-400" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-[18px] h-[18px]" />
                    <input type={showPassword ? "text" : "password"} name="password" value={formData.password} onChange={handleChange} placeholder="Enter your password" required className="auth-input w-full pl-11 pr-12 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm text-gray-800 placeholder-gray-400" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-purple-500 transition-colors p-0.5">
                      {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500 cursor-pointer" />
                    <span className="text-sm text-gray-500 group-hover:text-gray-700 transition-colors">Remember me</span>
                  </label>
                  <Link to="/forgot-password" className="text-sm text-purple-600 hover:text-purple-700 font-semibold transition-colors">Forgot Password?</Link>
                </div>

                <button type="submit" disabled={loading} className="submit-btn w-full text-white py-3.5 rounded-xl font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2">
                  {loading ? (<><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Signing in...</>) : (<>Sign In<ArrowRight className="w-4 h-4" /></>)}
                </button>
              </form>

              <div className="relative my-4 md:my-6">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
                <div className="relative flex justify-center"><span className="px-3 text-xs text-gray-400 uppercase tracking-wider" style={{ background: 'inherit' }}>or</span></div>
              </div>

              <p className="text-center text-sm text-gray-500">
                Don't have an account?{" "}
                <Link to="/signup" className="text-purple-600 hover:text-purple-700 font-bold transition-colors">Create Account</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
