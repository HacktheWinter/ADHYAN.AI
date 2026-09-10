import React, { useState, useRef, useEffect } from "react";
import { X, Plus, Trash2, Save, ChevronDown, ChevronUp, Code, Code2, Settings, Maximize2, Minimize2, Upload, Loader2, FileUp, Clock, FileText, Sparkles, CheckCircle, Check } from "lucide-react";
import axios from "axios";
import API_BASE_URL from "../config";
import Editor from "@monaco-editor/react";

const CustomSelect = ({ value, onChange, options }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find(o => o.value === value) || options[0];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-2 border border-gray-200 rounded-xl outline-none bg-white hover:bg-gray-50 focus:ring-2 focus:ring-indigo-500 transition-all text-sm text-gray-800 font-medium cursor-pointer"
      >
        <span className="truncate">{selectedOption?.label}</span>
        <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2" />
      </button>
      
      {isOpen && (
        <div className="absolute top-full mt-1.5 w-full bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between transition-colors cursor-pointer ${
                value === opt.value 
                  ? 'bg-indigo-50 text-indigo-700 font-bold' 
                  : 'text-gray-700 hover:bg-gray-50 font-medium'
              }`}
            >
              <span className="truncate">{opt.label}</span>
              {value === opt.value && <Check className="w-4 h-4 flex-shrink-0 ml-2" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const ExpandableTextarea = ({ value, onChange, placeholder }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current && !isExpanded) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      // Auto-grow up to 150px
      textareaRef.current.style.height = Math.min(scrollHeight, 150) + 'px';
    }
  }, [value, isExpanded]);

  return (
    <>
      <div className="relative group">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-4 py-3 pr-10 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-300 outline-none resize-none text-sm transition-all overflow-hidden"
          style={{ minHeight: '6rem' }}
        />
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className="absolute top-2 right-2 p-1.5 bg-white shadow-sm border border-gray-200 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
          title="Expand to Full Screen"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {isExpanded && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                Edit Question Text
              </h3>
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full transition-colors"
              >
                <Minimize2 className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 flex-1 flex flex-col">
              <textarea
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full h-full p-6 border-2 border-indigo-100 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-300 outline-none resize-none text-base leading-relaxed transition-all shadow-inner"
              />
            </div>
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-200 transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
              >
                <CheckCircle className="w-5 h-5" /> Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
const emptyCoding = {
  title: "",
  description: "",
  examples: [{ input: "", output: "", explanation: "" }],
  constraints: [""],
  functionParams: [],
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
  executionMode: "function"
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

const CreateManualQuizModal = ({ classId, onClose, onCreated, showToast }) => {
  const [title, setTitle] = useState("");
  const [difficulty, setDifficulty] = useState("mixed");
  const [isDifficultyMenuOpen, setIsDifficultyMenuOpen] = useState(false);
  const difficultyDropdownRef = useRef(null);
  
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (difficultyDropdownRef.current && !difficultyDropdownRef.current.contains(event.target)) {
        setIsDifficultyMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  const [sections, setSections] = useState([emptySection(0)]);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedEditor, setExpandedEditor] = useState(null);
  const [expandedSection, setExpandedSection] = useState(0);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [extractingSectionIdx, setExtractingSectionIdx] = useState(-1);

  // Language tab state for code editors
  const [activeLang, setActiveLang] = useState({});

  // AI Generation state
  const [aiPanelOpenForSection, setAiPanelOpenForSection] = useState(-1);
  const [aiTopicInput, setAiTopicInput] = useState("");
  const [aiQuestionCount, setAiQuestionCount] = useState(5);
  const [aiMarksPerQuestion, setAiMarksPerQuestion] = useState(1);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

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
      showToast("Please select questions to update marks", 'error');
      return;
    }
    if (!marks || marks <= 0) {
      showToast("Please enter a valid marks value", 'error');
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
      showToast("Please select questions to delete", 'error');
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

  const handleExtractQuestions = async (sIdx, e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = [
      "application/pdf", 
      "application/msword", 
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document", 
      "application/vnd.ms-excel", 
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ];
    
    if (!allowedTypes.includes(file.type)) {
      showToast("Please upload a PDF, Word, or Excel document.", 'error');
      return;
    }

    try {
      setExtractingSectionIdx(sIdx);
      const formData = new FormData();
      formData.append("file", file);

      const res = await axios.post(`${API_BASE_URL}/quiz/extract-exact`, formData, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" }
      });

      const extractedQuestions = res.data.questions;
      if (extractedQuestions && extractedQuestions.length > 0) {
        const formattedQuestions = extractedQuestions.map(q => {
          if (q.type === 'coding') {
            return {
              type: 'coding',
              marks: q.marks || 5,
              coding: {
                ...emptyCoding,
                ...q.coding
              }
            };
          } else {
            return {
              type: 'mcq',
              marks: q.marks || 1,
              question: q.question || "",
              options: q.options || ["", "", "", ""],
              correctOptionIndex: q.correctOptionIndex ?? 0
            };
          }
        });

        const updated = [...sections];
        // If the section only has one empty placeholder question, replace it
        if (updated[sIdx].questions.length === 1 && !updated[sIdx].questions[0].question && !updated[sIdx].questions[0].coding?.title) {
           updated[sIdx].questions = formattedQuestions;
        } else {
           updated[sIdx].questions = [...updated[sIdx].questions, ...formattedQuestions];
        }
        setSections(updated);
        showToast(`Imported ${formattedQuestions.length} question${formattedQuestions.length > 1 ? 's' : ''} from file`, 'success');
      }
    } catch (error) {
      console.error("Extraction failed:", error);
      showToast(error.response?.data?.error || "Failed to extract questions from file", 'error');
    } finally {
      setExtractingSectionIdx(-1);
      e.target.value = null; // reset file input
    }
  };

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
    setSections(prevSections => {
      const updated = [...prevSections];
      const section = { ...updated[sIdx] };
      const questions = [...section.questions];
      const question = { ...questions[qIdx] };
      const coding = { ...question.coding };
      
      coding[field] = value;
      
      // Automatically swap placeholders if executionMode changes
      if (field === "executionMode") {
        const isFunction = value === "function";
        const oldPlaceholder = isFunction ? "{{USER_CODE}}" : "{{STUDENT_BODY}}";
        const newPlaceholder = isFunction ? "{{STUDENT_BODY}}" : "{{USER_CODE}}";
        
        if (coding.driverCode) {
          coding.driverCode = coding.driverCode.map(d => ({
            ...d,
            code: d.code ? d.code.replace(new RegExp(oldPlaceholder, "g"), newPlaceholder) : d.code
          }));
        }
      }
      
      question.coding = coding;
      questions[qIdx] = question;
      section.questions = questions;
      updated[sIdx] = section;
      return updated;
    });
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


  const handleSave = async () => {
    if (!title.trim()) return showToast("Please enter an assessment title", 'error');

    const mappedSections = [];

    for (let sIdx = 0; sIdx < sections.length; sIdx++) {
      const section = sections[sIdx];
      if (!section.title.trim()) return showToast(`Section ${sIdx + 1} needs a title`, 'error');


      const mappedQuestions = [];
      for (let qIdx = 0; qIdx < section.questions.length; qIdx++) {
        const q = section.questions[qIdx];
        if (q.type === "mcq") {
          if (!q.question?.trim()) return showToast(`Section ${sIdx + 1}, Q${qIdx + 1} is empty`, 'error');
          if (q.options.some(opt => !opt.trim())) return showToast(`Section ${sIdx + 1}, Q${qIdx + 1} has empty options`, 'error');
          if (q.correctOptionIndex === null) return showToast(`Select a correct answer for Section ${sIdx + 1}, Q${qIdx + 1}`, 'error');
          
          mappedQuestions.push({
            type: "mcq",
            question: q.question,
            marks: q.marks,
            options: q.options,
            correctAnswer: q.options[q.correctOptionIndex]
          });
        } else {
          if (!q.coding.title?.trim()) return showToast(`Section ${sIdx + 1}, Q${qIdx + 1} missing title`, 'error');
          if (!q.coding.description?.trim()) return showToast(`Section ${sIdx + 1}, Q${qIdx + 1} missing description`, 'error');
          
          const reqLangs = ["java", "cpp", "javascript", "python", "c"];
          for (const lang of reqLangs) {
            const hasStarter = q.coding.starterCode?.some(s => s.language === lang && s.code?.trim());
            const hasDriver = q.coding.driverCode?.some(d => d.language === lang && d.code?.trim());
            if (!hasStarter || !hasDriver) {
              return showToast(`Section ${sIdx + 1}, Q${qIdx + 1} is missing starter/driver code for ${lang}.`, 'error');
            }
          }

          if (q.coding.testCases.length === 0 || !q.coding.testCases[0].input.trim()) return showToast(`Section ${sIdx + 1}, Q${qIdx + 1} must have a valid test case`, 'error');

          mappedQuestions.push({
            type: "coding",
            question: q.coding.title, // Use title for the root question field
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
      const res = await axios.post(
        `${API_BASE_URL}/quiz/create-manual`,
        {
          classroomId: classId,
          title,
          sections: mappedSections,
          difficulty
        },
        { withCredentials: true }
      );
      
      onCreated(res.data.quiz);
    } catch (error) {
      console.error("Failed to create assessment", error);
      showToast(error.response?.data?.error || "Failed to create assessment", 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 transition-all duration-300">
      <div className={`bg-surface border border-line flex flex-col shadow-2xl font-body text-ink transition-all duration-300 ${isFullScreen ? 'fixed inset-0 w-full h-full rounded-none' : 'rounded-2xl w-full max-w-5xl max-h-[90vh]'}`}>
        <div className={`px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-white sticky top-0 z-10 ${isFullScreen ? '' : 'rounded-t-2xl'}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
              <FileText className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Create Assessment</h3>
              <p className="text-xs text-gray-500">Build multi-section assessments with MCQs & Coding</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsFullScreen(!isFullScreen)} 
              className="text-gray-400 hover:text-indigo-600 transition-colors p-2 rounded-lg hover:bg-indigo-50"
              title={isFullScreen ? "Exit Full Screen" : "Full Screen"}
            >
              {isFullScreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
            <button 
              onClick={onClose} 
              disabled={isSaving} 
              className="text-gray-400 hover:text-rose-600 transition-colors p-2 rounded-lg hover:bg-rose-50"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 flex-1 overflow-y-auto space-y-6 bg-gray-50">
          {/* Quiz General Details */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
            <h4 className="font-bold text-sm text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Settings className="w-4 h-4 text-indigo-600" /> General Details
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Assessment Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Midterm Assessment"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-300 outline-none transition-all text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Difficulty</label>
                <div className="relative" ref={difficultyDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsDifficultyMenuOpen(!isDifficultyMenuOpen)}
                    className="w-full flex items-center justify-between px-3 py-2.5 border border-gray-200 rounded-xl bg-gray-50 hover:bg-gray-100 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all text-sm font-medium text-gray-800 cursor-pointer"
                  >
                    <span className="capitalize">{difficulty}</span>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </button>
                  
                  {isDifficultyMenuOpen && (
                    <div className="absolute top-full mt-1.5 w-full bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                      {['easy', 'medium', 'hard', 'mixed'].map((level) => (
                        <button
                          key={level}
                          type="button"
                          onClick={() => {
                            setDifficulty(level);
                            setIsDifficultyMenuOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between transition-colors cursor-pointer ${
                            difficulty === level 
                              ? 'bg-indigo-50 text-indigo-700 font-bold' 
                              : 'text-gray-700 hover:bg-gray-50 font-medium'
                          }`}
                        >
                          <span className="capitalize">{level}</span>
                          {difficulty === level && <Check className="w-4 h-4" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Sections */}
          <div className="space-y-4">
            {sections.map((section, sIdx) => (
              <div key={sIdx} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div 
                  className={`px-5 py-3.5 flex items-center justify-between cursor-pointer transition-colors ${expandedSection === sIdx ? 'bg-indigo-50/60 border-b border-gray-200' : 'hover:bg-gray-50'}`}
                  onClick={() => setExpandedSection(expandedSection === sIdx ? -1 : sIdx)}
                >
                  <div className="flex items-center gap-3">
                    {expandedSection === sIdx ? <ChevronUp className="w-4 h-4 text-indigo-600" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    <h4 className="font-bold text-base text-gray-900">{section.title || `Section ${sIdx + 1}`}</h4>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${section.type === 'coding' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                      {section.type === 'coding' ? 'Coding' : 'MCQ'}
                    </span>
                    <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      {section.questions.length} Q{section.questions.length !== 1 ? 's' : ''}
                    </span>

                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (aiPanelOpenForSection === sIdx) {
                          setAiPanelOpenForSection(-1);
                        } else {
                          setExpandedSection(sIdx);
                          setAiPanelOpenForSection(sIdx);
                          setAiTopicInput("");
                          setAiQuestionCount(section.type === "coding" ? 3 : 5);
                          setAiMarksPerQuestion(section.type === "coding" ? 5 : 1);
                          setTimeout(() => {
                            const panel = document.getElementById(`ai-panel-${sIdx}`);
                            if (panel) {
                              panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }
                          }, 100);
                        }
                      }}
                      disabled={isGeneratingAI}
                      className={`flex items-center gap-1.5 px-3 py-1.5 font-semibold rounded-lg transition-colors text-xs border disabled:opacity-50 ${
                        aiPanelOpenForSection === sIdx
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : 'bg-white text-purple-600 border-purple-200 hover:bg-purple-50'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Generate with AI</span>
                    </button>
                    <div 
                      className="relative" 
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input 
                        type="file" 
                        accept=".pdf,.doc,.docx,.xls,.xlsx" 
                        onChange={(e) => {
                          e.stopPropagation();
                          handleExtractQuestions(sIdx, e);
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                        disabled={extractingSectionIdx === sIdx}
                      />
                      <button
                        type="button"
                        disabled={extractingSectionIdx === sIdx}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 font-semibold rounded-lg hover:bg-emerald-100 transition-colors text-xs border border-emerald-200 disabled:opacity-50"
                      >
                        {extractingSectionIdx === sIdx ? (
                          <><Loader2 className="w-3.5 h-3.5 animate-spin" /> <span className="hidden sm:inline">Extracting...</span></>
                        ) : (
                          <><FileUp className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Import Questions</span></>
                        )}
                      </button>
                    </div>
                    {sections.length > 1 && (
                      <button 
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleRemoveSection(sIdx); }} 
                        className="text-gray-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                        title="Delete Section"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {expandedSection === sIdx && (
                  <div className="p-5 space-y-5">
                    {/* AI Generation Panel */}
                    {aiPanelOpenForSection === sIdx && (
                      <div id={`ai-panel-${sIdx}`} className="ai-panel-animated bg-white rounded-xl p-5 space-y-4 relative overflow-hidden shadow-lg">
                        {/* Gradient accent bar */}
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-violet-500 to-indigo-500"></div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-md shadow-purple-500/20">
                              <Sparkles className="w-4.5 h-4.5 text-white" />
                            </div>
                            <div>
                              <h6 className="font-bold text-sm text-gray-900">AI Question Generator</h6>
                              <p className="text-xs text-gray-500">Generate {section.type === 'coding' ? 'coding challenges' : 'MCQ questions'} from your topics</p>
                            </div>
                          </div>
                          <button
                            onClick={() => setAiPanelOpenForSection(-1)}
                            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">Topics / Prompt</label>
                          <textarea
                            value={aiTopicInput}
                            onChange={(e) => setAiTopicInput(e.target.value)}
                            placeholder={section.type === 'coding' 
                              ? 'e.g. binary search, linked list reversal, dynamic programming...'
                              : 'e.g. photosynthesis, cell division, genetics...'
                            }
                            className="w-full px-3.5 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-200 outline-none transition-all text-sm resize-none h-20"
                            disabled={isGeneratingAI}
                          />
                        </div>

                        <div className="flex items-end gap-4">
                          <div className="flex-shrink-0">
                            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">Questions</label>
                            <div className="flex items-center border border-gray-200 rounded-xl bg-gray-50 overflow-hidden focus-within:ring-2 focus-within:ring-purple-500 focus-within:border-purple-200 focus-within:bg-white transition-all h-10 w-24 pl-3 relative">
                              <input
                                type="number"
                                min="1"
                                max="20"
                                value={aiQuestionCount}
                                onChange={(e) => setAiQuestionCount(Math.max(1, Math.min(20, Number(e.target.value))))}
                                className="w-full bg-transparent border-none outline-none text-sm font-bold text-gray-900 p-0 pr-6 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                disabled={isGeneratingAI}
                              />
                              <div className="absolute right-0 top-0 h-full flex flex-col border-l border-gray-200">
                                <button type="button" onClick={() => setAiQuestionCount(Math.min(20, aiQuestionCount + 1))} disabled={isGeneratingAI} className="flex-1 w-7 flex items-center justify-center text-gray-500 hover:text-purple-700 hover:bg-purple-100 transition-colors border-b border-gray-200 disabled:opacity-50 cursor-pointer">
                                  <ChevronUp className="w-3 h-3" />
                                </button>
                                <button type="button" onClick={() => setAiQuestionCount(Math.max(1, aiQuestionCount - 1))} disabled={isGeneratingAI} className="flex-1 w-7 flex items-center justify-center text-gray-500 hover:text-purple-700 hover:bg-purple-100 transition-colors disabled:opacity-50 cursor-pointer">
                                  <ChevronDown className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                          <div className="flex-shrink-0">
                            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">Marks Each</label>
                            <div className="flex items-center border border-gray-200 rounded-xl bg-gray-50 overflow-hidden focus-within:ring-2 focus-within:ring-purple-500 focus-within:border-purple-200 focus-within:bg-white transition-all h-10 w-24 pl-3 relative">
                              <input
                                type="number"
                                min="1"
                                max="100"
                                value={aiMarksPerQuestion}
                                onChange={(e) => setAiMarksPerQuestion(Math.max(1, Math.min(100, Number(e.target.value))))}
                                className="w-full bg-transparent border-none outline-none text-sm font-bold text-gray-900 p-0 pr-6 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                disabled={isGeneratingAI}
                              />
                              <div className="absolute right-0 top-0 h-full flex flex-col border-l border-gray-200">
                                <button type="button" onClick={() => setAiMarksPerQuestion(Math.min(100, aiMarksPerQuestion + 1))} disabled={isGeneratingAI} className="flex-1 w-7 flex items-center justify-center text-gray-500 hover:text-purple-700 hover:bg-purple-100 transition-colors border-b border-gray-200 disabled:opacity-50 cursor-pointer">
                                  <ChevronUp className="w-3 h-3" />
                                </button>
                                <button type="button" onClick={() => setAiMarksPerQuestion(Math.max(1, aiMarksPerQuestion - 1))} disabled={isGeneratingAI} className="flex-1 w-7 flex items-center justify-center text-gray-500 hover:text-purple-700 hover:bg-purple-100 transition-colors disabled:opacity-50 cursor-pointer">
                                  <ChevronDown className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={async () => {
                              if (!aiTopicInput.trim()) {
                                showToast("Please enter topics or a prompt", 'error');
                                return;
                              }
                              setIsGeneratingAI(true);
                              try {
                                const res = await axios.post(
                                  `${API_BASE_URL}/quiz/generate-questions-from-prompt`,
                                  {
                                    topics: aiTopicInput.trim(),
                                    questionType: section.type || "mcq",
                                    questionCount: aiQuestionCount,
                                    marksPerQuestion: aiMarksPerQuestion,
                                    difficulty: difficulty,
                                  },
                                  { withCredentials: true }
                                );

                                const generated = res.data.questions;
                                if (generated && generated.length > 0) {
                                  const updated = [...sections];
                                  const hasOnlyEmptyPlaceholder =
                                    updated[sIdx].questions.length === 1 &&
                                    !updated[sIdx].questions[0].question &&
                                    !updated[sIdx].questions[0].coding?.title;

                                  if (hasOnlyEmptyPlaceholder) {
                                    const preservedMode = updated[sIdx].questions[0].coding?.executionMode || "standard";
                                    const mappedGenerated = generated.map(g => {
                                      if (g.type === "coding" && g.coding) {
                                        g.coding.executionMode = preservedMode;
                                        if (preservedMode === "function" && g.coding.driverCode) {
                                          g.coding.driverCode = g.coding.driverCode.map(d => ({
                                            ...d,
                                            code: d.code ? d.code.replace(new RegExp("{{USER_CODE}}", "g"), "{{STUDENT_BODY}}") : d.code
                                          }));
                                        }
                                      }
                                      return g;
                                    });
                                    updated[sIdx].questions = mappedGenerated;
                                  } else {
                                    updated[sIdx].questions = [...updated[sIdx].questions, ...generated];
                                  }
                                  setSections(updated);
                                  setAiPanelOpenForSection(-1);
                                  setAiTopicInput("");
                                  
                                  showToast(
                                    `Generated ${generated.length} ${section.type === 'coding' ? 'coding' : 'MCQ'} question${generated.length > 1 ? 's' : ''} successfully!`,
                                    'success'
                                  );
                                } else {
                                  showToast("AI could not generate questions. Try different topics.", 'error');
                                }
                              } catch (error) {
                                console.error("AI generation failed:", error);
                                showToast(error.response?.data?.error || "Failed to generate questions. Please try again.", 'error');
                              } finally {
                                setIsGeneratingAI(false);
                              }
                            }}
                            disabled={isGeneratingAI || !aiTopicInput.trim()}
                            className="ai-generate-btn flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white font-bold rounded-xl transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-purple-600/25 cursor-pointer"
                          >
                            {isGeneratingAI ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Generating {section.type === 'coding' ? 'Coding' : 'MCQ'} Questions...
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-4 h-4" />
                                Generate {aiQuestionCount} {section.type === 'coding' ? 'Coding' : 'MCQ'} Questions
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}



                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Section Title</label>
                        <input
                          type="text"
                          value={section.title}
                          onChange={(e) => updateSection(sIdx, "title", e.target.value)}
                          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl outline-none bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-300 transition-all text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Section Type</label>
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
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Instructions (Optional)</label>
                      <textarea
                        value={section.instructions}
                        onChange={(e) => updateSection(sIdx, "instructions", e.target.value)}
                        placeholder="Any special instructions for this section..."
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl outline-none bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-300 transition-all h-16 resize-none text-sm"
                      />
                    </div>

                    <div className="space-y-5 border-t border-gray-200 pt-5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                        <h5 className="font-bold text-sm text-gray-700 uppercase tracking-wider">Questions in this Section</h5>
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
                        <div key={qIdx} className="p-5 border border-gray-200 rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                          {/* Left accent border */}
                          <div className={`absolute left-0 top-0 bottom-0 w-1 ${q.type === 'mcq' ? 'bg-indigo-500' : 'bg-amber-500'}`}></div>
                          
                          <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-3">
                              {(selectedQuestions[sIdx] || []).length > 0 && (
                                <input 
                                  type="checkbox" 
                                  checked={(selectedQuestions[sIdx] || []).includes(qIdx)}
                                  onChange={() => handleSelectQuestion(sIdx, qIdx)}
                                  className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                                />
                              )}
                              <div className="flex items-center gap-2">
                                <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                                  q.type === 'mcq' 
                                    ? 'bg-indigo-100 text-indigo-700' 
                                    : 'bg-amber-100 text-amber-700'
                                }`}>
                                  {q.type === 'mcq' ? <FileText className="w-3.5 h-3.5" /> : <Code className="w-3.5 h-3.5"/>}
                                </span>
                                <h6 className="font-bold text-gray-800 text-sm">
                                  {q.type === 'mcq' ? 'MCQ' : 'Coding'} Question {qIdx + 1}
                                </h6>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1">
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Marks</label>
                                <input 
                                  type="number" 
                                  value={q.marks} 
                                  onChange={e => updateQuestion(sIdx, qIdx, "marks", Number(e.target.value))} 
                                  className="w-12 px-1.5 py-0.5 text-sm border-0 bg-transparent outline-none text-center font-bold text-gray-800"
                                />
                              </div>
                              {section.questions.length > 1 && (
                                <button 
                                  onClick={() => handleRemoveQuestion(sIdx, qIdx)} 
                                  className="text-gray-400 hover:text-rose-500 p-1.5 rounded-lg hover:bg-rose-50 transition-all"
                                  title="Delete Question"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>

                          {q.type === 'mcq' ? (
                            // MCQ Editor
                            <div className="space-y-4">
                              <ExpandableTextarea
                                value={q.question}
                                onChange={(val) => updateQuestion(sIdx, qIdx, "question", val)}
                                placeholder="Enter your question text here..."
                              />
                              <div className="space-y-2">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                  <CheckCircle className="w-3 h-3" /> Select the correct answer
                                </p>
                                {q.options.map((opt, optIndex) => {
                                  const isCorrect = q.correctOptionIndex === optIndex;
                                  const letter = String.fromCharCode(65 + optIndex);
                                  return (
                                    <label 
                                      key={optIndex} 
                                      className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-all group ${
                                        isCorrect 
                                          ? 'bg-emerald-50 border-emerald-300 shadow-sm shadow-emerald-100' 
                                          : 'bg-white border-gray-200 hover:border-indigo-200 hover:bg-indigo-50/30'
                                      }`}
                                    >
                                      <input
                                        type="radio"
                                        name={`correct-${sIdx}-${qIdx}`}
                                        checked={isCorrect}
                                        onChange={() => updateQuestion(sIdx, qIdx, "correctOptionIndex", optIndex)}
                                        className="sr-only"
                                      />
                                      <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all ${
                                        isCorrect 
                                          ? 'bg-emerald-500 text-white shadow-sm' 
                                          : 'bg-gray-100 text-gray-500 group-hover:bg-indigo-100 group-hover:text-indigo-600'
                                      }`}>
                                        {isCorrect ? <CheckCircle className="w-4 h-4" /> : letter}
                                      </span>
                                      <input
                                        type="text"
                                        value={opt}
                                        onChange={(e) => {
                                          const newOpts = [...q.options];
                                          newOpts[optIndex] = e.target.value;
                                          updateQuestion(sIdx, qIdx, "options", newOpts);
                                        }}
                                        placeholder={`Option ${letter}`}
                                        className="flex-1 bg-transparent outline-none text-sm font-medium text-gray-800 placeholder-gray-400"
                                      />
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          ) : (

                            // Coding Editor
                            <div className="space-y-6 bg-gray-50/30 p-6 rounded-2xl border border-indigo-100">
                              <div className="flex items-center gap-2 mb-2 pb-4 border-b border-indigo-100">
                                <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-lg text-sm font-bold flex items-center gap-2">
                                  <Code2 className="w-4 h-4" /> Coding Challenge
                                </span>
                              </div>
                              
                              <div>
                                <label className="block text-sm font-bold mb-1 text-gray-800">Problem Title</label>
                                <input 
                                  value={q.coding.title}
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
                                  value={q.coding.description}
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
                                {(q.coding.functionParams || []).length === 0 ? (
                                  <p className="text-xs text-purple-400 italic">No parameters added. Click "Add Parameter" if this problem uses target, k, or similar values.</p>
                                ) : (
                                  <div className="space-y-2">
                                    {(q.coding.functionParams || []).map((param, pIdx) => (
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
                                    {q.coding.examples.map((ex, exIdx) => (
                                      <div key={exIdx} className="p-4 bg-gray-50 rounded-xl border border-gray-100 relative group">
                                        {q.coding.examples.length > 1 && (
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
                                  {q.coding.constraints.map((constraint, cIdx) => (
                                    <div key={cIdx} className="mb-2 flex items-center gap-2">
                                      <input value={constraint} onChange={e => handleStringArrayUpdate(sIdx, qIdx, "constraints", cIdx, e.target.value)} placeholder="e.g. 2 <= nums.length <= 10^4" className="flex-1 p-2 text-xs border rounded outline-none focus:ring-1 focus:ring-indigo-500" />
                                      {q.coding.constraints.length > 1 && (
                                        <button onClick={() => handleArrayFieldRemove(sIdx, qIdx, "constraints", cIdx)} className="text-rose-500 p-1"><X className="w-4 h-4"/></button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-bold mb-1">Comparison Mode</label>
                                  <CustomSelect
                                    value={q.coding.comparisonMode || "trimmed"}
                                    onChange={val => updateCodingField(sIdx, qIdx, "comparisonMode", val)}
                                    options={[
                                      { value: "trimmed", label: "Trimmed (Ignores extra spaces)" },
                                      { value: "exact", label: "Exact (Strict match)" }
                                    ]}
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-bold mb-1">Execution Mode</label>
                                  <CustomSelect
                                    value={q.coding.executionMode || "function"}
                                    onChange={val => updateCodingField(sIdx, qIdx, "executionMode", val)}
                                    options={[
                                      { value: "standard", label: "Standard (Student writes full program)" },
                                      { value: "function", label: "Function (Student writes function body only)" }
                                    ]}
                                  />
                                </div>
                                <div className="col-span-1 md:col-span-2 space-y-3">
                                  <label className="block text-sm font-bold mb-1 flex items-center gap-2">
                                    <Code2 className="w-4 h-4 text-indigo-600" />
                                    Boilerplate & Driver Code
                                    <span className="text-xs font-normal text-gray-400">(Required for all 5 languages)</span>
                                  </label>
                                  
                                  {/* Language Tabs */}
                                  <div className="flex border-b border-gray-200">
                                    {["java", "cpp", "javascript", "python", "c"].map(lang => {
                                      const tabKey = `${sIdx}-${qIdx}`;
                                      const currentLang = activeLang[tabKey] || "java";
                                      const hasCode = q.coding.starterCode?.some(s => s.language === lang && s.code?.trim()) && 
                                                      q.coding.driverCode?.some(d => d.language === lang && d.code?.trim());
                                      return (
                                        <button
                                          key={lang}
                                          type="button"
                                          onClick={() => setActiveLang(prev => ({ ...prev, [tabKey]: lang }))}
                                          className={`lang-tab px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                                            currentLang === lang
                                              ? 'active text-indigo-700 bg-indigo-50/50'
                                              : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                                          }`}
                                        >
                                          {lang}
                                          {hasCode && <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span>}
                                        </button>
                                      );
                                    })}
                                  </div>

                                  {/* Active Language Editor */}
                                  {(() => {
                                    const tabKey = `${sIdx}-${qIdx}`;
                                    const lang = activeLang[tabKey] || "java";
                                    const starter = q.coding.starterCode?.find(s => s.language === lang)?.code || "";
                                    const driver = q.coding.driverCode?.find(d => d.language === lang)?.code || "";
                                    return (
                                      <div key={lang} className="lang-tab-panel grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Starter Code Editor */}
                                        <div className="code-editor-container starter">
                                          <div className="editor-label">
                                            <span>Starter Code (Student sees this)</span>
                                            <button
                                              type="button"
                                              onClick={() => setExpandedEditor({ sIdx, qIdx, lang, field: 'starterCode', value: starter })}
                                              className="text-green-600 hover:text-green-800 transition-colors p-0.5"
                                              title="Expand Editor"
                                            >
                                              <Maximize2 className="w-3.5 h-3.5" />
                                            </button>
                                          </div>
                                          <div className="h-40">
                                            <Editor
                                              height="100%"
                                              language={lang === 'c' || lang === 'cpp' ? 'cpp' : lang}
                                              theme="light"
                                              value={starter}
                                              onChange={(val) => {
                                                const newStarter = [...(q.coding.starterCode || [])];
                                                const idx = newStarter.findIndex(s => s.language === lang);
                                                if (idx >= 0) newStarter[idx].code = val || "";
                                                else newStarter.push({ language: lang, code: val || "" });
                                                updateCodingField(sIdx, qIdx, "starterCode", newStarter);
                                              }}
                                              options={{ minimap: { enabled: false }, lineNumbers: 'off', scrollBeyondLastLine: false, tabSize: 2, padding: { top: 8 } }}
                                            />
                                          </div>
                                        </div>

                                        {/* Driver Code Editor */}
                                        <div className="code-editor-container driver">
                                          <div className="editor-label">
                                            <span>Driver Code (Use {q.coding.executionMode === 'function' ? '{{STUDENT_BODY}}' : '{{USER_CODE}}'})</span>
                                            <button
                                              type="button"
                                              onClick={() => setExpandedEditor({ sIdx, qIdx, lang, field: 'driverCode', value: driver })}
                                              className="text-purple-400 hover:text-purple-300 transition-colors p-0.5"
                                              title="Expand Editor"
                                            >
                                              <Maximize2 className="w-3.5 h-3.5" />
                                            </button>
                                          </div>
                                          <div className="h-40">
                                            <Editor
                                              height="100%"
                                              language={lang === 'c' || lang === 'cpp' ? 'cpp' : lang}
                                              theme="vs-dark"
                                              value={driver}
                                              onChange={(val) => {
                                                const newDriver = [...(q.coding.driverCode || [])];
                                                const idx = newDriver.findIndex(d => d.language === lang);
                                                if (idx >= 0) newDriver[idx].code = val || "";
                                                else newDriver.push({ language: lang, code: val || "" });
                                                updateCodingField(sIdx, qIdx, "driverCode", newDriver);
                                              }}
                                              options={{ minimap: { enabled: false }, lineNumbers: 'off', scrollBeyondLastLine: false, tabSize: 2, padding: { top: 8 } }}
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })()}
                                </div>
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
                                    {q.coding.testCases.map((tc, tcIdx) => (
                                      <div key={tcIdx} className="p-4 bg-white rounded-xl border border-indigo-100 relative shadow-sm group">
                                        {q.coding.testCases.length > 1 && (
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
                            className="flex-1 py-2.5 border-2 border-dashed border-gray-300 text-gray-600 font-bold rounded-xl hover:bg-gray-100 transition-colors flex items-center justify-center gap-2 text-sm"
                          >
                            <Plus className="w-4 h-4" /> Add MCQ
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAddQuestion(sIdx, "coding")}
                            className="flex-1 py-2.5 border-2 border-dashed border-indigo-300 text-indigo-600 font-bold rounded-xl hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2 text-sm"
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

        <div className="px-6 py-4 border-t border-line flex gap-3 bg-white rounded-b-2xl">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="flex-1 py-3 bg-gray-100 text-ink font-bold rounded-xl hover:bg-gray-200 transition-all border border-gray-200 hover:border-gray-300 active:scale-[0.98]"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Saving...</>
            ) : (
              <><Save className="w-5 h-5" /> Save Assessment</>
            )}
          </button>
        </div>

      </div>
      
      {/* Expanded Editor Modal */}
      {expandedEditor && (
        <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center backdrop-blur-sm p-4 sm:p-8">
          <div className="bg-[#1e1e1e] w-full max-w-6xl h-full max-h-[85vh] rounded-2xl flex flex-col shadow-2xl overflow-hidden border border-gray-700">
            <div className="flex items-center justify-between px-6 py-4 bg-[#252526] border-b border-[#3c3c3c]">
              <div>
                <h3 className="text-lg font-bold text-gray-100">
                  {expandedEditor.field === 'starterCode' ? 'Starter Code' : 'Driver Code'} 
                  <span className="ml-2 text-indigo-400 uppercase text-xs tracking-wider">{expandedEditor.lang}</span>
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  {expandedEditor.field === 'starterCode' ? 
                    'This is the boilerplate code the student will see. If using Function Mode, ensure the function signature wraps around {{STUDENT_BODY}}.' : 
                    'This is the hidden runner code. Use {{STUDENT_BODY}} (Function Mode) or {{USER_CODE}} (Standard Mode) to inject student code.'}
                </p>
              </div>
              <button 
                onClick={() => setExpandedEditor(null)}
                className="text-gray-400 hover:text-white bg-[#3c3c3c] hover:bg-rose-500/20 hover:text-rose-400 p-2 rounded-lg transition-colors"
                title="Minimize Editor"
              >
                <Minimize2 className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1">
              <Editor
                height="100%"
                language={expandedEditor.lang === 'c' || expandedEditor.lang === 'cpp' ? 'cpp' : expandedEditor.lang}
                theme="vs-dark"
                value={expandedEditor.value}
                onChange={(val) => {
                  const updatedVal = val || "";
                  setExpandedEditor(prev => ({ ...prev, value: updatedVal }));
                  const newArray = [...(sections[expandedEditor.sIdx].questions[expandedEditor.qIdx].coding[expandedEditor.field] || [])];
                  const idx = newArray.findIndex(item => item.language === expandedEditor.lang);
                  if (idx >= 0) newArray[idx].code = updatedVal;
                  else newArray.push({ language: expandedEditor.lang, code: updatedVal });
                  updateCodingField(expandedEditor.sIdx, expandedEditor.qIdx, expandedEditor.field, newArray);
                }}
                onMount={(editor, monaco) => {
                  // Auto-format the code when the editor opens to fix any single-line AI code
                  setTimeout(() => {
                    editor.getAction('editor.action.formatDocument').run().catch(() => {});
                  }, 100);
                }}
                options={{
                  minimap: { enabled: false },
                  fontSize: 15,
                  wordWrap: "on",
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  padding: { top: 16 },
                  tabSize: 2
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateManualQuizModal;