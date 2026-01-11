import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Brain, CheckCircle2, ChevronRight } from 'lucide-react';

const Demo = () => {
  const [activeTab, setActiveTab] = useState('quiz');
  const [currentQuestion, setCurrentQuestion] = useState(0);
  
  const testPaperQuestions = [
    { q: "Explain the light-dependent reactions in photosynthesis.", type: "Long Answer" },
    { q: "Compare and contrast photosynthesis and cellular respiration.", type: "Comparative" },
    { q: "What role do chloroplasts play in energy conversion?", type: "Short Answer" }
  ];
  
  const assignmentQuestions = [
    { q: "Research and describe three adaptations plants have developed for photosynthesis in different environments.", type: "Research" },
    { q: "Create a diagram showing the Calvin Cycle and explain each step.", type: "Visual" },
    { q: "Calculate the theoretical glucose production from 12 CO₂ molecules during photosynthesis.", type: "Problem-solving" }
  ];

  return (
    <section className="hidden lg:block py-24 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-sm font-medium mb-4">
            <Sparkles size={14} />
            <span>Interactive Demo</span>
          </div>
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6">
            Experience the <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600">Power of AI</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            See how ADHYAN.AI transforms educational content into engaging assessments in real-time.
          </p>
        </div>

        <div className="rounded-3xl bg-gray-900 p-2 sm:p-4 lg:p-6 shadow-2xl border border-gray-800">
          <div className="grid lg:grid-cols-2 gap-8 bg-gray-900/50 rounded-2xl overflow-hidden">
            {/* Control Panel */}
            <div className="p-6 lg:p-8 flex flex-col justify-center border-b lg:border-b-0 lg:border-r border-gray-800">
              <h3 className="text-2xl font-bold text-white mb-6">Try it yourself</h3>
              
              <div className="space-y-4">
                <button 
                  onClick={() => setActiveTab('quiz')}
                  className={`w-full text-left p-4 rounded-xl transition-all duration-300 flex items-center justify-between group ${activeTab === 'quiz' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-750 hover:text-white'}`}
                >
                  <div className="flex items-center gap-4">
                    <Brain size={24} />
                    <div>
                      <div className="font-semibold">Generate Quiz</div>
                      <div className={`text-sm ${activeTab === 'quiz' ? 'text-purple-200' : 'text-gray-500'}`}>Create unique questions from any text</div>
                    </div>
                  </div>
                  {activeTab === 'quiz' && <ChevronRight size={20} />}
                </button>

                <button 
                  onClick={() => { setActiveTab('testpaper'); setCurrentQuestion(0); }}
                  className={`w-full text-left p-4 rounded-xl transition-all duration-300 flex items-center justify-between group ${activeTab === 'testpaper' ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-750 hover:text-white'}`}
                >
                  <div className="flex items-center gap-4">
                    <Sparkles size={24} />
                    <div>
                      <div className="font-semibold">Generate Test Paper</div>
                      <div className={`text-sm ${activeTab === 'testpaper' ? 'text-emerald-200' : 'text-gray-500'}`}>Create comprehensive assessments</div>
                    </div>
                  </div>
                  {activeTab === 'testpaper' && <ChevronRight size={20} />}
                </button>

                <button 
                  onClick={() => { setActiveTab('assignment'); setCurrentQuestion(0); }}
                  className={`w-full text-left p-4 rounded-xl transition-all duration-300 flex items-center justify-between group ${activeTab === 'assignment' ? 'bg-amber-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-750 hover:text-white'}`}
                >
                  <div className="flex items-center gap-4">
                    <Brain size={24} />
                    <div>
                      <div className="font-semibold">Generate Assignment</div>
                      <div className={`text-sm ${activeTab === 'assignment' ? 'text-amber-200' : 'text-gray-500'}`}>Create detailed homework tasks</div>
                    </div>
                  </div>
                  {activeTab === 'assignment' && <ChevronRight size={20} />}
                </button>

                <button 
                  onClick={() => setActiveTab('grading')}
                  className={`w-full text-left p-4 rounded-xl transition-all duration-300 flex items-center justify-between group ${activeTab === 'grading' ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-750 hover:text-white'}`}
                >
                  <div className="flex items-center gap-4">
                    <CheckCircle2 size={24} />
                    <div>
                      <div className="font-semibold">AI Grading</div>
                      <div className={`text-sm ${activeTab === 'grading' ? 'text-indigo-200' : 'text-gray-500'}`}>Instant feedback on subjective answers</div>
                    </div>
                  </div>
                  {activeTab === 'grading' && <ChevronRight size={20} />}
                </button>
              </div>

              <div className="mt-8 pt-8 border-t border-gray-800">
                <div className="text-gray-400 text-sm mb-2">Capabilities showcased:</div>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-gray-800 rounded-full text-xs text-gray-300">Natural Language Processing</span>
                  <span className="px-3 py-1 bg-gray-800 rounded-full text-xs text-gray-300">Real-time Analysis</span>
                  <span className="px-3 py-1 bg-gray-800 rounded-full text-xs text-gray-300">Adaptive Learning</span>
                </div>
              </div>
            </div>

            {/* Interactive Preview Area */}
            <div className="p-6 lg:p-8 bg-gray-950 min-h-[400px] flex flex-col">
              <AnimatePresence mode="wait">
                {activeTab === 'quiz' ? (
                  <motion.div 
                    key="quiz"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="h-full flex flex-col"
                  >
                    <div className="flex items-center gap-2 mb-4 text-gray-400 text-sm font-mono">
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                      AI Model Active
                    </div>
                    
                    <div className="bg-gray-900 rounded-lg p-4 mb-4 border border-gray-800">
                      <h4 className="text-purple-400 text-sm font-medium mb-2">Input Text (Biology Notes)</h4>
                      <p className="text-gray-300 text-sm leading-relaxed">
                        Photosynthesis is the process used by plants, algae and certain bacteria to harness energy from sunlight and turn it into chemical energy...
                      </p>
                    </div>

                    <div className="flex justify-center my-2">
                      <ChevronRight className="rotate-90 text-gray-600" />
                    </div>

                    <div className="bg-gray-800/50 rounded-lg p-4 border border-purple-500/30 flex-1">
                      <h4 className="text-white font-medium mb-3">Generated Question:</h4>
                      <p className="text-gray-200 mb-4">What is the primary energy source converted during photosynthesis?</p>
                      
                      <div className="space-y-2">
                         {['A) Chemical Energy', 'B) Sunlight', 'C) Oxygen', 'D) Water'].map((opt, i) => (
                           <div key={i} className={`p-2 rounded border ${i === 1 ? 'border-green-500/50 bg-green-500/10 text-green-200' : 'border-gray-700 bg-gray-800 text-gray-400'} text-sm`}>
                             {opt}
                             {i === 1 && <span className="float-right text-xs text-green-400 font-bold">Answer</span>}
                           </div>
                         ))}
                      </div>
                    </div>
                  </motion.div>
                ) : activeTab === 'grading' ? (
                  <motion.div 
                    key="grading"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="h-full flex flex-col"
                  >
                    <div className="flex items-center gap-2 mb-4 text-gray-400 text-sm font-mono">
                       <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                       Evaluation Engine Ready
                    </div>

                    <div className="bg-gray-900 rounded-lg p-4 mb-4 border border-gray-800">
                      <h4 className="text-indigo-400 text-sm font-medium mb-2">Student Answer</h4>
                      <p className="text-gray-300 text-sm leading-relaxed">
                        "Mitochondria is the powerhouse of the cell because..."
                      </p>
                    </div>

                    <div className="bg-gray-800/50 rounded-lg p-4 border border-indigo-500/30 flex-1">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="text-white font-medium">AI Feedback</h4>
                        <span className="bg-green-900/30 text-green-400 px-2 py-1 rounded text-xs border border-green-900">Score: 9/10</span>
                      </div>
                      
                      <div className="space-y-3">
                         <div className="flex gap-2">
                           <CheckCircle2 size={16} className="text-green-500 mt-0.5" />
                           <p className="text-gray-300 text-sm">Correctly identifies main function.</p>
                         </div>
                         <div className="flex gap-2">
                           <Sparkles size={16} className="text-yellow-500 mt-0.5" />
                           <p className="text-gray-300 text-sm">Suggestion: Elaborate on ATP production process for full marks.</p>
                         </div>
                      </div>
                    </div>
                  </motion.div>
                ) : activeTab === 'testpaper' ? (
                  <motion.div 
                    key="testpaper"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="h-full flex flex-col"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2 text-gray-400 text-sm font-mono">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        Test Paper Generator
                      </div>
                      <span className="text-emerald-400 text-xs">Question {currentQuestion + 1}/3</span>
                    </div>
                    
                    <div className="bg-gray-900 rounded-lg p-4 mb-4 border border-gray-800">
                      <h4 className="text-emerald-400 text-sm font-medium mb-2">Test Paper Preview</h4>
                      <p className="text-gray-500 text-xs mb-2">Subject: Biology | Duration: 45 mins | Total Marks: 30</p>
                    </div>

                    <div className="bg-gray-800/50 rounded-lg p-4 border border-emerald-500/30 flex-1 overflow-y-auto">
                      <div className="mb-4">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="text-white font-medium">Q{currentQuestion + 1}.</h4>
                          <span className="bg-emerald-900/30 text-emerald-400 px-2 py-1 rounded text-xs border border-emerald-900">{testPaperQuestions[currentQuestion].type}</span>
                        </div>
                        <p className="text-gray-200 mb-3">{testPaperQuestions[currentQuestion].q}</p>
                        <div className="text-gray-400 text-xs">Marks: 10</div>
                      </div>

                      <div className="flex gap-2 mt-6">
                        {testPaperQuestions.map((_, i) => (
                          <button 
                            key={i}
                            onClick={() => setCurrentQuestion(i)}
                            className={`px-3 py-1 rounded text-xs transition-all ${currentQuestion === i ? 'bg-emerald-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
                          >
                            {i + 1}
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="assignment"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="h-full flex flex-col"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2 text-gray-400 text-sm font-mono">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                        Assignment Generator
                      </div>
                      <span className="text-amber-400 text-xs">Task {currentQuestion + 1}/3</span>
                    </div>
                    
                    <div className="bg-gray-900 rounded-lg p-4 mb-4 border border-gray-800">
                      <h4 className="text-amber-400 text-sm font-medium mb-2">Assignment Preview</h4>
                      <p className="text-gray-500 text-xs mb-2">Subject: Biology | Due: 1 Week | Difficulty: Intermediate</p>
                    </div>

                    <div className="bg-gray-800/50 rounded-lg p-4 border border-amber-500/30 flex-1 overflow-y-auto">
                      <div className="mb-4">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="text-white font-medium">Task {currentQuestion + 1}.</h4>
                          <span className="bg-amber-900/30 text-amber-400 px-2 py-1 rounded text-xs border border-amber-900">{assignmentQuestions[currentQuestion].type}</span>
                        </div>
                        <p className="text-gray-200 mb-3">{assignmentQuestions[currentQuestion].q}</p>
                        <div className="flex items-center gap-4 text-gray-400 text-xs">
                          <span>📄 Submission: Written Report</span>
                          <span>⏱️ Est. Time: 2-3 hours</span>
                        </div>
                      </div>

                      <div className="flex gap-2 mt-6">
                        {assignmentQuestions.map((_, i) => (
                          <button 
                            key={i}
                            onClick={() => setCurrentQuestion(i)}
                            className={`px-3 py-1 rounded text-xs transition-all ${currentQuestion === i ? 'bg-amber-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
                          >
                            {i + 1}
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Demo;