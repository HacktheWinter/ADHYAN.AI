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

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader className="w-10 h-10 text-purple-600 animate-spin" /></div>;
  if (!submission) return null;

  const totalEdited = Object.keys(editingMarks).length > 0;
  const isErrorState = submission.status === "failed";
  const isNeedsReview = submission.status === "needs_review";

  // ── Error banner styles ───────────────────────────────────────────
  const errorBannerStyles = {
    illegible: { bg: "bg-amber-50", border: "border-amber-300", text: "text-amber-800", label: "Handwriting Unclear" },
    network_error: { bg: "bg-red-50", border: "border-red-300", text: "text-red-800", label: "Network Error" },
    quota_exceeded: { bg: "bg-red-50", border: "border-red-300", text: "text-red-800", label: "API Quota Exceeded" },
    parse_error: { bg: "bg-orange-50", border: "border-orange-300", text: "text-orange-800", label: "Parse Error" },
    timeout: { bg: "bg-amber-50", border: "border-amber-300", text: "text-amber-800", label: "Evaluation Timeout" },
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
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm mb-6 overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-gray-50">
          <BarChart3 className="w-5 h-5 text-purple-600" />
          <h3 className="font-semibold text-gray-900">Marks Breakdown</h3>
        </div>
        <div className="overflow-x-auto">
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
            <thead>
              <tr style={{ backgroundColor: "#f8f5ff" }}>
                <th style={{
                  padding: "12px 16px", textAlign: "left", fontWeight: 600,
                  color: "#6b21a8", borderBottom: "2px solid #e9d5ff",
                  position: "sticky", left: 0, backgroundColor: "#f8f5ff", zIndex: 1,
                  minWidth: "140px"
                }}>
                  Section
                </th>
                {Array.from({ length: maxQCount }, (_, i) => (
                  <th key={i} style={{
                    padding: "12px 14px", textAlign: "center", fontWeight: 600,
                    color: "#6b21a8", borderBottom: "2px solid #e9d5ff",
                    minWidth: "70px"
                  }}>
                    Q{i + 1}
                  </th>
                ))}
                <th style={{
                  padding: "12px 16px", textAlign: "center", fontWeight: 700,
                  color: "#6b21a8", borderBottom: "2px solid #e9d5ff",
                  minWidth: "100px", backgroundColor: "#f3e8ff"
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
                  <tr key={marksPerQ} style={{ backgroundColor: isEven ? "#ffffff" : "#faf9fc" }}>
                    <td style={{
                      padding: "14px 16px", borderBottom: "1px solid #f0ecf5",
                      position: "sticky", left: 0,
                      backgroundColor: isEven ? "#ffffff" : "#faf9fc", zIndex: 1,
                    }}>
                      <div style={{ fontWeight: 600, color: "#1f2937", fontSize: "13px" }}>
                        {marksPerQ} mark{marksPerQ !== 1 ? "s" : ""} each
                      </div>
                      <div style={{ fontSize: "11px", color: "#9ca3af", marginTop: "2px" }}>
                        {sectionAnswers.length} question{sectionAnswers.length !== 1 ? "s" : ""}
                      </div>
                    </td>
                    {Array.from({ length: maxQCount }, (_, i) => {
                      const ans = sectionAnswers[i];
                      if (!ans) {
                        return (
                          <td key={i} style={{
                            padding: "14px 14px", textAlign: "center",
                            borderBottom: "1px solid #f0ecf5", color: "#d1d5db",
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
                          borderBottom: "1px solid #f0ecf5",
                        }}>
                          <span style={{ fontWeight: 700, color, fontSize: "14px" }}>
                            {ans.marksAwarded}
                          </span>
                          <span style={{ color: "#9ca3af", fontSize: "12px" }}>
                            {" "}/{marksPerQ}
                          </span>
                        </td>
                      );
                    })}
                    <td style={{
                      padding: "14px 16px", textAlign: "center",
                      borderBottom: "1px solid #f0ecf5",
                      backgroundColor: isEven ? "#faf5ff" : "#f3e8ff",
                    }}>
                      <span style={{ fontWeight: 700, color: "#7c3aed", fontSize: "15px" }}>
                        {sectionTotal}
                      </span>
                      <span style={{ color: "#a78bfa", fontSize: "12px" }}>
                        {" "}/{sectionMax}
                      </span>
                    </td>
                  </tr>
                );
              })}
              <tr style={{ backgroundColor: "#7c3aed" }}>
                <td style={{
                  padding: "14px 16px", fontWeight: 700, color: "#ffffff",
                  fontSize: "14px", position: "sticky", left: 0,
                  backgroundColor: "#7c3aed", zIndex: 1,
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
          <div key={ans.questionId} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Needs Human Review Banner */}
            {ans.needs_human_review && (
              <div className="flex items-center gap-2 px-6 py-2.5 bg-amber-50 border-b border-amber-200">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span className="text-xs font-semibold text-amber-800">⚠ This answer needs manual review by teacher</span>
              </div>
            )}

            {/* Question Header */}
            <div className="flex items-center gap-3 px-6 py-4 bg-gray-50 border-b border-gray-100">
              <span className="w-8 h-8 bg-purple-600 text-white rounded-full text-sm font-bold flex items-center justify-center flex-shrink-0">
                {idx + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-gray-800 text-sm font-medium">{ans.question || `Question ${idx + 1}`}</p>
                {ans.topic && (
                  <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                    <Tag className="w-3 h-3" />
                    {ans.topic}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {ans.handwritingConfidence != null && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    ans.handwritingConfidence >= 80 ? "bg-green-100 text-green-700" :
                    ans.handwritingConfidence >= 50 ? "bg-yellow-100 text-yellow-700" :
                    "bg-red-100 text-red-700"
                  }`}>
                    ✍ {ans.handwritingConfidence}%
                  </span>
                )}
                <span className="text-xs text-gray-500 font-semibold">{maxMarks} mark{maxMarks !== 1 ? "s" : ""}</span>
              </div>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Student's Answer Points */}
              {ans.studentAnswerPoints ? (
                <div className="flex items-start gap-3 p-4 bg-indigo-50 border border-indigo-200 rounded-xl">
                  <PenLine className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-indigo-700 uppercase tracking-wide mb-1">Student's Answer</p>
                    <p className="text-sm text-indigo-900 leading-relaxed whitespace-pre-line">{ans.studentAnswerPoints}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl">
                  <PenLine className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-400 italic">Student's answer not available</p>
                </div>
              )}

              {/* Keywords Found / Missed */}
              {hasKeywords && (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                  <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">Keyword Analysis</p>
                  <div className="flex flex-wrap gap-2">
                    {(ans.keywordsFound || []).map((kw, i) => (
                      <span key={`f-${i}`} className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                        <CheckCircle className="w-3 h-3" />
                        {kw}
                      </span>
                    ))}
                    {(ans.keywordsMissed || []).map((kw, i) => (
                      <span key={`m-${i}`} className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                        <XCircle className="w-3 h-3" />
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Marking Breakdown Table */}
              {hasBreakdown && (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                  <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-3">Step-by-Step Marking</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-300">
                          <th className="text-left py-2 pr-4 font-semibold text-gray-700">Component</th>
                          <th className="text-center py-2 px-3 font-semibold text-gray-700 w-16">Got</th>
                          <th className="text-center py-2 px-3 font-semibold text-gray-700 w-16">Max</th>
                          <th className="text-left py-2 pl-4 font-semibold text-gray-700">Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(ans.markingBreakdown).map(([component, data]) => {
                          const awarded = typeof data === "object" ? data.awarded : data;
                          const max = typeof data === "object" ? data.max : data;
                          const reason = typeof data === "object" ? data.reason : "";
                          const compPct = max > 0 ? (awarded / max) * 100 : 0;
                          const barColor = compPct >= 75 ? "bg-green-500" : compPct >= 40 ? "bg-yellow-500" : "bg-red-400";

                          return (
                            <tr key={component} className="border-b border-gray-100">
                              <td className="py-2.5 pr-4">
                                <span className="text-gray-800 font-medium capitalize">{component.replace(/_/g, " ")}</span>
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <span className={`font-bold ${compPct >= 75 ? "text-green-600" : compPct >= 40 ? "text-yellow-600" : "text-red-500"}`}>
                                  {awarded}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-center text-gray-500">{max}</td>
                              <td className="py-2.5 pl-4 text-gray-600 text-xs">{reason}</td>
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
                <div className="flex items-start gap-3 p-4 bg-purple-50 border border-purple-200 rounded-xl">
                  <MessageSquare className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-purple-700 uppercase tracking-wide mb-1">AI Feedback</p>
                    <p className="text-sm text-purple-900 leading-relaxed">{ans.aiFeedback}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl">
                  <MessageSquare className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-400 italic">No AI feedback available</p>
                </div>
              )}

              {/* Marks + Progress Bar */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>Score</span>
                    <span>{ans.marksAwarded}/{maxMarks}</span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
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
                        className="w-20 px-2 py-1.5 text-sm border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      <button
                        onClick={() => { const e = { ...editingMarks }; delete e[ans.questionId]; setEditingMarks(e); }}
                        className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className={`text-xl font-bold ${pct >= 75 ? "text-green-600" : pct >= 40 ? "text-yellow-600" : "text-red-500"}`}>
                        {ans.marksAwarded}/{maxMarks}
                      </span>
                      <button
                        onClick={() => setEditingMarks(prev => ({ ...prev, [ans.questionId]: ans.marksAwarded }))}
                        className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg cursor-pointer"
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
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                  ans.checkedBy === "ai" ? "bg-purple-100 text-purple-700" :
                  ans.checkedBy === "teacher" ? "bg-blue-100 text-blue-700" :
                  "bg-gray-100 text-gray-500"
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
    <div className="min-h-screen bg-gray-50">
      <div className={`mx-auto px-4 sm:px-6 py-6 transition-all duration-300 ${showPDF ? "max-w-[1800px]" : "max-w-5xl"}`}>

        {/* Back */}
        <button
          onClick={() => navigate(`/class/${classId}/test-papers/physical-results`)}
          className="flex items-center gap-2 text-purple-600 hover:text-purple-700 mb-4 cursor-pointer font-medium"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Results
        </button>

        {/* Error Banner (for failed submissions) */}
        {isErrorState && submission.errorType && (
          <div className={`mb-4 flex items-center gap-3 px-5 py-4 rounded-xl border-l-4 ${
            errorBannerStyles[submission.errorType]?.bg || "bg-red-50"
          } ${
            errorBannerStyles[submission.errorType]?.border || "border-red-300"
          }`}>
            <AlertTriangle className={`w-5 h-5 flex-shrink-0 ${errorBannerStyles[submission.errorType]?.text || "text-red-600"}`} />
            <div>
              <p className={`font-semibold text-sm ${errorBannerStyles[submission.errorType]?.text || "text-red-800"}`}>
                {errorBannerStyles[submission.errorType]?.label || "Error"}
              </p>
              <p className="text-sm text-gray-600 mt-0.5">{submission.errorMessage}</p>
            </div>
          </div>
        )}

        {/* Needs Review Banner */}
        {isNeedsReview && (
          <div className="mb-4 flex items-center gap-3 px-5 py-4 rounded-xl border-l-4 bg-amber-50 border-amber-400">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-sm text-amber-800">Manual Review Required</p>
              <p className="text-sm text-gray-600 mt-0.5">Some answers in this submission need manual review by the teacher.</p>
            </div>
          </div>
        )}

        {/* Student Header Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{submission.studentName}</h1>
              <p className="text-gray-500 text-sm mt-0.5">
                {submission.testTitle || submission.testPaperId?.title || "Physical Test"}
              </p>
              <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold ${
                submission.status === "checked" ? "bg-green-100 text-green-800" :
                submission.status === "needs_review" ? "bg-amber-100 text-amber-800" :
                submission.status === "failed" ? "bg-red-100 text-red-800" :
                "bg-yellow-100 text-yellow-800"
              }`}>
                {submission.status === "checked" ? "✅ Checked" :
                 submission.status === "needs_review" ? "⚠ Needs Review" :
                 submission.status === "failed" ? "❌ Failed" : "⏳ Pending"}
              </span>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 text-3xl font-bold text-purple-700">
                <Award className="w-8 h-8" />
                {submission.marksObtained}/{submission.totalMarks}
              </div>
              <div className={`text-lg font-semibold mt-1 ${submission.percentage >= 40 ? "text-green-600" : "text-red-500"}`}>
                {submission.percentage}%
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 mt-4">
            <button
              onClick={() => setShowPDF(!showPDF)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition cursor-pointer text-sm font-medium ${
                showPDF
                  ? "bg-purple-100 text-purple-700 hover:bg-purple-200 border border-purple-200"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              {showPDF ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
              {showPDF ? "Hide PDF Panel" : "View Student's PDF"}
            </button>
            <a
              href={getPhysicalSubmissionPDFUrl(submissionId)}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition cursor-pointer text-sm font-medium"
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
          <div className="mb-4 flex items-center justify-between bg-yellow-50 border border-yellow-200 rounded-xl px-5 py-3">
            <p className="text-sm text-yellow-800 font-medium">You have unsaved mark changes</p>
            <button
              onClick={saveMarks}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 bg-yellow-500 text-white text-sm font-semibold rounded-lg hover:bg-yellow-600 disabled:opacity-50 cursor-pointer transition"
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
                  background: "linear-gradient(to bottom, #e9d5ff, #c084fc, #e9d5ff)",
                  transition: "width 0.15s, background 0.15s", position: "relative",
                }}
                className="group-hover:!w-[6px]"
              >
                <div
                  style={{
                    position: "sticky", top: "50vh", transform: "translateY(-50%)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    width: "24px", height: "40px", marginLeft: "-10px",
                    borderRadius: "6px", backgroundColor: "#7c3aed",
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
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden h-full flex flex-col">
                  <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-purple-600" />
                      <h3 className="font-semibold text-gray-900 text-sm">Student's Handwritten Paper</h3>
                    </div>
                    <button
                      onClick={() => setShowPDF(false)}
                      className="p-1.5 hover:bg-gray-200 rounded-lg cursor-pointer transition"
                      title="Close PDF panel"
                    >
                      <X className="w-4 h-4 text-gray-500" />
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
