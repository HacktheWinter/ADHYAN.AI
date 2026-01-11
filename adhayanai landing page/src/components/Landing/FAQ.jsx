import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus } from 'lucide-react';

const FAQ = () => {
  const [activeIndex, setActiveIndex] = useState(null);

  const faqs = [
    {
      question: "How accurate is the AI grading?",
      answer: "Our AI is trained on vast educational datasets and achieves over 95% agreement with human graders. For subjective answers, it provides detailed feedback justifying the score, which teachers can review and override if needed."
    },
    {
      question: "Is the platform secure for conducting exams?",
      answer: "Yes, we employ enterprise-grade security. Our proctoring features monitor tab switching, copy-pasting, and can optionally record the session to ensure integrity during high-stakes assessments."
    },
    {
      question: "Can I use content from physical textbooks?",
      answer: "Absolutely! You can scan pages from textbooks or upload PDFs. Our OCR technology converts physical text into digital content that our AI can process to generate questions."
    },
    {
      question: "Do students need to pay to join a class?",
      answer: "No, students can join classes created by teachers for free. We also offer a free tier for students for self-study with daily limits on AI generation."
    },
    {
      question: "What languages does ADHYAYAN.AI support?",
      answer: "Currently, we fully support English. Beta support for Hindi and other major Indian languages is rolling out progressively."
    }
  ];

  return (
    <section className="py-24 bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6">
            Frequently Asked <span className="text-purple-600">Questions</span>
          </h2>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div key={index} className="border border-gray-200 rounded-xl overflow-hidden hover:border-purple-200 transition-colors duration-200">
              <button
                onClick={() => setActiveIndex(activeIndex === index ? null : index)}
                className="w-full flex items-center justify-between p-6 text-left bg-white hover:bg-gray-50 transition-colors"
              >
                <span className="font-semibold text-gray-900 pr-8">{faq.question}</span>
                {activeIndex === index ? (
                  <Minus className="text-purple-600 shrink-0" size={20} />
                ) : (
                  <Plus className="text-gray-400 shrink-0" size={20} />
                )}
              </button>
              <AnimatePresence>
                {activeIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                  >
                    <div className="p-6 pt-0 text-gray-600 leading-relaxed border-t border-gray-100 bg-gray-50/50">
                      {faq.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FAQ;
