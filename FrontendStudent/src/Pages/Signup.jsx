import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock, User, BookOpen, GraduationCap, Hash, Layers, Users, ChevronDown, Sparkles, BarChart3, Target, ArrowRight } from "lucide-react";
import axios from "axios";
import { persistAuth } from "../utils/authStorage";
import API_BASE_URL, { STUDENT_FRONTEND_URL, TEACHER_FRONTEND_URL, LANDING_PAGE_URL } from "../config";

// ── Course → Specialization mapping ──────────────────────────────
const COURSE_SPECIALIZATIONS = {
  "B.Tech": ["CSE", "IT", "Mechanical", "Civil", "Electrical", "Electronics", "AI & ML", "Data Science", "Cyber Security", "None"],
  "M.Tech": ["CSE", "IT", "Mechanical", "Civil", "Electrical", "Electronics", "AI & ML", "Data Science", "Cyber Security", "None"],
  "BCA": ["General", "Cloud Computing", "AI & ML", "Data Science", "Cyber Security", "None"],
  "MCA": ["General", "Cloud Computing", "AI & ML", "Data Science", "Cyber Security", "None"],
  "BBA": ["Marketing", "Finance", "HR", "International Business", "Operations", "None"],
  "MBA": ["Marketing", "Finance", "HR", "International Business", "Operations", "Business Analytics", "None"],
  "B.Sc": ["Physics", "Chemistry", "Mathematics", "Biology", "Computer Science","IT", "None"],
  "M.Sc": ["Physics", "Chemistry", "Mathematics", "Biology", "Computer Science", "None"],
  "B.Com": ["General", "Accounting", "Banking", "Taxation", "None"],
  "M.Com": ["General", "Accounting", "Banking", "Taxation", "None"],
  "BA": ["English", "Hindi", "Political Science", "History", "Psychology", "Economics", "None"],
  "MA": ["English", "Hindi", "Political Science", "History", "Psychology", "Economics", "None"],
  "B.Pharm": ["Pharmacy", "None"],
  "D.Pharm": ["Pharmacy", "None"],
  "LLB": ["Law", "None"],
  "B.Des": ["Fashion Design", "Interior Design", "Graphic Design", "Product Design", "None"],
  "B.Arch": ["Architecture", "None"],
  "MBBS": ["Medicine", "None"],
  "BDS": ["Dental Surgery", "None"],
  "B.Ed": ["Education", "None"],
  "Polytechnic": ["CSE", "Mechanical", "Civil", "Electrical", "Electronics", "None"],
};
const ALL_COURSES = Object.keys(COURSE_SPECIALIZATIONS);

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

