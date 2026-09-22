import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Brain,
  BookOpen,
  CheckCircle,
  Zap,
  GraduationCap,
  Send,
  Users,
  Shield,
  TrendingUp,
  Eye,
  BarChart3,
} from 'lucide-react';

const ease = [0.22, 1, 0.36, 1];

const PROMPT_TEXT = '"Generate a 10-question quiz on Photosynthesis for Grade 10 with mixed difficulty..."';

/* ─── Fast typing hook ─── */
const useTypingEffect = (text, speed = 12, delay = 300) => {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  useEffect(() => {
    let i = 0;
    const timeout = setTimeout(() => {
      const interval = setInterval(() => {
        if (i < text.length) {
          setDisplayed(text.slice(0, i + 1));
          i++;
        } else {
          clearInterval(interval);
          setDone(true);
        }
      }, speed);
      return () => clearInterval(interval);
    }, delay);
    return () => clearTimeout(timeout);
  }, [text, speed, delay]);
  return { displayed, done };
};

/* ─── Quiz data ─── */
const quizItems = [
  { q: 'What is the primary pigment in photosynthesis?', type: 'MCQ', difficulty: 'Easy' },
  { q: 'Explain the light-dependent reactions...', type: 'Subjective', difficulty: 'Medium' },
  { q: 'Compare C3 and C4 pathways of carbon fixation.', type: 'Long Answer', difficulty: 'Hard' },
];

const difficultyStyles = {
  Easy: 'bg-emerald-50 text-emerald-600',
  Medium: 'bg-amber-50 text-amber-600',
  Hard: 'bg-rose-50 text-rose-600',
};

/* ─── Mini progress ring ─── */
const MiniRing = ({ value = 96, size = 36, sw = 3 }) => {
  const r = (size - sw) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} className="transform -rotate-90 shrink-0">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(147,51,234,0.08)" strokeWidth={sw} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="url(#rg)" strokeWidth={sw}
        strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (value / 100) * c} />
      <defs>
        <linearGradient id="rg" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
      </defs>
    </svg>
  );
};

/* ─── Analytics mini-bars ─── */
const AnalyticsBars = () => {
  const bars = [
    { h: '55%', color: 'from-rose-400 to-rose-500' },
    { h: '40%', color: 'from-amber-400 to-amber-500' },
    { h: '70%', color: 'from-emerald-400 to-emerald-500' },
    { h: '90%', color: 'from-purple-400 to-indigo-500' },
  ];
  return (
    <div className="flex items-end gap-[5px] h-[36px]">
      {bars.map((b, i) => (
        <motion.div
          key={i}
          initial={{ height: 0 }}
          animate={{ height: b.h }}
          transition={{ duration: 0.5, delay: 0.3 + i * 0.08, ease }}
          className={`w-[8px] rounded-t-sm bg-gradient-to-t ${b.color}`}
        />
      ))}
    </div>
  );
};

