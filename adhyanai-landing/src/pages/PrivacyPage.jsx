import React from 'react';
import Navbar from '../components/Landing/Navbar';
import Footer from '../components/Landing/Footer';
import { Lock, Eye, Database, Server, Fingerprint, Share2 } from 'lucide-react';

const PrivacyPage = () => {
  const lastUpdated = "August 2026";

  const sections = [
    {
      id: "collection",
      icon: <Database className="w-6 h-6 text-indigo-600" />,
      title: "1. Information We Collect",
      content: "We collect information you provide directly to us (such as name, email, ERP/Roll number, course, and section) when you register for an account. We also automatically collect assessment data, including code submissions, multiple-choice answers, and proctoring telemetry (e.g., tab switching activity, full-screen exits) during active exams."
    },
    {
      id: "usage",
      icon: <Eye className="w-6 h-6 text-purple-600" />,
      title: "2. How We Use Your Data",
      content: "Your data is used strictly to provide and improve the ADHYAN.AI educational services. This includes authenticating users, auto-grading assessments, generating AI-powered study notes, and providing teachers with analytics regarding student performance and examination integrity."
    },
    {
      id: "sharing",
      icon: <Share2 className="w-6 h-6 text-blue-600" />,
      title: "3. Information Sharing",
      content: "We do not sell, rent, or monetize your personal data. Student data (including assessment scores and proctoring violations) is shared exclusively with the verified educators and institutional administrators associated with your enrolled courses. We may also share anonymized, aggregated data for research or platform improvement purposes."
    },
    {
      id: "security",
      icon: <Lock className="w-6 h-6 text-emerald-600" />,
      title: "4. Data Security",
      content: "We implement industry-standard security measures, including bcrypt password hashing, secure JWT authentication, and encrypted data transmission (HTTPS/WSS) to protect your personal information against unauthorized access, alteration, or destruction."
    },
    {
      id: "retention",
      icon: <Server className="w-6 h-6 text-rose-600" />,
      title: "5. Data Retention & Deletion",
      content: "We retain your academic data for as long as your account is active or as required by your educational institution. You may request the deletion of your account at any time. However, institutions may require us to maintain records of completed assessments and proctoring logs for academic compliance."
    },
    {
      id: "ai",
      icon: <Fingerprint className="w-6 h-6 text-amber-600" />,
      title: "6. AI Processing",
      content: "Certain features of ADHYAN.AI utilize third-party Large Language Models (LLMs), such as Google Gemini, for generating study materials and evaluating code. When you interact with these features, relevant prompts and inputs are processed securely by these APIs. We do not use your personal identifiable information to train foundational AI models."
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-inter">
      <Navbar />

      {/* Header Section */}
      <div className="bg-gray-900 text-white py-24 sm:py-32">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center justify-center p-3 bg-indigo-900/50 rounded-2xl mb-6 border border-indigo-500/30 shadow-inner">
            <Lock className="w-8 h-8 text-indigo-400" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-6">
            Privacy Policy
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Your privacy is our priority. Learn how we collect, use, and protect your data to ensure a secure learning environment.
          </p>
          <p className="mt-6 text-sm font-semibold text-indigo-400 uppercase tracking-widest">
            Last Updated: {lastUpdated}
          </p>
        </div>
      </div>

      {/* Content Section */}
      <main className="flex-grow max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white rounded-[2rem] shadow-xl shadow-gray-200/50 overflow-hidden border border-gray-100">
          <div className="p-8 sm:p-12">
            
            {/* Introduction */}
            <div className="prose prose-indigo max-w-none mb-12 text-gray-600">
              <p className="text-lg leading-relaxed">
                At ADHYAN.AI, we take your data privacy seriously. This policy describes the personal data we collect from you, how we use it, and your rights regarding this information when you use our educational platform and services.
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
            <div className="mt-16 pt-12 border-t border-gray-100 bg-indigo-50/50 rounded-2xl p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-3">Data Privacy Inquiries</h3>
              <p className="text-gray-600 mb-6">
                If you have questions about how we handle your data, or if you wish to exercise your data rights (including data export or deletion requests), please contact our Data Protection Officer.
              </p>
              <button disabled className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-semibold rounded-xl text-white bg-indigo-400 cursor-not-allowed opacity-70">
                Contact Privacy Team (Coming Soon)
              </button>
            </div>

          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PrivacyPage;
