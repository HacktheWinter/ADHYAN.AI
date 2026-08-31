import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Wand2, Sparkles, CheckCircle2 } from 'lucide-react';
import ParticleCanvas from './animation/ParticleCanvas';
import AtomCore from './animation/AtomCore';

const Hero = () => {
  const STUDENT_URL = import.meta.env.VITE_STUDENT_URL || "https://student.adhyanai.tech/";
  const TEACHER_URL = import.meta.env.VITE_TEACHER_URL || "https://teacher.adhyanai.tech/login";

  // Staggered entrance animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12,
        delayChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
    }
  };

  return (
    <section id="hero" className="relative overflow-hidden pt-28 pb-20 lg:pt-36 lg:pb-32 min-h-[90vh] flex items-center">
      {/* Background Interactive Particle Canvas */}
      <ParticleCanvas
        particleCount={55}
        particleColor="rgba(147, 51, 234, 0.35)"
        lineColor="rgba(99, 102, 241, 0.12)"
        interactionMode="attract"
      />

      {/* Radiant Gradient Background Auras */}
      <div className="absolute top-0 left-0 w-full h-full -z-20 bg-gradient-to-b from-purple-50/70 via-white to-indigo-50/50 pointer-events-none" />
      <div className="absolute top-1/4 right-10 w-[550px] h-[550px] bg-gradient-to-br from-purple-300/30 via-indigo-300/20 to-cyan-200/20 rounded-full blur-3xl -z-10 pointer-events-none animate-pulse" style={{ animationDuration: '8s' }} />
      <div className="absolute -bottom-20 left-10 w-[450px] h-[450px] bg-gradient-to-tr from-blue-300/25 to-purple-200/20 rounded-full blur-3xl -z-10 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* ================= LEFT CONTENT COLUMN ================= */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="lg:col-span-7 text-center lg:text-left"
          >
            {/* Top Pill Tag */}
            <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-100/90 border border-purple-200/80 text-purple-800 text-xs sm:text-sm font-semibold mb-6 shadow-sm backdrop-blur-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <Sparkles size={14} className="text-purple-600 shrink-0" />
              <span>Revolutionizing Education with AI</span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              variants={itemVariants}
              className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-gray-900 mb-6 leading-[1.12]"
            >
              Transform Your{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600">
                Learning Journey
              </span>
            </motion.h1>

            {/* Subheading (Original Exact Copy) */}
            <motion.p
              variants={itemVariants}
              className="text-lg sm:text-xl text-gray-600 mb-8 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-normal"
            >
              Create, manage, and track educational content with intelligent tools designed for modern classrooms. Empowering students and teachers alike with AI-driven insights.
            </motion.p>

            {/* Dual CTA System */}
            <motion.div
              variants={itemVariants}
              className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start items-center mb-10"
            >
              <a
                href={STUDENT_URL}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 text-base font-bold text-white bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-700 rounded-full shadow-[0_10px_25px_rgba(147,51,234,0.35)] hover:shadow-[0_15px_35px_rgba(147,51,234,0.5)] transform hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 group cursor-pointer"
              >
                <span>Start as Student</span>
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </a>

              <a
                href={TEACHER_URL}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold text-gray-800 bg-white/90 border border-gray-200/90 rounded-full hover:bg-gray-50 hover:border-gray-300 shadow-sm hover:shadow-md transform hover:-translate-y-0.5 transition-all duration-200 backdrop-blur-sm cursor-pointer"
              >
                <Wand2 size={18} className="text-purple-600" />
                <span>Start as Teacher</span>
              </a>
            </motion.div>

            {/* Micro Trust Strip */}
            <motion.div
              variants={itemVariants}
              className="flex flex-wrap items-center justify-center lg:justify-start gap-6 text-xs sm:text-sm text-gray-500 pt-4 border-t border-gray-200/60"
            >
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={16} className="text-emerald-600" />
                <span>Zero setup required</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={16} className="text-emerald-600" />
                <span>Free for learners</span>
              </div>
            </motion.div>
          </motion.div>

          {/* ================= RIGHT VISUAL COLUMN: ATOM CORE (Hidden on Mobile, Visible on Tablet/Desktop) ================= */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="hidden md:flex lg:col-span-5 items-center justify-center relative"
          >
            <AtomCore />
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