export default function Signup() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [courseSearch, setCourseSearch] = useState("");
  const [showCourseDropdown, setShowCourseDropdown] = useState(false);
  const courseDropdownRef = useRef(null);
  const [formData, setFormData] = useState({
    fullName: "", email: "", password: "", confirmPassword: "",
    role: "student", course: "", specialization: "", section: "", erpId: "", semester: "",
  });

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (courseDropdownRef.current && !courseDropdownRef.current.contains(e.target)) setShowCourseDropdown(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredCourses = ALL_COURSES.filter((c) => c.toLowerCase().includes(courseSearch.toLowerCase()));
  const specializations = formData.course && COURSE_SPECIALIZATIONS[formData.course] ? COURSE_SPECIALIZATIONS[formData.course] : [];
  const handleCourseSelect = (course) => { setFormData({ ...formData, course, specialization: "" }); setCourseSearch(course); setShowCourseDropdown(false); };

  const handleSubmit = async (e) => {
    e.preventDefault(); setError("");
    if (!agreeTerms) { setError("Please accept Terms & Conditions to continue."); return; }
    if (formData.password !== formData.confirmPassword) { setError("Passwords do not match!"); return; }
    if (formData.role === "student") {
      if (!formData.course.trim()) { setError("Course is required for students"); return; }
      if (!formData.section.trim()) { setError("Section is required for students"); return; }
      if (!formData.erpId.trim()) { setError("ERP ID is required for students"); return; }
      if (!formData.semester.trim()) { setError("Semester is required for students"); return; }
    }
    setLoading(true);
    try {
      const endpoint = formData.role === "teacher" ? `${API_BASE_URL}/teacher/register` : `${API_BASE_URL}/student/register`;
      const payload = { name: formData.fullName, email: formData.email, password: formData.password };
      if (formData.role === "student") {
        payload.course = formData.course.trim(); payload.specialization = formData.specialization.trim() || "None";
        payload.section = formData.section.trim(); payload.erpId = formData.erpId.trim(); payload.semester = formData.semester.trim();
      }
      const response = await axios.post(endpoint, payload);
      const userData = { ...(response.data.student || response.data.teacher), role: formData.role };
      persistAuth(response.data.token, userData, true);
      const targetUrl = formData.role === "teacher" ? TEACHER_FRONTEND_URL : STUDENT_FRONTEND_URL;
      try { if (window.location.origin !== new URL(targetUrl).origin) { window.location.replace(targetUrl); return; } } catch (urlError) { console.error("URL parse error:", urlError); }
      navigate("/");
    } catch (err) {
      const backendMsg = err.response?.data?.error || "Registration failed. Please try again.";
      setError(err.response?.status === 409 || /exist/i.test(backendMsg) ? "Account already exists. Please login." : backendMsg);
    } finally { setLoading(false); }
  };

  const handleChange = (e) => { setFormData({ ...formData, [e.target.name]: e.target.value }); setError(""); };

  const inputCls = "auth-input w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm text-gray-800 placeholder-gray-400";
  const inputSmCls = "auth-input w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm text-gray-800 placeholder-gray-400";
  const labelCls = "block text-sm font-semibold text-gray-700 mb-2";
  const labelSmCls = "block text-sm font-semibold text-gray-700 mb-1.5";

  return (
    <>
      <style>{sharedCSS}</style>
      <div className="auth-page min-h-screen flex items-center justify-center p-4 md:px-8 md:py-10" style={{ background: 'linear-gradient(135deg, #f5f0ff 0%, #faf8ff 25%, #f0e8ff 50%, #faf5ff 75%, #f5f0ff 100%)' }}>

        {/* Background blobs — desktop only */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none hidden md:block">
          <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full pulse-glow" style={{ background: 'radial-gradient(circle, rgba(167,139,250,0.2) 0%, transparent 70%)' }} />
          <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] rounded-full pulse-glow" style={{ background: 'radial-gradient(circle, rgba(196,181,253,0.15) 0%, transparent 70%)', animationDelay: '1.5s' }} />
        </div>

        <div className="w-full max-w-[1100px] grid md:grid-cols-2 gap-6 lg:gap-10 items-start relative z-10 px-1 md:px-0">
          {/* ── Left Branding ── */}
          <div className="hidden md:flex flex-col slide-up">
            <div className="sticky top-8">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-14 h-14 flex items-center justify-center rounded-2xl overflow-hidden shadow-lg shadow-purple-200/50">
                  <img src="/logo02.png" alt="Logo" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">ADHYAN.AI</h1>
                  <p className="text-xs font-medium text-purple-500 tracking-widest uppercase">Student Portal</p>
                </div>
              </div>

              <div className="mb-8">
                <h2 className="text-3xl lg:text-4xl font-extrabold text-gray-900 leading-tight mb-3">
                  Start Your<br />
                  <span className="bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent">Journey!</span> 🚀
                </h2>
                <p className="text-gray-500 text-base leading-relaxed max-w-md">
                  Join thousands of students and teachers using AI-powered tools for smarter learning.
                </p>
              </div>

              <div className="rounded-[24px] p-6 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 40%, #5b21b6 100%)' }}>
                <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full float-slow" style={{ background: 'rgba(255,255,255,0.06)' }} />
                <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full float-medium" style={{ background: 'rgba(255,255,255,0.04)', animationDelay: '1s' }} />
                <h3 className="text-base font-bold text-white mb-4 relative z-10">Why Join ADHYAN.AI?</h3>
                <div className="space-y-3 relative z-10">
                  {[
                    { icon: <Sparkles className="w-5 h-5 text-purple-100" />, title: "AI-Powered Notes", desc: "Smart organization & summaries" },
                    { icon: <BarChart3 className="w-5 h-5 text-purple-100" />, title: "Progress Tracking", desc: "Monitor your learning journey" },
                    { icon: <Users className="w-5 h-5 text-purple-100" />, title: "Collaboration Tools", desc: "Work together with classmates" },
                    { icon: <Target className="w-5 h-5 text-purple-100" />, title: "Interactive Quizzes", desc: "Test your knowledge anytime" },
                  ].map((f, i) => (
                    <div key={i} className="feature-card rounded-2xl p-3.5 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.15)' }}>{f.icon}</div>
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
            <div className="glass-card rounded-[28px] shadow-xl shadow-purple-100/30 p-0 md:p-8">
              {/* Mobile logo */}
              <div className="md:hidden flex items-center justify-center gap-2 mb-4">
                <img src="/logo02.png" alt="Logo" className="w-9 h-9 object-contain" />
                <span className="text-lg font-extrabold text-gray-900 tracking-tight">ADHYAN.AI</span>
              </div>

              <div className="text-center mb-4 md:mb-6">
                <h2 className="text-[22px] md:text-[28px] font-extrabold text-gray-900 mb-1">Create Account</h2>
                <p className="text-[13px] md:text-sm text-gray-500">Sign up to get started with ADHYAN.AI</p>
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-xl text-sm font-medium flex items-center gap-2" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}>
                  <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/></svg>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3 md:space-y-4">
                <div>
                  <label className={labelCls}>Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-[18px] h-[18px]" />
                    <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} placeholder="Enter your full name" required className={inputCls} />
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-[18px] h-[18px]" />
                    <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="your@email.com" required className={inputCls} />
                  </div>
                </div>

                {/* Role */}
                <div>
                  <label className={labelCls}>I am a</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[{ role: "student", Icon: BookOpen, label: "Student" }, { role: "teacher", Icon: User, label: "Teacher" }].map(({ role, Icon, label }) => (
                      <button key={role} type="button"
                        onClick={() => setFormData({ ...formData, role, ...(role === "student" ? {} : { course: "", specialization: "", section: "", erpId: "", semester: "" }) })}
                        className={`p-3 border-2 rounded-xl transition-all cursor-pointer ${formData.role === role ? "border-purple-500 bg-purple-50/80" : "border-gray-200 hover:border-gray-300 bg-white"}`}>
                        <Icon className={`w-5 h-5 mx-auto mb-1 ${formData.role === role ? "text-purple-600" : "text-gray-400"}`} />
                        <span className={`text-sm font-semibold ${formData.role === role ? "text-purple-600" : "text-gray-500"}`}>{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Student fields */}
                {formData.role === "student" && (
                  <div className="space-y-3 p-4 rounded-xl" style={{ background: 'rgba(139,92,246,0.04)', border: '1px solid rgba(139,92,246,0.1)' }}>
                    <p className="text-xs font-bold text-purple-600 uppercase tracking-wider">Academic Details</p>
                    <div ref={courseDropdownRef} className="relative">
                      <label className={labelSmCls}>Course *</label>
                      <div className="relative">
                        <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-[18px] h-[18px]" />
                        <input type="text" value={courseSearch}
                          onChange={(e) => { setCourseSearch(e.target.value); setShowCourseDropdown(true); if (!e.target.value) setFormData({ ...formData, course: "", specialization: "" }); }}
                          onFocus={() => setShowCourseDropdown(true)} placeholder="Search course (e.g. B.Tech, BCA)" className={inputSmCls + " pr-10"} />
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      </div>
                      {showCourseDropdown && filteredCourses.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                          {filteredCourses.map((course) => (
                            <button key={course} type="button" onClick={() => handleCourseSelect(course)}
                              className={`w-full text-left px-4 py-2.5 text-sm hover:bg-purple-50 transition cursor-pointer ${formData.course === course ? "bg-purple-50 text-purple-700 font-semibold" : "text-gray-700"}`}>{course}</button>
                          ))}
                        </div>
                      )}
                    </div>
                    {formData.course && specializations.length > 0 && (
                      <div>
                        <label className={labelSmCls}>Specialization</label>
                        <div className="relative">
                          <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                          <select name="specialization" value={formData.specialization} onChange={handleChange} className={inputSmCls + " appearance-none bg-white"}>
                            <option value="">Select Specialization</option>
                            {specializations.map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelSmCls}>Section *</label>
                        <div className="relative">
                          <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                          <input type="text" name="section" value={formData.section} onChange={handleChange} placeholder="e.g. A" required className={inputSmCls + " uppercase"} />
                        </div>
                      </div>
                      <div>
                        <label className={labelSmCls}>Semester *</label>
                        <div className="relative">
                          <Layers className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                          <select name="semester" value={formData.semester} onChange={handleChange} required className={inputSmCls + " appearance-none bg-white"}>
                            <option value="">Select</option>
                            {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={String(s)}>Sem {s}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className={labelSmCls}>ERP / Roll Number *</label>
                      <div className="relative">
                        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-[18px] h-[18px]" />
                        <input type="text" name="erpId" value={formData.erpId} onChange={handleChange} placeholder="Enter your ERP / Roll No." required className={inputSmCls} />
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className={labelCls}>Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-[18px] h-[18px]" />
                    <input type={showPassword ? "text" : "password"} name="password" value={formData.password} onChange={handleChange} placeholder="Create a password" required className={inputCls + " pr-12"} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-purple-500 transition-colors p-0.5">
                      {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-[18px] h-[18px]" />
                    <input type={showConfirmPassword ? "text" : "password"} name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} placeholder="Confirm your password" required className={inputCls + " pr-12"} />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-purple-500 transition-colors p-0.5">
                      {showConfirmPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <input type="checkbox" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500 mt-0.5 cursor-pointer" />
                  <label className="text-sm text-gray-500">
                    I agree to the{" "}
                    <a href={`${LANDING_PAGE_URL}/terms`} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:text-purple-700 font-semibold">Terms of Service</a>{" "}and{" "}
                    <a href={`${LANDING_PAGE_URL}/privacy`} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:text-purple-700 font-semibold">Privacy Policy</a>
                  </label>
                </div>

                <button type="submit" disabled={loading} className="submit-btn w-full text-white py-3.5 rounded-xl font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2">
                  {loading ? (<><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Creating Account...</>) : (<>Create Account<ArrowRight className="w-4 h-4" /></>)}
                </button>
              </form>

              <div className="relative my-3 md:my-5">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
                <div className="relative flex justify-center"><span className="px-3 text-xs text-gray-400 uppercase tracking-wider" style={{ background: 'inherit' }}>or</span></div>
              </div>

              <p className="text-center text-sm text-gray-500">
                Already have an account?{" "}<Link to="/login" className="text-purple-600 hover:text-purple-700 font-bold transition-colors">Sign In</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}