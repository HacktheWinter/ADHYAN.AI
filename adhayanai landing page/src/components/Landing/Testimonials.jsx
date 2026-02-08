import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const TestimonialCard = ({ member, index }) => {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div className="h-[420px] w-full perspective-1000 group cursor-pointer" onClick={() => setIsFlipped(!isFlipped)}>
      <motion.div
        className="relative w-full h-full transition-all duration-500 transform-style-3d"
        initial={false}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.15, animationDirection: "normal" }}
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* Front Face */}
        <div className="absolute inset-0 w-full h-full backface-hidden" style={{ backfaceVisibility: "hidden" }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, delay: index * 0.1 }}
            className="w-full h-full p-8 rounded-2xl bg-white border border-gray-100 shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col items-center text-center justify-between z-10 relative overflow-hidden"
          >
             {/* Decorative Background Removed */}

            <div className="relative mt-8 mb-4">
              <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${member.color} blur-lg opacity-40`}></div>
              <img 
                src={member.image} 
                alt={member.name}
                className="w-40 h-40 rounded-full object-cover border-4 border-white shadow-md relative z-10"
              />
            </div>
            
            <div className="relative z-10 flex-grow flex flex-col justify-center">
              <h4 className="font-bold text-gray-900 text-2xl mb-2">{member.name}</h4>
              <p className="text-indigo-600 font-medium text-lg">{member.role}</p>
            </div>

            <div className="mt-4 text-sm text-gray-400 font-medium animate-pulse">
              Click to view details
            </div>
          </motion.div>
        </div>

        {/* Back Face */}
        <div 
          className="absolute inset-0 w-full h-full backface-hidden rounded-2xl shadow-xl overflow-hidden"
          style={{ transform: "rotateY(180deg)", backfaceVisibility: "hidden" }}
        >
          <div className={`absolute inset-0 bg-gradient-to-br ${member.color} opacity-90`}></div>
          <div className="absolute inset-0 bg-black opacity-10"></div>
          
          <div className="relative h-full flex flex-col items-center justify-center p-8 text-white text-center z-10">
            <h4 className="font-bold text-2xl mb-6 border-b-2 border-white/20 pb-2">{member.name}</h4>
            <p className="text-lg leading-relaxed font-light italic">
              "{member.content}"
            </p>
            <div className="mt-auto pt-6 text-white/80 text-sm">
              Click to flip back
            </div>
            
            {/* Background Texture/Icon Overlay */}
             <div className="absolute -bottom-10 -right-10 opacity-10 transform -rotate-12 scale-150">
               <div className="text-9xl font-serif">"</div>
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
      name: "Lucky Singh Panwar",
      role: "Concept Designer & Rnd Lead",
      content: "Worked on concept design and research & development of the project, focusing on idea validation and strategic execution.",
      image: "/lucky.jpeg",
      color: "from-purple-500 to-indigo-500"
    },
    {
      name: "Deepak Singh Rawat",
      role: "Backend API, Live Class & AI Features",
      content: "Built scalable backend features and data models, implemented real-time live class functionality, and integrated AI features into the application",
      image: "/deepak.jpeg",
      color: "from-blue-500 to-cyan-500"
    },
    {
      name: "Harikesh Kumar",
      role: "Full Stack & AI Integration",
      content: "Worked on both frontend and backend development, integrated AI features into the application, and ensured seamless communication between system components.",
      image: "/harikesh.jpg",
      color: "from-emerald-500 to-green-500"
    },
    {
      name: "Lalit Nandan",
      role: "Simulation & Testing Analyst",
      content: "Conducted thorough testing and analysis of the application to ensure its functionality and reliability, covering user interaction flows.",
      image: "/lalit.jpeg",
      color: "from-orange-500 to-amber-500"
    }
  ];

  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      handleNext();
    }, 5000);
    return () => clearInterval(interval);
  }, [activeIndex]); // Restart timer on manual interaction

  const getPosition = (index) => {
    const offset = (index - activeIndex + 4) % 4;
    // 0 = Center
    // 1 = Right
    // 2 = Back
    // 3 = Left

    if (offset === 0) return { x: "-50%", scale: 1, zIndex: 30, opacity: 1 };
    if (offset === 1) return { x: "50%", scale: 0.85, zIndex: 20, opacity: 1 }; // Blur removed
    if (offset === 2) return { x: "-50%", scale: 0.6, zIndex: 10, opacity: 0 }; 
    if (offset === 3) return { x: "-150%", scale: 0.85, zIndex: 20, opacity: 1 }; // Blur removed
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

  return (
    <section id='our-team' className="py-24 bg-gray-50 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6"
          >
            Meet the <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600">Builders</span>
          </motion.h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            The passionate minds behind ADHYAN.AI
          </p>
        </div>

        {/* Carousel Container */}
        <div className="relative h-[450px] flex items-center justify-center">
            
          {/* Left Arrow */}
          <button 
            onClick={handlePrev}
            className="absolute left-0 md:left-[-50px] z-40 p-3 rounded-full bg-white/80 hover:bg-white shadow-lg text-indigo-600 hover:text-indigo-800 transition-all duration-300 backdrop-blur-sm transform hover:scale-110 cursor-pointer"
            aria-label="Previous"
          >
            <ChevronLeft size={28} />
          </button>

          <AnimatePresence>
            {teamMembers.map((member, index) => {
              const style = getPosition(index);
              return (
                <motion.div
                  key={index}
                  className="absolute w-[350px] md:w-[400px]"
                  animate={{
                    x: style.x,
                    scale: style.scale,
                    opacity: style.opacity,
                    zIndex: style.zIndex,
                    // filter removed
                  }}
                  transition={{ duration: 0.5, ease: "easeInOut" }}
                  style={{ 
                    // Centering the absolute elements
                    left: "50%", 
                    // We handle x offset in animate for positioning
                  }}
                >
                   <div className="w-full">
                     <TestimonialCard member={member} index={index} />
                   </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Right Arrow */}
          <button 
            onClick={handleNext}
            className="absolute right-0 md:right-[-50px] z-40 p-3 rounded-full bg-white/80 hover:bg-white shadow-lg text-indigo-600 hover:text-indigo-800 transition-all duration-300 backdrop-blur-sm transform hover:scale-110 cursor-pointer"
            aria-label="Next"
          >
            <ChevronRight size={28} />
          </button>

        </div>

        {/* Navigation Dots */}
        <div className="flex justify-center space-x-2 mt-8">
          {teamMembers.map((_, index) => (
            <button
              key={index}
              onClick={() => handleDotClick(index)}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                index === activeIndex ? "bg-indigo-600 w-8" : "bg-gray-300 hover:bg-gray-400"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;

