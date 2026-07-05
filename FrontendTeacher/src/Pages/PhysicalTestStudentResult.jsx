import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Loader, Edit2, Save, X, Award, FileText, BookOpen,
  MessageSquare, PenLine, BarChart3, PanelLeftClose, PanelLeft,
  GripVertical, AlertTriangle, CheckCircle, XCircle, Eye, Tag
} from "lucide-react";
import { getPhysicalSubmissionById, getPhysicalSubmissionPDFUrl, updatePhysicalMarksManually } from "../api/physicalTestApi";

const PhysicalTestStudentResult = () => {
  const { classId, submissionId } = useParams();
  const navigate = useNavigate();
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingMarks, setEditingMarks] = useState({});
  const [saving, setSaving] = useState(false);
  const [showPDF, setShowPDF] = useState(false);

  // ── Resizable columns ─────────────────────────────────────────────
  const [leftWidthPercent, setLeftWidthPercent] = useState(50);
  const isDragging = useRef(false);
  const containerRef = useRef(null);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      let pct = (x / rect.width) * 100;
      pct = Math.max(25, Math.min(75, pct));
      setLeftWidthPercent(pct);
    };

    const handleMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  const handleTouchStart = useCallback(() => {
    isDragging.current = true;
  }, []);

  useEffect(() => {
    const handleTouchMove = (e) => {
      if (!isDragging.current || !containerRef.current) return;
      const touch = e.touches[0];
      const rect = containerRef.current.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      let pct = (x / rect.width) * 100;
      pct = Math.max(25, Math.min(75, pct));
      setLeftWidthPercent(pct);
    };

    const handleTouchEnd = () => { isDragging.current = false; };

    window.addEventListener("touchmove", handleTouchMove);
    window.addEventListener("touchend", handleTouchEnd);
    return () => {
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, []);

  useEffect(() => { fetchSubmission(); }, [submissionId]);

  const fetchSubmission = async () => {
    try {
      const data = await getPhysicalSubmissionById(submissionId);
      setSubmission(data.submission);
    } catch (err) {
      console.error(err);
      navigate(`/class/${classId}/test-papers/physical-results`);
    } finally {
      setLoading(false);
    }
  };

  const saveMarks = async () => {
    setSaving(true);
    try {
      const updatedAnswers = submission.answers.map(ans => ({
        questionId: ans.questionId,
        marksAwarded: editingMarks[ans.questionId] !== undefined ? editingMarks[ans.questionId] : ans.marksAwarded,
        aiFeedback: ans.aiFeedback,
      }));
      await updatePhysicalMarksManually(submissionId, updatedAnswers);
      await fetchSubmission();
      setEditingMarks({});
    } catch {
      alert("Failed to save marks");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-paper flex items-center justify-center font-body text-ink"><Loader className="w-10 h-10 text-violet-dark animate-spin" /></div>;
  if (!submission) return null;

  const totalEdited = Object.keys(editingMarks).length > 0;
  const isErrorState = submission.status === "failed";
  const isNeedsReview = submission.status === "needs_review";

  // ── Error banner styles ───────────────────────────────────────────
  const errorBannerStyles = {
    illegible: { bg: "bg-amber-500/10", border: "border-amber-500/40", text: "text-amber-600 dark:text-amber-300", label: "Handwriting Unclear" },
    network_error: { bg: "bg-rose-500/10", border: "border-rose-500/40", text: "text-rose-600 dark:text-rose-350", label: "Network Error" },
    quota_exceeded: { bg: "bg-rose-500/10", border: "border-rose-500/40", text: "text-rose-600 dark:text-rose-350", label: "API Quota Exceeded" },
    parse_error: { bg: "bg-orange-500/10", border: "border-orange-500/40", text: "text-orange-600 dark:text-orange-350", label: "Parse Error" },
    timeout: { bg: "bg-amber-500/10", border: "border-amber-500/40", text: "text-amber-600 dark:text-amber-300", label: "Evaluation Timeout" },
  };

  // ── Marks Breakdown Table Component ───────────────────────────────
  const MarksBreakdownTable = () => {
    if (!["checked", "needs_review"].includes(submission.status) || !submission.answers?.length) return null;

    const groups = {};
    submission.answers.forEach(ans => {
      const key = ans.marks;
      if (!groups[key]) groups[key] = [];
      groups[key].push(ans);
    });
    const sortedSections = Object.keys(groups).map(Number).sort((a, b) => a - b);
    const maxQCount = Math.max(...sortedSections.map(k => groups[k].length));

    return (
      <div className="bg-surface rounded-2xl border border-line shadow-sm mb-6 overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-line bg-paper">
          <BarChart3 className="w-5 h-5 text-violet-dark" />
          <h3 className="font-semibold font-display text-ink">Marks Breakdown</h3>
        </div>
        <div className="overflow-x-auto">
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
            <thead>
              <tr style={{ backgroundColor: "var(--paper)" }}>
                <th style={{
                  padding: "12px 16px", textAlign: "left", fontWeight: 600,
                  color: "var(--violet-dark)", borderBottom: "2px solid var(--line)",
                  position: "sticky", left: 0, backgroundColor: "var(--paper)", zIndex: 1,
                  minWidth: "140px"
                }}>
                  Section
                </th>
                {Array.from({ length: maxQCount }, (_, i) => (
                  <th key={i} style={{
                    padding: "12px 14px", textAlign: "center", fontWeight: 600,
                    color: "var(--violet-dark)", borderBottom: "2px solid var(--line)",
                    minWidth: "70px"
                  }}>
                    Q{i + 1}
                  </th>
                ))}
                <th style={{
                  padding: "12px 16px", textAlign: "center", fontWeight: 700,
                  color: "var(--violet-dark)", borderBottom: "2px solid var(--line)",
                  minWidth: "100px", backgroundColor: "var(--line)"
                }}>
                  Section Total
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedSections.map((marksPerQ, sIdx) => {
                const sectionAnswers = groups[marksPerQ];
                const sectionTotal = sectionAnswers.reduce((s, a) => s + a.marksAwarded, 0);
                const sectionMax = sectionAnswers.length * marksPerQ;
                const isEven = sIdx % 2 === 0;

                return (
                  <tr key={marksPerQ} style={{ backgroundColor: isEven ? "var(--surface)" : "var(--paper)" }}>
                    <td style={{
                      padding: "14px 16px", borderBottom: "1px solid var(--line)",
                      position: "sticky", left: 0,
                      backgroundColor: isEven ? "var(--surface)" : "var(--paper)", zIndex: 1,
                    }}>
                      <div style={{ fontWeight: 600, color: "var(--ink)", fontSize: "13px" }}>
                        {marksPerQ} mark{marksPerQ !== 1 ? "s" : ""} each
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--ink-soft)", marginTop: "2px" }}>
                        {sectionAnswers.length} question{sectionAnswers.length !== 1 ? "s" : ""}
                      </div>
                    </td>
                    {Array.from({ length: maxQCount }, (_, i) => {
                      const ans = sectionAnswers[i];
                      if (!ans) {
                        return (
                          <td key={i} style={{
                            padding: "14px 14px", textAlign: "center",
                            borderBottom: "1px solid var(--line)", color: "var(--ink-soft)",
                          }}>
                            —
                          </td>
                        );
                      }
                      const pct = marksPerQ > 0 ? (ans.marksAwarded / marksPerQ) * 100 : 0;
                      const color = pct >= 75 ? "#16a34a" : pct >= 40 ? "#ca8a04" : "#dc2626";
                      return (
                        <td key={i} style={{
                          padding: "14px 14px", textAlign: "center",
                          borderBottom: "1px solid var(--line)",
                        }}>
                          <span style={{ fontWeight: 700, color, fontSize: "14px" }}>
                            {ans.marksAwarded}
                          </span>
                          <span style={{ color: "var(--ink-soft)", fontSize: "12px" }}>
                            {" "}/{marksPerQ}
                          </span>
                        </td>
                      );
                    })}
                    <td style={{
                      padding: "14px 16px", textAlign: "center",
                      borderBottom: "1px solid var(--line)",
                      backgroundColor: isEven ? "var(--paper)" : "var(--line)",
                    }}>
                      <span style={{ fontWeight: 700, color: "var(--violet-dark)", fontSize: "15px" }}>
                        {sectionTotal}
                      </span>
                      <span style={{ color: "var(--ink-soft)", fontSize: "12px" }}>
                        {" "}/{sectionMax}
                      </span>
                    </td>
                  </tr>
                );
              })}
              <tr style={{ backgroundColor: "var(--violet-dark)" }}>
                <td style={{
                  padding: "14px 16px", fontWeight: 700, color: "#ffffff",
                  fontSize: "14px", position: "sticky", left: 0,
                  backgroundColor: "var(--violet-dark)", zIndex: 1,
                }}>
                  Grand Total
                </td>
                {Array.from({ length: maxQCount }, (_, i) => (
                  <td key={i} style={{ padding: "14px 14px" }}></td>
                ))}
                <td style={{ padding: "14px 16px", textAlign: "center" }}>
                  <span style={{
                    fontWeight: 800, color: "#ffffff", fontSize: "18px",
                    letterSpacing: "0.5px",
                  }}>
                    {submission.marksObtained}
                  </span>
                  <span style={{ color: "#ddd6fe", fontSize: "14px", fontWeight: 500 }}>
                    {" "}/{submission.totalMarks}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ── Q&A Cards Content ─────────────────────────────────────────────
  const QACards = () => (
    <div className="space-y-5">
      {submission.answers.map((ans, idx) => {
        const maxMarks = ans.marks;
        const isEditing = editingMarks[ans.questionId] !== undefined;
        const pct = maxMarks > 0 ? (ans.marksAwarded / maxMarks) * 100 : 0;
        const hasKeywords = (ans.keywordsFound?.length > 0 || ans.keywordsMissed?.length > 0);
        const hasBreakdown = ans.markingBreakdown && typeof ans.markingBreakdown === "object" && Object.keys(ans.markingBreakdown).length > 0;

        return (
          <div key={ans.questionId} className="bg-surface rounded-2xl border border-line shadow-sm overflow-hidden">
            {/* Needs Human Review Banner */}
            {ans.needs_human_review && (
              <div className="flex items-center gap-2 px-6 py-2.5 bg-amber-50 border-b border-line">
                <AlertTriangle className="w-4 h-4 text-amber-650 flex-shrink-0" />
                <span className="text-xs font-bold text-amber-800">⚠ This answer needs manual review by teacher</span>
              </div>
            )}

            {/* Question Header */}
            <div className="flex items-center gap-3 px-6 py-4 bg-paper border-b border-line">
              <span className="w-8 h-8 bg-violet-dark text-white rounded-full text-sm font-bold flex items-center justify-center flex-shrink-0">
                {idx + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-ink text-sm font-bold font-display">{ans.question || `Question ${idx + 1}`}</p>
                {ans.topic && (
                  <span className="inline-flex items-center gap-1 mt-1 px-2.5 py-0.5 bg-violet-50 text-violet-dark border border-line rounded-xl text-xs font-bold">
                    <Tag className="w-3 h-3" />
                    {ans.topic}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {ans.handwritingConfidence != null && (
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border border-line ${
                    ans.handwritingConfidence >= 80 ? "bg-green-100 dark:bg-green-955/40 text-green-800 dark:text-green-300" :
                    ans.handwritingConfidence >= 50 ? "bg-amber-50 text-amber-850" :
                    "bg-rose-100 dark:bg-rose-955/40 text-rose-800 dark:text-rose-350"
                  }`}>
                    ✍ {ans.handwritingConfidence}%
                  </span>
                )}
                <span className="text-xs text-ink-soft font-bold">{maxMarks} mark{maxMarks !== 1 ? "s" : ""}</span>
              </div>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Student's Answer Points */}
              {ans.studentAnswerPoints ? (
                <div className="flex items-start gap-3 p-4 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/40 dark:border-indigo-900/30 rounded-xl">
                  <PenLine className="w-4 h-4 text-indigo-650 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wide mb-1">Student's Answer</p>
                    <p className="text-sm text-ink leading-relaxed whitespace-pre-line">{ans.studentAnswerPoints}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 p-4 bg-paper border border-line rounded-xl">
                  <PenLine className="w-4 h-4 text-ink-soft opacity-40 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-ink-soft italic">Student's answer not available</p>
                </div>
              )}

              {/* Keywords Found / Missed */}
              {hasKeywords && (
                <div className="p-4 bg-paper border border-line rounded-xl">
                  <p className="text-xs font-bold text-ink-soft uppercase tracking-wider mb-2">Keyword Analysis</p>
                  <div className="flex flex-wrap gap-2">
                    {(ans.keywordsFound || []).map((kw, i) => (
                      <span key={`f-${i}`} className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 dark:bg-green-955/40 text-green-800 dark:text-green-300 border border-line rounded-xl text-xs font-bold">
                        <CheckCircle className="w-3 h-3" />
                        {kw}
                      </span>
                    ))}
                    {(ans.keywordsMissed || []).map((kw, i) => (
                      <span key={`m-${i}`} className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-100 dark:bg-rose-955/40 text-rose-800 dark:text-rose-350 border border-line rounded-xl text-xs font-bold">
                        <XCircle className="w-3 h-3" />
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Marking Breakdown Table */}
              {hasBreakdown && (
                <div className="p-4 bg-paper border border-line rounded-xl">
                  <p className="text-xs font-bold text-ink-soft uppercase tracking-wider mb-3">Step-by-Step Marking</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-line text-ink-soft font-bold uppercase tracking-wider text-xs">
                          <th className="text-left py-2 pr-4 font-semibold">Component</th>
                          <th className="text-center py-2 px-3 w-16">Got</th>
                          <th className="text-center py-2 px-3 w-16">Max</th>
                          <th className="text-left py-2 pl-4">Reason</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {Object.entries(ans.markingBreakdown).map(([component, data]) => {
                          const awarded = typeof data === "object" ? data.awarded : data;
                          const max = typeof data === "object" ? data.max : data;
                          const reason = typeof data === "object" ? data.reason : "";
                          const compPct = max > 0 ? (awarded / max) * 100 : 0;

                          return (
                            <tr key={component} className="border-b border-line">
                              <td className="py-2.5 pr-4">
                                <span className="text-ink font-semibold capitalize">{component.replace(/_/g, " ")}</span>
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <span className={`font-bold ${compPct >= 75 ? "text-green-600 dark:text-green-450" : compPct >= 40 ? "text-orange-600 dark:text-orange-400" : "text-rose-600 dark:text-rose-455"}`}>
                                  {awarded}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-center text-ink-soft">{max}</td>
                              <td className="py-2.5 pl-4 text-ink-soft text-xs">{reason}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* AI Feedback */}
              {ans.aiFeedback ? (
                <div className="flex items-start gap-3 p-4 bg-violet-50/50 border border-line rounded-xl">
                  <MessageSquare className="w-4 h-4 text-violet-dark flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-violet-dark uppercase tracking-wide mb-1">AI Feedback</p>
                    <p className="text-sm text-ink leading-relaxed">{ans.aiFeedback}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 p-4 bg-paper border border-line rounded-xl">
                  <MessageSquare className="w-4 h-4 text-ink-soft opacity-40 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-ink-soft italic">No AI feedback available</p>
                </div>
              )}

              {/* Marks + Progress Bar */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between text-xs text-ink-soft mb-1 font-semibold">
                    <span>Score</span>
                    <span>{ans.marksAwarded}/{maxMarks}</span>
                  </div>
                  <div className="w-full h-2 bg-line rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${pct >= 75 ? "bg-green-500" : pct >= 40 ? "bg-yellow-500" : "bg-red-400"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {isEditing ? (
                    <>
                      <input
                        type="number"
                        min="0"
                        max={maxMarks}
                        value={editingMarks[ans.questionId]}
                        onChange={e => setEditingMarks(prev => ({
                          ...prev,
                          [ans.questionId]: Math.min(maxMarks, Math.max(0, parseFloat(e.target.value) || 0))
                        }))}
                        className="w-20 px-2 py-1.5 text-sm border border-line bg-paper text-ink rounded-xl outline-none focus:ring-2 focus:ring-violet-dark"
                      />
                      <button
                        onClick={() => { const e = { ...editingMarks }; delete e[ans.questionId]; setEditingMarks(e); }}
                        className="p-1.5 text-ink-soft hover:bg-line/80 rounded-xl cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className={`text-xl font-bold ${pct >= 75 ? "text-green-600 dark:text-green-450" : pct >= 40 ? "text-orange-600 dark:text-orange-400" : "text-rose-600 dark:text-rose-455"}`}>
                        {ans.marksAwarded}/{maxMarks}
                      </span>
                      <button
                        onClick={() => setEditingMarks(prev => ({ ...prev, [ans.questionId]: ans.marksAwarded }))}
                        className="p-1.5 text-ink-soft hover:bg-line/80 rounded-xl cursor-pointer"
                        title="Edit marks"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Checked by badge */}
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold border border-line ${
                  ans.checkedBy === "ai" ? "bg-violet-50 text-violet-dark" :
                  ans.checkedBy === "teacher" ? "bg-blue-50 text-blue-700 dark:text-blue-400" :
                  "bg-line text-ink-soft"
                }`}>
                  {ans.checkedBy === "ai" ? "✨ AI Checked" : ans.checkedBy === "teacher" ? "👨‍🏫 Teacher Checked" : "⏳ Pending"}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen bg-paper font-body text-ink">
      <div className={`mx-auto px-4 sm:px-6 py-6 transition-all duration-300 ${showPDF ? "max-w-[1800px]" : "max-w-5xl"}`}>

        {/* Back */}
        <button
          onClick={() => navigate(`/class/${classId}/test-papers/physical-results`)}
          className="flex items-center gap-2 text-violet-dark hover:opacity-80 font-bold transition-all mb-4 cursor-pointer text-sm"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Results
        </button>

        {/* Error Banner (for failed submissions) */}
        {isErrorState && submission.errorType && (
          <div className={`mb-4 flex items-center gap-3 px-5 py-4 rounded-xl border-l-4 border-line ${
            errorBannerStyles[submission.errorType]?.bg || "bg-rose-500/10"
          }`}>
            <AlertTriangle className={`w-5 h-5 flex-shrink-0 ${errorBannerStyles[submission.errorType]?.text || "text-rose-600"}`} />
            <div>
              <p className={`font-semibold text-sm ${errorBannerStyles[submission.errorType]?.text || "text-rose-700"}`}>
                {errorBannerStyles[submission.errorType]?.label || "Error"}
              </p>
              <p className="text-sm text-ink-soft mt-0.5">{submission.errorMessage}</p>
            </div>
          </div>
        )}

        {/* Needs Review Banner */}
        {isNeedsReview && (
          <div className="mb-4 flex items-center gap-3 px-5 py-4 rounded-xl border-l-4 bg-amber-50 border-line">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-sm text-amber-800">Manual Review Required</p>
              <p className="text-sm text-ink-soft mt-0.5">Some answers in this submission need manual review by the teacher.</p>
            </div>
          </div>
        )}

        {/* Student Header Card */}
        <div className="bg-surface rounded-2xl border border-line shadow-sm p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold font-display text-ink">{submission.studentName}</h1>
              <p className="text-ink-soft text-sm mt-0.5">
                {submission.testTitle || submission.testPaperId?.title || "Physical Test"}
              </p>
              <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold border border-line ${
                submission.status === "checked" ? "bg-green-100 dark:bg-green-955/40 text-green-800 dark:text-green-300" :
                submission.status === "needs_review" ? "bg-amber-50 text-amber-800" :
                submission.status === "failed" ? "bg-rose-100 dark:bg-rose-955/40 text-rose-800 dark:text-rose-350" :
                "bg-line text-ink"
              }`}>
                {submission.status === "checked" ? "✅ Checked" :
                 submission.status === "needs_review" ? "⚠ Needs Review" :
                 submission.status === "failed" ? "❌ Failed" : "⏳ Pending"}
              </span>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 text-3xl font-black font-display text-violet-dark">
                <Award className="w-8 h-8" />
                {submission.marksObtained}/{submission.totalMarks}
              </div>
              <div className={`text-lg font-semibold mt-1 ${submission.percentage >= 40 ? "text-green-600 dark:text-green-400" : "text-rose-600 dark:text-rose-455"}`}>
                {submission.percentage}%
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 mt-4">
            <button
              onClick={() => setShowPDF(!showPDF)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition cursor-pointer text-sm font-bold border border-line ${
                showPDF
                  ? "bg-violet-50 text-violet-dark"
                  : "btn-settings-blue text-white"
              }`}
            >
              {showPDF ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
              {showPDF ? "Hide PDF Panel" : "View Student's PDF"}
            </button>
            <a
              href={getPhysicalSubmissionPDFUrl(submissionId)}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-paper border border-line text-ink rounded-xl hover:bg-line/45 transition cursor-pointer text-sm font-bold"
            >
              <FileText className="w-4 h-4" />
              Open in New Tab
            </a>
          </div>
        </div>

        {/* Marks Breakdown Table */}
        <MarksBreakdownTable />

        {/* Save All Banner */}
        {totalEdited && (
          <div className="mb-4 flex items-center justify-between bg-amber-50 border border-line rounded-xl px-5 py-3">
            <p className="text-sm text-amber-800 font-bold">You have unsaved mark changes</p>
            <button
              onClick={saveMarks}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 bg-amber-600 text-white text-sm font-bold rounded-xl hover:bg-amber-700 disabled:opacity-50 cursor-pointer transition"
            >
              {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save All Changes
            </button>
          </div>
        )}

        {/* Two-Column Layout (when PDF open) / Single column */}
        {showPDF ? (
          <div
            ref={containerRef}
            className="flex flex-col lg:flex-row"
            style={{ gap: 0 }}
          >
            {/* Left Column — Q&A Cards */}
            <div
              className="min-w-0 overflow-y-auto"
              style={{ width: `${leftWidthPercent}%`, paddingRight: "8px" }}
            >
              <QACards />
            </div>

            {/* Draggable Resizer Handle */}
            <div
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
              className="hidden lg:flex items-center justify-center flex-shrink-0 group"
              style={{ width: "12px", cursor: "col-resize", position: "relative", zIndex: 10 }}
            >
              <div
                style={{
                  width: "4px", height: "100%", minHeight: "200px",
                  borderRadius: "4px",
                  background: "linear-gradient(to bottom, var(--line), var(--violet-dark), var(--line))",
                  transition: "width 0.15s, background 0.15s", position: "relative",
                }}
                className="group-hover:!w-[6px]"
              >
                <div
                  style={{
                    position: "sticky", top: "50vh", transform: "translateY(-50%)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    width: "24px", height: "40px", marginLeft: "-10px",
                    borderRadius: "6px", backgroundColor: "var(--violet-dark)",
                    boxShadow: "0 2px 8px rgba(124, 58, 237, 0.35)",
                    transition: "transform 0.15s, box-shadow 0.15s",
                  }}
                  className="group-hover:scale-110 group-hover:shadow-lg"
                >
                  <GripVertical className="w-4 h-4 text-white" />
                </div>
              </div>
            </div>

            {/* Right Column — Sticky PDF Viewer */}
            <div
              className="min-w-0"
              style={{ width: `${100 - leftWidthPercent}%`, paddingLeft: "8px" }}
            >
              <div className="lg:sticky lg:top-4" style={{ maxHeight: "calc(100vh - 2rem)" }}>
                <div className="bg-surface rounded-2xl border border-line shadow-sm overflow-hidden h-full flex flex-col">
                  <div className="px-4 py-3 border-b border-line bg-paper flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-violet-dark" />
                      <h3 className="font-semibold font-display text-ink text-sm">Student's Handwritten Paper</h3>
                    </div>
                    <button
                      onClick={() => setShowPDF(false)}
                      className="p-1.5 hover:bg-line/80 rounded-xl cursor-pointer transition"
                      title="Close PDF panel"
                    >
                      <X className="w-4 h-4 text-ink-soft" />
                    </button>
                  </div>
                  <iframe
                     src={`${getPhysicalSubmissionPDFUrl(submissionId)}#toolbar=0`}
                    className="w-full border-0 flex-1"
                    style={{ minHeight: "calc(100vh - 6rem)" }}
                    title="Student Paper"
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <QACards />
        )}

      </div>
    </div>
  );
};

export default PhysicalTestStudentResult;