/* ════════════════════════════════════════════════════════ */
const HeroVisual = () => {
  const { displayed: typedPrompt, done: promptDone } = useTypingEffect(PROMPT_TEXT, 12, 300);
  const [showQuiz, setShowQuiz] = useState(false);

  useEffect(() => {
    if (promptDone) {
      const t = setTimeout(() => setShowQuiz(true), 200);
      return () => clearTimeout(t);
    }
  }, [promptDone]);

  return (
    <div className="relative w-full max-w-[540px] mx-auto select-none">
      {/* ── Ambient glow ── */}
      <div className="absolute -inset-8 bg-gradient-to-tr from-purple-400/20 via-indigo-400/12 to-cyan-400/8 rounded-[44px] blur-[50px] pointer-events-none" />

      {/* ═══════════════ MAIN CARD ═══════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.15, ease }}
        className="relative"
      >
        <div className="bg-white/80 backdrop-blur-2xl border border-white/70 rounded-[24px] shadow-[0_20px_60px_rgba(147,51,234,0.12),0_6px_24px_rgba(0,0,0,0.05)] overflow-hidden">

          {/* ── Window Chrome ── */}
          <div className="flex items-center gap-2 px-5 pt-4 pb-3 border-b border-gray-100/70">
            <div className="flex gap-[6px]">
              <span className="w-[10px] h-[10px] rounded-full bg-[#ff5f57]" />
              <span className="w-[10px] h-[10px] rounded-full bg-[#febc2e]" />
              <span className="w-[10px] h-[10px] rounded-full bg-[#28c840]" />
            </div>
            <div className="flex-1 mx-3">
              <div className="h-[26px] bg-gray-50/90 rounded-lg flex items-center justify-center px-3 border border-gray-100/40">
                <div className="flex items-center gap-1.5">
                  <Shield size={10} className="text-emerald-500" />
                  <span className="text-[10px] text-gray-400 font-mono tracking-wide">adhyanai.tech/classroom</span>
                </div>
              </div>
            </div>
            <div className="w-7 h-7 rounded-lg bg-purple-50/80 flex items-center justify-center border border-purple-100/50">
              <Brain size={13} className="text-purple-600" />
            </div>
          </div>

          {/* ── Card Body ── */}
          <div className="p-5 sm:p-6 space-y-3.5">

            {/* Teacher Prompt Box */}
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.25, ease }}
            >
              <div className="bg-gradient-to-br from-slate-50/90 to-gray-50/60 rounded-2xl p-3.5 border border-gray-200/40">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 via-indigo-500 to-purple-700 flex items-center justify-center shrink-0 shadow-md shadow-purple-500/20">
                    <GraduationCap size={14} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[10px] font-bold text-gray-800 tracking-wide uppercase">Teacher Prompt</p>
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: promptDone ? 1 : 0 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 18 }}
                      >
                        <div className="w-5 h-5 rounded-md bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                          <Send size={8} className="text-white" />
                        </div>
                      </motion.div>
                    </div>
                    <p className="text-[11px] text-gray-500 leading-relaxed">
                      {typedPrompt}
                      {!promptDone && (
                        <motion.span
                          animate={{ opacity: [1, 0] }}
                          transition={{ duration: 0.5, repeat: Infinity }}
                          className="inline-block w-[2px] h-3 bg-purple-500 ml-0.5 align-text-bottom"
                        />
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* AI Processing indicator */}
            <AnimatePresence>
              {promptDone && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-center gap-2 px-1">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-50/80 border border-purple-100/60">
                      <motion.div
                        animate={{ rotate: [0, 360] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                      >
                        <Sparkles size={11} className="text-purple-500" />
                      </motion.div>
                      <span className="text-[10px] font-semibold text-purple-700">AI Processing</span>
                      <div className="flex gap-[2px]">
                        {[0, 1, 2].map((i) => (
                          <motion.span
                            key={i}
                            animate={{ scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] }}
                            transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
                            className="w-[3px] h-[3px] rounded-full bg-purple-400"
                          />
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 px-2 py-1.5 rounded-full bg-emerald-50/80 border border-emerald-100/60">
                      <Zap size={10} className="text-emerald-500" />
                      <span className="text-[10px] font-bold text-emerald-700">1.2s</span>
                    </div>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: '100%' }}
                      transition={{ duration: 0.8, ease }}
                      className="h-[2px] flex-1 rounded-full bg-gradient-to-r from-purple-400 via-indigo-400 to-cyan-400"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Generated Quiz Questions */}
            <AnimatePresence>
              {showQuiz && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-2"
                >
                  {quizItems.map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: 16, scale: 0.97 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      transition={{ duration: 0.35, delay: i * 0.1, ease }}
                      className="group flex items-center gap-2.5 p-2.5 rounded-xl bg-white/90 border border-gray-100/70 shadow-[0_1px_4px_rgba(0,0,0,0.03)] hover:shadow-[0_3px_12px_rgba(147,51,234,0.08)] hover:border-purple-200/60 transition-all duration-200"
                    >
                      <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center shrink-0 border border-purple-200/30">
                        <span className="text-[9px] font-bold text-purple-700">{i + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] text-gray-700 font-medium leading-snug truncate">{item.q}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[8px] px-1.5 py-[1px] rounded bg-indigo-50 text-indigo-600 font-semibold">{item.type}</span>
                          <span className={`text-[8px] px-1.5 py-[1px] rounded font-semibold ${difficultyStyles[item.difficulty]}`}>{item.difficulty}</span>
                        </div>
                      </div>
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 18, delay: 0.15 + i * 0.1 }}
                      >
                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shrink-0">
                          <CheckCircle size={10} className="text-white" />
                        </div>
                      </motion.div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Bottom Action Bar */}
            <AnimatePresence>
              {showQuiz && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.35 }}
                  className="flex items-center justify-between pt-3 border-t border-gray-100/70"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <BookOpen size={11} className="text-gray-400" />
                      <span className="text-[9px] text-gray-500 font-medium">10 questions</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users size={10} className="text-gray-400" />
                      <span className="text-[9px] text-gray-500 font-medium">Grade 10</span>
                    </div>
                  </div>
                  <motion.div
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.97 }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-500 via-indigo-500 to-purple-600 text-white shadow-md shadow-purple-500/20 cursor-pointer"
                  >
                    <span className="text-[9px] font-bold tracking-wide">Publish Quiz</span>
                    <Send size={8} className="text-white/90" />
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {/* ═══════════════ FLOATING BADGES ═══════════════ */}

      {/* Top-right: AI-Powered badge */}
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.4, ease }}
        className="absolute -top-4 -right-2 sm:-right-6 z-20"
      >
        <motion.div
          animate={{ y: [-4, 4, -4] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
          className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-white/95 backdrop-blur-md border border-purple-100/50 shadow-[0_10px_30px_rgba(147,51,234,0.15)]"
        >
          <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 flex items-center justify-center text-white shadow-sm shadow-amber-500/25">
            <Zap size={13} className="fill-white" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-gray-900 leading-tight">AI-Powered</div>
            <div className="text-[8px] text-purple-600 font-semibold">Smart Grading</div>
          </div>
        </motion.div>
      </motion.div>

      {/* Bottom-left: Accuracy badge with mini ring */}
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.55, ease }}
        className="absolute -bottom-4 -left-2 sm:-left-6 z-20"
      >
        <motion.div
          animate={{ y: [3, -5, 3] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-white/95 backdrop-blur-md border border-emerald-100/50 shadow-[0_10px_30px_rgba(16,185,129,0.14)]"
        >
          <div className="relative">
            <MiniRing />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[8px] font-black text-purple-600">96</span>
            </div>
          </div>
          <div>
            <div className="text-[10px] font-bold text-gray-900 leading-tight">96% Accuracy</div>
            <div className="text-[8px] text-emerald-600 font-semibold">Semantic Analysis</div>
          </div>
        </motion.div>
      </motion.div>

    </div>
  );
};

export default HeroVisual;
