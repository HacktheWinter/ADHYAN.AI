import React from 'react';
import Navbar from '../components/Landing/Navbar';
import Footer from '../components/Landing/Footer';
import { Shield, FileText, CheckCircle2, AlertTriangle, Book, Scale } from 'lucide-react';

const TermsPage = () => {
  const lastUpdated = "August 2026";

  const sections = [
    {
      id: "acceptance",
      icon: <CheckCircle2 className="w-6 h-6 text-purple-600" />,
      title: "1. Acceptance of Terms",
      content: "By accessing and using ADHYAN.AI (the 'Platform'), you agree to be bound by these Terms of Service. If you do not agree to these terms, you may not access or use the Platform. These terms apply to all visitors, students, educators, and institutions who access the Service."
    },
    {
      id: "accounts",
      icon: <FileText className="w-6 h-6 text-indigo-600" />,
      title: "2. User Accounts and Security",
      content: "You must provide accurate, complete, and updated registration information. You are solely responsible for maintaining the confidentiality of your account and password. You must notify us immediately of any breach of security or unauthorized use of your account. Institutions must ensure their student rosters and ERP data are accurately maintained."
    },
    {
      id: "conduct",
      icon: <AlertTriangle className="w-6 h-6 text-rose-600" />,
      title: "3. Academic Integrity & Conduct",
      content: "ADHYAN.AI features robust proctoring and assessment tools. Any attempt to circumvent these systems—including tab switching, external assistance during full-screen proctored exams, or exploiting system vulnerabilities—constitutes a violation of these terms. We reserve the right to auto-submit assessments and report violations to your educational institution."
    },
    {
      id: "content",
      icon: <Book className="w-6 h-6 text-blue-600" />,
      title: "4. User-Generated Content",
      content: "Educators retain all rights to the quizzes, coding challenges, and study materials they create ('User Content'). By posting User Content, you grant ADHYAN.AI a non-exclusive license to use, display, and distribute this content solely for the purpose of operating the Platform. We do not claim ownership of your intellectual property."
    },
    {
      id: "liability",
      icon: <Scale className="w-6 h-6 text-emerald-600" />,
      title: "5. Limitation of Liability",
      content: "In no event shall ADHYAN.AI, its directors, employees, or partners be liable for any indirect, incidental, special, consequential, or punitive damages arising out of your use of the Platform. This includes, without limitation, loss of data, academic penalties resulting from proctoring flags, or system downtime during assessments."
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-inter">
      <Navbar />

      {/* Header Section */}
      <div className="bg-gray-900 text-white py-24 sm:py-32">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center justify-center p-3 bg-purple-900/50 rounded-2xl mb-6 border border-purple-500/30 shadow-inner">
            <Shield className="w-8 h-8 text-purple-400" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-6">
            Terms of Service
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Please read these terms carefully before using ADHYAN.AI. They define your rights and responsibilities on our platform.
          </p>
          <p className="mt-6 text-sm font-semibold text-purple-400 uppercase tracking-widest">
            Last Updated: {lastUpdated}
          </p>
        </div>
      </div>

      {/* Content Section */}
      <main className="flex-grow max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white rounded-[2rem] shadow-xl shadow-gray-200/50 overflow-hidden border border-gray-100">
          <div className="p-8 sm:p-12">
            
            {/* Introduction */}
            <div className="prose prose-purple max-w-none mb-12 text-gray-600">
              <p className="text-lg leading-relaxed">
                Welcome to ADHYAN.AI. Our mission is to empower educators and students with intelligent, AI-driven educational tools. These Terms of Service constitute a legally binding agreement made between you and ADHYAN.AI concerning your access to and use of the platform.
              </p>
            </div>

            {/* Sections */}
            <div className="space-y-12">
              {sections.map((section) => (
                <div key={section.id} id={section.id} className="scroll-mt-32 group">
                  <div className="flex items-start gap-5">
                    <div className="flex-shrink-0 w-12 h-12 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-center shadow-sm group-hover:scale-110 group-hover:bg-white group-hover:shadow-md transition-all duration-300">
                      {section.icon}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-4">{section.title}</h2>
                      <p className="text-gray-600 leading-relaxed text-[17px]">
                        {section.content}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Contact Section */}
            <div className="mt-16 pt-12 border-t border-gray-100 bg-purple-50/50 rounded-2xl p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-3">Questions about our Terms?</h3>
              <p className="text-gray-600 mb-6">
                If you have any questions or require clarification regarding these Terms of Service, please reach out to our legal team.
              </p>
              <button disabled className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-semibold rounded-xl text-white bg-purple-400 cursor-not-allowed opacity-70">
                Contact Legal Team (Coming Soon)
              </button>
            </div>

          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default TermsPage;
