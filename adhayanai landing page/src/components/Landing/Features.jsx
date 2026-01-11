import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, CheckCircle, MessageCircle, TrendingUp, Shield, Smartphone, FileQuestion, ClipboardList } from 'lucide-react';

const Features = () => {
  const features = [
    {
      icon: FileQuestion,
      title: "Generate Question Paper",
      description: "Create comprehensive exams instantly. \nExample Questions:\n1. Explain the theory of relativity.\n2. Describe the process of photosynthesis.\n3. Solve for x: 2x + 5 = 15.",
      color: "from-rose-500 to-red-500"
    },
    {
      icon: ClipboardList,
      title: "Generate Assignments",
      description: "Design engaging homework. \nExample Tasks:\n1. Write a 500-word essay on climate change.\n2. Analyze the character arc of Hamlet.\n3. Complete the attached thermodynamics problems.",
      color: "from-cyan-500 to-teal-500"
    },
    {
      icon: MessageCircle,
      title: "Real-Time Collaboration",
      description: "Interactive doubt-solving with live chat and instant notifications for seamless communication.",
      color: "from-emerald-500 to-green-500"
    },
    {
      icon: TrendingUp,
      title: "Progress Tracking",
      description: "Comprehensive analytics and insights for students and teachers to identify learning gaps.",
      color: "from-orange-500 to-amber-500"
    },
    {
      icon: Shield,
      title: "Secure & Private",
      description: "Protected assessments with anti-cheat proctoring features and secure data handling.",
      color: "from-red-500 to-pink-500"
    },
    {
      icon: Smartphone,
      title: "Cross-Platform Access",
      description: "Seamless experience across desktop, tablet, and mobile devices.",
      color: "from-indigo-500 to-violet-500"
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <section id="features" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4"
          >
            Capabilities that <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600">Empower You</span>
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, delay: 0.1 }}
            className="text-xl text-gray-600 max-w-2xl mx-auto"
          >
            Everything you need to transform the educational experience, derived from advanced AI technology.
          </motion.p>
        </div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {features.map((feature, index) => (
            <motion.div 
              key={index}
              variants={itemVariants}
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
              className="p-8 rounded-2xl bg-white border border-gray-100 hover:border-purple-100 shadow-sm hover:shadow-lg transition-all duration-300 group"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                <feature.icon className="text-white w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
              <p className="text-gray-600 leading-relaxed whitespace-pre-line">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default Features;
