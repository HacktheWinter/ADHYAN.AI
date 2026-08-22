import React, { useState, useEffect } from "react";
import { X, Plus, Trash2, Save, ChevronDown, ChevronUp, Code, Code2, Settings, Download, Maximize2, Minimize2 } from "lucide-react";
import { exportQuizToExcel, exportQuizToPDF } from '../utils/exportUtils';
import axios from "axios";
import API_BASE_URL from "../config";

const emptyCoding = {
  title: "",
  description: "",
  examples: [{ input: "", output: "", explanation: "" }],
  constraints: [""],
  allowedLanguages: ["javascript", "python", "java", "cpp"],
  starterCode: [{ language: "javascript", code: "// Write your code here\n" }],
  publicTestCases: [{ input: "", expectedOutput: "" }],
  hiddenTestCases: [{ input: "", expectedOutput: "" }],
  comparisonMode: "trimmed"
};

const emptyMCQ = {
  question: "",
  options: ["", "", "", ""],
  correctOptionIndex: null,
};

const emptyQuestion = (type = "mcq") => ({
  type,
  marks: 1,
  ...(type === "mcq" ? emptyMCQ : { coding: { ...emptyCoding } })
});

const emptySection = (index) => ({
  title: `Section ${index + 1}`,
  instructions: "",
  durationMinutes: "",
  type: "mcq",
  questions: [emptyQuestion("mcq")]
});

