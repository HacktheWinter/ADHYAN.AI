import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

const Pricing = () => {
  const plans = [
    {
      name: "Student Basic",
      price: "Free",
      description: "Perfect for self-study and practice.",
      features: [
        "Unlimited practice quizzes",
        "Basic AI feedback",
        "Performance tracking",
        "Access to community resources"
      ],
      buttonText: "Start Learning",
      popular: false
    },
    {
      name: "Teacher Pro",
      price: "₹999",
      period: "/month",
      description: "Power up your classroom with AI tools.",
      features: [
        "Create unlimited classes",
        "AI-powered grading assistant",
        "Detailed student analytics",
        "Priority support",
        "Export reports"
      ],
      buttonText: "Start Teaching",
      popular: true
    },
    {
      name: "Institution",
      price: "Custom",
      description: "For schools and large organizations.",
      features: [
        "All Pro features",
        "Centralized admin dashboard",
        "LMS Integration",
        "Custom branding",
        "Dedicated account manager"
      ],
      buttonText: "Contact Sales",
      popular: false
    }
  ];

  return (
    <section id="pricing" className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6">
            Simple, Transparent <span className="text-purple-600">Pricing</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Choose the perfect plan for your educational journey.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, delay: index * 0.1 }}
              whileHover={{ y: -8 }}
              className={`relative p-8 rounded-2xl bg-white border ${plan.popular ? 'border-purple-500 ring-2 ring-purple-500/20 shadow-xl' : 'border-gray-200 shadow-sm'} flex flex-col`}
            >
              {plan.popular && (
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <span className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-3 py-1 text-xs font-bold uppercase tracking-wide rounded-full shadow-lg">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="mb-8">
                <h3 className="text-lg font-bold text-gray-900 mb-2">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                  {plan.period && <span className="text-gray-500 text-sm font-medium">{plan.period}</span>}
                </div>
                <p className="text-gray-600 text-sm">{plan.description}</p>
              </div>

              <div className="flex-1 mb-8">
                <ul className="space-y-4">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-gray-600">
                      <Check size={16} className="text-green-500 mt-0.5 shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              <button className={`w-full py-3 px-4 rounded-xl font-semibold transition-all duration-200 ${plan.popular ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:shadow-lg hover:opacity-90' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'}`}>
                {plan.buttonText}
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Pricing;
