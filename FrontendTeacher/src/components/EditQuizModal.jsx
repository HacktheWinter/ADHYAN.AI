import React, { useState, useEffect } from "react";
import { X, Plus, Trash2, Save, ChevronDown, ChevronUp, Code, Code2, Settings, Download, Maximize2, Minimize2, FileText } from "lucide-react";
import { exportQuizToExcel, exportQuizToPDF } from '../utils/exportUtils';
import axios from "axios";
import API_BASE_URL from "../config";
import Editor from "@monaco-editor/react";

const emptyCoding = {
  title: "",
  description: "",
  examples: [{ input: "", output: "", explanation: "" }],
  constraints: [""],
  functionParams: [],
  allowedLanguages: ["java", "cpp", "javascript", "python", "c"],
  starterCode: [
    { language: "java", code: "" },
    { language: "cpp", code: "" },
    { language: "javascript", code: "" },
    { language: "python", code: "" },
    { language: "c", code: "" }
  ],
  driverCode: [
    { language: "java", code: "" },
    { language: "cpp", code: "" },
    { language: "javascript", code: "" },
    { language: "python", code: "" },
    { language: "c", code: "" }
  ],
  testCases: [{ input: "", expectedOutput: "" }],
  comparisonMode: "trimmed",
  executionMode: "standard"
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
  const [expandedEditor, setExpandedEditor] = useState(null);

  // Bulk Actions State
  const [selectedQuestions, setSelectedQuestions] = useState({});
  const [bulkMarks, setBulkMarks] = useState({});

  const handleSelectQuestion = (sIdx, qIdx) => {
    setSelectedQuestions(prev => {
      const sectionSelected = prev[sIdx] || [];
      if (sectionSelected.includes(qIdx)) {
        return { ...prev, [sIdx]: sectionSelected.filter(i => i !== qIdx) };
      } else {
        return { ...prev, [sIdx]: [...sectionSelected, qIdx] };
      }
    });
  };

  const handleSelectAll = (sIdx) => {
    setSelectedQuestions(prev => {
      const sectionQuestions = sections[sIdx].questions;
      const sectionSelected = prev[sIdx] || [];
      if (sectionSelected.length === sectionQuestions.length) {
        return { ...prev, [sIdx]: [] }; // Deselect all
      } else {
        return { ...prev, [sIdx]: sectionQuestions.map((_, i) => i) }; // Select all
      }
    });
  };

  const handleBulkMarksChange = (sIdx) => {
    const selected = selectedQuestions[sIdx] || [];
    const marks = bulkMarks[sIdx];
    if (selected.length === 0) {
      alert("Please select questions to update marks");
      return;
    }
    if (!marks || marks <= 0) {
      alert("Please enter a valid marks value");
      return;
    }
    const updatedSections = [...sections];
    selected.forEach(qIdx => {
      updatedSections[sIdx].questions[qIdx].marks = Number(marks);
    });
    setSections(updatedSections);
    setSelectedQuestions(prev => ({ ...prev, [sIdx]: [] }));
    setBulkMarks(prev => ({ ...prev, [sIdx]: "" }));
  };

  const handleBulkDelete = (sIdx) => {
    const selected = selectedQuestions[sIdx] || [];
    if (selected.length === 0) {
      alert("Please select questions to delete");
      return;
    }
    if (!confirm(`Are you sure you want to delete ${selected.length} questions?`)) return;
    
    const updatedSections = [...sections];
    updatedSections[sIdx].questions = updatedSections[sIdx].questions.filter((_, i) => !selected.includes(i));
    
    if (updatedSections[sIdx].questions.length === 0) {
      updatedSections[sIdx].questions = [emptyQuestion(updatedSections[sIdx].type)];
    }
    
    setSections(updatedSections);
    setSelectedQuestions(prev => ({ ...prev, [sIdx]: [] }));
  };

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
            coding: q.type === 'coding' ? {
              ...emptyCoding,
              ...q.coding,
              // Merge old public/hidden test cases into unified testCases for backward compat
              testCases: q.coding?.testCases?.length > 0 
                ? q.coding.testCases 
                : [...(q.coding?.hiddenTestCases || []), ...(q.coding?.publicTestCases || [])].filter(tc => tc.input || tc.expectedOutput).length > 0
                  ? [...(q.coding?.hiddenTestCases || []), ...(q.coding?.publicTestCases || [])].filter(tc => tc.input || tc.expectedOutput)
                  : [{ input: "", expectedOutput: "" }]
            } : undefined,
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

  const handleStringArrayUpdate = (sIdx, qIdx, arrayName, index, value) => {
    const updated = [...sections];
    updated[sIdx].questions[qIdx].coding[arrayName][index] = value;
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
    if (!title.trim()) return alert("Please enter an assessment title");

    const mappedSections = [];
    let totalMarks = 0;

    for (let sIdx = 0; sIdx < sections.length; sIdx++) {
      const section = sections[sIdx];
      if (!section.title.trim()) return alert(`Section ${sIdx + 1} needs a title`);


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
          if (q.coding.testCases.length === 0 || !q.coding.testCases[0].input.trim()) return alert(`Section ${sIdx + 1}, Q${qIdx + 1} must have a valid test case`);

          const reqLangs = ["java", "cpp", "javascript", "python", "c"];
          for (const lang of reqLangs) {
            const hasStarter = q.coding.starterCode?.some(s => s.language === lang && s.code?.trim());
            const hasDriver = q.coding.driverCode?.some(d => d.language === lang && d.code?.trim());
            if (!hasStarter || !hasDriver) {
              return alert(`Section ${sIdx + 1}, Q${qIdx + 1} is missing starter code or driver code for ${lang}. Both are required for all 5 languages.`);
            }
          }

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
      console.error("Failed to update assessment", error);
      alert(error.response?.data?.error || "Failed to update assessment");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 transition-all duration-300">
      <div className={`bg-surface border border-line flex flex-col shadow-2xl font-body text-ink transition-all duration-300 ${isFullScreen ? 'fixed inset-0 w-full h-full rounded-none' : 'rounded-2xl w-full max-w-5xl max-h-[90vh]'}`}>
        <div className={`p-6 border-b border-line flex items-center justify-between bg-white sticky top-0 z-10 ${isFullScreen ? '' : 'rounded-t-2xl'}`}>
          <div>
            <h3 className="text-2xl font-semibold font-display text-ink">
              Edit Assessment
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
                <label className="block text-sm font-bold text-ink mb-1">Assessment Title</label>
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
                        <label className="block text-sm font-bold text-ink mb-1">Section Type</label>
                        <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200">
                          <button
                            type="button"
                            onClick={() => {
                              if (section.type !== "mcq") {
                                const updated = [...sections];
                                updated[sIdx].type = "mcq";
                                updated[sIdx].questions = [emptyQuestion("mcq")];
                                setSections(updated);
                              }
                            }}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
                              (!section.type || section.type === "mcq") 
                                ? "bg-white text-indigo-600 shadow-sm border border-gray-200/50" 
                                : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"
                            }`}
                          >
                            <FileText className="w-4 h-4" /> MCQ
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (section.type !== "coding") {
                                const updated = [...sections];
                                updated[sIdx].type = "coding";
                                updated[sIdx].questions = [emptyQuestion("coding")];
                                setSections(updated);
                              }
                            }}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
                              section.type === "coding" 
                                ? "bg-white text-indigo-600 shadow-sm border border-gray-200/50" 
                                : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"
                            }`}
                          >
                            <Code2 className="w-4 h-4" /> Coding
                          </button>
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
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                        <h5 className="font-bold text-gray-700 uppercase text-sm tracking-wider">Questions in this Section</h5>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => handleSelectAll(sIdx)}
                            className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all duration-200 cursor-pointer ${
                              (selectedQuestions[sIdx] || []).length > 0
                                ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
                                : 'text-indigo-600 hover:bg-indigo-50'
                            }`}
                          >
                            {(selectedQuestions[sIdx] || []).length > 0
                              ? `${(selectedQuestions[sIdx] || []).length} Selected — Deselect`
                              : 'Select All'}
                          </button>

                          {(selectedQuestions[sIdx] || []).length > 0 && (
                            <>
                              <span className="text-gray-300">|</span>
                              <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                placeholder="Marks"
                                value={bulkMarks[sIdx] || ""}
                                onChange={(e) => setBulkMarks(prev => ({ ...prev, [sIdx]: e.target.value.replace(/[^0-9]/g, '') }))}
                                className="w-14 px-2 py-1 text-xs border border-gray-200 bg-white rounded-lg outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-300 text-center font-semibold text-gray-700 transition-all"
                              />
                              <button 
                                onClick={() => handleBulkMarksChange(sIdx)}
                                className="px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              >
                                Apply
                              </button>
                              <span className="text-gray-300">|</span>
                              <button 
                                onClick={() => handleBulkDelete(sIdx)}
                                className="px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-1"
                              >
                                <Trash2 className="w-3 h-3" /> Delete
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      
                      {section.questions.map((q, qIdx) => (
                        <div key={qIdx} className="p-5 border border-line rounded-xl bg-gray-50/50">
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                              {(selectedQuestions[sIdx] || []).length > 0 && (
                                <input 
                                  type="checkbox" 
                                  checked={(selectedQuestions[sIdx] || []).includes(qIdx)}
                                  onChange={() => handleSelectQuestion(sIdx, qIdx)}
                                  className="w-4 h-4 text-indigo-600 rounded cursor-pointer mt-0.5"
                                />
                              )}
                              <h6 className="font-bold text-indigo-700 flex items-center gap-2">
                                {q.type === 'mcq' ? 'MCQ' : <Code className="w-4 h-4"/>} Question {qIdx + 1}
                              </h6>
                            </div>
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

                              {/* Function Parameters */}
                              <div className="border border-purple-200 rounded-xl p-5 bg-purple-50/30">
                                <div className="flex justify-between items-center mb-3">
                                  <div>
                                    <h6 className="font-bold text-sm text-purple-800">Function Parameters</h6>
                                    <p className="text-xs text-purple-500 mt-0.5">Define parameters like target, k, needle etc. shown to students</p>
                                  </div>
                                  <button 
                                    type="button"
                                    onClick={() => handleArrayFieldAdd(sIdx, qIdx, "functionParams", { name: "", description: "" })} 
                                    className="bg-purple-100 text-purple-700 hover:bg-purple-200 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                                  >
                                    <Plus className="w-3 h-3"/> Add Parameter
                                  </button>
                                </div>
                                {(q.coding?.functionParams || []).length === 0 ? (
                                  <p className="text-xs text-purple-400 italic">No parameters added. Click "Add Parameter" if this problem uses target, k, or similar values.</p>
                                ) : (
                                  <div className="space-y-2">
                                    {(q.coding?.functionParams || []).map((param, pIdx) => (
                                      <div key={pIdx} className="flex items-center gap-2 bg-white rounded-lg p-2.5 border border-purple-100 group">
                                        <input
                                          value={param.name}
                                          onChange={e => handleArrayFieldUpdate(sIdx, qIdx, "functionParams", pIdx, "name", e.target.value)}
                                          placeholder="e.g. target"
                                          className="w-32 px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-purple-500 font-mono font-semibold"
                                        />
                                        <span className="text-gray-300">—</span>
                                        <input
                                          value={param.description}
                                          onChange={e => handleArrayFieldUpdate(sIdx, qIdx, "functionParams", pIdx, "description", e.target.value)}
                                          placeholder="e.g. The target sum value"
                                          className="flex-1 px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-purple-500"
                                        />
                                        <button 
                                          type="button"
                                          onClick={() => handleArrayFieldRemove(sIdx, qIdx, "functionParams", pIdx)} 
                                          className="text-gray-400 hover:text-rose-500 p-1 rounded opacity-0 group-hover:opacity-100 transition-all"
                                        >
                                          <X className="w-3.5 h-3.5"/>
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
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
                                  <label className="block text-sm font-bold mb-1">Execution Mode</label>
                                  <div className="relative">
                                    <select 
                                      value={q.coding?.executionMode || "standard"}
                                      onChange={e => updateCodingField(sIdx, qIdx, "executionMode", e.target.value)}
                                      className="w-full px-4 py-2 border rounded-xl outline-none bg-white hover:bg-gray-50 focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer transition-all"
                                    >
                                      <option value="standard">Standard (Student writes full program)</option>
                                      <option value="function">Function (Student writes function body only)</option>
                                    </select>
                                    <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                  </div>
                                </div>
                              </div>

                              <div>
                                <label className="block text-sm font-bold mb-1">Allowed Languages</label>
                                <input 
                                  value={(q.coding?.allowedLanguages || []).join(", ")}
                                  onChange={e => updateCodingField(sIdx, qIdx, "allowedLanguages", e.target.value.split(",").map(s => s.trim()))}
                                  className="w-full px-4 py-2 border rounded-xl outline-none bg-white text-sm"
                                  placeholder="java, cpp, javascript, python, c"
                                />
                              </div>

                              {/* Starter & Driver Code Editors */}
                              <div className="col-span-1 md:col-span-2 space-y-4">
                                <label className="block text-sm font-bold mb-1">Boilerplate & Driver Code (Required for all 5 languages)</label>
                                {["java", "cpp", "javascript", "python", "c"].map(lang => {
                                  const starter = q.coding?.starterCode?.find(s => s.language === lang)?.code || "";
                                  const driver = q.coding?.driverCode?.find(d => d.language === lang)?.code || "";
                                  return (
                                    <div key={lang} className="border border-gray-200 p-4 rounded-xl bg-white shadow-sm">
                                      <h6 className="font-bold uppercase text-xs mb-2 text-indigo-600">{lang}</h6>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                          <div className="flex justify-between items-center mb-1">
                                            <label className="text-xs font-semibold text-gray-600 block">Starter Code (Student sees this)</label>
                                            <button
                                              type="button"
                                              onClick={() => setExpandedEditor({ sIdx, qIdx, lang, field: 'starterCode', value: starter })}
                                              className="text-gray-400 hover:text-indigo-600 transition-colors p-1"
                                              title="Expand Editor"
                                            >
                                              <Maximize2 className="w-4 h-4" />
                                            </button>
                                          </div>
                                          <div className="h-32 rounded overflow-hidden border border-gray-200">
                                            <Editor
                                              height="100%"
                                              language={lang === 'c' || lang === 'cpp' ? 'cpp' : lang}
                                              theme="light"
                                              value={starter}
                                              onChange={(val) => {
                                                const newStarter = [...(q.coding?.starterCode || [])];
                                                const idx = newStarter.findIndex(s => s.language === lang);
                                                if (idx >= 0) newStarter[idx].code = val || "";
                                                else newStarter.push({ language: lang, code: val || "" });
                                                updateCodingField(sIdx, qIdx, "starterCode", newStarter);
                                              }}
                                              options={{ minimap: { enabled: false }, lineNumbers: 'off', scrollBeyondLastLine: false, tabSize: 2 }}
                                            />
                                          </div>
                                        </div>
                                        <div>
                                          <div className="flex justify-between items-center mb-1">
                                            <label className="text-xs font-semibold text-gray-600 block">
                                              Driver Code (Use {q.coding?.executionMode === 'function' ? '{{STUDENT_BODY}}' : '{{USER_CODE}}'})
                                            </label>
                                            <button
                                              type="button"
                                              onClick={() => setExpandedEditor({ sIdx, qIdx, lang, field: 'driverCode', value: driver })}
                                              className="text-gray-400 hover:text-indigo-600 transition-colors p-1"
                                              title="Expand Editor"
                                            >
                                              <Maximize2 className="w-4 h-4" />
                                            </button>
                                          </div>
                                          <div className="h-32 rounded overflow-hidden border border-gray-200 bg-gray-50">
                                            <Editor
                                              height="100%"
                                              language={lang === 'c' || lang === 'cpp' ? 'cpp' : lang}
                                              theme="vs-dark"
                                              value={driver}
                                              onChange={(val) => {
                                                const newDriver = [...(q.coding?.driverCode || [])];
                                                const idx = newDriver.findIndex(d => d.language === lang);
                                                if (idx >= 0) newDriver[idx].code = val || "";
                                                else newDriver.push({ language: lang, code: val || "" });
                                                updateCodingField(sIdx, qIdx, "driverCode", newDriver);
                                              }}
                                              options={{ minimap: { enabled: false }, lineNumbers: 'off', scrollBeyondLastLine: false, tabSize: 2 }}
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Test Cases */}
                              <div className="border border-indigo-200 rounded-xl p-5 bg-indigo-50/30 shadow-sm">
                                  <div className="flex justify-between items-center mb-4">
                                    <div>
                                      <h6 className="font-bold text-sm text-indigo-800">Test Cases</h6>
                                      <p className="text-xs text-indigo-500 mt-0.5">Used for auto-grading. Students can run code against these but can't see expected outputs.</p>
                                    </div>
                                    <button onClick={() => handleArrayFieldAdd(sIdx, qIdx, "testCases", { input: "", expectedOutput: "" })} className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"><Plus className="w-3 h-3"/> Add</button>
                                  </div>
                                  <div className="space-y-4">
                                    {(q.coding?.testCases || []).map((tc, tcIdx) => (
                                      <div key={tcIdx} className="p-4 bg-white rounded-xl border border-indigo-100 relative shadow-sm group">
                                        {(q.coding?.testCases || []).length > 1 && (
                                          <button onClick={() => handleArrayFieldRemove(sIdx, qIdx, "testCases", tcIdx)} className="absolute top-2 right-2 text-indigo-300 hover:text-rose-500 bg-indigo-50 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all"><X className="w-3 h-3"/></button>
                                        )}
                                        <div className="space-y-2">
                                          <div>
                                            <label className="text-[10px] font-bold uppercase text-indigo-400 mb-1 block tracking-wider">Input</label>
                                            <textarea value={tc.input} onChange={e => handleArrayFieldUpdate(sIdx, qIdx, "testCases", tcIdx, "input", e.target.value)} placeholder="Test input..." className="w-full p-2 text-sm border border-indigo-100 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 font-mono resize-y min-h-[60px]" />
                                          </div>
                                          <div>
                                            <label className="text-[10px] font-bold uppercase text-indigo-400 mb-1 block tracking-wider">Expected Output</label>
                                            <textarea value={tc.expectedOutput} onChange={e => handleArrayFieldUpdate(sIdx, qIdx, "testCases", tcIdx, "expectedOutput", e.target.value)} placeholder="Expected output..." className="w-full p-2 text-sm border border-indigo-100 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 font-mono resize-y min-h-[60px]" />
                                          </div>
                                        </div>
                                      </div>
                                    ))}
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

    {/* Expanded Editor Overlay */}
    {expandedEditor && (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-8">
        <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[80vh] flex flex-col shadow-2xl">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h4 className="font-bold text-lg text-gray-900">
                {expandedEditor.field === 'starterCode' ? 'Starter Code' : 'Driver Code'} — {expandedEditor.lang.toUpperCase()}
              </h4>
              <p className="text-xs text-gray-500 mt-0.5">
                {expandedEditor.field === 'driverCode' ? 'Use {{USER_CODE}} or {{STUDENT_BODY}} placeholder' : 'This code is shown to the student as a starting point'}
              </p>
            </div>
            <button onClick={() => setExpandedEditor(null)} className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 min-h-[400px]">
            <Editor
              height="100%"
              language={expandedEditor.lang === 'c' || expandedEditor.lang === 'cpp' ? 'cpp' : expandedEditor.lang}
              theme={expandedEditor.field === 'driverCode' ? 'vs-dark' : 'light'}
              value={expandedEditor.value}
              onChange={(val) => {
                const { sIdx, qIdx, lang, field } = expandedEditor;
                const updated = [...sections];
                const arr = [...(updated[sIdx].questions[qIdx].coding?.[field] || [])];
                const idx = arr.findIndex(s => s.language === lang);
                if (idx >= 0) arr[idx].code = val || "";
                else arr.push({ language: lang, code: val || "" });
                updated[sIdx].questions[qIdx].coding[field] = arr;
                setSections(updated);
                setExpandedEditor(prev => ({ ...prev, value: val || "" }));
              }}
              options={{ minimap: { enabled: false }, lineNumbers: 'on', scrollBeyondLastLine: false, tabSize: 2, fontSize: 14 }}
            />
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default EditQuizModal;