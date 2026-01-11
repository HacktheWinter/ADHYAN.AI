import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, Wand2 } from 'lucide-react';

const Hero = () => {
  const STUDENT_URL = import.meta.env.VITE_STUDENT_URL || "https://adhyanai-student.onrender.com/";
  const TEACHER_URL = import.meta.env.VITE_TEACHER_URL || "https://adhyanai-teacher.onrender.com/";

  return (
    <section className="relative overflow-hidden pt-24 pb-20 lg:pt-32 lg:pb-28">
      {/* Background gradients */}
      <div className="absolute top-0 left-0 w-full h-full -z-10 bg-gradient-to-br from-purple-50 via-white to-blue-50"></div>
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-200/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-200/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          {/* Text Content */}
          <div className="text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100/80 border border-purple-200 text-purple-700 text-sm font-medium mb-6">
                <Sparkles size={16} />
                <span>Revolutionizing Education with AI</span>
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 mb-6 leading-tight">
                Transform Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600">Learning Journey</span>
              </h1>
              
              <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                Create, manage, and track educational content with intelligent tools designed for modern classrooms. Empowering students and teachers alike with AI-driven insights.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <a 
                  href={STUDENT_URL}
                  className="inline-flex items-center justify-center gap-2 px-8 py-3.5 text-base font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full hover:shadow-lg hover:shadow-purple-500/30 transform hover:-translate-y-0.5 transition-all duration-200"
                >
                  Start as Student
                  <ArrowRight size={18} />
                </a>
                <a 
                  href={TEACHER_URL}
                  className="inline-flex items-center justify-center gap-2 px-8 py-3.5 text-base font-semibold text-gray-700 bg-white border border-gray-200 rounded-full hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
                >
                  Start as Teacher
                  <Wand2 size={18} className="text-indigo-600" />
                </a>
              </div>
            </motion.div>
          </div>

          {/* Visual Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="hidden lg:flex relative lg:h-[600px] items-center justify-center"
          >
            {/* Placeholder for 3D/Abstract Visual - using CSS shapes for now */}
            <div className="relative w-full max-w-md aspect-square">
               <div className="absolute inset-0 bg-gradient-to-tr from-purple-100 to-indigo-100 rounded-[2rem] transform rotate-3 shadow-2xl border border-white/50"></div>
               <div className="absolute inset-0 bg-white/60 backdrop-blur-sm rounded-[2rem] transform -rotate-3 shadow-xl border border-white/50 flex items-center justify-center">
                  <div className="text-center p-8">
                     <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg transform rotate-12">
                       <Sparkles className="text-white w-10 h-10" />
                     </div>
                     <h3 className="text-2xl font-bold text-gray-800 mb-2">AI Grading</h3>
                     <p className="text-gray-500">Semantic Answer Checking</p>
                     
                     {/* Floating Elements */}
                     <motion.div 
                       animate={{ y: [0, -10, 0] }}
                       transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                       className="absolute -top-10 -right-10 bg-white p-4 rounded-xl shadow-lg border border-gray-100"
                     >
                       <div className="flex items-center gap-3">
                         <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                           <span className="font-bold text-green-600">A+</span>
                         </div>
                         <div>
                           <div className="text-sm font-semibold text-gray-800">Answer Score</div>
                           <div className="text-xs text-green-600 font-medium">96% Accuracy</div>
                         </div>
                       </div>
                     </motion.div>

                     <motion.div 
                       animate={{ y: [0, 10, 0] }}
                       transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                       className="absolute -bottom-5 -left-5 bg-white p-4 rounded-xl shadow-lg border border-gray-100"
                     >
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <Wand2 size={16} className="text-blue-600"/>
                           </div>
                           <div className="text-sm font-medium text-gray-600">Generating Questions...</div>
                        </div>
                     </motion.div>
                  </div>
               </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
