import React from 'react';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

const Testimonials = () => {
  const testimonials = [
    {
      name: "Dr. Sarah Mitchell",
      role: "High School Biology Teacher",
      content: "ADHYAYAN.AI has completely transformed how I grade. What used to take me weekends now takes just a couple of hours. The AI feedback is surprisingly detailed and helpful for students.",
      initials: "SM",
      color: "from-purple-500 to-indigo-500"
    },
    {
      name: "Rahul Sharma",
      role: "Class 12 Student",
      content: "The practice quizzes generated from my notes helped meace my finals. It's like having a personal tutor who knows exactly what I need to study.",
      initials: "RS",
      color: "from-blue-500 to-cyan-500"
    },
    {
      name: "Priya Patel",
      role: "College Professor",
      content: "I manage 300+ students, and the analytics dashboard gives me insights I never had before. I can identify struggling students weeks before exams.",
      initials: "PP",
      color: "from-emerald-500 to-green-500"
    }
  ];

  return (
    <section className="py-24 bg-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6"
          >
            Trusted by <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600">Educators & Students</span>
          </motion.h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, delay: index * 0.1 }}
              whileHover={{ y: -5 }}
              className="p-8 rounded-2xl bg-gray-50 border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300"
            >
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={16} className="fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              
              <p className="text-gray-600 italic mb-6 leading-relaxed">"{testimonial.content}"</p>
              
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${testimonial.color} flex items-center justify-center text-white font-bold text-sm`}>
                  {testimonial.initials}
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-sm">{testimonial.name}</h4>
                  <p className="text-indigo-600 text-xs font-medium">{testimonial.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