const EditQuizModal = ({ quiz, onClose, onSave }) => {
  const [title, setTitle] = useState(quiz.title || "");
  const [difficulty, setDifficulty] = useState(quiz.difficulty || "mixed");
  const [sections, setSections] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedSection, setExpandedSection] = useState(0);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  useEffect(() => {
    // Map initial data to our editing format
    if (quiz.sections && quiz.sections.length > 0) {
      const mapped = quiz.sections.map(sec => ({
        ...sec,
        durationMinutes: sec.durationMinutes || "",
        questions: sec.questions.map(q => {
          let correctOptionIndex = null;
          if (q.type === 'mcq' && q.options) {
            correctOptionIndex = q.options.indexOf(q.correctAnswer);
            if (correctOptionIndex === -1) correctOptionIndex = null;
          }
          return {
            ...emptyQuestion(q.type || 'mcq'), // Ensure all fields exist
            ...q,
            coding: q.type === 'coding' ? { ...emptyCoding, ...q.coding } : undefined,
            correctOptionIndex
          };
        })
      }));
      setSections(mapped);
    } else {
      setSections([emptySection(0)]);
    }
  }, [quiz]);

  const handleAddSection = () => {
    setSections([...sections, emptySection(sections.length)]);
    setExpandedSection(sections.length);
  };

  const handleRemoveSection = (index) => {
    if (sections.length > 1) {
      setSections(sections.filter((_, i) => i !== index));
      setExpandedSection(Math.max(0, index - 1));
    }
  };

  const updateSection = (sIdx, field, value) => {
    const updated = [...sections];
    updated[sIdx][field] = value;
    setSections(updated);
  };

  const handleAddQuestion = (sIdx, type) => {
    const updated = [...sections];
    updated[sIdx].questions.push(emptyQuestion(type));
    setSections(updated);
  };

  const handleRemoveQuestion = (sIdx, qIdx) => {
    const updated = [...sections];
    if (updated[sIdx].questions.length > 1) {
      updated[sIdx].questions = updated[sIdx].questions.filter((_, i) => i !== qIdx);
      setSections(updated);
    }
  };

  const updateQuestion = (sIdx, qIdx, field, value) => {
    const updated = [...sections];
    updated[sIdx].questions[qIdx][field] = value;
    setSections(updated);
  };

  const updateCodingField = (sIdx, qIdx, field, value) => {
    const updated = [...sections];
    updated[sIdx].questions[qIdx].coding[field] = value;
    setSections(updated);
  };

  const handleArrayFieldAdd = (sIdx, qIdx, arrayName, emptyObj) => {
    const updated = [...sections];
    updated[sIdx].questions[qIdx].coding[arrayName].push(emptyObj);
    setSections(updated);
  };

  const handleArrayFieldRemove = (sIdx, qIdx, arrayName, index) => {
    const updated = [...sections];
    updated[sIdx].questions[qIdx].coding[arrayName] = updated[sIdx].questions[qIdx].coding[arrayName].filter((_, i) => i !== index);
    setSections(updated);
  };

  const handleArrayFieldUpdate = (sIdx, qIdx, arrayName, index, field, value) => {
    const updated = [...sections];
    updated[sIdx].questions[qIdx].coding[arrayName][index][field] = value;
    setSections(updated);
  };

  const handleExportExcel = () => {
    const result = exportQuizToExcel(quiz);
    alert(result.message);
    setShowExportDropdown(false);
  };

  const handleExportPDF = () => {
    const result = exportQuizToPDF(quiz);
    alert(result.message);
    setShowExportDropdown(false);
  };

  const handleSave = async () => {
    if (!title.trim()) return alert("Please enter a quiz title");

    const mappedSections = [];
    let totalMarks = 0;

    for (let sIdx = 0; sIdx < sections.length; sIdx++) {
      const section = sections[sIdx];
      if (!section.title.trim()) return alert(`Section ${sIdx + 1} needs a title`);
      if (!section.durationMinutes || Number(section.durationMinutes) <= 0) return alert(`Section ${sIdx + 1} needs a valid duration in minutes`);

      const mappedQuestions = [];
      for (let qIdx = 0; qIdx < section.questions.length; qIdx++) {
        const q = section.questions[qIdx];
        totalMarks += Number(q.marks || 1);
        
        if (q.type === "mcq") {
          if (!q.question?.trim()) return alert(`Section ${sIdx + 1}, Q${qIdx + 1} is empty`);
          if (q.options.some(opt => !opt.trim())) return alert(`Section ${sIdx + 1}, Q${qIdx + 1} has empty options`);
          if (q.correctOptionIndex === null || q.correctOptionIndex === -1) return alert(`Select a correct answer for Section ${sIdx + 1}, Q${qIdx + 1}`);
          
          mappedQuestions.push({
            type: "mcq",
            question: q.question,
            marks: q.marks,
            options: q.options,
            correctAnswer: q.options[q.correctOptionIndex]
          });
        } else {
          if (!q.coding.title?.trim()) return alert(`Section ${sIdx + 1}, Q${qIdx + 1} missing title`);
          if (!q.coding.description?.trim()) return alert(`Section ${sIdx + 1}, Q${qIdx + 1} missing description`);
          if (q.coding.hiddenTestCases.length === 0 || !q.coding.hiddenTestCases[0].input.trim()) return alert(`Section ${sIdx + 1}, Q${qIdx + 1} must have a valid hidden test case`);

          mappedQuestions.push({
            type: "coding",
            question: q.coding.title,
            marks: q.marks,
            coding: q.coding
          });
        }
      }

      mappedSections.push({
        title: section.title,
        instructions: section.instructions,
        durationMinutes: section.durationMinutes ? Number(section.durationMinutes) : null,
        type: section.type,
        order: sIdx,
        questions: mappedQuestions
      });
    }

    try {
      setIsSaving(true);
      const res = await axios.put(
        `${API_BASE_URL}/quiz/${quiz._id}`,
        {
          title,
          sections: mappedSections,
          difficulty,
          totalMarks
        },
        { withCredentials: true }
      );
      
      onSave(res.data.quiz);
    } catch (error) {
      console.error("Failed to update quiz", error);
      alert(error.response?.data?.error || "Failed to update quiz");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 transition-all duration-300">
      <div className={`bg-surface border border-line flex flex-col shadow-2xl font-body text-ink transition-all duration-300 ${isFullScreen ? 'fixed inset-0 w-full h-full rounded-none' : 'rounded-2xl w-full max-w-5xl max-h-[90vh]'}`}>
        <div className={`p-6 border-b border-line flex items-center justify-between bg-white sticky top-0 z-10 ${isFullScreen ? '' : 'rounded-t-2xl'}`}>
          <div>
            <h3 className="text-2xl font-semibold font-display text-ink">
              Edit Quiz
            </h3>
            <p className="text-sm text-ink-soft mt-1">
              Modify sections, questions, and settings
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setShowExportDropdown(!showExportDropdown)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-colors cursor-pointer shadow-sm"
              >
                <Download className="w-4 h-4" />
                <span>Export</span>
                <ChevronDown className="w-4 h-4" />
              </button>
              
              {showExportDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-line py-2 z-50 overflow-hidden">
                  <button onClick={handleExportExcel} className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-ink hover:bg-gray-100 transition-colors">
                    <Download className="w-4 h-4 text-emerald-600" /> Excel
                  </button>
                  <button onClick={handleExportPDF} className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-ink hover:bg-gray-100 transition-colors">
                    <Download className="w-4 h-4 text-rose-600" /> PDF
                  </button>
                </div>
              )}
            </div>

            <button 
              onClick={() => setIsFullScreen(!isFullScreen)} 
              className="text-ink-soft hover:text-indigo-600 transition-colors p-2 rounded-lg hover:bg-indigo-50"
              title={isFullScreen ? "Exit Full Screen" : "Full Screen"}
            >
              {isFullScreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
            <button 
              onClick={onClose} 
              disabled={isSaving} 
              className="text-ink-soft hover:text-rose-600 transition-colors p-2 rounded-lg hover:bg-rose-50"
              title="Close"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 flex-1 overflow-y-auto space-y-6 bg-gray-50">
          {/* Quiz General Details */}
          <div className="bg-white p-6 rounded-2xl border border-line shadow-sm">
            <h4 className="font-bold text-lg mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5 text-indigo-600" /> General Details
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-ink mb-1">Quiz Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Midterm Assessment"
                  className="w-full px-4 py-2 border border-line rounded-xl bg-paper focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-ink mb-1">Difficulty</label>
                <div className="relative">
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="w-full px-4 py-2 border border-line rounded-xl bg-white hover:bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer transition-all"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                    <option value="mixed">Mixed</option>
                  </select>
                  <ChevronDown className="w-5 h-5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          {/* Sections */}
          <div className="space-y-4">
            {sections.map((section, sIdx) => (
              <div key={sIdx} className="bg-white rounded-2xl border border-line shadow-sm overflow-hidden">
                <div 
                  className={`p-4 flex items-center justify-between cursor-pointer ${expandedSection === sIdx ? 'bg-indigo-50/50 border-b border-line' : 'hover:bg-gray-50'}`}
                  onClick={() => setExpandedSection(expandedSection === sIdx ? -1 : sIdx)}
                >
                  <div className="flex items-center gap-3">
                    {expandedSection === sIdx ? <ChevronUp className="w-5 h-5 text-indigo-600" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                    <h4 className="font-bold text-lg">{section.title || `Section ${sIdx + 1}`}</h4>
                    <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                      {section.questions.length} Question(s)
                    </span>
                  </div>
                  {sections.length > 1 && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleRemoveSection(sIdx); }} 
                      className="text-rose-500 hover:text-rose-700 p-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {expandedSection === sIdx && (
                  <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-ink mb-1">Section Title</label>
                        <input
                          type="text"
                          value={section.title}
                          onChange={(e) => updateSection(sIdx, "title", e.target.value)}
                          className="w-full px-4 py-2 border border-line rounded-xl outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-ink mb-1">Duration (Minutes)</label>
                        <input
                          type="number"
                          placeholder="e.g. 30"
                          min="1"
                          value={section.durationMinutes}
                          onChange={(e) => updateSection(sIdx, "durationMinutes", e.target.value)}
                          className="w-full px-4 py-2 border border-line rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-ink mb-1">Section Type</label>
                        <div className="relative">
                          <select
                            value={section.type || "mcq"}
                            onChange={(e) => {
                              const updated = [...sections];
                              updated[sIdx].type = e.target.value;
                              updated[sIdx].questions = [emptyQuestion(e.target.value)];
                              setSections(updated);
                            }}
                            className="w-full px-4 py-2 border border-line rounded-xl outline-none bg-white hover:bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer transition-all"
                          >
                            <option value="mcq">Multiple Choice (MCQ)</option>
                            <option value="coding">Coding Challenge</option>
                          </select>
                          <ChevronDown className="w-5 h-5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-bold text-ink mb-1">Instructions (Optional)</label>
                        <textarea
                          value={section.instructions}
                          onChange={(e) => updateSection(sIdx, "instructions", e.target.value)}
                          className="w-full px-4 py-2 border border-line rounded-xl outline-none h-20 resize-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-6 border-t border-line pt-6">
                      <h5 className="font-bold text-gray-700">Questions in this Section</h5>
                      
                      {section.questions.map((q, qIdx) => (
                        <div key={qIdx} className="p-5 border border-line rounded-xl bg-gray-50/50">
                          <div className="flex justify-between items-start mb-4">
                            <h6 className="font-bold text-indigo-700 flex items-center gap-2">
                              {q.type === 'mcq' ? 'MCQ' : <Code className="w-4 h-4"/>} Question {qIdx + 1}
                            </h6>
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                <label className="text-xs font-bold text-gray-600">Marks:</label>
                                <input 
                                  type="number" 
                                  value={q.marks} 
                                  onChange={e => updateQuestion(sIdx, qIdx, "marks", Number(e.target.value))} 
                                  className="w-16 px-2 py-1 text-sm border rounded outline-none"
                                />
                              </div>
                              {section.questions.length > 1 && (
                                <button onClick={() => handleRemoveQuestion(sIdx, qIdx)} className="text-rose-500">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>

                          {q.type === 'mcq' ? (
                            <div>
                              <textarea
                                value={q.question}
                                onChange={(e) => updateQuestion(sIdx, qIdx, "question", e.target.value)}
                                placeholder="Enter question text..."
                                className="w-full px-4 py-2 mb-4 border border-line rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-20"
                              />
                              <div className="space-y-3">
                                <p className="text-xs font-bold text-gray-500 uppercase">Options (Select correct via radio)</p>
                                {q.options.map((opt, optIndex) => (
                                  <div key={optIndex} className="flex items-center gap-3">
                                    <input
                                      type="radio"
                                      name={`correct-${sIdx}-${qIdx}`}
                                      checked={q.correctOptionIndex === optIndex}
                                      onChange={() => updateQuestion(sIdx, qIdx, "correctOptionIndex", optIndex)}
                                      className="w-4 h-4 text-indigo-600"
                                    />
                                    <input
                                      type="text"
                                      value={opt}
                                      onChange={(e) => {
                                        const newOpts = [...q.options];
                                        newOpts[optIndex] = e.target.value;
                                        updateQuestion(sIdx, qIdx, "options", newOpts);
                                      }}
                                      placeholder={`Option ${String.fromCharCode(65 + optIndex)}`}
                                      className="flex-1 px-4 py-2 border rounded-xl bg-white outline-none"
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-6 bg-gray-50/30 p-6 rounded-2xl border border-indigo-100">
                              <div className="flex items-center gap-2 mb-2 pb-4 border-b border-indigo-100">
                                <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-lg text-sm font-bold flex items-center gap-2">
                                  <Code2 className="w-4 h-4" /> Coding Challenge
                                </span>
                              </div>
                              
                              <div>
                                <label className="block text-sm font-bold mb-1 text-gray-800">Problem Title</label>
                                <input 
                                  value={q.coding?.title || ""}
                                  onChange={e => updateCodingField(sIdx, qIdx, "title", e.target.value)}
                                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl outline-none bg-white focus:ring-2 focus:ring-indigo-500 transition-shadow"
                                  placeholder="e.g. Two Sum"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-bold mb-1 text-gray-800 flex justify-between">
                                  <span>Problem Description</span>
                                  <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded">Markdown Supported</span>
                                </label>
                                <textarea 
                                  value={q.coding?.description || ""}
                                  onChange={e => updateCodingField(sIdx, qIdx, "description", e.target.value)}
                                  className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none bg-white min-h-[160px] resize-y focus:ring-2 focus:ring-indigo-500 transition-shadow font-mono text-sm"
                                  placeholder="Write the full problem description..."
                                />
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Examples */}
                                <div className="border border-gray-200 rounded-xl p-5 bg-white shadow-sm">
                                  <div className="flex justify-between items-center mb-4">
                                    <h6 className="font-bold text-sm text-gray-800">Examples</h6>
                                    <button onClick={() => handleArrayFieldAdd(sIdx, qIdx, "examples", { input: "", output: "", explanation: "" })} className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"><Plus className="w-3 h-3"/> Add Example</button>
                                  </div>
                                  <div className="space-y-4">
                                    {(q.coding?.examples || []).map((ex, exIdx) => (
                                      <div key={exIdx} className="p-4 bg-gray-50 rounded-xl border border-gray-100 relative group">
                                        {(q.coding?.examples || []).length > 1 && (
                                          <button onClick={() => handleArrayFieldRemove(sIdx, qIdx, "examples", exIdx)} className="absolute top-2 right-2 text-gray-400 hover:text-rose-500 bg-white rounded-full p-1 shadow-sm opacity-0 group-hover:opacity-100 transition-all"><X className="w-3 h-3"/></button>
                                        )}
                                        <div className="space-y-2">
                                          <div>
                                            <label className="text-[10px] font-bold uppercase text-gray-500 mb-1 block tracking-wider">Input</label>
                                            <textarea value={ex.input} onChange={e => handleArrayFieldUpdate(sIdx, qIdx, "examples", exIdx, "input", e.target.value)} placeholder="e.g. nums = [2,7,11,15], target = 9" className="w-full p-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 font-mono resize-y min-h-[60px]" />
                                          </div>
                                          <div>
                                            <label className="text-[10px] font-bold uppercase text-gray-500 mb-1 block tracking-wider">Output</label>
                                            <textarea value={ex.output} onChange={e => handleArrayFieldUpdate(sIdx, qIdx, "examples", exIdx, "output", e.target.value)} placeholder="e.g. [0,1]" className="w-full p-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 font-mono resize-y min-h-[60px]" />
                                          </div>
                                          <div>
                                            <label className="text-[10px] font-bold uppercase text-gray-500 mb-1 block tracking-wider">Explanation (Optional)</label>
                                            <input value={ex.explanation} onChange={e => handleArrayFieldUpdate(sIdx, qIdx, "examples", exIdx, "explanation", e.target.value)} placeholder="Why does this input produce this output?" className="w-full p-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* Constraints */}
                                <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50">
                                  <div className="flex justify-between items-center mb-2">
                                    <h6 className="font-bold text-sm text-gray-700">Constraints</h6>
                                    <button onClick={() => handleArrayFieldAdd(sIdx, qIdx, "constraints", "")} className="text-indigo-600 text-xs font-bold flex items-center gap-1"><Plus className="w-3 h-3"/> Add</button>
                                  </div>
                                  {(q.coding?.constraints || []).map((constraint, cIdx) => (
                                    <div key={cIdx} className="mb-2 flex items-center gap-2">
                                      <input value={constraint} onChange={e => handleStringArrayUpdate(sIdx, qIdx, "constraints", cIdx, e.target.value)} placeholder="e.g. 2 <= nums.length <= 10^4" className="flex-1 p-2 text-xs border rounded outline-none focus:ring-1 focus:ring-indigo-500" />
                                      {(q.coding?.constraints || []).length > 1 && (
                                        <button onClick={() => handleArrayFieldRemove(sIdx, qIdx, "constraints", cIdx)} className="text-rose-500 p-1"><X className="w-4 h-4"/></button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-bold mb-1">Comparison Mode</label>
                                  <div className="relative">
                                    <select 
                                      value={q.coding?.comparisonMode || "trimmed"}
                                      onChange={e => updateCodingField(sIdx, qIdx, "comparisonMode", e.target.value)}
                                      className="w-full px-4 py-2 border rounded-xl outline-none bg-white hover:bg-gray-50 focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer transition-all"
                                    >
                                      <option value="trimmed">Trimmed (Ignores extra spaces)</option>
                                      <option value="exact">Exact (Strict match)</option>
                                    </select>
                                    <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-sm font-bold mb-1">Allowed Languages</label>
                                  <input 
                                    value={(q.coding?.allowedLanguages || []).join(", ")}
                                    onChange={e => updateCodingField(sIdx, qIdx, "allowedLanguages", e.target.value.split(",").map(s => s.trim()))}
                                    className="w-full px-4 py-2 border rounded-xl outline-none bg-white text-sm"
                                    placeholder="javascript, python"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Public */}
                                <div className="border border-gray-200 rounded-xl p-5 bg-white shadow-sm">
                                  <div className="flex justify-between items-center mb-4">
                                    <div>
                                      <h6 className="font-bold text-sm text-gray-800">Public Test Cases</h6>
                                      <p className="text-xs text-gray-500 mt-0.5">Visible to students during the quiz</p>
                                    </div>
                                    <button onClick={() => handleArrayFieldAdd(sIdx, qIdx, "publicTestCases", { input: "", expectedOutput: "" })} className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"><Plus className="w-3 h-3"/> Add</button>
                                  </div>
                                  <div className="space-y-4">
                                    {(q.coding?.publicTestCases || []).map((tc, tcIdx) => (
                                      <div key={tcIdx} className="p-4 bg-gray-50 rounded-xl border border-gray-100 relative group">
                                        {(q.coding?.publicTestCases || []).length > 1 && (
                                          <button onClick={() => handleArrayFieldRemove(sIdx, qIdx, "publicTestCases", tcIdx)} className="absolute top-2 right-2 text-gray-400 hover:text-rose-500 bg-white rounded-full p-1 shadow-sm opacity-0 group-hover:opacity-100 transition-all"><X className="w-3 h-3"/></button>
                                        )}
                                        <div className="space-y-2">
                                          <div>
                                            <label className="text-[10px] font-bold uppercase text-gray-500 mb-1 block tracking-wider">Input</label>
                                            <textarea value={tc.input} onChange={e => handleArrayFieldUpdate(sIdx, qIdx, "publicTestCases", tcIdx, "input", e.target.value)} placeholder="Test input..." className="w-full p-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 font-mono resize-y min-h-[60px]" />
                                          </div>
                                          <div>
                                            <label className="text-[10px] font-bold uppercase text-gray-500 mb-1 block tracking-wider">Expected Output</label>
                                            <textarea value={tc.expectedOutput} onChange={e => handleArrayFieldUpdate(sIdx, qIdx, "publicTestCases", tcIdx, "expectedOutput", e.target.value)} placeholder="Expected output..." className="w-full p-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 font-mono resize-y min-h-[60px]" />
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* Hidden */}
                                <div className="border border-indigo-200 rounded-xl p-5 bg-indigo-50/30 shadow-sm">
                                  <div className="flex justify-between items-center mb-4">
                                    <div>
                                      <h6 className="font-bold text-sm text-indigo-800">Hidden Test Cases</h6>
                                      <p className="text-xs text-indigo-500 mt-0.5">Used for auto-grading, hidden from students</p>
                                    </div>
                                    <button onClick={() => handleArrayFieldAdd(sIdx, qIdx, "hiddenTestCases", { input: "", expectedOutput: "" })} className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"><Plus className="w-3 h-3"/> Add</button>
                                  </div>
                                  <div className="space-y-4">
                                    {(q.coding?.hiddenTestCases || []).map((tc, tcIdx) => (
                                      <div key={tcIdx} className="p-4 bg-white rounded-xl border border-indigo-100 relative shadow-sm group">
                                        {(q.coding?.hiddenTestCases || []).length > 1 && (
                                          <button onClick={() => handleArrayFieldRemove(sIdx, qIdx, "hiddenTestCases", tcIdx)} className="absolute top-2 right-2 text-indigo-300 hover:text-rose-500 bg-indigo-50 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all"><X className="w-3 h-3"/></button>
                                        )}
                                        <div className="space-y-2">
                                          <div>
                                            <label className="text-[10px] font-bold uppercase text-indigo-400 mb-1 block tracking-wider">Input</label>
                                            <textarea value={tc.input} onChange={e => handleArrayFieldUpdate(sIdx, qIdx, "hiddenTestCases", tcIdx, "input", e.target.value)} placeholder="Test input..." className="w-full p-2 text-sm border border-indigo-100 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 font-mono resize-y min-h-[60px]" />
                                          </div>
                                          <div>
                                            <label className="text-[10px] font-bold uppercase text-indigo-400 mb-1 block tracking-wider">Expected Output</label>
                                            <textarea value={tc.expectedOutput} onChange={e => handleArrayFieldUpdate(sIdx, qIdx, "hiddenTestCases", tcIdx, "expectedOutput", e.target.value)} placeholder="Expected output..." className="w-full p-2 text-sm border border-indigo-100 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 font-mono resize-y min-h-[60px]" />
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}

                      <div className="flex gap-3">
                        {section.type === "mcq" ? (
                          <button
                            onClick={() => handleAddQuestion(sIdx, "mcq")}
                            className="flex-1 py-2 border-2 border-dashed border-gray-300 text-gray-600 font-bold rounded-xl hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
                          >
                            <Plus className="w-4 h-4" /> Add MCQ
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAddQuestion(sIdx, "coding")}
                            className="flex-1 py-2 border-2 border-dashed border-indigo-300 text-indigo-600 font-bold rounded-xl hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2"
                          >
                            <Code className="w-4 h-4" /> Add Coding Question
                          </button>
                        )}
                      </div>

                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={handleAddSection}
            className="w-full py-4 border-2 border-dashed border-indigo-200 text-indigo-700 font-bold rounded-2xl hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add New Section
          </button>
        </div>

        <div className="p-6 border-t border-line flex gap-3 bg-white rounded-b-2xl">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="flex-1 py-3 bg-gray-100 text-ink font-bold rounded-xl hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {isSaving ? "Saving..." : <><Save className="w-5 h-5" /> Save Changes</>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditQuizModal;