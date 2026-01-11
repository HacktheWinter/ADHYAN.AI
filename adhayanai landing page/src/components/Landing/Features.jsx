import React from 'react';
import { motion } from 'framer-motion';
import { Video, Megaphone, Calendar, MessageSquareMore, Sparkles, CheckCircle, MessageCircle, TrendingUp, Shield, Smartphone, FileQuestion, ClipboardList } from 'lucide-react';

const Features = () => {
  const features = [
    {
      icon: Video,
      title: "Live Classes",
      description: "Conduct interactive live sessions with integrated whiteboard, screen sharing, and automatic recording for later review.",
      color: "from-blue-500 to-indigo-500"
    },
    {
      icon: Megaphone,
      title: "Smart Announcements",
      description: "Keep everyone aligned with rich-text announcements, important alerts, and file attachments delivered instantly.",
      color: "from-yellow-500 to-orange-500"
    },
    {
      icon: Calendar,
      title: "Interactive Calendar",
      description: "Stay organized with a centralized academic calendar for scheduling classes, exams, and tracking deadlines.",
      color: "from-purple-500 to-pink-500"
    },
    {
      icon: FileQuestion,
      title: "Generate Question Paper",
      description: "Create comprehensive exams instantly. \nExample Questions:\n1. Explain the theory of relativity.\n2. Describe the process of photosynthesis.",
      color: "from-rose-500 to-red-500"
    },
    {
      icon: ClipboardList,
      title: "Generate Assignments",
      description: "Design engaging homework. \nExample Tasks:\n1. Write a 500-word essay on climate change.\n2. Analyze the character arc of Hamlet.",
      color: "from-cyan-500 to-teal-500"
    },
    {
      icon: MessageSquareMore,
      title: "Instant Feedback",
      description: "Provide personalized feedback on assignments and assessments to guide student improvement effectively.",
      color: "from-teal-500 to-emerald-500"
    },
    {
      icon: TrendingUp,
      title: "Progress Tracking",
      description: "Comprehensive analytics and insights for students and teachers to identify learning gaps and track growth.",
      color: "from-orange-500 to-amber-500"
    },
    {
      icon: MessageCircle,
      title: "Real-Time Collaboration",
      description: "Interactive learning with live chat, doubt solving, and peer-to-peer discussions.",
      color: "from-emerald-500 to-green-500"
    },
    {
      icon: Shield,
      title: "Secure & Private",
      description: "Protected assessments with anti-cheat proctoring features and enterprise-grade data security.",
      color: "from-red-500 to-pink-500"
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
