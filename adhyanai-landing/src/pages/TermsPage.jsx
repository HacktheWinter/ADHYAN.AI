import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Navbar from '../components/Landing/Navbar';
import Footer from '../components/Landing/Footer';
import { Shield, FileText, CheckCircle2, AlertTriangle, Book, Scale, Mail, ChevronRight, ShieldAlert } from 'lucide-react';

const TermsPage = () => {
  const lastUpdated = "August 2026";
  const [activeSection, setActiveSection] = useState("acceptance");

  const sections = [
    {
      id: "acceptance",
      icon: <CheckCircle2 className="w-5 h-5 text-purple-600" />,
      title: "1. Acceptance of Terms",
      summary: "Binding agreement for all visitors and registered users.",
      content: "By accessing and using ADHYAN.AI (the 'Platform'), you agree to be bound by these Terms of Service. If you do not agree to these terms, you may not access or use the Platform. These terms apply to all visitors, students, educators, and institutions who access the Service.",
      rules: [
        "Applicable across all web and mobile portal interfaces",
        "Registration constitutes complete agreement with these guidelines",
        "Terms subject to periodic updates with visible changelog notice"
      ]
    },
    {
      id: "accounts",
      icon: <FileText className="w-5 h-5 text-indigo-600" />,
      title: "2. User Accounts and Security",
      summary: "Account integrity, credentials, and institutional rosters.",
      content: "You must provide accurate, complete, and updated registration information. You are solely responsible for maintaining the confidentiality of your account and password. You must notify us immediately of any breach of security or unauthorized use of your account. Institutions must ensure their student rosters and ERP data are accurately maintained.",
      rules: [
        "Single individual use per authenticated account",
        "Mandatory notification upon any suspected unauthorized login",
        "Institutions are responsible for verifying student roster authenticity"
      ]
    },
    {
      id: "conduct",
      icon: <AlertTriangle className="w-5 h-5 text-rose-600" />,
      title: "3. Academic Integrity & Conduct",
      summary: "Strict anti-cheat proctoring and exam credibility.",
      content: "ADHYAN.AI features robust proctoring and assessment tools. Any attempt to circumvent these systems—including tab switching, external assistance during full-screen proctored exams, or exploiting system vulnerabilities—constitutes a violation of these terms. We reserve the right to auto-submit assessments and report violations to your educational institution.",
      rules: [
        "Zero tolerance for unauthorized tabs or secondary screens during exams",
        "Automated telemetry flag logging shared with course instructor",
        "Attempts to inject malicious code into grading sandboxes will trigger bans"
      ]
    },
    {
      id: "content",
      icon: <Book className="w-5 h-5 text-blue-600" />,
      title: "4. User-Generated Content & IP",
      summary: "Educators retain full intellectual ownership.",
      content: "Educators retain all rights to the quizzes, coding challenges, and study materials they create ('User Content'). By posting User Content, you grant ADHYAN.AI a non-exclusive license to use, display, and distribute this content solely for the purpose of operating the Platform. We do not claim ownership of your intellectual property.",
      rules: [
        "Educator retains full copyright over created question banks",
        "Platform granted processing rights solely for classroom delivery",
        "Proprietary materials will not be published to public indexes"
      ]
    },
    {
      id: "liability",
      icon: <Scale className="w-5 h-5 text-emerald-600" />,
      title: "5. Limitation of Liability",
      summary: "Platform uptime and academic decision governance.",
      content: "In no event shall ADHYAN.AI, its directors, employees, or partners be liable for any indirect, incidental, special, consequential, or punitive damages arising out of your use of the Platform. This includes, without limitation, loss of data, academic penalties resulting from proctoring flags, or system downtime during assessments.",
      rules: [
        "AI grading scores serve as pedagogical aids under instructor oversight",
        "Scheduled maintenance windows are announced with advance notice",
        "Users advised to maintain local backups of critical curriculum files"
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
      <div className="bg-gradient-to-br from-gray-950 via-purple-950 to-indigo-950 text-white pt-32 pb-20 sm:pt-36 sm:pb-24 relative overflow-hidden border-b border-gray-800">
        
        {/* Background glow orbs */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          
          <div className="flex justify-center mb-6">
            <div className="p-3.5 bg-purple-500/10 rounded-2xl border border-purple-400/30 shadow-lg shadow-purple-500/10">
              <Shield className="w-8 h-8 text-purple-400" />
            </div>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-4 text-white">
            Terms of{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-indigo-300 to-cyan-400">
              Service
            </span>
          </h1>

          <p className="text-base sm:text-lg text-gray-300 max-w-2xl mx-auto leading-relaxed">
            Please read these terms carefully before accessing ADHYAN.AI. They define your rights, responsibilities, and standards of academic integrity.
          </p>

          <div className="mt-6 flex items-center justify-center gap-4 text-xs font-mono text-purple-300">
            <span className="px-3 py-1 rounded-full bg-purple-950/80 border border-purple-800">
              Last Updated: {lastUpdated}
            </span>
            <span className="px-3 py-1 rounded-full bg-indigo-950/80 text-indigo-300 border border-indigo-800 flex items-center gap-1">
              <ShieldAlert size={13} /> Legally Binding
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
                Clauses
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
                  <span>Legal Support</span>
                </a>
              </div>
            </div>
          </div>

          {/* Legal Clauses (Right 8 cols) */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Overview Card */}
            <div className="p-7 sm:p-8 rounded-3xl bg-white border border-gray-200/90 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-3">Preamble & Agreement</h2>
              <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
                Welcome to <span className="font-semibold text-gray-900">ADHYAN.AI</span>. Our mission is to empower educators and students with intelligent, AI-driven educational tools. These Terms of Service constitute a legally binding agreement made between you and ADHYAN.AI concerning your access to and use of the platform and affiliated portals.
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

                {/* Key Rules / Guidelines */}
                <div className="p-4 rounded-2xl bg-gray-50/80 border border-gray-100">
                  <div className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2.5 font-mono">
                    Key Conditions:
                  </div>
                  <ul className="space-y-2">
                    {section.rules.map((rule, rIdx) => (
                      <li key={rIdx} className="flex items-center gap-2.5 text-xs sm:text-sm text-gray-600">
                        <CheckCircle2 size={14} className="text-purple-600 shrink-0" />
                        <span>{rule}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ))}

            {/* Legal Help Desk Card */}
            <div className="p-7 sm:p-8 rounded-3xl bg-gradient-to-r from-purple-50 via-indigo-50/50 to-blue-50 border border-purple-200/80 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Legal & Institutional Compliance Desk</h3>
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed mb-5">
                If you represent an educational institution with custom SLA requirements or have questions regarding our Terms of Service, please contact our legal counsel:
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <a
                  href="mailto:adhyan.ai.73@gmail.com?subject=Terms%20of%20Service%20Inquiry%20-%20ADHYAN.AI"
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

export default TermsPage;
