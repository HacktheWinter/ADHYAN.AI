import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Navbar from '../components/Landing/Navbar';
import Footer from '../components/Landing/Footer';
import { Lock, Eye, Database, Server, Fingerprint, Share2, Mail, ShieldCheck, CheckCircle2, ChevronRight } from 'lucide-react';

const PrivacyPage = () => {
  const lastUpdated = "August 2026";
  const [activeSection, setActiveSection] = useState("collection");

  const sections = [
    {
      id: "collection",
      icon: <Database className="w-5 h-5 text-indigo-600" />,
      title: "1. Information We Collect",
      summary: "Registration credentials and examination telemetry.",
      content: "We collect information you provide directly to us (such as name, email, ERP/Roll number, course, and section) when you register for an account. We also automatically collect assessment data, including code submissions, multiple-choice answers, and proctoring telemetry (e.g., tab switching activity, full-screen exits) during active exams.",
      highlights: [
        "Account info: Name, email, institutional roll number",
        "Assessment submissions: Quizzes, code files, and homework",
        "Examination telemetry: Tab-switch frequency and browser events"
      ]
    },
    {
      id: "usage",
      icon: <Eye className="w-5 h-5 text-purple-600" />,
      title: "2. How We Use Your Data",
      summary: "Service delivery, AI grading, and student analytics.",
      content: "Your data is used strictly to provide and improve the ADHYAN.AI educational services. This includes authenticating users, auto-grading assessments, generating AI-powered study notes, and providing teachers with analytics regarding student performance and examination integrity.",
      highlights: [
        "Automated semantic evaluation of tests",
        "Teacher gradebook reports and class progress analytics",
        "Platform security and fraud prevention"
      ]
    },
    {
      id: "sharing",
      icon: <Share2 className="w-5 h-5 text-blue-600" />,
      title: "3. Information Sharing",
      summary: "Zero monetization of student data.",
      content: "We do not sell, rent, or monetize your personal data. Student data (including assessment scores and proctoring violations) is shared exclusively with the verified educators and institutional administrators associated with your enrolled courses. We may also share anonymized, aggregated data for research or platform improvement purposes.",
      highlights: [
        "Never sold to third-party ad networks",
        "Shared only with your enrolled institution and professors",
        "Aggregated benchmarking is strictly anonymized"
      ]
    },
    {
      id: "security",
      icon: <Lock className="w-5 h-5 text-emerald-600" />,
      title: "4. Data Security",
      summary: "256-bit encryption and secure JWT tokens.",
      content: "We implement industry-standard security measures, including bcrypt password hashing, secure JWT authentication, and encrypted data transmission (HTTPS/WSS) to protect your personal information against unauthorized access, alteration, or destruction.",
      highlights: [
        "End-to-end TLS 1.3 encrypted communications",
        "Bcrypt salted hashing for all user passwords",
        "Strict role-based access control (RBAC)"
      ]
    },
    {
      id: "retention",
      icon: <Server className="w-5 h-5 text-rose-600" />,
      title: "5. Data Retention & Deletion",
      summary: "User rights and institutional compliance.",
      content: "We retain your academic data for as long as your account is active or as required by your educational institution. You may request the deletion of your account at any time. However, institutions may require us to maintain records of completed assessments and proctoring logs for academic compliance.",
      highlights: [
        "Right to export personal data records",
        "Account deletion honored within 30 days upon request",
        "Exam audit logs archived per institutional governance"
      ]
    },
    {
      id: "ai",
      icon: <Fingerprint className="w-5 h-5 text-amber-600" />,
      title: "6. AI Processing & Governance",
      summary: "Safe inference with zero model training on student PII.",
      content: "Certain features of ADHYAN.AI utilize advanced Large Language Models (such as Google Gemini) for generating study materials and evaluating code. When you interact with these features, relevant prompts and inputs are processed securely. We do not use your personal identifiable information (PII) to train foundational AI models.",
      highlights: [
        "Enterprise API tier with strict data privacy guarantees",
        "Zero student PII used for foundational model retraining",
        "Transparent rubric-based AI scoring explanations"
      ]
    }
  ];

  // Scroll-spy: Automatically highlight left side contents menu as user scrolls
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 200;
      for (const section of sections) {
        const el = document.getElementById(section.id);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPosition >= top && scrollPosition < top + height) {
            setActiveSection(section.id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (e, id) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      const offset = 100;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = el.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
      setActiveSection(id);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <Navbar />

      {/* Header Section */}
      <div className="bg-gradient-to-br from-gray-950 via-indigo-950 to-purple-950 text-white pt-32 pb-20 sm:pt-36 sm:pb-24 relative overflow-hidden border-b border-gray-800">
        
        {/* Background glow orbs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          
          <div className="flex justify-center mb-6">
            <div className="p-3.5 bg-indigo-500/10 rounded-2xl border border-indigo-400/30 shadow-lg shadow-indigo-500/10">
              <Lock className="w-8 h-8 text-indigo-400" />
            </div>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-4 text-white">
            Privacy{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-indigo-300 to-cyan-400">
              Policy
            </span>
          </h1>

          <p className="text-base sm:text-lg text-gray-300 max-w-2xl mx-auto leading-relaxed">
            Your privacy and data sovereignty are fundamental. Learn how we protect student, teacher, and institutional data across our AI ecosystem.
          </p>

          <div className="mt-6 flex items-center justify-center gap-4 text-xs font-mono text-indigo-300">
            <span className="px-3 py-1 rounded-full bg-indigo-950/80 border border-indigo-800">
              Effective: {lastUpdated}
            </span>
            <span className="px-3 py-1 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-800 flex items-center gap-1">
              <ShieldCheck size={13} /> 256-Bit Encrypted
            </span>
          </div>
        </div>
      </div>

      {/* Main Legal Content Container */}
      <main className="flex-grow max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full">
        <div className="grid lg:grid-cols-12 gap-10">
          
          {/* Desktop Sticky Table of Contents (Left 4 cols) */}
          <div className="hidden lg:block lg:col-span-4">
            <div className="sticky top-28 p-6 rounded-3xl bg-white border border-gray-200/90 shadow-sm space-y-2">
              <div className="text-xs font-bold font-mono uppercase tracking-wider text-gray-400 mb-4 px-3">
                Contents
              </div>
              {sections.map((section) => {
                const isActive = activeSection === section.id;
                return (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    onClick={(e) => scrollToSection(e, section.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl text-xs font-bold transition-all duration-200 ${
                      isActive
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-500/25 translate-x-1'
                        : 'text-gray-600 hover:bg-purple-50/60 hover:text-purple-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <div className={`p-1 rounded-lg ${isActive ? 'bg-white/20 text-white' : ''}`}>
                        {section.icon}
                      </div>
                      <span className="truncate">{section.title}</span>
                    </div>
                    <ChevronRight size={14} className={isActive ? 'text-white' : 'text-gray-400'} />
                  </a>
                );
              })}

              <div className="pt-4 mt-4 border-t border-gray-100">
                <a
                  href="mailto:adhyan.ai.73@gmail.com"
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gray-900 text-white text-xs font-bold hover:bg-purple-600 transition-colors shadow-sm"
                >
                  <Mail size={14} />
                  <span>Privacy Inquiries</span>
                </a>
              </div>
            </div>
          </div>

          {/* Legal Clauses (Right 8 cols) */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Overview Intro Card */}
            <div className="p-7 sm:p-8 rounded-3xl bg-white border border-gray-200/90 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-3">Overview & Commitment</h2>
              <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
                At <span className="font-semibold text-gray-900">ADHYAN.AI</span>, we are committed to transparent, privacy-first educational technology. This Privacy Policy details the information we collect, how it empowers student learning and teacher productivity, and the strict safeguards protecting your academic records.
              </p>
            </div>

            {/* Individual Structured Sections */}
            {sections.map((section) => (
              <motion.div
                key={section.id}
                id={section.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                className="scroll-mt-28 p-7 sm:p-8 rounded-3xl bg-white border border-gray-200/90 shadow-sm hover:shadow-md transition-all group"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="p-3 rounded-2xl bg-gray-50 border border-gray-200/80 group-hover:scale-105 group-hover:bg-purple-50 group-hover:border-purple-200 transition-all shrink-0">
                    {section.icon}
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900 group-hover:text-purple-600 transition-colors">
                      {section.title}
                    </h2>
                    <p className="text-xs font-medium text-purple-600 font-mono mt-0.5">
                      {section.summary}
                    </p>
                  </div>
                </div>

                <p className="text-gray-600 text-sm sm:text-base leading-relaxed mb-6">
                  {section.content}
                </p>

                {/* Key Bullet Highlights */}
                <div className="p-4 rounded-2xl bg-gray-50/80 border border-gray-100">
                  <div className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2.5 font-mono">
                    Key Safeguards:
                  </div>
                  <ul className="space-y-2">
                    {section.highlights.map((highlight, hIdx) => (
                      <li key={hIdx} className="flex items-center gap-2.5 text-xs sm:text-sm text-gray-600">
                        <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                        <span>{highlight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ))}

            {/* DPO & Contact Box */}
            <div className="p-7 sm:p-8 rounded-3xl bg-gradient-to-r from-purple-50 via-indigo-50/50 to-blue-50 border border-purple-200/80 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Data Protection Officer & Privacy Desk</h3>
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed mb-5">
                If you have questions about how we handle your academic data, or wish to submit an export or account deletion request, please reach out directly to our Data Protection Officer:
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <a
                  href="mailto:adhyan.ai.73@gmail.com?subject=Privacy%20Data%20Inquiry%20-%20ADHYAN.AI"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 transition-all shadow-md shadow-purple-500/20"
                >
                  <Mail size={15} />
                  <span>adhyan.ai.73@gmail.com</span>
                </a>
              </div>
            </div>

          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PrivacyPage;
