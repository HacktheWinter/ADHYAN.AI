import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Wand2 } from 'lucide-react';

const FinalCTA = () => {
  const STUDENT_URL = import.meta.env.VITE_STUDENT_URL || "https://adhyanai-student.onrender.com/";
  const TEACHER_URL = import.meta.env.VITE_TEACHER_URL || "https://adhyanai-teacher.onrender.com/";

  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute inset-0 bg-gray-900 z-0">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-purple-900/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
           <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-indigo-900/30 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
         <motion.div
           initial={{ opacity: 0, scale: 0.95 }}
           whileInView={{ opacity: 1, scale: 1 }}
           viewport={{ once: true }}
         >
            <h2 className="text-4xl lg:text-5xl font-bold text-white mb-8 tracking-tight">
              Ready to <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400">Transform</span> Your Classroom?
            </h2>
            <p className="text-xl text-gray-300 mb-12 leading-relaxed">
              Join thousands of educators and students who are already experiencing the future of education with ADHYAN.AI
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a 
                  href={STUDENT_URL}
                  className="group inline-flex items-center justify-center gap-2 px-8 py-4 text-lg font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full hover:shadow-lg hover:shadow-purple-500/50 transform hover:-translate-y-1 transition-all duration-200"
                >
                  Start as Student
                  <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                </a>
                <a 
                  href={TEACHER_URL}
                  className="group inline-flex items-center justify-center gap-2 px-8 py-4 text-lg font-bold text-white bg-white/10 border border-white/20 rounded-full hover:bg-white/20 backdrop-blur-sm transition-all duration-200"
                >
                  Start as Teacher
                  <Wand2 className="text-purple-300" />
                </a>
              </div>
         </motion.div>
      </div>
    </section>
  );
};

export default FinalCTA;
