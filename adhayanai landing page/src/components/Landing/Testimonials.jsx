import React from 'react';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

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
    <section id='our-team' className="py-24 bg-white relative overflow-hidden">
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

        <div className="grid md:grid-cols-3 gap-8">
          {teamMembers.map((member, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, delay: index * 0.1 }}
              whileHover={{ y: -5 }}
              className="p-8 rounded-2xl bg-gray-50 border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col items-center text-center"
            >
              <div className="relative mb-6">
                <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${member.color} blur-lg opacity-20`}></div>
                <img 
                  src={member.image} 
                  alt={member.name}
                  className="w-40 h-40 rounded-full object-cover border-4 border-white shadow-md relative z-10"
                />
              </div>
              
              <h4 className="font-bold text-gray-900 text-xl mb-2">{member.name}</h4>
              <p className="text-indigo-600 font-medium mb-4 h-12 flex items-center justify-center">{member.role}</p>
              
              <p className="text-gray-600 italic leading-relaxed">"{member.content}"</p>
              
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
