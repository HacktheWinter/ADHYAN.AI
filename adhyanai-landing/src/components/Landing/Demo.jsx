import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Brain, CheckCircle2, ChevronRight, Terminal, Cpu, Zap, Award, Layers } from 'lucide-react';

const Demo = () => {
  const [activeTab, setActiveTab] = useState('quiz');
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [mobileTab, setMobileTab] = useState('quiz');

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

  // Lightweight static content used by the mobile version — no motion, no interval state
  const mobileContent = {
    quiz: {
      icon: Brain,
      color: 'purple',
      label: 'Generate Quiz',
      body: (
        <>
          <p className="text-gray-400 text-xs font-mono mb-3">Input: Biology Notes</p>
          <p className="text-gray-300 text-sm mb-4 leading-relaxed">
            "Photosynthesis is the process used by plants, algae and certain bacteria to harness energy from sunlight..."
          </p>
          <div className="bg-gray-800/50 rounded-lg p-4 border border-purple-500/30">
            <p className="text-white text-sm font-medium mb-3">What is the primary energy source converted during photosynthesis?</p>
            <div className="space-y-2">
              {['Chemical Energy', 'Sunlight', 'Oxygen', 'Water'].map((opt, i) => (
                <div key={i} className={`p-2 rounded border text-xs ${i === 1 ? 'border-green-500/50 bg-green-500/10 text-green-200' : 'border-gray-700 text-gray-400'}`}>
                  {opt} {i === 1 && <span className="float-right text-green-400 font-bold">Answer</span>}
                </div>
              ))}
            </div>
          </div>
        </>
      )
    },
    testpaper: {
      icon: Sparkles,
      color: 'emerald',
      label: 'Test Paper',
      body: (
        <>
          <p className="text-gray-400 text-xs mb-3">Biology | 45 mins | 30 marks</p>
          <div className="bg-gray-800/50 rounded-lg p-4 border border-emerald-500/30">
            <div className="flex justify-between items-start mb-2">
              <span className="text-white text-sm font-medium">Q1.</span>
              <span className="bg-emerald-900/30 text-emerald-400 px-2 py-0.5 rounded text-xs border border-emerald-900">{testPaperQuestions[0].type}</span>
            </div>
            <p className="text-gray-200 text-sm mb-2">{testPaperQuestions[0].q}</p>
            <p className="text-gray-500 text-xs">Marks: 10</p>
          </div>
        </>
      )
    },
    assignment: {
      icon: Brain,
      color: 'amber',
      label: 'Assignment',
      body: (
        <>
          <p className="text-gray-400 text-xs mb-3">Biology | Due 1 Week | Intermediate</p>
          <div className="bg-gray-800/50 rounded-lg p-4 border border-amber-500/30">
            <div className="flex justify-between items-start mb-2">
              <span className="text-white text-sm font-medium">Task 1.</span>
              <span className="bg-amber-900/30 text-amber-400 px-2 py-0.5 rounded text-xs border border-amber-900">{assignmentQuestions[0].type}</span>
            </div>
            <p className="text-gray-200 text-sm">{assignmentQuestions[0].q}</p>
          </div>
        </>
      )
    },
    grading: {
      icon: CheckCircle2,
      color: 'indigo',
      label: 'AI Grading',
      body: (
        <>
          <p className="text-gray-400 text-xs mb-3">Student Answer</p>
          <p className="text-gray-300 text-sm mb-4">"Mitochondria is the powerhouse of the cell because..."</p>
          <div className="bg-gray-800/50 rounded-lg p-4 border border-indigo-500/30">
            <div className="flex justify-between items-center mb-3">
              <span className="text-white text-sm font-medium">AI Feedback</span>
              <span className="bg-green-900/30 text-green-400 px-2 py-0.5 rounded text-xs border border-green-900">9/10</span>
            </div>
            <div className="flex gap-2 mb-2">
              <CheckCircle2 size={14} className="text-green-500 mt-0.5 shrink-0" />
              <p className="text-gray-300 text-xs">Correctly identifies main function.</p>
            </div>
            <div className="flex gap-2">
              <Sparkles size={14} className="text-yellow-500 mt-0.5 shrink-0" />
              <p className="text-gray-300 text-xs">Elaborate on ATP production for full marks.</p>
            </div>
          </div>
        </>
      )
    }
  };

  const colorClasses = {
    purple: 'bg-purple-600 text-purple-200',
    emerald: 'bg-emerald-600 text-emerald-200',
    amber: 'bg-amber-600 text-amber-200',
    indigo: 'bg-indigo-600 text-indigo-200',
  };

  return (
    <section id="demo" className="py-20 lg:py-28 bg-white relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-cyan-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center mb-12 lg:mb-16">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs sm:text-sm font-semibold mb-4"
          >
            <Terminal size={14} />
            <span>Live Interactive Simulator</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, delay: 0.1 }}
            className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-4 tracking-tight"
          >
            Experience the{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600">
              Neural Engine in Action
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, delay: 0.15 }}
            className="text-lg text-gray-600 max-w-2xl mx-auto"
          >
            Switch between modes to see how ADHYAN structures raw educational content into rich assessments in milliseconds.
          </motion.p>
        </div>

        {/* ---------- MOBILE / TABLET: lightweight static tabbed version ---------- */}
        <div className="lg:hidden rounded-2xl bg-gray-900 p-3.5 shadow-xl border border-gray-800">
          <div className="grid grid-cols-2 gap-2 mb-3">
            {Object.entries(mobileContent).map(([key, tab]) => {
              const Icon = tab.icon;
              const isActive = mobileTab === key;
              return (
                <button
                  key={key}
                  onClick={() => setMobileTab(key)}
                  className={`flex items-center gap-2 p-3 rounded-xl text-left transition-colors cursor-pointer ${
                    isActive ? colorClasses[tab.color] : 'bg-gray-800 text-gray-400'
                  }`}
                >
                  <Icon size={16} className="shrink-0" />
                  <span className="text-xs font-semibold truncate">{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="bg-gray-950 rounded-xl p-4 border border-gray-800">
            <div className="flex items-center gap-2 mb-3 text-gray-500 text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Neural Engine Active
            </div>
            {mobileContent[mobileTab].body}
          </div>
        </div>

        {/* ---------- DESKTOP: Futuristic Mac OS-style AI Workspace IDE ---------- */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="hidden lg:block rounded-3xl bg-gray-950 shadow-2xl border border-gray-800 overflow-hidden"
        >
          {/* Mac OS Window Header */}
          <div className="bg-gray-900 px-6 py-3.5 border-b border-gray-800 flex items-center justify-between select-none">
            <div className="flex items-center gap-2.5">
              <div className="w-3 h-3 rounded-full bg-red-500/90 shadow-sm" />
              <div className="w-3 h-3 rounded-full bg-amber-500/90 shadow-sm" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/90 shadow-sm" />
              <span className="ml-3 text-xs font-mono text-gray-400 flex items-center gap-1.5">
                <Cpu size={13} className="text-purple-400" />
                ADHYAN_AI_ENGINE_v2.4.exe
              </span>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="px-2.5 py-1 rounded-md bg-purple-950/80 border border-purple-500/30 text-purple-300">
                Model: ADHYAN-LLM-Pro
              </span>
              <div className="flex items-center gap-1.5 text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-md border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>⚡ 120ms Latency</span>
              </div>
            </div>
          </div>

          {/* Console Body */}
          <div className="grid lg:grid-cols-12 bg-gray-950 min-h-[500px]">
            
            {/* Left Tab Navigator (5 cols) */}
            <div className="lg:col-span-5 p-6 lg:p-8 flex flex-col justify-between border-r border-gray-800/80 bg-gray-900/40">
              <div>
                <div className="text-xs font-mono text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Layers size={14} className="text-purple-400" />
                  <span>Select Operation Mode</span>
                </div>

                <div className="space-y-3">
                  {/* Tab 1: Quiz */}
                  <button
                    onClick={() => setActiveTab('quiz')}
                    className={`w-full text-left p-4 rounded-2xl transition-all duration-200 flex items-center justify-between group cursor-pointer border ${
                      activeTab === 'quiz'
                        ? 'bg-purple-600 text-white border-purple-400/40 shadow-lg shadow-purple-500/20'
                        : 'bg-gray-900/80 text-gray-300 border-gray-800 hover:bg-gray-850 hover:text-white hover:border-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${activeTab === 'quiz' ? 'bg-white/20' : 'bg-purple-950/70 text-purple-400 border border-purple-500/20'}`}>
                        <Brain size={20} />
                      </div>
                      <div>
                        <div className="font-bold text-sm">Generate Quiz</div>
                        <div className={`text-xs ${activeTab === 'quiz' ? 'text-purple-100' : 'text-gray-500'}`}>Instant MCQs with answer keys</div>
                      </div>
                    </div>
                    {activeTab === 'quiz' && <ChevronRight size={18} className="text-purple-200" />}
                  </button>

                  {/* Tab 2: Test Paper */}
                  <button
                    onClick={() => { setActiveTab('testpaper'); setCurrentQuestion(0); }}
                    className={`w-full text-left p-4 rounded-2xl transition-all duration-200 flex items-center justify-between group cursor-pointer border ${
                      activeTab === 'testpaper'
                        ? 'bg-emerald-600 text-white border-emerald-400/40 shadow-lg shadow-emerald-500/20'
                        : 'bg-gray-900/80 text-gray-300 border-gray-800 hover:bg-gray-850 hover:text-white hover:border-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${activeTab === 'testpaper' ? 'bg-white/20' : 'bg-emerald-950/70 text-emerald-400 border border-emerald-500/20'}`}>
                        <Sparkles size={20} />
                      </div>
                      <div>
                        <div className="font-bold text-sm">Generate Test Paper</div>
                        <div className={`text-xs ${activeTab === 'testpaper' ? 'text-emerald-100' : 'text-gray-500'}`}>Full structured subjective exams</div>
                      </div>
                    </div>
                    {activeTab === 'testpaper' && <ChevronRight size={18} className="text-emerald-200" />}
                  </button>

                  {/* Tab 3: Assignment */}
                  <button
                    onClick={() => { setActiveTab('assignment'); setCurrentQuestion(0); }}
                    className={`w-full text-left p-4 rounded-2xl transition-all duration-200 flex items-center justify-between group cursor-pointer border ${
                      activeTab === 'assignment'
                        ? 'bg-amber-600 text-white border-amber-400/40 shadow-lg shadow-amber-500/20'
                        : 'bg-gray-900/80 text-gray-300 border-gray-800 hover:bg-gray-850 hover:text-white hover:border-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${activeTab === 'assignment' ? 'bg-white/20' : 'bg-amber-950/70 text-amber-400 border border-amber-500/20'}`}>
                        <Zap size={20} />
                      </div>
                      <div>
                        <div className="font-bold text-sm">Generate Assignment</div>
                        <div className={`text-xs ${activeTab === 'assignment' ? 'text-amber-100' : 'text-gray-500'}`}>Research & problem-solving tasks</div>
                      </div>
                    </div>
                    {activeTab === 'assignment' && <ChevronRight size={18} className="text-amber-200" />}
                  </button>

                  {/* Tab 4: AI Grading */}
                  <button
                    onClick={() => setActiveTab('grading')}
                    className={`w-full text-left p-4 rounded-2xl transition-all duration-200 flex items-center justify-between group cursor-pointer border ${
                      activeTab === 'grading'
                        ? 'bg-indigo-600 text-white border-indigo-400/40 shadow-lg shadow-indigo-500/20'
                        : 'bg-gray-900/80 text-gray-300 border-gray-800 hover:bg-gray-850 hover:text-white hover:border-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${activeTab === 'grading' ? 'bg-white/20' : 'bg-indigo-950/70 text-indigo-400 border border-indigo-500/20'}`}>
                        <Award size={20} />
                      </div>
                      <div>
                        <div className="font-bold text-sm">Semantic AI Grading</div>
                        <div className={`text-xs ${activeTab === 'grading' ? 'text-indigo-100' : 'text-gray-500'}`}>Rubric scoring & actionable feedback</div>
                      </div>
                    </div>
                    {activeTab === 'grading' && <ChevronRight size={18} className="text-indigo-200" />}
                  </button>
                </div>
              </div>

              {/* Console Micro-Specs */}
              <div className="mt-8 pt-6 border-t border-gray-800/80">
                <div className="text-[11px] font-mono text-gray-500 uppercase mb-2">Capabilities Active:</div>
                <div className="flex flex-wrap gap-2 text-xs font-mono">
                  <span className="px-2.5 py-1 rounded-md bg-gray-800 text-gray-400 border border-gray-700">Transformer-XL</span>
                  <span className="px-2.5 py-1 rounded-md bg-gray-800 text-gray-400 border border-gray-700">Semantic Parsing</span>
                  <span className="px-2.5 py-1 rounded-md bg-gray-800 text-gray-400 border border-gray-700">Zero-Shot Rubric</span>
                </div>
              </div>
            </div>

            {/* Right Output Workspace (7 cols) */}
            <div className="lg:col-span-7 p-6 lg:p-8 bg-gray-950 flex flex-col justify-between">
              <AnimatePresence mode="wait">
                {activeTab === 'quiz' && (
                  <motion.div
                    key="quiz"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.25 }}
                    className="h-full flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-800 text-xs font-mono text-gray-400">
                        <span className="text-purple-400">source: biology_chapter_04_notes.txt</span>
                        <span className="text-emerald-400">Status: Parsed 100%</span>
                      </div>

                      <div className="bg-gray-900/90 rounded-xl p-4 mb-4 border border-gray-800">
                        <div className="text-xs font-mono text-purple-400 mb-1.5">Input Syllabus Extract:</div>
                        <p className="text-gray-300 text-xs sm:text-sm leading-relaxed font-sans">
                          "Photosynthesis is the biochemical process by which photoautotrophs convert light energy into chemical energy stored in glucose molecules..."
                        </p>
                      </div>

                      <div className="bg-purple-950/20 rounded-2xl p-5 border border-purple-500/30 shadow-inner">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-white text-sm font-bold font-sans">Generated Question #1:</span>
                          <span className="text-[10px] font-mono bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded border border-purple-500/30">Difficulty: Medium</span>
                        </div>
                        <p className="text-gray-200 text-sm mb-4 font-sans font-medium">
                          What is the primary energy conversion occurring in the light reactions of photosynthesis?
                        </p>

                        <div className="space-y-2">
                          {[
                            { text: 'A) Chemical energy into thermal energy', correct: false },
                            { text: 'B) Light energy into chemical energy (ATP & NADPH)', correct: true },
                            { text: 'C) Kinetic energy into potential energy', correct: false },
                            { text: 'D) Nuclear energy into electromagnetic energy', correct: false }
                          ].map((opt, i) => (
                            <div
                              key={i}
                              className={`p-3 rounded-xl border text-xs sm:text-sm flex items-center justify-between font-sans transition-all ${
                                opt.correct
                                  ? 'border-emerald-500/50 bg-emerald-950/40 text-emerald-200 font-semibold'
                                  : 'border-gray-800 bg-gray-900/60 text-gray-400'
                              }`}
                            >
                              <span>{opt.text}</span>
                              {opt.correct && (
                                <span className="text-[11px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-mono font-bold">
                                  Correct Key
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'testpaper' && (
                  <motion.div
                    key="testpaper"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.25 }}
                    className="h-full flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-800 text-xs font-mono text-gray-400">
                        <span className="text-emerald-400">Subject: Biology • Total Marks: 30 • 45 Mins</span>
                        <span className="text-gray-400">Question {currentQuestion + 1} of 3</span>
                      </div>

                      <div className="bg-emerald-950/20 rounded-2xl p-5 border border-emerald-500/30">
                        <div className="flex justify-between items-start mb-3">
                          <span className="text-white text-base font-bold font-sans">Q{currentQuestion + 1}.</span>
                          <span className="bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-md text-xs font-mono border border-emerald-500/30">
                            {testPaperQuestions[currentQuestion].type} • 10 Marks
                          </span>
                        </div>
                        <p className="text-gray-200 text-sm leading-relaxed mb-6 font-sans">
                          {testPaperQuestions[currentQuestion].q}
                        </p>

                        <div className="flex items-center gap-2 pt-4 border-t border-gray-800">
                          <span className="text-xs font-mono text-gray-400">Jump to Question:</span>
                          {testPaperQuestions.map((_, i) => (
                            <button
                              key={i}
                              onClick={() => setCurrentQuestion(i)}
                              className={`w-8 h-8 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                                currentQuestion === i
                                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/30'
                                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                              }`}
                            >
                              {i + 1}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'assignment' && (
                  <motion.div
                    key="assignment"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.25 }}
                    className="h-full flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-800 text-xs font-mono text-gray-400">
                        <span className="text-amber-400">Assignment: Term Research & Visuals</span>
                        <span className="text-gray-400">Task {currentQuestion + 1} of 3</span>
                      </div>

                      <div className="bg-amber-950/20 rounded-2xl p-5 border border-amber-500/30">
                        <div className="flex justify-between items-start mb-3">
                          <span className="text-white text-base font-bold font-sans">Task #{currentQuestion + 1}</span>
                          <span className="bg-amber-500/20 text-amber-300 px-2.5 py-1 rounded-md text-xs font-mono border border-amber-500/30">
                            {assignmentQuestions[currentQuestion].type}
                          </span>
                        </div>
                        <p className="text-gray-200 text-sm leading-relaxed mb-6 font-sans">
                          {assignmentQuestions[currentQuestion].q}
                        </p>

                        <div className="grid grid-cols-2 gap-3 text-xs font-mono text-gray-400 bg-gray-900/60 p-3 rounded-xl mb-4">
                          <div>⏱️ Estimated Time: 2 Hours</div>
                          <div>📁 Format: PDF Report / Diagram</div>
                        </div>

                        <div className="flex items-center gap-2 pt-2">
                          <span className="text-xs font-mono text-gray-400">Select Task:</span>
                          {assignmentQuestions.map((_, i) => (
                            <button
                              key={i}
                              onClick={() => setCurrentQuestion(i)}
                              className={`w-8 h-8 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                                currentQuestion === i
                                  ? 'bg-amber-600 text-white shadow-md shadow-amber-500/30'
                                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                              }`}
                            >
                              {i + 1}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'grading' && (
                  <motion.div
                    key="grading"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.25 }}
                    className="h-full flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-800 text-xs font-mono text-gray-400">
                        <span className="text-indigo-400">Semantic Rubric Analyzer v3.1</span>
                        <span className="text-emerald-400">Confidence: 98.2%</span>
                      </div>

                      <div className="bg-gray-900/90 rounded-xl p-4 mb-3 border border-gray-800">
                        <div className="text-xs font-mono text-gray-400 mb-1">Student Submission Sample:</div>
                        <p className="text-gray-300 text-xs sm:text-sm italic font-sans">
                          "Mitochondria is called the powerhouse because it generates adenosine triphosphate (ATP) through cellular respiration and oxidative phosphorylation."
                        </p>
                      </div>

                      <div className="bg-indigo-950/20 rounded-2xl p-4 sm:p-5 border border-indigo-500/30">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-white font-bold text-sm">Automated Evaluation:</span>
                          <span className="bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full text-xs font-mono font-bold border border-emerald-500/40">
                            Score: 9.5 / 10
                          </span>
                        </div>

                        <div className="space-y-2.5 text-xs sm:text-sm font-sans">
                          <div className="flex items-start gap-2.5 text-emerald-300 bg-emerald-950/30 p-2.5 rounded-xl border border-emerald-500/20">
                            <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                            <span><strong>Concept Mastery:</strong> Accurately links ATP synthesis to oxidative phosphorylation.</span>
                          </div>
                          <div className="flex items-start gap-2.5 text-amber-300 bg-amber-950/30 p-2.5 rounded-xl border border-amber-500/20">
                            <Sparkles size={16} className="text-amber-400 shrink-0 mt-0.5" />
                            <span><strong>Rubric Suggestion:</strong> Mention the role of cristae/inner membrane for full marks.</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Bottom Status Strip */}
              <div className="mt-6 pt-4 border-t border-gray-800 flex items-center justify-between text-[11px] font-mono text-gray-500">
                <span>Tokens: 642 / 2048</span>
                <span>Encoding: UTF-8</span>
                <span className="text-purple-400">Stream: Active</span>
              </div>
            </div>

          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Demo;
