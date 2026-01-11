import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { UserPlus, FileText, Edit, BarChart, PlusCircle, Upload, Award } from 'lucide-react';

const HowItWorks = () => {
  const [activeTab, setActiveTab] = useState('teacher');

  const studentSteps = [
    {
      icon: UserPlus,
      title: "Join Class",
      description: "Enter your unique class code to instantly join your virtual classroom.",
      color: "bg-blue-100 text-blue-600"
    },
    {
      icon: FileText,
      title: "Access Materials",
      description: "View notes, assignments, and study materials organized by your teacher.",
      color: "bg-purple-100 text-purple-600"
    },
    {
      icon: Edit,
      title: "Take Assessments",
      description: "Complete quizzes and tests in a secure, AI-priveleged environment.",
      color: "bg-indigo-100 text-indigo-600"
    },
    {
      icon: BarChart,
      title: "Track Progress",
      description: "Get instant results and detailed AI feedback to improve performance.",
      color: "bg-green-100 text-green-600"
    }
  ];

  const teacherSteps = [
    {
      icon: PlusCircle,
      title: "Create Class",
      description: "Set up your virtual classroom in seconds and invite students.",
      color: "bg-orange-100 text-orange-600"
    },
    {
      icon: Upload,
      title: "Upload Content",
      description: "Simply upload your notes or textbooks. Our AI analyzes everything.",
      color: "bg-pink-100 text-pink-600"
    },
    {
      icon: Sparkles, 
      title: "Generate Assessments",
      description: "Let AI create quizzes and tests from your content automatically.",
      color: "bg-yellow-100 text-yellow-600"
    },
    {
      icon: Award,
      title: "Evaluate & Analyze",
      description: "AI assists in grading subjective answers and providing class insights.",
      color: "bg-teal-100 text-teal-600"
    }
  ];

  // Helper for Sparkles icon
  function Sparkles(props) {
    return (
      <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      </svg>
    );
  }

  const activeSteps = activeTab === 'teacher' ? teacherSteps : studentSteps;

  return (
    <section id="how-it-works" className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6"
          >
            How <span className="text-purple-600">ADHYAN.AI</span> Works
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, delay: 0.1 }}
            className="text-xl text-gray-600 max-w-2xl mx-auto mb-8"
          >
            A seamless experience for both educators and learners, designed to save time and enhance results.
          </motion.p>
          
          {/* Toggle Button */}
          <div className="inline-flex bg-white p-1 rounded-full border border-gray-200 shadow-sm relative">
            <div 
              className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full transition-all duration-300 ease-in-out ${
                activeTab === 'teacher' ? 'left-1' : 'left-[calc(50%+2px)]'
              }`}
            ></div>
            <button
              onClick={() => setActiveTab('teacher')}
              className={`relative px-8 py-2.5 rounded-full text-sm font-semibold transition-colors z-10 cursor-pointer ${
                activeTab === 'teacher' ? 'text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Teacher
            </button>
            <button
              onClick={() => setActiveTab('student')}
              className={`relative px-8 py-2.5 rounded-full text-sm font-semibold transition-colors z-10 cursor-pointer ${
                activeTab === 'student' ? 'text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Student
            </button>
          </div>
        </div>

        <div className="max-w-3xl mx-auto">
           <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-300 before:to-transparent">
            {activeSteps.map((step, index) => (
              <motion.div
                key={`${activeTab}-${index}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-gray-50 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                  <div className={`w-3 h-3 rounded-full ${step.color.split(' ')[0].replace('bg-', 'bg-')}`}></div>
                </div>
                
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300">
                  <div className="flex items-center gap-4 mb-3">
                    <div className={`p-2 rounded-lg ${step.color}`}>
                      <step.icon size={20} />
                    </div>
                    <h3 className="font-bold text-gray-900">{step.title}</h3>
                  </div>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
