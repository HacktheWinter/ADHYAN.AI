import React from 'react';
import { motion } from 'framer-motion';
import { UserCheck, School, FileCheck, Smile } from 'lucide-react';

const Stats = () => {
  const stats = [
    {
      icon: UserCheck,
      value: "1,000+",
      label: "Active Students",
      color: "text-blue-600"
    },
    {
      icon: School,
      value: "500+",
      label: "Teachers Trust Us",
      color: "text-purple-600"
    },
    {
      icon: FileCheck,
      value: "50,000+",
      label: "Assessments Created",
      color: "text-indigo-600"
    },
    {
      icon: Smile,
      value: "98%",
      label: "Satisfaction Rate",
      color: "text-green-600"
    }
  ];

  return (
    <section className="py-20 bg-gradient-to-br from-indigo-900 to-purple-900 relative overflow-hidden">
      {/* Background patterns */}
      <div className="absolute inset-0 opacity-10">
         <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full mix-blend-overlay filter blur-3xl"></div>
         <div className="absolute bottom-0 right-0 w-64 h-64 bg-white rounded-full mix-blend-overlay filter blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, delay: index * 0.1 }}
              className="p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-colors duration-300"
            >
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-white/10 rounded-xl">
                  <stat.icon size={24} className="text-white" />
                </div>
              </div>
              <motion.div
                initial={{ scale: 0.5 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true, delay: 0.2 + index * 0.1 }}
                className="text-4xl lg:text-5xl font-bold text-white mb-2"
              >
                {stat.value}
              </motion.div>
              <div className="text-indigo-200 font-medium">
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
