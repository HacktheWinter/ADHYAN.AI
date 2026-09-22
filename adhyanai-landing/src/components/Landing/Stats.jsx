import React, { useEffect, useState, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { UserCheck, School, FileCheck, Smile } from 'lucide-react';

// Smooth number counter from 0 to target value with easeOutExpo easing
const AnimatedCounter = ({ target, suffix = '', duration = 2.2 }) => {
  const [displayValue, setDisplayValue] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-30px' });

  useEffect(() => {
    if (!isInView) return;

    let startTime = null;
    let animationFrameId;

    // Smooth exponential ease-out curve
    const easeOutExpo = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);
      const easedProgress = easeOutExpo(progress);
      const current = Math.floor(easedProgress * target);

      setDisplayValue(current);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      } else {
        setDisplayValue(target);
      }
    };

    animationFrameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isInView, target, duration]);

  return (
    <span ref={ref}>
      {displayValue.toLocaleString()}
      {suffix}
    </span>
  );
};

const Stats = () => {
  const stats = [
    {
      icon: UserCheck,
      target: 1000,
      suffix: "+",
      label: "Active Students",
      color: "text-blue-400",
      glowColor: "group-hover:border-blue-500/30"
    },
    {
      icon: School,
      target: 500,
      suffix: "+",
      label: "Educators Onboard",
      color: "text-purple-400",
      glowColor: "group-hover:border-purple-500/30"
    },
    {
      icon: FileCheck,
      target: 50000,
      suffix: "+",
      label: "Assessments Generated",
      color: "text-indigo-400",
      glowColor: "group-hover:border-indigo-500/30"
    },
    {
      icon: Smile,
      target: 98,
      suffix: "%",
      label: "Satisfaction Rate",
      color: "text-emerald-400",
      glowColor: "group-hover:border-emerald-500/30"
    }
  ];

  return (
    <section className="py-24 bg-gradient-to-br from-gray-950 via-indigo-950 to-purple-950 relative overflow-hidden">


      {/* Background Ambient Glows */}
      <div className="absolute inset-0 opacity-20 pointer-events-none -z-10">
        <div className="absolute top-0 left-1/4 w-72 h-72 bg-purple-500 rounded-full mix-blend-screen filter blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-indigo-500 rounded-full mix-blend-screen filter blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 text-center">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 24, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -5 }}
              className={`p-6 sm:p-8 rounded-3xl bg-white/[0.04] backdrop-blur-md border border-white/10 hover:bg-white/[0.07] ${stat.glowColor} transition-all duration-300 shadow-xl group`}
            >
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/10 shadow-inner group-hover:scale-110 transition-transform duration-300">
                  <stat.icon size={22} className={stat.color} />
                </div>
              </div>

              <div className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-2 tracking-tight">
                <AnimatedCounter
                  target={stat.target}
                  suffix={stat.suffix}
                  duration={2.0 + index * 0.2}
                />
              </div>

              <div className="text-gray-300 text-xs sm:text-sm font-medium">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Stats;
