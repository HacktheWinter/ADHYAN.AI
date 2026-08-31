import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PlusCircle,
  Video,
  Upload,
  Megaphone,
  Sparkles,
  Award,
  UserPlus,
  FileText,
  Edit,
  BarChart,
  CheckCircle,
  ChevronRight
} from 'lucide-react';

const HowItWorks = () => {
  const [activeTab, setActiveTab] = useState('teacher');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const containerRef = useRef(null);

  const teacherSteps = [
    {
      step: '01',
      icon: PlusCircle,
      title: 'Create Virtual Classroom',
      description: 'Set up your virtual classroom in seconds. Generate unique invite codes, configure batch schedules, and enroll students effortlessly.',
      tag: 'Step 1: Setup',
      gradient: 'from-orange-500 to-amber-500',
      bgGlow: 'bg-orange-500/15',
      accentColor: 'text-orange-600',
      highlight: '⚡ Instant Class Code',
      preview: (
        <div className="mt-5 p-4 rounded-2xl bg-gray-950 border border-gray-800 text-left text-xs font-mono shadow-inner space-y-2.5">
          <div className="flex items-center justify-between text-gray-400 border-b border-gray-800 pb-2">
            <span className="text-purple-400">Classroom: Grade 12 Advanced Physics</span>
            <span className="text-green-400">● Live & Ready</span>
          </div>
          <div className="flex items-center justify-between bg-gray-900/80 p-2.5 rounded-xl border border-gray-800">
            <span className="text-gray-300">Class Invite Code:</span>
            <span className="bg-purple-600/30 text-purple-300 px-2.5 py-1 rounded-md font-bold tracking-widest text-sm border border-purple-500/40">
              PHY-2026-X
            </span>
          </div>
          <div className="text-[11px] text-gray-500 flex items-center gap-1.5">
            <CheckCircle size={13} className="text-emerald-500" />
            <span>Automated student roster synchronization enabled</span>
          </div>
        </div>
      )
    },
    {
      step: '02',
      icon: Video,
      title: 'Conduct Live Interactive Classes',
      description: 'Host rich live video sessions with real-time digital whiteboard, dual screen-sharing, and automated high-definition cloud recording for student revision.',
      tag: 'Step 2: Classroom',
      gradient: 'from-red-500 to-rose-600',
      bgGlow: 'bg-rose-500/15',
      accentColor: 'text-rose-600',
      highlight: '🎥 Auto HD Recording',
      preview: (
        <div className="mt-5 p-4 rounded-2xl bg-gray-950 border border-gray-800 text-left text-xs font-mono shadow-inner space-y-2.5">
          <div className="flex items-center justify-between text-gray-400 border-b border-gray-800 pb-2">
            <span className="text-rose-400">Live Whiteboard Studio</span>
            <span className="text-red-400 animate-pulse font-bold">● REC (00:42:15)</span>
          </div>
          <div className="p-3 bg-gray-900/80 rounded-xl border border-gray-800 flex items-center justify-between">
            <span className="text-gray-300">Interactive Participants:</span>
            <span className="text-emerald-400 font-bold">48 Students Connected</span>
          </div>
          <div className="text-[11px] text-gray-500 flex items-center gap-1.5">
            <CheckCircle size={13} className="text-emerald-500" />
            <span>AI Real-time Transcription & Note Capture Active</span>
          </div>
        </div>
      )
    },
    {
      step: '03',
      icon: Upload,
      title: 'Upload Syllabus & Curriculum Notes',
      description: 'Simply drag and drop PDF lecture notes, textbook chapters, or reference materials. Our neural engine parses and indexes core learning objectives.',
      tag: 'Step 3: Indexing',
      gradient: 'from-purple-500 to-indigo-600',
      bgGlow: 'bg-purple-500/15',
      accentColor: 'text-purple-600',
      highlight: '📑 Smart PDF Parsing',
      preview: (
        <div className="mt-5 p-4 rounded-2xl bg-gray-950 border border-gray-800 text-left text-xs font-mono shadow-inner space-y-2.5">
          <div className="flex items-center justify-between text-gray-400 border-b border-gray-800 pb-2">
            <span className="text-indigo-400">Document Parser</span>
            <span className="text-emerald-400">100% Indexed</span>
          </div>
          <div className="p-2.5 bg-gray-900/80 rounded-xl border border-gray-800 flex items-center justify-between">
            <span className="text-gray-300 truncate max-w-[220px]">Quantum_Mechanics_Ch4.pdf</span>
            <span className="text-purple-300 text-[10px] bg-purple-900/50 px-2 py-0.5 rounded">34 Concepts Extracted</span>
          </div>
          <div className="text-[11px] text-gray-500 flex items-center gap-1.5">
            <CheckCircle size={13} className="text-emerald-500" />
            <span>Ready for 1-click test generation & semantic grading</span>
          </div>
        </div>
      )
    },
    {
      step: '04',
      icon: Megaphone,
      title: 'Publish Smart Announcements',
      description: 'Broadcast timetable changes, critical test dates, and syllabus guidelines with rich-text formatting and instant push alerts to enrolled students.',
      tag: 'Step 4: Broadcast',
      gradient: 'from-blue-500 to-cyan-600',
      bgGlow: 'bg-blue-500/15',
      accentColor: 'text-blue-600',
      highlight: '🔔 Real-time Alerts',
      preview: (
        <div className="mt-5 p-4 rounded-2xl bg-gray-950 border border-gray-800 text-left text-xs font-mono shadow-inner space-y-2.5">
          <div className="flex items-center justify-between text-gray-400 border-b border-gray-800 pb-2">
            <span className="text-blue-400">Announcement Broadcast</span>
            <span className="text-cyan-400">Sent to 48 Students</span>
          </div>
          <div className="p-2.5 bg-gray-900/80 rounded-xl border border-gray-800">
            <p className="text-gray-200 font-sans text-xs">"Mid-term assessment scheduled for Friday 10:00 AM. Study chapters 1-4."</p>
          </div>
          <div className="text-[11px] text-gray-500 flex items-center gap-1.5">
            <CheckCircle size={13} className="text-emerald-500" />
            <span>Push alert & calendar notification synced</span>
          </div>
        </div>
      )
    },
    {
      step: '05',
      icon: Sparkles,
      title: 'AI Question Generation in 1-Click',
      description: 'Generate standardized exams and randomized problem sets categorized by difficulty, complete with step-by-step rubrics and automated answer keys.',
      tag: 'Step 5: Assessment',
      gradient: 'from-amber-500 to-yellow-500',
      bgGlow: 'bg-amber-500/15',
      accentColor: 'text-amber-600',
      highlight: '✨ 1-Click Test Generation',
      preview: (
        <div className="mt-5 p-4 rounded-2xl bg-gray-950 border border-gray-800 text-left text-xs font-mono shadow-inner space-y-2.5">
          <div className="flex items-center justify-between text-gray-400 border-b border-gray-800 pb-2">
            <span className="text-amber-400">Generated Exam: 25 MCQs + 5 Subjective</span>
            <span className="text-emerald-400 font-semibold">⚡ In 1.2s</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
            <div className="p-2 rounded-lg bg-gray-900 border border-gray-800 text-gray-300">Easy: 10 Qs</div>
            <div className="p-2 rounded-lg bg-gray-900 border border-gray-800 text-gray-300">Medium: 15 Qs</div>
            <div className="p-2 rounded-lg bg-gray-900 border border-gray-800 text-purple-300">Hard: 5 Qs</div>
          </div>
          <div className="text-[11px] text-gray-500 flex items-center gap-1.5">
            <CheckCircle size={13} className="text-emerald-500" />
            <span>Full answer keys & detailed marking rubrics generated</span>
          </div>
        </div>
      )
    },
    {
      step: '06',
      icon: Award,
      title: 'Automated Semantic Evaluation',
      description: 'Accelerate grading with context-aware semantic AI that reads long-form answers, applies customizable grading criteria, and highlights concept mastery.',
      tag: 'Step 6: Insights',
      gradient: 'from-emerald-500 to-teal-600',
      bgGlow: 'bg-emerald-500/15',
      accentColor: 'text-emerald-600',
      highlight: '🎯 96% Grading Accuracy',
      preview: (
        <div className="mt-5 p-4 rounded-2xl bg-gray-950 border border-gray-800 text-left text-xs font-mono shadow-inner space-y-2.5">
          <div className="flex items-center justify-between text-gray-400 border-b border-gray-800 pb-2">
            <span className="text-emerald-400">Evaluation Report</span>
            <span className="text-emerald-400 font-bold">Grade: 9.5/10</span>
          </div>
          <div className="p-2.5 bg-emerald-950/40 rounded-xl border border-emerald-500/30 text-emerald-300 text-xs">
            "Excellent explanation of core principles. Minor feedback on notation provided."
          </div>
          <div className="text-[11px] text-gray-500 flex items-center gap-1.5">
            <CheckCircle size={13} className="text-emerald-500" />
            <span>Batch gradebook exported to CSV & student portal</span>
          </div>
        </div>
      )
    }
  ];

  const studentSteps = [
    {
      step: '01',
      icon: UserPlus,
      title: 'Join Class with 1-Click',
      description: 'Enter your teacher’s unique class code or accept an email invitation to instantly access study materials, timetables, and lecture streams.',
      tag: 'Step 1: Enrollment',
      gradient: 'from-blue-500 to-cyan-500',
      bgGlow: 'bg-blue-500/15',
      accentColor: 'text-blue-600',
      highlight: '🔑 Instant Access',
      preview: (
        <div className="mt-5 p-4 rounded-2xl bg-gray-950 border border-gray-800 text-left text-xs font-mono shadow-inner space-y-2.5">
          <div className="flex items-center justify-between text-gray-400 border-b border-gray-800 pb-2">
            <span className="text-cyan-400">Student Portal</span>
            <span className="text-green-400">● Enrolled</span>
          </div>
          <div className="p-2.5 bg-gray-900/80 rounded-xl border border-gray-800 text-gray-300">
            Enrolled in <span className="text-white font-bold">Grade 12 Physics & Chemistry</span>
          </div>
          <div className="text-[11px] text-gray-500 flex items-center gap-1.5">
            <CheckCircle size={13} className="text-emerald-500" />
            <span>All class resources ready on dashboard</span>
          </div>
        </div>
      )
    },
    {
      step: '02',
      icon: Video,
      title: 'Attend Interactive Live Sessions',
      description: 'Participate actively with live chat, doubt-clearing queues, and playback recorded classes anytime for pre-exam revision.',
      tag: 'Step 2: Learning',
      gradient: 'from-red-500 to-pink-500',
      bgGlow: 'bg-red-500/15',
      accentColor: 'text-red-600',
      highlight: '💬 Live Doubt Clearing',
      preview: (
        <div className="mt-5 p-4 rounded-2xl bg-gray-950 border border-gray-800 text-left text-xs font-mono shadow-inner space-y-2.5">
          <div className="flex items-center justify-between text-gray-400 border-b border-gray-800 pb-2">
            <span className="text-rose-400">Live Classroom View</span>
            <span className="text-green-400">● Connected</span>
          </div>
          <div className="p-2.5 bg-gray-900/80 rounded-xl border border-gray-800 text-gray-300 flex justify-between items-center">
            <span>Doubt Queue Status:</span>
            <span className="text-purple-300 font-bold">Answered Live by Teacher</span>
          </div>
          <div className="text-[11px] text-gray-500 flex items-center gap-1.5">
            <CheckCircle size={13} className="text-emerald-500" />
            <span>Session recorded for 24/7 on-demand replay</span>
          </div>
        </div>
      )
    },
    {
      step: '03',
      icon: FileText,
      title: 'Access Structured Notes & Homework',
      description: 'Browse organized subject folders, syllabus breakdown, and recommended reading curated specifically for your curriculum.',
      tag: 'Step 3: Materials',
      gradient: 'from-purple-500 to-indigo-500',
      bgGlow: 'bg-purple-500/15',
      accentColor: 'text-purple-600',
      highlight: '📚 Centralized Study Hub',
      preview: (
        <div className="mt-5 p-4 rounded-2xl bg-gray-950 border border-gray-800 text-left text-xs font-mono shadow-inner space-y-2.5">
          <div className="flex items-center justify-between text-gray-400 border-b border-gray-800 pb-2">
            <span className="text-indigo-400">Study Drive</span>
            <span className="text-cyan-400">12 Documents</span>
          </div>
          <div className="p-2.5 bg-gray-900/80 rounded-xl border border-gray-800 text-gray-300">
            📁 Unit 3: Wave Optics & Thermodynamics (Organized by Date)
          </div>
          <div className="text-[11px] text-gray-500 flex items-center gap-1.5">
            <CheckCircle size={13} className="text-emerald-500" />
            <span>AI Summaries available for fast revision</span>
          </div>
        </div>
      )
    },
    {
      step: '04',
      icon: Megaphone,
      title: 'Stay Informed with Timely Alerts',
      description: 'Never miss an exam date or assignment submission with centralized notifications and calendar deadline synchronizations.',
      tag: 'Step 4: Deadlines',
      gradient: 'from-yellow-500 to-orange-500',
      bgGlow: 'bg-yellow-500/15',
      accentColor: 'text-yellow-600',
      highlight: '⏰ Never Miss Deadlines',
      preview: (
        <div className="mt-5 p-4 rounded-2xl bg-gray-950 border border-gray-800 text-left text-xs font-mono shadow-inner space-y-2.5">
          <div className="flex items-center justify-between text-gray-400 border-b border-gray-800 pb-2">
            <span className="text-amber-400">Upcoming Deadlines</span>
            <span className="text-amber-400">Due in 2 days</span>
          </div>
          <div className="p-2.5 bg-gray-900/80 rounded-xl border border-gray-800 text-gray-300 flex justify-between items-center">
            <span>Assignment 4: Modern Physics</span>
            <span className="text-emerald-400 font-bold">Ready to Submit</span>
          </div>
          <div className="text-[11px] text-gray-500 flex items-center gap-1.5">
            <CheckCircle size={13} className="text-emerald-500" />
            <span>Synced to Google & Apple Calendars</span>
          </div>
        </div>
      )
    },
    {
      step: '05',
      icon: Edit,
      title: 'Take Proctored AI Assessments',
      description: 'Complete quizzes and exams in a focused, anti-cheat protected test environment with auto-saving progress and timer warnings.',
      tag: 'Step 5: Examination',
      gradient: 'from-indigo-500 to-purple-600',
      bgGlow: 'bg-indigo-500/15',
      accentColor: 'text-indigo-600',
      highlight: '🛡️ Secure Environment',
      preview: (
        <div className="mt-5 p-4 rounded-2xl bg-gray-950 border border-gray-800 text-left text-xs font-mono shadow-inner space-y-2.5">
          <div className="flex items-center justify-between text-gray-400 border-b border-gray-800 pb-2">
            <span className="text-purple-400">Exam Window: Live</span>
            <span className="text-emerald-400 font-bold">Time Left: 45:00</span>
          </div>
          <div className="p-2.5 bg-gray-900/80 rounded-xl border border-gray-800 text-gray-300">
            🔒 Fullscreen Proctoring & Auto-Save Active (24/25 Answered)
          </div>
          <div className="text-[11px] text-gray-500 flex items-center gap-1.5">
            <CheckCircle size={13} className="text-emerald-500" />
            <span>Encrypted cloud submission</span>
          </div>
        </div>
      )
    },
    {
      step: '06',
      icon: BarChart,
      title: 'Review Analytics & Concept Mastery',
      description: 'Receive instant score breakdowns, personalized AI feedback on weak areas, and targeted recommendations to elevate your academic grade.',
      tag: 'Step 6: Mastery',
      gradient: 'from-emerald-500 to-green-600',
      bgGlow: 'bg-emerald-500/15',
      accentColor: 'text-emerald-600',
      highlight: '📊 Personalized AI Coaching',
      preview: (
        <div className="mt-5 p-4 rounded-2xl bg-gray-950 border border-gray-800 text-left text-xs font-mono shadow-inner space-y-2.5">
          <div className="flex items-center justify-between text-gray-400 border-b border-gray-800 pb-2">
            <span className="text-emerald-400">Score: 94% (Top 5%)</span>
            <span className="text-green-400 font-bold">Mastery Level A+</span>
          </div>
          <div className="p-2.5 bg-emerald-950/40 rounded-xl border border-emerald-500/30 text-emerald-300">
            "Strong grasp of Optics. Focus on 2 review questions in Thermodynamics."
          </div>
          <div className="text-[11px] text-gray-500 flex items-center gap-1.5">
            <CheckCircle size={13} className="text-emerald-500" />
            <span>Personalized revision pathway unlocked</span>
          </div>
        </div>
      )
    }
  ];

  const activeSteps = activeTab === 'teacher' ? teacherSteps : studentSteps;
  const currentStep = activeSteps[currentStepIndex] || activeSteps[0];
  const Icon = currentStep.icon;

  // Ultra-precise scroll listener to freeze screen and auto-advance cards 01 -> 06 as you scroll down
  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const totalScrollDistance = rect.height - windowHeight;

      if (totalScrollDistance <= 0) return;

      // Scrolled distance from top of this section
      const scrolled = -rect.top;
      const rawProgress = Math.max(0, Math.min(1, scrolled / totalScrollDistance));
      setScrollProgress(rawProgress);

      // Map progress directly into active card index [0, 5]
      const stepCount = activeSteps.length;
      // Using equal segment distribution
      const computedIndex = Math.min(stepCount - 1, Math.max(0, Math.floor(rawProgress * stepCount)));
      setCurrentStepIndex(computedIndex);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [activeTab, activeSteps.length]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCurrentStepIndex(0);
  };

  return (
    <>
      {/* ================= MOBILE & TABLET VIEW (< 1024px) ================= */}
      <section id="how-it-works-mobile" className="lg:hidden py-16 sm:py-20 bg-gray-50/90 relative overflow-hidden">
        {/* Ambient background glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[350px] bg-gradient-to-r from-purple-200/30 via-indigo-100/20 to-cyan-200/30 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          {/* Section Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-100 border border-purple-200 text-purple-700 text-xs font-semibold mb-3">
              <Sparkles size={13} className="text-purple-600 shrink-0" />
              <span>Interactive Workflow</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-2.5 tracking-tight">
              How{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600">
                ADHYAN.AI
              </span>{' '}
              Works
            </h2>

            <p className="text-xs sm:text-sm text-gray-600 max-w-lg mx-auto mb-6">
              Explore the 6-stage end-to-end intelligent workflow for educators and students.
            </p>

            {/* Workflow Toggle Buttons */}
            <div className="inline-flex bg-white p-1 rounded-2xl border border-gray-200 shadow-sm w-full max-w-sm">
              <button
                onClick={() => handleTabChange('teacher')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'teacher'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/25'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                👩‍🏫 Teacher
              </button>
              <button
                onClick={() => handleTabChange('student')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'student'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/25'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                👨‍🎓 Student
              </button>
            </div>
          </div>

          {/* Step Pill Selector Horizontal Bar */}
          <div className="flex items-center justify-between gap-1.5 mb-5 bg-white p-1.5 rounded-2xl border border-gray-200 shadow-xs overflow-x-auto">
            {activeSteps.map((step, idx) => {
              const isSelected = idx === currentStepIndex;
              return (
                <button
                  key={idx}
                  onClick={() => setCurrentStepIndex(idx)}
                  className={`flex-1 min-w-[44px] py-2 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                    isSelected
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/25 scale-105'
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <span>0{idx + 1}</span>
                  <span className="text-[9px] font-sans font-medium truncate max-w-[50px] hidden xs:block">
                    {step.tag.replace(/Step \d+: /, '')}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active Card for Mobile */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`mob-${activeTab}-${currentStepIndex}`}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="p-5 sm:p-7 rounded-3xl bg-white border border-gray-200 shadow-lg relative overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${currentStep.gradient} flex items-center justify-center text-white shadow-md`}>
                    <Icon size={20} />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase font-mono block">
                      Stage {currentStep.step} of 06
                    </span>
                    <span className="text-xs font-bold text-gray-800 font-mono">
                      {currentStep.tag}
                    </span>
                  </div>
                </div>

                <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold font-mono bg-gray-100 ${currentStep.accentColor}`}>
                  {currentStep.highlight}
                </span>
              </div>

              {/* Title & Description */}
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {currentStep.title}
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed mb-3">
                {currentStep.description}
              </p>

              {/* Mockup Preview Box */}
              {currentStep.preview}

              {/* Mobile Prev / Next Navigation Buttons */}
              <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between gap-3">
                <button
                  onClick={() => setCurrentStepIndex((prev) => Math.max(0, prev - 1))}
                  disabled={currentStepIndex === 0}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    currentStepIndex === 0
                      ? 'opacity-40 cursor-not-allowed text-gray-400 bg-gray-100'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  ← Previous
                </button>

                <div className="text-[11px] font-mono font-bold text-purple-600">
                  {currentStepIndex + 1} / {activeSteps.length}
                </div>

                <button
                  onClick={() => setCurrentStepIndex((prev) => Math.min(activeSteps.length - 1, prev + 1))}
                  disabled={currentStepIndex === activeSteps.length - 1}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    currentStepIndex === activeSteps.length - 1
                      ? 'opacity-40 cursor-not-allowed text-gray-400 bg-gray-100'
                      : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm'
                  }`}
                >
                  Next Stage →
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      {/* ================= DESKTOP VIEW (>= 1024px) WITH PINNED SCROLL ================= */}
      <section
        id="how-it-works"
        ref={containerRef}
        className="hidden lg:block relative bg-gray-50/80 h-[340vh]"
      >
        {/* ================= PINNED / FROZEN STICKY CONTAINER ================= */}
        <div className="sticky top-0 h-screen w-full flex items-center justify-center overflow-hidden">
          
          {/* Ambient Glowing Background */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[600px] bg-gradient-to-r from-purple-200/25 via-indigo-100/20 to-cyan-200/25 rounded-full blur-3xl pointer-events-none -z-10" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-8">
            
            <div className="grid lg:grid-cols-12 gap-10 lg:gap-14 items-center">
              
              {/* ================= LEFT COLUMN: Overview & Dynamic Timeline ================= */}
              <div className="lg:col-span-5 flex flex-col justify-center">
                
                {/* Tag */}
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-100/90 border border-purple-200 text-purple-700 text-xs sm:text-sm font-semibold mb-4 w-fit backdrop-blur-sm">
                  <Sparkles size={14} className="text-purple-600 shrink-0" />
                  <span>Scroll to Advance Steps</span>
                </div>

                {/* Headline */}
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-4 tracking-tight leading-tight">
                  How{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600">
                    ADHYAN.AI
                  </span>{' '}
                  Works
                </h2>

                <p className="text-sm sm:text-base text-gray-600 mb-6 leading-relaxed">
                  Scroll naturally down the page. The screen stays locked while each workflow card seamlessly replaces the last.
                </p>

                {/* Workflow Toggle Buttons */}
                <div className="inline-flex bg-white p-1.5 rounded-2xl border border-gray-200 shadow-sm relative mb-6 w-full sm:w-auto">
                  <button
                    onClick={() => handleTabChange('teacher')}
                    className={`flex-1 sm:flex-initial relative px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 ${
                      activeTab === 'teacher'
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/25'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <span>👩‍🏫 Teacher Workflow</span>
                  </button>
                  <button
                    onClick={() => handleTabChange('student')}
                    className={`flex-1 sm:flex-initial relative px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 ${
                      activeTab === 'student'
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/25'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <span>👨‍🎓 Student Workflow</span>
                  </button>
                </div>

                {/* Interactive Step Timeline Indicator */}
                <div className="space-y-2 pt-2 border-t border-gray-200/80">
                  <div className="flex items-center justify-between text-xs font-bold text-gray-400 font-mono uppercase mb-1">
                    <span>Current Stage</span>
                    <span className="text-purple-600 font-bold font-mono">Stage 0{currentStepIndex + 1} / 0{activeSteps.length}</span>
                  </div>

                  {/* 6 Stage Segment Bars */}
                  <div className="grid grid-cols-6 gap-2">
                    {activeSteps.map((step, idx) => (
                      <div
                        key={idx}
                        className={`h-2 rounded-full transition-all duration-300 ${
                          idx === currentStepIndex
                            ? 'bg-gradient-to-r from-purple-600 to-indigo-600 shadow-md shadow-purple-500/30 scale-y-125'
                            : idx < currentStepIndex
                            ? 'bg-purple-300'
                            : 'bg-gray-200'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Live Scroll Progress Bar */}
                  <div className="w-full bg-gray-200 h-1 rounded-full overflow-hidden mt-3">
                    <div
                      className="h-full bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 transition-all duration-100 ease-out"
                      style={{ width: `${Math.round(scrollProgress * 100)}%` }}
                    />
                  </div>

                  {/* Micro Scroll Prompt */}
                  <div className="flex items-center justify-between pt-2 text-xs text-gray-500 font-medium">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-purple-600 animate-ping" />
                      <span>Scroll up / down to transition stages</span>
                    </div>
                    <span className="font-mono text-purple-600 font-bold">
                      {Math.round(scrollProgress * 100)}%
                    </span>
                  </div>
                </div>

              </div>

              {/* ================= RIGHT COLUMN: Fixed Single Position Morphing Card ================= */}
              <div className="lg:col-span-7 relative flex items-center justify-center min-h-[460px] sm:min-h-[500px]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`${activeTab}-${currentStepIndex}`}
                    initial={{ opacity: 0, y: 30, scale: 0.96, filter: 'blur(3px)' }}
                    animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, y: -30, scale: 0.96, filter: 'blur(3px)' }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    className="w-full relative p-7 sm:p-9 rounded-3xl bg-white/95 backdrop-blur-2xl border border-gray-200/90 shadow-[0_20px_60px_rgba(147,51,234,0.12)] group overflow-hidden"
                  >
                    {/* Radiant Glow Behind Card */}
                    <div className={`absolute top-0 right-0 w-72 h-72 rounded-full ${currentStep.bgGlow} blur-3xl -z-10 pointer-events-none transition-all duration-500`} />

                    {/* Card Header */}
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-3.5">
                        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${currentStep.gradient} flex items-center justify-center text-white shadow-lg shadow-purple-500/20`}>
                          <Icon size={26} />
                        </div>
                        <div>
                          <span className="text-[11px] font-bold text-gray-400 tracking-wider uppercase font-mono block">
                            Stage {currentStep.step} of 06
                          </span>
                          <span className="text-xs font-bold text-gray-800 font-mono">
                            {currentStep.tag}
                          </span>
                        </div>
                      </div>

                      {/* Step Highlight Pill & Big Number */}
                      <div className="flex items-center gap-3">
                        <span className={`inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full text-xs font-bold font-mono bg-gray-100 ${currentStep.accentColor} shadow-xs`}>
                          {currentStep.highlight}
                        </span>
                        <span className="text-4xl font-black font-mono text-gray-200">
                          {currentStep.step}
                        </span>
                      </div>
                    </div>

                    {/* Title & Description */}
                    <h3 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-3 tracking-tight">
                      {currentStep.title}
                    </h3>

                    <p className="text-gray-600 text-sm sm:text-base leading-relaxed mb-4">
                      {currentStep.description}
                    </p>

                    {/* Realistic Interactive Mockup / Live Preview Box */}
                    {currentStep.preview}

                    {/* Footer Action Strip */}
                    <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 font-medium">
                      <div className="flex items-center gap-1.5 text-emerald-600 font-semibold">
                        <CheckCircle size={14} />
                        <span>Intelligent Workflow Engine</span>
                      </div>
                      <div className="flex items-center gap-1 text-purple-600 font-bold">
                        <span>Stage {currentStep.step} Active</span>
                        <ChevronRight size={14} />
                      </div>
                    </div>

                  </motion.div>
                </AnimatePresence>
              </div>

            </div>

          </div>
        </div>
      </section>
    </>
  );
};

export default HowItWorks;
