import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Video,
  Megaphone,
  Calendar,
  FileQuestion,
  ClipboardList,
  MessageSquareMore,
  TrendingUp,
  MessageCircle,
  Shield,
  Sparkles,
  Zap,
  CheckCircle2,
  Activity,
  Award
} from 'lucide-react';

const Features = () => {
  const containerRef = useRef(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };


  // Complete, authentic 9 core features of ADHYAN.AI
  const features = [
    {
      icon: FileQuestion,
      title: "Generate Question Paper",
      description: "Create comprehensive exams instantly from syllabus notes, PDFs, or textbook topics. Generate structured Multiple Choice, Short Answer, and Long Answer questions with automated answer keys.",
      tag: "Flagship AI",
      gradient: "from-purple-600 to-indigo-600",
      featured: true,
      colSpan: "lg:col-span-2",
      preview: (
        <div className="mt-4 bg-gray-950 rounded-2xl p-4 border border-gray-800 text-left shadow-inner">
          <div className="flex items-center justify-between mb-2 text-xs text-gray-400 font-mono border-b border-gray-800 pb-2">
            <span className="text-purple-400">Input: Biology / Cellular Respiration</span>
            <span className="text-emerald-400 font-semibold">⚡ Generated in 0.8s</span>
          </div>
          <p className="text-gray-200 text-xs sm:text-sm font-medium mb-2">
            Q. What is the net yield of ATP molecules per glucose molecule in aerobic respiration?
          </p>
          <div className="grid grid-cols-1 xs:grid-cols-2 gap-2 text-xs">
            <div className="p-2 rounded-lg bg-gray-900 border border-gray-800 text-gray-400">A) 2 ATP</div>
            <div className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 font-semibold flex items-center justify-between">
              <span>B) 36-38 ATP</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">Correct</span>
            </div>
          </div>
        </div>
      )
    },
    {
      icon: Video,
      title: "Live Classes",
      description: "Conduct interactive live sessions with integrated digital whiteboard, seamless screen sharing, and automatic session recording for on-demand student revision.",
      tag: "Live Classroom",
      gradient: "from-blue-500 to-indigo-500",
      colSpan: "lg:col-span-1"
    },
    {
      icon: MessageSquareMore,
      title: "Instant Feedback & Semantic Grading",
      description: "Provide AI-assisted subjective grading that understands context and conceptual grasp against structured rubrics, offering constructive suggestions to guide student improvement.",
      tag: "AI Evaluation",
      gradient: "from-emerald-500 to-teal-600",
      featured: true,
      colSpan: "lg:col-span-2",
      preview: (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-gray-50 rounded-2xl p-3.5 border border-gray-200">
          <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-xs">
            <div className="text-[11px] font-semibold text-gray-500 mb-1">Student Answer</div>
            <p className="text-xs text-gray-700 italic">"Mitochondria synthesizes ATP through oxidative phosphorylation..."</p>
          </div>
          <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200">
            <div className="flex items-center justify-between text-xs font-bold text-emerald-800 mb-1">
              <span>AI Evaluation</span>
              <span className="bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full text-[10px]">9.5 / 10</span>
            </div>
            <p className="text-[11px] text-emerald-700">Accurately identifies key biochemical mechanism.</p>
          </div>
        </div>
      )
    },
    {
      icon: ClipboardList,
      title: "Generate Assignments",
      description: "Design engaging homework and research tasks in seconds. Specify difficulty levels, submission guidelines, and automatically structure problem-solving prompts.",
      tag: "Smart Homework",
      gradient: "from-cyan-500 to-teal-500",
      colSpan: "lg:col-span-1"
    },
    {
      icon: Calendar,
      title: "Interactive Academic Calendar",
      description: "Stay organized with a centralized calendar for scheduling live lectures, setting assignment deadlines, and tracking exam dates across all your enrolled batches.",
      tag: "Organization",
      gradient: "from-purple-500 to-pink-500",
      colSpan: "lg:col-span-1"
    },
    {
      icon: Megaphone,
      title: "Smart Announcements",
      description: "Keep students and faculty aligned with rich-text announcements, critical timetable alerts, and downloadable file attachments delivered in real-time.",
      tag: "Communication",
      gradient: "from-yellow-500 to-orange-500",
      colSpan: "lg:col-span-1"
    },
    {
      icon: TrendingUp,
      title: "Progress Tracking & Analytics",
      description: "Comprehensive analytics and visual insights for educators and students to identify individual learning gaps, track score trends, and export gradebooks.",
      tag: "Analytics",
      gradient: "from-orange-500 to-amber-500",
      colSpan: "lg:col-span-1"
    },
    {
      icon: MessageCircle,
      title: "Real-Time Collaboration",
      description: "Encourage active peer learning with class channels, instant doubt clearing, and collaborative discussions between teachers and students.",
      tag: "Community",
      gradient: "from-emerald-500 to-green-500",
      colSpan: "lg:col-span-1"
    },
    {
      icon: Shield,
      title: "Secure & Anti-Cheat Proctoring",
      description: "Conduct high-stakes assessments with confidence using fullscreen lock enforcement, tab-switch monitoring, and 100% encrypted exam submissions.",
      tag: "Integrity",
      gradient: "from-rose-500 to-red-500",
      colSpan: "lg:col-span-2"
    }
  ];

  return (
    <section id="features" className="py-24 bg-gray-50/50 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-gradient-to-r from-purple-200/20 via-indigo-100/20 to-blue-200/20 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-xs sm:text-sm font-semibold mb-4"
          >
            <Sparkles size={14} />
            <span>Platform Capabilities</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, delay: 0.1 }}
            className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-4 tracking-tight"
          >
            Capabilities that{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600">
              Empower You
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, delay: 0.15 }}
            className="text-lg text-gray-600 max-w-2xl mx-auto"
          >
            Everything you need to transform the educational experience, derived from advanced AI technology.
          </motion.p>
        </div>

        {/* Bento Grid with Cursor Spotlight */}
        <div
          ref={containerRef}
          onMouseMove={handleMouseMove}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {/* Spotlight overlay */}
          {isHovered && (
            <div
              className="pointer-events-none absolute -inset-px rounded-3xl opacity-100 transition-opacity duration-300 -z-0"
              style={{
                background: `radial-gradient(650px circle at ${mousePos.x}px ${mousePos.y}px, rgba(147, 51, 234, 0.08), transparent 70%)`
              }}
            />
          )}

          {features.map((feature, index) => {
            const Icon = feature.icon;
            // Column-based staggered delay for cards entering in the same viewport band
            const colDelay = (index % 3) * 0.1;

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 35, scale: 0.94 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{
                  duration: 0.55,
                  delay: colDelay,
                  ease: [0.22, 1, 0.36, 1]
                }}
                whileHover={{ y: -5, transition: { duration: 0.2 } }}
                className={`${feature.colSpan || 'lg:col-span-1'} relative p-5 xs:p-6 sm:p-7 lg:p-8 rounded-3xl bg-white border border-gray-200/80 shadow-sm hover:shadow-xl transition-shadow duration-300 flex flex-col justify-between group overflow-hidden`}
              >
                <div>
                  <div className="flex items-center justify-between mb-5 sm:mb-6">
                    <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center text-white shadow-md shadow-purple-500/15 group-hover:scale-110 transition-transform duration-300`}>
                      <Icon size={22} />
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold font-mono">
                      {feature.tag}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-gray-900 mb-2.5 group-hover:text-purple-600 transition-colors">
                    {feature.title}
                  </h3>

                  <p className="text-gray-600 leading-relaxed text-sm">
                    {feature.description}
                  </p>
                </div>

                {feature.preview && feature.preview}
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Features;
