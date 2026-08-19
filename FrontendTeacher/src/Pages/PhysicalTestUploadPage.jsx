import React, { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Upload, X, FileText, Loader, Sparkles, User, BookOpen,
  AlertCircle, CheckCircle, ChevronDown, ChevronUp, Plus, Trash2,
  Lock, Unlock, Edit2, Eye
} from "lucide-react";
import {
  extractAnswerKeyFromPDF,
  confirmAnswerKeyAPI,
  uploadStudentPapersAPI,
} from "../api/physicalTestApi";

const PhysicalTestUploadPage = () => {
  const { classId } = useParams();
  const navigate = useNavigate();

  // ── Wizard step state ─────────────────────────────────────────────
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1: Test Details
  const [testTitle, setTestTitle] = useState("");
  const [totalMarks, setTotalMarks] = useState(0);

  // Step 2: Question Card
  const [questionCard, setQuestionCard] = useState(null);
  const qcInputRef = useRef(null);
  const [extracting, setExtracting] = useState(false);

  // Step 3: Answer Key (extracted + editable)
  const [extractedQuestions, setExtractedQuestions] = useState([]);
  const [answerKeyConfirmed, setAnswerKeyConfirmed] = useState(false);
  const [questionCardFileId, setQuestionCardFileId] = useState("");
  const [questionCardFileName, setQuestionCardFileName] = useState("");
  const [subject, setSubject] = useState("");
  const [expandedQ, setExpandedQ] = useState(null);

  // Step 4: Student Papers
  const [studentFiles, setStudentFiles] = useState([]);
  const papersInputRef = useRef(null);
  const step4Ref = useRef(null);

  // Status
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // ── Step 2: question card handlers ─────────────────────────────────
  const handleQCSelect = (e) => {
    const file = e.target.files[0];
    if (file) { setQuestionCard(file); setError(""); }
  };

  const handleQCDrop = (e) => {
    e.preventDefault();
    const file = Array.from(e.dataTransfer.files).find(f => f.type === "application/pdf");
    if (file) { setQuestionCard(file); setError(""); }
  };

  // ── Step 2→3: Generate Answer Key ─────────────────────────────────
  const handleGenerateAnswerKey = async () => {
    setError("");
    if (!testTitle.trim()) return setError("Please enter an examination option/title first.");
    if (!questionCard) return setError("Please upload the question card PDF.");

    setExtracting(true);
    try {
      const data = await extractAnswerKeyFromPDF(classId, testTitle.trim(), 100, questionCard);
      setExtractedQuestions(data.questions || []);
      
      // Calculate total marks based on extracted questions or use AI's total
      const calculatedTotalMarks = data.totalMarks || (data.questions || []).reduce((acc, q) => acc + (q.marks || 0), 0);
      setTotalMarks(calculatedTotalMarks);
      
      setQuestionCardFileId(data.questionCardFileId || "");
      setQuestionCardFileName(data.questionCardFileName || "");
      setSubject(data.subject || "");
      setCurrentStep(3);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "Failed to extract answer key. Please try again.");
    } finally {
      setExtracting(false);
    }
  };

  // ── Step 3: Answer key editing helpers ─────────────────────────────
  const updateQuestion = (idx, field, value) => {
    setExtractedQuestions(prev => prev.map((q, i) => i === idx ? { ...q, [field]: value } : q));
    setAnswerKeyConfirmed(false);
  };

  const updateRubric = (idx, field, value) => {
    setExtractedQuestions(prev => prev.map((q, i) =>
      i === idx ? { ...q, rubric: { ...q.rubric, [field]: value } } : q
    ));
    setAnswerKeyConfirmed(false);
  };

  const updateMarkingScheme = (qIdx, key, value) => {
    setExtractedQuestions(prev => prev.map((q, i) => {
      if (i !== qIdx) return q;
      const scheme = { ...q.rubric.markingScheme, [key]: parseFloat(value) || 0 };
      return { ...q, rubric: { ...q.rubric, markingScheme: scheme } };
    }));
    setAnswerKeyConfirmed(false);
  };

  const removeMarkingSchemeKey = (qIdx, key) => {
    setExtractedQuestions(prev => prev.map((q, i) => {
      if (i !== qIdx) return q;
      const scheme = { ...q.rubric.markingScheme };
      delete scheme[key];
      return { ...q, rubric: { ...q.rubric, markingScheme: scheme } };
    }));
    setAnswerKeyConfirmed(false);
  };

  const addMarkingSchemeKey = (qIdx) => {
    const name = prompt("Component name (e.g. 'definition', 'example'):");
    if (!name?.trim()) return;
    updateMarkingScheme(qIdx, name.trim().toLowerCase(), 1);
  };

  const addKeyword = (qIdx) => {
    const kw = prompt("Add mandatory keyword:");
    if (!kw?.trim()) return;
    setExtractedQuestions(prev => prev.map((q, i) =>
      i === qIdx ? { ...q, rubric: { ...q.rubric, mandatoryKeywords: [...(q.rubric.mandatoryKeywords || []), kw.trim()] } } : q
    ));
    setAnswerKeyConfirmed(false);
  };

  const removeKeyword = (qIdx, kwIdx) => {
    setExtractedQuestions(prev => prev.map((q, i) =>
      i === qIdx ? { ...q, rubric: { ...q.rubric, mandatoryKeywords: q.rubric.mandatoryKeywords.filter((_, ki) => ki !== kwIdx) } } : q
    ));
    setAnswerKeyConfirmed(false);
  };

  // ── Step 3→4: Confirm answer key ──────────────────────────────────
  const handleConfirmAnswerKey = async () => {
    setError("");
    // Validate
    for (const q of extractedQuestions) {
      if (!q.rubric?.mandatoryKeywords?.length) {
        return setError(`Question "${q.questionId}" needs at least one mandatory keyword.`);
      }
      if (!q.rubric?.markingScheme || Object.keys(q.rubric.markingScheme).length === 0) {
        return setError(`Question "${q.questionId}" needs a marking scheme.`);
      }
    }

    try {
      // Recalculate total marks right before confirmation in case teacher edited marks
      const finalTotalMarks = extractedQuestions.reduce((acc, q) => acc + (q.marks || 0), 0);
      setTotalMarks(finalTotalMarks);

      await confirmAnswerKeyAPI({
        classId,
        testTitle: testTitle.trim(),
        totalMarks: finalTotalMarks,
        questionCardFileId,
        questionCardFileName,
        questions: extractedQuestions,
      });
      setAnswerKeyConfirmed(true);
      setCurrentStep(4);
      setSuccessMsg("Answer key confirmed! You can now upload student papers.");
      setTimeout(() => setSuccessMsg(""), 4000);
      
      // Auto-scroll to step 4
      setTimeout(() => {
        step4Ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to confirm answer key.");
    }
  };

  // ── Step 4: Student paper handlers ────────────────────────────────
  const handlePapersSelect = (e) => {
    const selected = Array.from(e.target.files);
    const newFiles = selected.map(file => ({
      file,
      studentName: file.name.replace(/\.pdf$/i, ""),
      id: Math.random().toString(36).substr(2, 9),
    }));
    setStudentFiles(prev => [...prev, ...newFiles]);
  };

  const handlePapersDrop = (e) => {
    e.preventDefault();
    if (!answerKeyConfirmed) return;
    const dropped = Array.from(e.dataTransfer.files).filter(f => f.type === "application/pdf");
    const newFiles = dropped.map(file => ({
      file,
      studentName: file.name.replace(/\.pdf$/i, ""),
      id: Math.random().toString(36).substr(2, 9),
    }));
    setStudentFiles(prev => [...prev, ...newFiles]);
  };

  const handleNameChange = (id, value) => {
    setStudentFiles(prev => prev.map(f => f.id === id ? { ...f, studentName: value } : f));
  };

  const handleRemove = (id) => {
    setStudentFiles(prev => prev.filter(f => f.id !== id));
  };

  // ── Step 4: Submit ────────────────────────────────────────────────
  const handleSubmit = async () => {
    setError("");
    if (studentFiles.length === 0) return setError("Please upload at least one student answer PDF.");
    const emptyNames = studentFiles.filter(f => !f.studentName.trim());
    if (emptyNames.length > 0) return setError("Please enter student names for all files.");

    setUploading(true);
    try {
      const studentMappings = studentFiles.map(f => ({
        fileName: f.file.name,
        studentName: f.studentName.trim(),
        studentId: null,
      }));
      const rawFiles = studentFiles.map(f => f.file);
      await uploadStudentPapersAPI(
        classId, testTitle.trim(), totalMarks,
        questionCardFileId, questionCardFileName,
        extractedQuestions, rawFiles, studentMappings
      );
      navigate(`/class/${classId}/test-papers/physical-results?testTitle=${encodeURIComponent(testTitle.trim())}&autoCheck=true`);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  // ── Step indicator ─────────────────────────────────────────────────
  const steps = [
    { num: 1, label: "Test Details" },
    { num: 2, label: "Question Card" },
    { num: 3, label: "Answer Key" },
    { num: 4, label: "Student Papers" },
  ];

  return (
    <div className="min-h-screen bg-paper font-body text-ink">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">

        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate(`/class/${classId}/test-papers`)}
            className="flex items-center gap-2 text-violet-dark hover:opacity-80 font-bold transition-all mb-4 cursor-pointer text-sm"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Test Papers
          </button>
          <h1 className="text-2xl font-semibold font-display text-ink">Upload Physical Papers</h1>
          <p className="text-ink-soft text-sm mt-1">
            Upload question card → Generate answer key → Upload student papers → AI will check them
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-2">
          {steps.map((step, i) => (
            <React.Fragment key={step.num}>
              <div
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap border border-line ${
                  currentStep === step.num
                    ? "bg-violet-dark text-white shadow-md border-transparent"
                    : currentStep > step.num
                    ? "bg-violet-50 text-violet-dark"
                    : "bg-paper text-ink-soft opacity-60"
                }`}
              >
                {currentStep > step.num ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <span className="w-5 h-5 rounded-full bg-line flex items-center justify-center text-xs font-bold">
                    {step.num}
                  </span>
                )}
                {step.label}
              </div>
              {i < steps.length - 1 && (
                <div className={`w-8 h-0.5 flex-shrink-0 ${currentStep > step.num ? "bg-violet-dark" : "bg-line"}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Success Message */}
        {successMsg && (
          <div className="mb-5 flex items-center gap-2 bg-green-100 dark:bg-green-950/40 text-green-800 dark:text-green-300 border border-line rounded-xl px-4 py-3 text-sm">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            {successMsg}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-5 flex items-start gap-2 bg-rose-100 dark:bg-rose-955/40 text-rose-800 dark:text-rose-350 border border-line rounded-xl px-4 py-3 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            STEP 1 — Test Details
        ═══════════════════════════════════════════════════════════════ */}
        <div className={`bg-surface rounded-2xl border border-line p-6 shadow-sm mb-5 transition-all ${
          currentStep === 1 ? "ring-2 ring-violet-dark" : "opacity-80"
        }`}>
          <h2 className="text-base font-semibold font-display text-ink mb-4 flex items-center gap-2">
            <span className="w-6 h-6 bg-violet-dark text-white rounded-full text-xs flex items-center justify-center font-bold">1</span>
            Test Details
            {currentStep > 1 && <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-ink-soft uppercase tracking-wider mb-1">Examination Option / Title <span className="text-rose-500">*</span></label>
              <input
                type="text"
                value={testTitle}
                onChange={e => { setTestTitle(e.target.value); if (currentStep > 1 && !answerKeyConfirmed) setCurrentStep(1); }}
                placeholder="e.g. Mid-Term Exam — Science"
                disabled={answerKeyConfirmed}
                className="w-full border border-line bg-paper text-ink rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-violet-dark outline-none disabled:opacity-60 disabled:bg-line"
              />
            </div>
          </div>
          {currentStep === 1 && testTitle.trim() && (
            <button
              onClick={() => setCurrentStep(2)}
              className="mt-4 px-5 py-2.5 btn-settings-blue text-sm rounded-xl font-bold transition cursor-pointer"
            >
              Next →
            </button>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            STEP 2 — Upload Question Card + Generate Answer Key
        ═══════════════════════════════════════════════════════════════ */}
        <div className={`bg-surface rounded-2xl border border-line p-6 shadow-sm mb-5 transition-all ${
          currentStep === 2 ? "ring-2 ring-violet-dark" : currentStep < 2 ? "opacity-50 pointer-events-none" : "opacity-80"
        }`}>
          <h2 className="text-base font-semibold font-display text-ink mb-1 flex items-center gap-2">
            <span className="w-6 h-6 bg-violet-dark text-white rounded-full text-xs flex items-center justify-center font-bold">2</span>
            Upload Question Card
            {currentStep > 2 && <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />}
          </h2>
          <p className="text-xs text-ink-soft mb-4 ml-8">PDF of the printed question paper — AI will extract questions and generate full rubrics</p>

          {questionCard ? (
            <div className="flex items-center gap-3 p-4 bg-violet-50 text-violet-dark border border-line rounded-xl mb-4">
              <BookOpen className="w-8 h-8 text-violet-dark flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">{questionCard.name}</p>
                <p className="text-xs text-ink-soft">{(questionCard.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              {!answerKeyConfirmed && (
                <button
                  onClick={() => { setQuestionCard(null); if (qcInputRef.current) qcInputRef.current.value = ""; setExtractedQuestions([]); setAnswerKeyConfirmed(false); }}
                  className="p-1.5 text-ink-soft hover:text-rose-500 hover:bg-line/20 rounded-xl transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : (
            <div
              onDrop={handleQCDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => qcInputRef.current?.click()}
              className="border-2 border-dashed border-line bg-paper rounded-xl p-8 text-center cursor-pointer hover:border-violet-dark hover:bg-violet-50/50 transition-all mb-4"
            >
              <BookOpen className="w-10 h-10 text-violet-dark opacity-40 mx-auto mb-2" />
              <p className="text-ink font-medium text-sm">Drop question card PDF here or click to browse</p>
              <input ref={qcInputRef} type="file" accept="application/pdf" onChange={handleQCSelect} className="hidden" />
            </div>
          )}

          {currentStep === 2 && questionCard && !answerKeyConfirmed && (
            <button
              onClick={handleGenerateAnswerKey}
              disabled={extracting}
              className="w-full flex items-center justify-center gap-3 py-3 btn-settings-blue font-bold rounded-xl disabled:opacity-60 transition-all shadow-lg cursor-pointer text-sm"
            >
              {extracting ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  AI is analyzing the question paper… This may take a minute
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Generate Answer Key with AI
                </>
              )}
            </button>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            STEP 3 — Review & Edit Answer Key
        ═══════════════════════════════════════════════════════════════ */}
        {extractedQuestions.length > 0 && (
          <div className={`bg-surface rounded-2xl border border-line p-6 shadow-sm mb-5 transition-all ${
            currentStep === 3 ? "ring-2 ring-violet-dark" : currentStep < 3 ? "opacity-50" : "opacity-90"
          }`}>
            <h2 className="text-base font-semibold font-display text-ink mb-1 flex items-center gap-2">
              <span className="w-6 h-6 bg-violet-dark text-white rounded-full text-xs flex items-center justify-center font-bold">3</span>
              Review Answer Key
              {answerKeyConfirmed && <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />}
            </h2>
            <p className="text-xs text-ink-soft mb-4 ml-8">
              {subject && <span className="font-bold text-violet-dark">Subject: {subject} · </span>}
              <span className="font-bold text-ink">Total Marks: {totalMarks} · </span>
              {extractedQuestions.length} question(s) extracted · Click any question to edit its rubric
            </p>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {extractedQuestions.map((q, idx) => {
                const isExpanded = expandedQ === idx;
                const schemeEntries = Object.entries(q.rubric?.markingScheme || {});
                const schemeTotal = schemeEntries.reduce((s, [, v]) => s + v, 0);

                return (
                  <div key={q.questionId} className={`border rounded-xl overflow-hidden transition-all bg-surface ${
                    isExpanded ? "border-violet-300 shadow-md" : "border-line"
                  }`}>
                    {/* Collapsed header */}
                    <button
                      onClick={() => setExpandedQ(isExpanded ? null : idx)}
                      className="w-full flex items-center gap-3 px-4 py-3 bg-paper hover:bg-line/20 transition text-left cursor-pointer"
                    >
                      <span className="w-7 h-7 bg-violet-dark text-white rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0">
                        {q.questionNumber || idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold font-display text-ink truncate">{q.question}</p>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs text-ink-soft font-semibold">{q.marks} marks</span>
                          {q.topic && <span className="text-xs text-violet-dark font-bold">• {q.topic}</span>}
                          <span className="text-xs text-ink-soft font-semibold">• {q.rubric?.mandatoryKeywords?.length || 0} keywords</span>
                        </div>
                      </div>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-ink-soft flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-ink-soft flex-shrink-0" />}
                    </button>

                    {/* Expanded editor */}
                    {isExpanded && (
                      <div className="px-4 py-4 space-y-4 bg-surface border-t border-line">
                        {/* Question text */}
                        <div>
                          <label className="text-xs font-bold text-ink-soft uppercase tracking-wider">Question Text</label>
                          <textarea
                            value={q.question}
                            onChange={e => updateQuestion(idx, "question", e.target.value)}
                            disabled={answerKeyConfirmed}
                            rows={2}
                            className="w-full mt-1 border border-line bg-paper text-ink rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-violet-dark outline-none disabled:opacity-60"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs font-bold text-ink-soft uppercase tracking-wider">Topic</label>
                            <input
                              value={q.topic || ""}
                              onChange={e => updateQuestion(idx, "topic", e.target.value)}
                              disabled={answerKeyConfirmed}
                              className="w-full mt-1 border border-line bg-paper text-ink rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-violet-dark outline-none disabled:opacity-60"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-ink-soft uppercase tracking-wider">Marks</label>
                            <input
                              type="number"
                              value={q.marks}
                              onChange={e => updateQuestion(idx, "marks", parseFloat(e.target.value) || 0)}
                              disabled={answerKeyConfirmed}
                              min="0"
                              className="w-full mt-1 border border-line bg-paper text-ink rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-violet-dark outline-none disabled:opacity-60"
                            />
                          </div>
                        </div>

                        {/* Model Answer */}
                        <div>
                          <label className="text-xs font-bold text-ink-soft uppercase tracking-wider">Model Answer (for teacher reference)</label>
                          <textarea
                            value={q.answerKey || ""}
                            onChange={e => updateQuestion(idx, "answerKey", e.target.value)}
                            disabled={answerKeyConfirmed}
                            rows={3}
                            className="w-full mt-1 border border-line bg-paper text-ink rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-violet-dark outline-none disabled:opacity-60"
                          />
                        </div>

                        {/* Mandatory Keywords */}
                        <div>
                          <label className="text-xs font-bold text-ink-soft uppercase tracking-wider mb-2 block">
                            Mandatory Keywords <span className="text-rose-500">*</span>
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {(q.rubric?.mandatoryKeywords || []).map((kw, kwIdx) => (
                              <span key={kwIdx} className="inline-flex items-center gap-1 px-3 py-1 bg-violet-50 text-violet-dark border border-line rounded-xl text-xs font-bold">
                                {kw}
                                {!answerKeyConfirmed && (
                                  <button onClick={() => removeKeyword(idx, kwIdx)} className="hover:text-rose-500 cursor-pointer">
                                    <X className="w-3 h-3" />
                                  </button>
                                )}
                              </span>
                            ))}
                            {!answerKeyConfirmed && (
                              <button
                                onClick={() => addKeyword(idx)}
                                className="inline-flex items-center gap-1 px-3 py-1 border border-dashed border-line text-violet-dark rounded-xl text-xs font-bold hover:bg-violet-50 cursor-pointer"
                              >
                                <Plus className="w-3 h-3" /> Add
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Marking Scheme */}
                        <div>
                          <label className="text-xs font-bold text-ink-soft uppercase tracking-wider mb-2 flex items-center justify-between">
                            <span>Marking Scheme <span className="text-rose-500">*</span></span>
                            <span className={`text-xs font-bold ${schemeTotal === q.marks ? "text-green-600 dark:text-green-400" : "text-rose-600 dark:text-rose-455"}`}>
                              Total: {schemeTotal}/{q.marks} marks
                            </span>
                          </label>
                          <div className="space-y-2">
                            {schemeEntries.map(([key, val]) => (
                              <div key={key} className="flex items-center gap-2">
                                <span className="text-sm text-ink font-semibold min-w-[140px] capitalize">{key.replace(/_/g, " ")}</span>
                                <input
                                  type="number"
                                  value={val}
                                  onChange={e => updateMarkingScheme(idx, key, e.target.value)}
                                  disabled={answerKeyConfirmed}
                                  min="0"
                                  className="w-20 border border-line bg-paper text-ink rounded-xl px-2 py-1 text-sm text-center focus:ring-2 focus:ring-violet-dark outline-none disabled:opacity-60"
                                />
                                <span className="text-xs text-ink-soft font-semibold">marks</span>
                                {!answerKeyConfirmed && (
                                  <button onClick={() => removeMarkingSchemeKey(idx, key)} className="p-1.5 text-ink-soft hover:text-rose-500 hover:bg-line/20 rounded-xl cursor-pointer">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            ))}
                            {!answerKeyConfirmed && (
                              <button
                                onClick={() => addMarkingSchemeKey(idx)}
                                className="flex items-center gap-1 text-xs text-violet-dark hover:opacity-80 font-bold transition-all cursor-pointer mt-1"
                              >
                                <Plus className="w-3 h-3" /> Add component
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Depth Requirement */}
                        <div>
                          <label className="text-xs font-bold text-ink-soft uppercase tracking-wider">Depth Requirement</label>
                          <input
                            value={q.rubric?.depthRequired || ""}
                            onChange={e => updateRubric(idx, "depthRequired", e.target.value)}
                            disabled={answerKeyConfirmed}
                            placeholder="e.g. Minimum 3 sentences. Must include real-world example."
                            className="w-full mt-1 border border-line bg-paper text-ink rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-violet-dark outline-none disabled:opacity-60"
                          />
                        </div>

                        {/* Zero Mark Condition */}
                        <div>
                          <label className="text-xs font-bold text-ink-soft uppercase tracking-wider">Zero Mark Condition</label>
                          <input
                            value={q.rubric?.zeroMarkCondition || ""}
                            onChange={e => updateRubric(idx, "zeroMarkCondition", e.target.value)}
                            disabled={answerKeyConfirmed}
                            placeholder="e.g. 0 marks if student defines a completely different concept"
                            className="w-full mt-1 border border-line bg-paper text-ink rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-violet-dark outline-none disabled:opacity-60"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Next Button — confirms answer key and moves to Step 4 */}
            {!answerKeyConfirmed && currentStep === 3 && (
              <button
                onClick={handleConfirmAnswerKey}
                className="w-full mt-5 flex items-center justify-center gap-2 py-3.5 btn-settings-blue font-bold rounded-xl transition cursor-pointer text-sm shadow-lg"
              >
                <CheckCircle className="w-5 h-5" />
                Next → Upload Student Copies
              </button>
            )}

            {answerKeyConfirmed && (
              <div className="mt-3 flex items-center gap-2 bg-green-100 dark:bg-green-955/40 text-green-800 dark:text-green-300 border border-line rounded-xl px-4 py-2 text-sm font-semibold">
                <CheckCircle className="w-4 h-4" />
                Answer key confirmed. You can expand questions above to review (read-only).
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            STEP 4 — Upload Student Papers (LOCKED until answer key confirmed)
        ═══════════════════════════════════════════════════════════════ */}
        <div ref={step4Ref} className={`bg-surface rounded-2xl border border-line p-6 shadow-sm mb-5 transition-all ${
          !answerKeyConfirmed ? "opacity-50" : currentStep === 4 ? "ring-2 ring-violet-dark" : ""
        }`}>
          <h2 className="text-base font-semibold font-display text-ink mb-1 flex items-center gap-2">
            <span className="w-6 h-6 bg-violet-dark text-white rounded-full text-xs flex items-center justify-center font-bold">4</span>
            Upload Student Answer Sheets
            {!answerKeyConfirmed ? (
              <Lock className="w-4 h-4 text-ink-soft ml-auto" />
            ) : (
              <Unlock className="w-4 h-4 text-green-500 ml-auto" />
            )}
          </h2>

          {!answerKeyConfirmed ? (
            <p className="text-xs text-ink-soft ml-8 mt-1">
              🔒 Upload the question card and confirm the answer key first to unlock this step.
            </p>
          ) : (
            <>
              <p className="text-xs text-ink-soft mb-4 ml-8">One PDF per student — max 10 MB each</p>

              <div
                onDrop={handlePapersDrop}
                onDragOver={e => e.preventDefault()}
                onClick={() => papersInputRef.current?.click()}
                className="border-2 border-dashed border-line bg-paper rounded-xl p-6 text-center cursor-pointer hover:border-violet-dark hover:bg-violet-50/55 transition-all"
              >
                <Upload className="w-8 h-8 text-violet-dark opacity-40 mx-auto mb-2" />
                <p className="text-ink font-medium text-sm">Drop student PDFs here or click to browse</p>
                <p className="text-ink-soft text-xs mt-1">Multiple files allowed</p>
                <input ref={papersInputRef} type="file" accept="application/pdf" multiple onChange={handlePapersSelect} className="hidden" />
              </div>

              {studentFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-ink">{studentFiles.length} file(s) selected</span>
                    <button onClick={() => setStudentFiles([])} className="text-xs text-rose-600 dark:text-rose-450 hover:opacity-85 font-bold cursor-pointer">Clear all</button>
                  </div>
                  {studentFiles.map(f => (
                    <div key={f.id} className="flex items-center gap-3 p-3 bg-paper border border-line rounded-xl">
                      <FileText className="w-7 h-7 text-violet-dark opacity-75 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-ink-soft truncate mb-1">{f.file.name} ({(f.file.size / 1024 / 1024).toFixed(1)} MB)</p>
                        <div className="flex items-center gap-2">
                          <User className="w-3 h-3 text-ink-soft flex-shrink-0" />
                          <input
                            type="text"
                            value={f.studentName}
                            onChange={e => handleNameChange(f.id, e.target.value)}
                            placeholder="Student name..."
                            className="flex-1 text-sm border border-line bg-surface text-ink rounded-lg px-2 py-1 focus:ring-2 focus:ring-violet-dark outline-none"
                          />
                        </div>
                      </div>
                      <button onClick={() => handleRemove(f.id)} className="p-1.5 text-ink-soft hover:bg-line/60 rounded-xl cursor-pointer flex-shrink-0">
                        <X className="w-4 h-4 text-ink-soft" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Submit */}
        {answerKeyConfirmed && studentFiles.length > 0 && (
          <button
            onClick={handleSubmit}
            disabled={uploading}
            className="w-full flex items-center justify-center gap-3 py-4 btn-settings-blue text-white font-bold rounded-2xl disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-lg cursor-pointer text-base"
          >
            {uploading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Uploading Student Papers…
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Check {studentFiles.length} Copy(s) with AI
              </>
            )}
          </button>
        )}

      </div>
    </div>
  );
};

export default PhysicalTestUploadPage;
