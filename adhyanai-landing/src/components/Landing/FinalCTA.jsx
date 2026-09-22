import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Wand2, Sparkles } from 'lucide-react';

const FinalCTA = () => {
  const STUDENT_URL = import.meta.env.VITE_STUDENT_URL || "https://student.adhyanai.tech/";
  const TEACHER_URL = import.meta.env.VITE_TEACHER_URL || "https://teacher.adhyanai.tech/login";

  return (
    <section className="py-24 sm:py-32 relative overflow-hidden bg-gray-950">

      {/* Background radiant aura glow */}
      <div className="absolute inset-0 pointer-events-none -z-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-gradient-to-r from-purple-600/25 via-indigo-600/25 to-cyan-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s' }} />
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-900/60 border border-purple-500/30 text-purple-300 text-xs sm:text-sm font-semibold mb-6 backdrop-blur-md">
            <Sparkles size={14} className="text-purple-400" />
            <span>Ready to Elevate Learning?</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-6xl font-extrabold text-white mb-6 tracking-tight leading-tight">
            Ready to{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-indigo-300 to-cyan-400">
              Transform
            </span>{' '}
            Your Classroom?
          </h2>

          <p className="text-base sm:text-xl text-gray-300 mb-10 max-w-2xl mx-auto leading-relaxed">
            Join thousands of educators and students who are already experiencing the future of education with ADHYAN.AI
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a
              href={STUDENT_URL}
              className="w-full sm:w-auto group inline-flex items-center justify-center gap-2.5 px-8 py-4 text-base font-bold text-white bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 rounded-full shadow-[0_10px_30px_rgba(147,51,234,0.4)] hover:shadow-[0_15px_40px_rgba(147,51,234,0.6)] transform hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer"
            >
              <span>Start as Student</span>
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </a>

            <a
              href={TEACHER_URL}
              className="w-full sm:w-auto group inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold text-white bg-white/10 border border-white/20 rounded-full hover:bg-white/20 hover:border-white/30 backdrop-blur-md shadow-sm transform hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
            >
              <Wand2 size={18} className="text-purple-300" />
              <span>Start as Teacher</span>
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default FinalCTA;
