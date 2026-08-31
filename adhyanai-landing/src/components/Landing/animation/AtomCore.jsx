import React, { useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Sparkles, Brain, Shield, Zap, Award, Radio } from 'lucide-react';
import FloatingBadge from './FloatingBadge';
import { playChimeSound } from '../../../utils/audio';

const AtomCore = () => {
  const containerRef = useRef(null);
  const [isOvercharged, setIsOvercharged] = useState(false);

  // Mouse Parallax 3D Physics
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 25, stiffness: 120 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);

  const rotateX = useTransform(smoothY, [-0.5, 0.5], [16, -16]);
  const rotateY = useTransform(smoothX, [-0.5, 0.5], [-16, 16]);

  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  const triggerOvercharge = () => {
    playChimeSound();
    setIsOvercharged(true);
    setTimeout(() => setIsOvercharged(false), 2500);
  };

  const speedMultiplier = isOvercharged ? 0.35 : 1;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={triggerOvercharge}
      className="relative w-full max-w-[340px] xs:max-w-[400px] sm:max-w-[480px] lg:max-w-[560px] aspect-square flex items-center justify-center select-none cursor-pointer scale-[0.82] xs:scale-[0.92] sm:scale-100 transition-transform origin-center"
      style={{ perspective: 1400 }}
      title="Click to supercharge AI Core!"
    >
      {/* 3D Tilt Wrapper */}
      <motion.div
        style={{
          rotateX,
          rotateY,
          transformStyle: 'preserve-3d'
        }}
        className="relative w-full h-full flex items-center justify-center"
      >
        {/* ================= AMBIENT CORE RADIANCE & GLOWS ================= */}
        <div
          className={`absolute w-80 h-80 rounded-full blur-3xl -z-10 transition-all duration-700 pointer-events-none ${
            isOvercharged
              ? 'bg-gradient-to-tr from-cyan-500/40 via-purple-500/40 to-pink-500/40 scale-125'
              : 'bg-gradient-to-tr from-purple-600/30 via-indigo-600/25 to-cyan-400/25'
          }`}
        />
        <div className="absolute w-56 h-56 rounded-full bg-purple-500/20 blur-2xl -z-10 animate-pulse pointer-events-none" />

        {/* Energy Shockwave Ring 1 (Pulse out) */}
        <motion.div
          animate={{
            scale: [0.8, 1.6, 2.1],
            opacity: [0.7, 0.25, 0]
          }}
          transition={{
            duration: isOvercharged ? 1.8 : 3.6,
            repeat: Infinity,
            ease: 'easeOut'
          }}
          className="absolute w-44 h-44 rounded-full border border-purple-500/40 pointer-events-none"
        />

        {/* Energy Shockwave Ring 2 (Delayed pulse) */}
        <motion.div
          animate={{
            scale: [0.8, 1.6, 2.1],
            opacity: [0.6, 0.2, 0]
          }}
          transition={{
            duration: isOvercharged ? 1.8 : 3.6,
            repeat: Infinity,
            ease: 'easeOut',
            delay: isOvercharged ? 0.9 : 1.8
          }}
          className="absolute w-44 h-44 rounded-full border border-cyan-400/40 pointer-events-none"
        />

        {/* ================= 3D ORBITAL RINGS & ELECTRONS ================= */}

        {/* --- Orbit 1: Horizontal / Cyan Orbit --- */}
        <div
          className="absolute w-[380px] h-[380px] rounded-full pointer-events-none"
          style={{
            transform: 'rotateX(72deg) rotateZ(0deg)',
            transformStyle: 'preserve-3d'
          }}
        >
          {/* Subtle Glowing Track */}
          <div className="w-full h-full rounded-full border border-cyan-400/35 shadow-[0_0_20px_rgba(34,211,238,0.2)]" />
          
          {/* Orbiting Particle 1 with glowing comet trail */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 14 * speedMultiplier, repeat: Infinity, ease: 'linear' }}
            className="w-full h-full absolute inset-0"
          >
            {/* Comet Head */}
            <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-cyan-400 shadow-[0_0_16px_#22d3ee] flex items-center justify-center">
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
            </div>
            {/* Trailing glow node */}
            <div className="absolute top-2 left-[44%] w-2 h-2 rounded-full bg-cyan-300/60 blur-[1px]" />
          </motion.div>
        </div>

        {/* --- Orbit 2: +60deg / Electric Indigo-Purple Orbit --- */}
        <div
          className="absolute w-[400px] h-[400px] rounded-full pointer-events-none"
          style={{
            transform: 'rotateX(72deg) rotateZ(60deg)',
            transformStyle: 'preserve-3d'
          }}
        >
          <div className="w-full h-full rounded-full border border-indigo-400/40 shadow-[0_0_22px_rgba(99,102,241,0.25)] border-dashed" />
          
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 18 * speedMultiplier, repeat: Infinity, ease: 'linear' }}
            className="w-full h-full absolute inset-0"
          >
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-indigo-400 shadow-[0_0_14px_#818cf8] flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
            </div>
            {/* Secondary micro-electron on same orbit */}
            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-purple-400 shadow-[0_0_10px_#c084fc]" />
          </motion.div>
        </div>

        {/* --- Orbit 3: -60deg / Fuchsia & Pink Orbit --- */}
        <div
          className="absolute w-[350px] h-[350px] rounded-full pointer-events-none"
          style={{
            transform: 'rotateX(72deg) rotateZ(-60deg)',
            transformStyle: 'preserve-3d'
          }}
        >
          <div className="w-full h-full rounded-full border border-fuchsia-400/35 shadow-[0_0_18px_rgba(217,70,239,0.2)]" />
          
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 16 * speedMultiplier, repeat: Infinity, ease: 'linear' }}
            className="w-full h-full absolute inset-0"
          >
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-fuchsia-400 shadow-[0_0_14px_#e879f9] flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
            </div>
          </motion.div>
        </div>

        {/* --- Orbit 4: Near-Vertical / Emerald Orbit (Extra Depth Axis) --- */}
        <div
          className="absolute w-[360px] h-[360px] rounded-full pointer-events-none"
          style={{
            transform: 'rotateY(75deg) rotateZ(35deg)',
            transformStyle: 'preserve-3d'
          }}
        >
          <div className="w-full h-full rounded-full border border-emerald-400/30 shadow-[0_0_16px_rgba(52,211,153,0.2)] border-dotted" />
          
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 21 * speedMultiplier, repeat: Infinity, ease: 'linear' }}
            className="w-full h-full absolute inset-0"
          >
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-emerald-400 shadow-[0_0_12px_#34d399] flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
            </div>
          </motion.div>
        </div>

        {/* ================= CENTRAL AI QUANTUM NUCLEUS ================= */}
        <motion.div
          style={{ transform: 'translateZ(30px)' }}
          animate={{
            scale: isOvercharged ? [1, 1.12, 1] : [1, 1.05, 1],
            boxShadow: isOvercharged
              ? [
                  '0 0 50px rgba(34, 211, 238, 0.7)',
                  '0 0 90px rgba(168, 85, 247, 0.9)',
                  '0 0 50px rgba(34, 211, 238, 0.7)'
                ]
              : [
                  '0 0 35px rgba(147, 51, 234, 0.45)',
                  '0 0 60px rgba(99, 102, 241, 0.65)',
                  '0 0 35px rgba(147, 51, 234, 0.45)'
                ]
          }}
          transition={{ duration: isOvercharged ? 1.5 : 3.5, repeat: Infinity, ease: 'easeInOut' }}
          className="relative z-20 w-36 h-36 rounded-3xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-cyan-500 p-0.5 flex items-center justify-center group shadow-2xl backdrop-blur-2xl cursor-pointer"
        >
          {/* Inner frosted glass core */}
          <div className="w-full h-full rounded-3xl bg-gray-950/85 backdrop-blur-md flex flex-col items-center justify-center p-3 text-center border border-white/25 group-hover:border-purple-400/60 transition-all duration-300 relative overflow-hidden">
            
            {/* Glowing background cyber grid inside core */}
            <div className="absolute inset-0 bg-[radial-gradient(#818cf8_1px,transparent_1px)] [background-size:10px_10px] opacity-20" />

            {/* Pulsing Neural Brain Badge */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: isOvercharged ? 8 : 22, repeat: Infinity, ease: 'linear' }}
              className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-500 via-indigo-500 to-cyan-400 flex items-center justify-center mb-1.5 shadow-lg relative z-10"
            >
              <Brain className="w-5 h-5 text-white drop-shadow" />
            </motion.div>

            {/* ADHYAN.AI Core Text */}
            <div className="relative z-10">
              <div className="text-white text-xs font-extrabold tracking-tight flex items-center justify-center gap-1">
                <span>ADHYAN</span>
                <span className="text-purple-400">.AI</span>
              </div>
              <div className="text-[10px] text-purple-300 font-mono flex items-center justify-center gap-1.5 mt-0.5">
                <span className={`w-1.5 h-1.5 rounded-full ${isOvercharged ? 'bg-cyan-400 animate-ping' : 'bg-green-400 animate-pulse'}`} />
                <span>{isOvercharged ? 'Supercharged' : 'Core Active'}</span>
              </div>
            </div>

            {/* Micro Sparkle Indicator */}
            <div className="absolute bottom-1 right-2 opacity-50 group-hover:opacity-100 transition-opacity">
              <Sparkles size={10} className="text-cyan-300 animate-spin" style={{ animationDuration: '6s' }} />
            </div>
          </div>
        </motion.div>

        {/* ================= FLOATING SATELLITE BADGES (3D Depth) ================= */}

        {/* Top Right: Instant Quiz Gen */}
        <FloatingBadge
          yAmplitude={8}
          yDuration={3.2}
          xAmplitude={4}
          xDuration={4.5}
          delay={0.1}
          className="absolute -top-3 -right-2 sm:-top-6 sm:-right-6 z-30"
          style={{ transform: 'translateZ(50px)' }}
        >
          <div className="flex items-center gap-2 sm:gap-2.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-2xl bg-white/95 backdrop-blur-md border border-purple-200 shadow-[0_10px_30px_rgba(147,51,234,0.2)] text-gray-800 hover:scale-105 transition-transform">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white shadow-sm shrink-0">
              <Zap size={14} className="fill-white" />
            </div>
            <div>
              <div className="text-[11px] sm:text-xs font-bold text-gray-900 leading-tight">Instant Quiz Gen</div>
              <div className="text-[9px] sm:text-[10px] text-purple-600 font-semibold font-mono">⚡ 1.2s Latency</div>
            </div>
          </div>
        </FloatingBadge>

        {/* Bottom Left: Semantic Grading */}
        <FloatingBadge
          yAmplitude={9}
          yDuration={4.0}
          xAmplitude={3}
          xDuration={3.6}
          delay={0.3}
          className="absolute -bottom-3 -left-2 sm:-bottom-6 sm:-left-8 z-30"
          style={{ transform: 'translateZ(45px)' }}
        >
          <div className="flex items-center gap-2 sm:gap-2.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-2xl bg-white/95 backdrop-blur-md border border-emerald-200 shadow-[0_10px_30px_rgba(16,185,129,0.2)] text-gray-800 hover:scale-105 transition-transform">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white shadow-sm shrink-0">
              <Award size={14} />
            </div>
            <div>
              <div className="text-[11px] sm:text-xs font-bold text-gray-900 leading-tight">Semantic Grading</div>
              <div className="text-[9px] sm:text-[10px] text-emerald-600 font-semibold font-mono">🎯 96% Accuracy</div>
            </div>
          </div>
        </FloatingBadge>

        {/* Top Left: Anti-Cheat Shield */}
        <FloatingBadge
          yAmplitude={6}
          yDuration={3.8}
          xAmplitude={3}
          xDuration={4.8}
          delay={0.5}
          className="absolute top-4 -left-2 sm:top-10 sm:-left-10 z-30 hidden sm:block"
          style={{ transform: 'translateZ(40px)' }}
        >
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/90 backdrop-blur-md border border-cyan-200 shadow-[0_8px_25px_rgba(6,182,212,0.18)] text-gray-800 hover:scale-105 transition-transform">
            <Shield size={14} className="text-cyan-600 shrink-0" />
            <div>
              <span className="text-[11px] font-bold text-gray-800 block leading-tight">Proctored & Secure</span>
              <span className="text-[9px] text-gray-500 font-medium">Real-time Anti-Cheat</span>
            </div>
          </div>
        </FloatingBadge>

        {/* Bottom Right: Live AI Whiteboard */}
        <FloatingBadge
          yAmplitude={7}
          yDuration={4.2}
          xAmplitude={3}
          xDuration={4.0}
          delay={0.7}
          className="absolute bottom-6 -right-2 sm:bottom-12 sm:-right-10 z-30 hidden sm:block"
          style={{ transform: 'translateZ(35px)' }}
        >
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/90 backdrop-blur-md border border-indigo-200 shadow-[0_8px_25px_rgba(99,102,241,0.18)] text-gray-800 hover:scale-105 transition-transform">
            <Radio size={14} className="text-indigo-600 shrink-0 animate-pulse" />
            <div>
              <span className="text-[11px] font-bold text-gray-800 block leading-tight">Live Classroom</span>
              <span className="text-[9px] text-indigo-600 font-medium">AI Sync Active</span>
            </div>
          </div>
        </FloatingBadge>

      </motion.div>
    </div>
  );
};

export default AtomCore;
