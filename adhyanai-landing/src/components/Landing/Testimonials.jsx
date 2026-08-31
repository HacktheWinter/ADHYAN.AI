import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, RotateCw, Sparkles, Quote, ExternalLink } from 'lucide-react';
import { playFlipSound } from '../../utils/audio';

const TestimonialCard = ({ member, isCenter, onSelect }) => {
  const [isFlipped, setIsFlipped] = useState(false);

  // Reset flip state when card is no longer in center
  useEffect(() => {
    if (!isCenter && isFlipped) {
      setIsFlipped(false);
    }
  }, [isCenter]);

  const handleClick = () => {
    playFlipSound();
    if (isCenter) {
      setIsFlipped(!isFlipped);
    } else {
      onSelect();
    }
  };

  return (
    <div
      className="h-[410px] sm:h-[440px] w-full group cursor-pointer select-none"
      onClick={handleClick}
      title={isCenter ? "Click to flip and read contributions" : `Click to bring ${member.name} to front`}
      style={{
        transform: 'translate3d(0, 0, 0)',
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale'
      }}
    >
      <motion.div
        className="relative w-full h-full"
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* ================= FRONT FACE ================= */}
        <div
          className="absolute inset-0 w-full h-full rounded-3xl bg-white border border-gray-200/90 shadow-[0_10px_35px_rgba(0,0,0,0.06)] p-5 sm:p-8 flex flex-col items-center text-center justify-between overflow-hidden"
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: 'translateZ(1px)'
          }}
        >
          {/* Avatar with Soft Radiant Colored Glow Aura */}
          <div className="relative mt-2 sm:mt-3 mb-3 sm:mb-4">
            <div className={`absolute -inset-2 rounded-full bg-gradient-to-br ${member.color} blur-lg opacity-40 group-hover:opacity-75 transition-opacity duration-300`} />
            <img 
              src={member.image} 
              alt={member.name}
              className="w-28 h-28 xs:w-32 xs:h-32 sm:w-36 sm:h-36 rounded-full object-cover border-4 border-white shadow-xl relative z-10 bg-gray-100 group-hover:scale-105 transition-transform duration-300"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&h=300&fit=crop&crop=face";
              }}
            />
          </div>
          
          {/* Name & Role */}
          <div className="relative z-10 flex-grow flex flex-col justify-center">
            <h4 className="font-extrabold text-gray-900 text-xl sm:text-2xl mb-1.5 tracking-tight">
              {member.name}
            </h4>
            <p className="text-purple-700 font-semibold text-xs sm:text-sm px-3 py-1 rounded-full bg-purple-50 border border-purple-200/60 inline-block mx-auto">
              {member.role}
            </p>
          </div>

          {/* Micro Tech Skill Pills */}
          <div className="flex flex-wrap justify-center gap-1.5 my-2">
            {member.skills.slice(0, 3).map((skill, sIdx) => (
              <span
                key={sIdx}
                className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-[10px] font-medium font-mono"
              >
                {skill}
              </span>
            ))}
          </div>

          {/* Interactive Flip Badge Prompt */}
          <div className="mt-2 text-xs font-semibold text-purple-600 flex items-center gap-1.5 bg-purple-50/80 px-3.5 py-1.5 rounded-full border border-purple-100">
            <RotateCw size={12} className="text-purple-500" />
            <span>Click to view contributions</span>
          </div>
        </div>

        {/* ================= BACK FACE ================= */}
        <div 
          className="absolute inset-0 w-full h-full rounded-3xl shadow-xl overflow-hidden"
          style={{
            transform: "rotateY(180deg) translateZ(1px)",
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden"
          }}
        >
          {/* Rich Gradient Backdrop */}
          <div className={`absolute inset-0 bg-gradient-to-br ${member.color} opacity-95`}></div>
          <div className="absolute inset-0 bg-gray-950/20"></div>
          
          <div className="relative h-full flex flex-col items-center justify-between p-6 sm:p-8 text-white text-center z-10">
            
            {/* Header with developer badge */}
            <div className="w-full flex items-center justify-between border-b border-white/20 pb-3">
              <span className="text-xs font-mono font-bold tracking-wider uppercase text-white/80">
                Core Contribution
              </span>
              <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full text-white font-medium">
                Verified
              </span>
            </div>

            {/* Contribution Quote */}
            <div className="my-auto relative px-2">
              <Quote className="w-7 h-7 text-white/30 mx-auto mb-2 rotate-180" />
              <p className="text-xs sm:text-sm leading-relaxed font-normal text-white drop-shadow-xs">
                "{member.content}"
              </p>
            </div>

            {/* Back Footer with Portfolio Link on Left & Flip Prompt on Right */}
            <div className="w-full pt-3 border-t border-white/20 flex items-center justify-between text-xs text-white/90">
              {member.portfolio ? (
                <a
                  href={member.portfolio}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1.5 font-bold text-white hover:text-cyan-200 transition-colors bg-white/15 hover:bg-white/25 px-2.5 py-1 rounded-lg border border-white/20 shadow-xs"
                  title={`Open ${member.name}'s Portfolio in new window`}
                >
                  <span>{member.name}</span>
                  <ExternalLink size={12} />
                </a>
              ) : (
                <span className="font-bold text-white text-sm">{member.name}</span>
              )}

              <div className="flex items-center gap-1 text-white/80 hover:text-white transition-colors cursor-pointer">
                <RotateCw size={12} className="rotate-180" />
                <span>Flip back</span>
              </div>
            </div>
            
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const Testimonials = () => {
  const teamMembers = [
    {
      name: "Aman Singh Kunwar",
      role: "Lead Frontend & UI/UX Designer",
      content: "Crafted intuitive user interfaces and modern responsive experiences across the entire platform, leading the frontend architecture, visual design systems, and seamless user interaction flows.",
      image: "/aman.jpg",
      color: "from-cyan-500 via-teal-500 to-blue-600",
      skills: ["UI/UX Design", "React.js", "Frontend Architecture", "Tailwind CSS"],
      portfolio: "https://aman-singh-kunwar-portfolio1.onrender.com/"
    },
    {
      name: "Harikesh Kumar",
      role: "Full Stack & AI Integration",
      content: "Worked on both frontend and backend development, integrated AI features into the application, and ensured seamless communication between system components.",
      image: "/harikesh.jpg",
      color: "from-emerald-600 via-teal-600 to-green-600",
      skills: ["React.js", "Node.js", "AI Integration", "Tailwind"]
    },
    {
      name: "Lucky Singh Panwar",
      role: "Concept Designer & Rnd Lead",
      content: "Worked on concept design and research & development of the project, focusing on idea validation and strategic execution.",
      image: "/lucky.jpeg",
      color: "from-purple-600 via-indigo-600 to-purple-700",
      skills: ["Concept Design", "R&D", "UI/UX", "Product Strategy"]
    },
    {
      name: "Deepak Singh Rawat",
      role: "Backend API, Live Class & AI Features",
      content: "Built scalable backend features and data models, implemented real-time live class functionality, and integrated AI features into the application.",
      image: "/deepak.jpeg",
      color: "from-blue-600 via-indigo-600 to-violet-600",
      skills: ["Backend APIs", "Live Classes", "WebRTC", "Data Models"],
      portfolio: "https://deepaksinghrawatportfolio.netlify.app/"
    },
    {
      name: "Lalit Nandan",
      role: "Simulation & Testing Analyst",
      content: "Conducted thorough testing and analysis of the application to ensure its functionality and reliability, covering user interaction flows.",
      image: "/lalit.jpeg",
      color: "from-orange-500 via-amber-500 to-rose-500",
      skills: ["Testing & QA", "Simulations", "Flow Verification", "Audits"]
    }
  ];

  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [touchStart, setTouchStart] = useState(null);

  // Auto-play interval with hover-pause support
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      handleNext();
    }, 4500);
    return () => clearInterval(interval);
  }, [activeIndex, isPaused, teamMembers.length]);

  // Enhanced 5-Member 3D Coverflow Curve Position Calculator (Crisp & High-Performance)
  const getPosition = (index) => {
    const total = teamMembers.length;
    const offset = (index - activeIndex + total) % total;

    // 0 = Center (Crystal Clear & Sharp)
    if (offset === 0) {
      return {
        x: "-50%",
        scale: 1,
        zIndex: 30,
        opacity: 1,
        rotateY: 0,
        pointerEvents: "auto"
      };
    }
    // 1 = Immediate Right
    if (offset === 1) {
      return {
        x: "30%",
        scale: 0.82,
        zIndex: 15,
        opacity: 0.45,
        rotateY: -16,
        pointerEvents: "auto"
      };
    }
    // 2 = Far Right / Back
    if (offset === 2) {
      return {
        x: "85%",
        scale: 0.58,
        zIndex: 5,
        opacity: 0,
        rotateY: -30,
        pointerEvents: "none"
      };
    }
    // 3 = Far Left / Back
    if (offset === 3) {
      return {
        x: "-185%",
        scale: 0.58,
        zIndex: 5,
        opacity: 0,
        rotateY: 30,
        pointerEvents: "none"
      };
    }
    // 4 = Immediate Left
    if (offset === 4) {
      return {
        x: "-130%",
        scale: 0.82,
        zIndex: 15,
        opacity: 0.45,
        rotateY: 16,
        pointerEvents: "auto"
      };
    }
  };

  const handleDotClick = (index) => {
    setActiveIndex(index);
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % teamMembers.length);
  };

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + teamMembers.length) % teamMembers.length);
  };

  // Touch Swipe Handlers for mobile ergonomics
  const handleTouchStart = (e) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (e) => {
    if (!touchStart) return;
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;
    if (diff > 45) {
      handleNext();
    } else if (diff < -45) {
      handlePrev();
    }
    setTouchStart(null);
  };

  return (
    <section id="our-team" className="py-20 sm:py-24 bg-gray-50/70 relative overflow-hidden">
      {/* Dynamic Ambient Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[750px] h-[500px] bg-gradient-to-r from-purple-200/20 via-indigo-100/20 to-blue-200/20 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center mb-12 sm:mb-16">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-xs sm:text-sm font-semibold mb-4"
          >
            <Sparkles size={14} className="text-purple-600" />
            <span>The Team Behind ADHYAN.AI</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, delay: 0.1 }}
            className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-4 tracking-tight"
          >
            Meet the{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600">
              Builders
            </span>
          </motion.h2>
          <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
            The passionate engineers and designers building the future of intelligent education.
          </p>
        </div>

        {/* 3D Carousel Container with Touch Swipe Support */}
        <div
          className="relative h-[450px] sm:h-[480px] flex items-center justify-center"
          style={{ perspective: 1200 }}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Left Arrow Button */}
          <button 
            onClick={handlePrev}
            className="absolute left-1 sm:left-4 md:left-8 z-40 p-2.5 sm:p-3.5 rounded-2xl bg-white/90 hover:bg-white shadow-[0_8px_25px_rgba(0,0,0,0.1)] text-purple-600 hover:text-purple-800 border border-gray-200/80 transition-all duration-300 backdrop-blur-md transform hover:scale-110 active:scale-95 cursor-pointer"
            aria-label="Previous Builder"
          >
            <ChevronLeft size={20} />
          </button>

          {/* 3D Curved Animated Cards */}
          <AnimatePresence initial={false}>
            {teamMembers.map((member, index) => {
              const style = getPosition(index);
              const isCenter = index === activeIndex;

              return (
                <motion.div
                  key={index}
                  className="absolute w-[285px] xs:w-[320px] sm:w-[380px]"
                  animate={{
                    x: style.x,
                    scale: style.scale,
                    opacity: style.opacity,
                    zIndex: style.zIndex,
                    rotateY: style.rotateY
                  }}
                  transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
                  style={{ 
                    left: "50%",
                    transformStyle: "preserve-3d",
                    pointerEvents: style.pointerEvents,
                    willChange: "transform, opacity",
                    WebkitFontSmoothing: "antialiased",
                    MozOsxFontSmoothing: "grayscale"
                  }}
                >
                  <div className="w-full">
                    <TestimonialCard
                      member={member}
                      isCenter={isCenter}
                      onSelect={() => handleDotClick(index)}
                    />
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Right Arrow Button */}
          <button 
            onClick={handleNext}
            className="absolute right-1 sm:right-4 md:right-8 z-40 p-2.5 sm:p-3.5 rounded-2xl bg-white/90 hover:bg-white shadow-[0_8px_25px_rgba(0,0,0,0.1)] text-purple-600 hover:text-purple-800 border border-gray-200/80 transition-all duration-300 backdrop-blur-md transform hover:scale-110 active:scale-95 cursor-pointer"
            aria-label="Next Builder"
          >
            <ChevronRight size={20} />
          </button>

        </div>

        {/* Navigation Dots & Active Indicator Strip */}
        <div className="flex flex-col items-center gap-3 mt-6">
          <div className="flex justify-center items-center space-x-2.5">
            {teamMembers.map((member, index) => (
              <button
                key={index}
                onClick={() => handleDotClick(index)}
                className={`h-2.5 rounded-full transition-all duration-400 cursor-pointer ${
                  index === activeIndex
                    ? "bg-gradient-to-r from-purple-600 to-indigo-600 w-9 shadow-md shadow-purple-500/25"
                    : "bg-gray-300 hover:bg-gray-400 w-2.5"
                }`}
                title={`View ${member.name}`}
              />
            ))}
          </div>
          <span className="text-xs text-gray-400 font-medium">
            Hover to pause • Click card to flip
          </span>
        </div>

      </div>
    </section>
  );
};

export default Testimonials;
