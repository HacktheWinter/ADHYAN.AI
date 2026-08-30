import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus, HelpCircle, Sparkles, MessageCircleQuestion, Mail, ArrowRight, ShieldCheck, Cpu, Layers } from 'lucide-react';
import { playTapSound } from '../../utils/audio';

const FAQ = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState("All");

  const categories = ["All", "AI & Grading", "Security & Integrity", "Pricing & Access"];

  const faqs = [
    {
      category: "AI & Grading",
      tag: "Semantic Engine",
      question: "How does the AI semantic grading evaluate subjective answers?",
      answer: "Unlike legacy auto-graders that perform basic keyword matching, ADHYAN.AI analyzes the contextual meaning and conceptual grasp of the student's response. It grades against a structured rubric, produces a justification score (e.g. 9.5/10), and provides actionable constructive feedback."
    },
    {
      category: "Security & Integrity",
      tag: "Proctoring",
      question: "Is the exam environment secure against cheating?",
      answer: "Yes. ADHYAN.AI incorporates comprehensive examination integrity tools including tab-switch monitoring, fullscreen lockdown enforcement, and dynamic question/option sequence shuffling to maintain test credibility."
    },
    {
      category: "AI & Grading",
      tag: "Content Ingestion",
      question: "Can teachers upload physical textbook scans or handwritten notes?",
      answer: "Absolutely. You can upload PDFs, Word documents, or clear images of physical textbook pages. Our OCR text extractor parses the curriculum content so the AI engine can generate targeted quizzes and exams."
    },
    {
      category: "Pricing & Access",
      tag: "Free Student Access",
      question: "Do students need to pay to join classes?",
      answer: "No. Students can join any classroom created by their teachers completely free using their 6-digit class code. Students also have free access to self-study practice tools on the Student Portal."
    },
    {
      category: "AI & Grading",
      tag: "Multi-Language",
      question: "What languages does ADHYAN.AI support?",
      answer: "ADHYAN.AI fully supports English across all quiz generation and grading modules. Support for Hindi and additional regional languages is currently in active development."
    },
    {
      category: "Pricing & Access",
      tag: "LMS / Enterprise",
      question: "Can schools integrate ADHYAN.AI with existing LMS platforms?",
      answer: "Yes. Our Institution tier supports custom API integrations and single sign-on (SSO) with standard school management and Learning Management Systems (LMS)."
    }
  ];

  const filteredFaqs = selectedCategory === "All"
    ? faqs
    : faqs.filter(faq => faq.category === selectedCategory);

  return (
    <section id="faq" className="py-24 bg-white relative overflow-hidden">
      {/* Ambient background blur glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[450px] bg-gradient-to-r from-purple-100/40 via-indigo-100/30 to-blue-100/40 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-xs sm:text-sm font-semibold mb-4 backdrop-blur-sm"
          >
            <HelpCircle size={14} className="text-purple-600" />
            <span>Got Questions?</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, delay: 0.1 }}
            className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-4 tracking-tight"
          >
            Frequently Asked{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600">
              Questions
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, delay: 0.15 }}
            className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto"
          >
            Everything you need to know about the platform, AI grading accuracy, and classroom proctoring.
          </motion.p>

          {/* Interactive Category Filter Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-8">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => {
                  playTapSound();
                  setSelectedCategory(category);
                  setActiveIndex(0);
                }}
                className={`px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-all duration-300 cursor-pointer ${
                  selectedCategory === category
                    ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/25 scale-105"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Animated Accordion List */}
        <div className="space-y-3.5">
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedCategory}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="space-y-3.5"
            >
              {filteredFaqs.map((faq, index) => {
                const isOpen = activeIndex === index;
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.04 }}
                    className={`rounded-2xl border transition-all duration-300 overflow-hidden relative ${
                      isOpen
                        ? 'border-purple-300 bg-gradient-to-r from-purple-50/40 via-white to-white shadow-md shadow-purple-500/5'
                        : 'border-gray-200/90 hover:border-purple-200 bg-white shadow-xs hover:shadow-md'
                    }`}
                  >
                    {/* Active Left Indicator Strip */}
                    {isOpen && (
                      <motion.div
                        layoutId="activeFaqIndicator"
                        className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-purple-600 to-indigo-600"
                      />
                    )}

                    <button
                      onClick={() => {
                        playTapSound();
                        setActiveIndex(isOpen ? null : index);
                      }}
                      className="w-full flex items-center justify-between p-4 sm:p-6 text-left cursor-pointer transition-colors group"
                    >
                      <div className="flex flex-col xs:flex-row xs:items-center gap-1.5 xs:gap-3 pr-3">
                        <span className="text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200/60 w-fit shrink-0">
                          {faq.tag}
                        </span>
                        <span className="font-bold text-gray-900 text-sm sm:text-base group-hover:text-purple-600 transition-colors">
                          {faq.question}
                        </span>
                      </div>
                      
                      <div
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${
                          isOpen
                            ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white rotate-180 shadow-md shadow-purple-500/30'
                            : 'bg-gray-100 text-gray-500 group-hover:bg-purple-100 group-hover:text-purple-600'
                        }`}
                      >
                        {isOpen ? <Minus size={14} /> : <Plus size={14} />}
                      </div>
                    </button>

                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                        >
                          <div className="px-5 sm:px-6 pb-6 pt-1 text-gray-600 text-xs sm:text-sm leading-relaxed border-t border-purple-100/50">
                            {faq.answer}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Interactive "Still Have Questions?" Help Box */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-12 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-purple-50 via-indigo-50/50 to-blue-50 border border-purple-200/70 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left"
        >
          <div>
            <h4 className="text-lg font-bold text-gray-900 mb-1 flex items-center justify-center sm:justify-start gap-2">
              <MessageCircleQuestion size={18} className="text-purple-600" />
              <span>Still have questions?</span>
            </h4>
            <p className="text-xs sm:text-sm text-gray-600">
              Can’t find what you’re looking for? Reach out directly to our engineering support team.
            </p>
          </div>

          <a
            href="mailto:adhyan.ai.73@gmail.com?subject=Inquiry%20from%20ADHYAN.AI%20FAQ"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs sm:text-sm shadow-md shadow-purple-500/25 hover:shadow-lg hover:shadow-purple-500/40 hover:-translate-y-0.5 transition-all shrink-0 cursor-pointer"
          >
            <Mail size={15} />
            <span>Contact Support</span>
            <ArrowRight size={14} />
          </a>
        </motion.div>

      </div>
    </section>
  );
};

export default FAQ;
