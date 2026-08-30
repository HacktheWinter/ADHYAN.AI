import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Sparkles, Zap, ArrowRight, ShieldCheck, HelpCircle } from 'lucide-react';
import { playToggleSound } from '../../utils/audio';

const Pricing = () => {
  const [isAnnual, setIsAnnual] = useState(false);

  const STUDENT_URL = import.meta.env.VITE_STUDENT_URL || "https://student.adhyanai.tech/";
  const TEACHER_URL = import.meta.env.VITE_TEACHER_URL || "https://teacher.adhyanai.tech/login";

  const plans = [
    {
      name: "Student Basic",
      price: "₹0",
      period: "free forever",
      description: "Essential AI learning tools for self-study and student classroom participation.",
      badge: "Free Tier",
      badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
      features: [
        "Unlimited practice quiz attempts",
        "Join unlimited virtual classrooms",
        "Instant basic AI feedback on answers",
        "Access to shared class study materials",
        "Personalized performance tracking"
      ],
      buttonText: "Start Learning Free",
      href: STUDENT_URL,
      popular: false
    },
    {
      name: "Teacher Pro",
      price: isAnnual ? "₹799" : "₹999",
      period: "/ month",
      annualNote: isAnnual ? "Billed ₹9,588 annually (Save 20%)" : null,
      description: "Comprehensive AI toolkit designed to automate classroom creation and grading.",
      badge: "Most Popular",
      badgeColor: "bg-purple-100 text-purple-800 border-purple-300",
      features: [
        "Create unlimited subject batches & classes",
        "Automated AI question & test generator",
        "Semantic AI grading with rubric feedback",
        "Live interactive classes with whiteboard",
        "Export gradebooks & class analytics",
        "Priority customer & technical support"
      ],
      buttonText: "Start Teaching Pro",
      href: TEACHER_URL,
      popular: true
    },
    {
      name: "Institution",
      price: "Custom",
      period: "annual licensing",
      description: "Enterprise deployment for schools, coaching institutes, and universities.",
      badge: "Schools & Academies",
      badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
      features: [
        "All Teacher Pro capabilities included",
        "Centralized institution admin dashboard",
        "Custom branding with school domain",
        "LMS & SIS API integration",
        "Dedicated onboarding & account manager",
        "Custom SLA & data compliance"
      ],
      buttonText: "Contact Sales Team",
      href: "mailto:adhyan.ai.73@gmail.com?subject=Institution%20Plan%20Inquiry%20-%20ADHYAN.AI",
      popular: false
    }
  ];

  return (
    <section id="pricing" className="py-24 bg-gray-50/60 relative overflow-hidden">
      {/* Background radiant ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[850px] h-[550px] bg-gradient-to-r from-purple-200/20 via-indigo-100/20 to-blue-200/20 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-xs sm:text-sm font-semibold mb-4 backdrop-blur-sm"
          >
            <Sparkles size={14} className="text-purple-600" />
            <span>Simple, Transparent Pricing</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, delay: 0.1 }}
            className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-4 tracking-tight"
          >
            Invest in{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600">
              Smarter Education
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, delay: 0.15 }}
            className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto mb-8"
          >
            No hidden charges. Upgrade or cancel anytime with transparent plans for every scale.
          </motion.p>

          {/* Interactive Monthly / Annual Toggle Switch */}
          <div className="inline-flex items-center gap-1.5 sm:gap-3 bg-white p-1 sm:p-1.5 rounded-full border border-gray-200 shadow-sm max-w-full overflow-hidden">
            <button
              onClick={() => {
                playToggleSound();
                setIsAnnual(false);
              }}
              className={`px-3.5 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-bold transition-all duration-300 cursor-pointer ${
                !isAnnual
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/25'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => {
                playToggleSound();
                setIsAnnual(true);
              }}
              className={`px-3.5 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-bold transition-all duration-300 cursor-pointer flex items-center gap-1 sm:gap-1.5 ${
                isAnnual
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/25'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span>Annual</span>
              <span className={`text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full font-extrabold ${
                isAnnual ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700'
              }`}>
                -20%
              </span>
            </button>
          </div>
        </div>

        {/* Compact, Elevated Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto items-stretch pt-6">
          {plans.map((plan, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 25, scale: 0.96 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -8, transition: { duration: 0.25 } }}
              className={`relative p-5 xs:p-6 sm:p-7 rounded-3xl bg-white flex flex-col justify-between transition-all duration-300 group ${
                plan.popular
                  ? 'border-2 border-purple-500 ring-4 ring-purple-500/10 shadow-[0_20px_50px_rgba(147,51,234,0.15)] md:-translate-y-2'
                  : 'border border-gray-200/90 shadow-sm hover:shadow-xl hover:border-purple-200'
              }`}
            >
              {/* Popular Glowing Banner floating cleanly on top */}
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
                  <span className="bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 text-white px-4 py-1 text-xs font-extrabold uppercase tracking-wider rounded-full shadow-lg shadow-purple-500/35 flex items-center gap-1.5 whitespace-nowrap border border-white/30">
                    <Sparkles size={12} className="animate-spin" style={{ animationDuration: '4s' }} />
                    {plan.badge}
                  </span>
                </div>
              )}

              {/* Card Top Information */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  {!plan.popular ? (
                    <span className={`text-[11px] font-bold uppercase tracking-wider font-mono px-2.5 py-0.5 rounded-full border ${plan.badgeColor}`}>
                      {plan.badge}
                    </span>
                  ) : (
                    <span className="h-5" /> /* Headroom placeholder to maintain alignment */
                  )}
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-1 group-hover:text-purple-600 transition-colors">
                  {plan.name}
                </h3>
                <p className="text-gray-500 text-xs mb-4 leading-relaxed line-clamp-2">
                  {plan.description}
                </p>

                {/* Animated Price Section */}
                <div className="pb-4 mb-4 border-b border-gray-100">
                  <div className="flex items-baseline gap-1.5">
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={plan.price}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.2 }}
                        className="text-3xl sm:text-4xl font-black text-gray-900 font-sans tracking-tight"
                      >
                        {plan.price}
                      </motion.span>
                    </AnimatePresence>
                    {plan.period && (
                      <span className="text-gray-500 text-xs font-semibold">
                        {plan.period}
                      </span>
                    )}
                  </div>
                  {plan.annualNote && (
                    <div className="text-[11px] text-purple-600 font-medium mt-0.5">
                      {plan.annualNote}
                    </div>
                  )}
                </div>

                {/* Compact Feature List */}
                <div className="mb-6">
                  <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider font-mono mb-2.5">
                    Included Features:
                  </div>
                  <ul className="space-y-2">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-xs text-gray-600 leading-snug">
                        <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                          <Check size={11} className="stroke-[3]" />
                        </div>
                        <span className="font-medium">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Action Button */}
              <a
                href={plan.href}
                className={`w-full relative py-3 px-5 rounded-2xl font-bold text-xs sm:text-sm text-center transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 overflow-hidden group/btn ${
                  plan.popular
                    ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-700 text-white shadow-md shadow-purple-500/25 hover:shadow-lg hover:shadow-purple-500/40 hover:-translate-y-0.5'
                    : 'bg-gray-100 text-gray-800 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200'
                }`}
              >
                <span>{plan.buttonText}</span>
                <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
              </a>
            </motion.div>
          ))}
        </div>

        {/* Bottom Trust Note */}
        <div className="mt-12 text-center text-xs text-gray-500 flex items-center justify-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={16} className="text-emerald-600" />
            <span>Secure 256-bit payment encryption</span>
          </div>
          <span>•</span>
          <div>Cancel or switch plans anytime</div>
          <span>•</span>
          <a href="mailto:adhyan.ai.73@gmail.com" className="text-purple-600 hover:underline">
            Need institutional custom pricing?
          </a>
        </div>

      </div>
    </section>
  );
};

export default Pricing;
