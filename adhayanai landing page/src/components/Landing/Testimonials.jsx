import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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
      role: "Idea, Documentation & UI Design",
      content: "Crafted the core vision, managed comprehensive documentation, and designed an intuitive, user-centric interface.",
      image: "/lucky.jpeg",
      color: "from-purple-500 to-indigo-500"
    },
    {
      name: "Deepak Singh Rawat",
      role: "Backend API, Live Class & AI Integration",
      content: "Built robust backend architectures, implemented real-time live class features, and integrated advanced AI capabilities.",
      image: "/deepak.jpeg",
      color: "from-blue-500 to-cyan-500"
    },
    {
      name: "Harikesh Kumar",
      role: "Frontend & AI Features",
      content: "Developed the responsive frontend, seamlessly connected it with the backend, and implemented interactive AI features.",
      image: "/harikesh.jpg",
      color: "from-emerald-500 to-green-500"
    }
  ];

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

        <div className="grid md:grid-cols-3 gap-8 px-4">
          {teamMembers.map((member, index) => (
            <TestimonialCard key={index} member={member} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;

