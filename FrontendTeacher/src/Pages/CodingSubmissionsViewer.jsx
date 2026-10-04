import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle, ArrowLeft, CheckCircle, Clock, Code2, Eye,
  FileCode, Loader, RefreshCw, Search, Trophy, Users, X,
  MoreVertical, BarChart2, User, Camera, MessageSquare, Award, Send,
  Maximize2, Minimize2
} from "lucide-react";
import { getCodingAssessmentById, getCodingSubmissions, gradeCodingSubmission } from "../api/codingAssessmentApi";
import axios from "axios";
import API_BASE_URL from "../config";

export default function CodingSubmissionsViewer() {
  const { classId, assessmentId } = useParams();
  const navigate = useNavigate();
  const [assessment, setAssessment] = useState(null);
  const [classroom, setClassroom] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState("html");
  const [grade, setGrade] = useState("");
  const [feedback, setFeedback] = useState("");
  const [saving, setSaving] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [fullscreenPreview, setFullscreenPreview] = useState(false);
  const maxMarks = Number(assessment?.maxMarks) || 10;

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [a, s] = await Promise.all([
        getCodingAssessmentById(assessmentId),
        getCodingSubmissions(assessmentId),
      ]);
      setAssessment(a.assessment);
      setSubmissions(s.submissions || []);

      // Fetch classroom data for total students count
      try {
        const classResponse = await axios.get(`${API_BASE_URL}/classroom/${classId}`);
        setClassroom(classResponse.data.classroom);
      } catch (classError) {
        console.error("Error fetching classroom:", classError);
      }
    } catch (error) {
      console.error("Error fetching coding results:", error);
    } finally {
      setLoading(false);
    }
  }, [assessmentId, classId]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    setGrade(selected?.marksAwarded ?? "");
    setFeedback(selected?.teacherFeedback || "");
  }, [selected]);

  const submitted = submissions.filter((s) => s.submissionStatus !== "in-progress");
  const graded = submitted.filter((s) => s.marksAwarded !== null && s.marksAwarded !== undefined);
  const averagePercent = graded.length
    ? (graded.reduce((n, s) => n + (Number(s.marksAwarded) / maxMarks) * 100, 0) / graded.length).toFixed(1)
    : "—";
  const totalStudents = classroom?.students?.length || 0;

  const filtered = useMemo(
    () => submissions.filter((s) => {
      const searchStr = search.toLowerCase();
      const name = (s.studentId?.name || s.studentName || "").toLowerCase();
      const email = (s.studentId?.email || "").toLowerCase();
      const erpId = (s.studentId?.erpId || "").toLowerCase();
      return name.includes(searchStr) || email.includes(searchStr) || erpId.includes(searchStr);
    }),
    [submissions, search]
  );

  const formatDuration = (seconds) => seconds ? `${Math.floor(seconds / 60)}m ${seconds % 60}s` : "—";
  const openSubmission = (submission) => { setSelected(submission); setTab("html"); };

  const saveGrade = async () => {
    if (!selected || grade === "" || Number(grade) < 0 || Number(grade) > maxMarks) return;
    try {
      setSaving(true);
      const result = await gradeCodingSubmission(selected._id, { marksAwarded: Number(grade), teacherFeedback: feedback });
      setSubmissions((items) => items.map((s) => s._id === selected._id ? result.submission : s));
      // Auto-close the modal after successful save
      setSelected(null);
    } catch (error) {
      window.alert(error.response?.data?.error || "Could not save grade.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center font-body text-ink">
        <div className="text-center">
          <Loader className="w-12 h-12 text-violet-dark animate-spin mx-auto mb-4" />
          <p className="text-ink-soft font-semibold">Loading assessment results...</p>
        </div>
      </div>
    );
  }

  if (!assessment && submissions.length === 0) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center font-body text-ink">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-rose-500 mx-auto mb-4" />
          <p className="text-ink font-semibold font-display">Assessment not found</p>
          <p className="text-ink-soft text-sm mt-2">No assessment or submissions available</p>
          <button
            onClick={() => navigate(`/class/${classId}/coding-round`)}
            className="mt-4 px-6 py-3 btn-settings-blue text-sm rounded-xl font-bold transition cursor-pointer"
          >
            Back to Coding Rounds
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper font-body text-ink">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">

        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <button
            onClick={() => navigate(`/class/${classId}/coding-round`)}
            className="flex items-center gap-2 text-violet-dark hover:opacity-80 font-bold transition-all mb-4 cursor-pointer text-sm"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Coding Rounds
          </button>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold font-display text-ink mb-2" title={assessment?.title}>
                {(assessment?.title || "Coding Round Results").length > 50
                  ? (assessment?.title || "Coding Round Results").substring(0, 50) + "..."
                  : (assessment?.title || "Coding Round Results")}
              </h1>
              <p className="text-sm sm:text-base text-ink-soft">
                1 coding question • {maxMarks} marks • {submissions.length} submissions
              </p>
            </div>

            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 hover:bg-line/60 rounded-xl text-ink-soft hover:text-ink transition-colors cursor-pointer"
              >
                <MoreVertical className="w-5 h-5" />
              </button>

              {showMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowMenu(false)}
                  ></div>
                  <div className="absolute right-0 top-full mt-2 w-48 bg-surface rounded-xl shadow-xl border border-line z-20 py-1 overflow-hidden">
                    <button
                      onClick={() => navigate(`/class/${classId}/dashboard`, { state: { activeTab: 'coding' } })}
                      className="w-full text-left px-4 py-2.5 text-sm text-ink hover:bg-violet-50 hover:text-violet-dark flex items-center gap-2 transition-colors cursor-pointer font-medium"
                    >
                      <BarChart2 className="w-4 h-4 text-violet-dark" />
                      Class Dashboard
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Stats Cards - Hidden on small screens */}
        <div className="hidden md:grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-surface rounded-2xl border border-line p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-ink-soft uppercase tracking-wider mb-1">Submission</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-xl font-black font-display text-ink">
                    {submissions.length} <span className="text-xs font-normal font-body text-ink-soft">out of {totalStudents} students</span>
                  </p>
                </div>
              </div>
              <FileCode className="w-10 h-10 text-ink-soft opacity-20" />
            </div>
          </div>

          <div className="bg-surface rounded-2xl border border-line p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-ink-soft uppercase tracking-wider mb-1">Average Score</p>
                <p className="text-3xl font-black font-display text-violet-dark">
                  {graded.length ? `${averagePercent}%` : "—"}
                </p>
              </div>
              <Trophy className="w-10 h-10 text-ink-soft opacity-20" />
            </div>
          </div>

          <div className="bg-surface rounded-2xl border border-line p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-ink-soft uppercase tracking-wider mb-1">Graded</p>
                <p className="text-3xl font-black font-display text-green-600 dark:text-green-400">{graded.length}</p>
              </div>
              <CheckCircle className="w-10 h-10 text-ink-soft opacity-20" />
            </div>
          </div>

          <div className="bg-surface rounded-2xl border border-line p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-ink-soft uppercase tracking-wider mb-1">Maximum Marks</p>
                <p className="text-3xl font-black font-display text-rose-600 dark:text-rose-450">{maxMarks}</p>
              </div>
              <Users className="w-10 h-10 text-ink-soft opacity-20" />
            </div>
          </div>
        </div>

        {/* Refresh & Search Bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4 sm:mb-6">
          <button
            onClick={fetchData}
            className="flex items-center justify-center gap-2 px-4 sm:px-6 py-3 bg-line text-ink text-sm sm:text-base font-bold rounded-xl hover:bg-line/80 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-5 h-5" />
            Refresh
          </button>

          <div className="relative flex-1 sm:max-w-xs ml-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-soft" />
            <input
              type="text"
              placeholder="Search by name, email or ERP ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-3 bg-surface border border-line rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-ink text-sm sm:text-base"
            />
          </div>
        </div>

        {/* Submissions Table */}
        <div className="bg-surface rounded-2xl border border-line overflow-hidden shadow-sm">
          {filtered.length === 0 ? (
            <div className="p-8 sm:p-12 text-center bg-surface">
              <FileCode className="w-12 h-12 sm:w-16 sm:h-16 text-ink-soft opacity-20 mx-auto mb-4" />
              <p className="text-ink-soft font-semibold">{search ? "No matching submissions" : "No submissions yet"}</p>
              <p className="text-ink-soft text-sm mt-1">Student coding submissions will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface border-b border-line">
                  <tr>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-bold text-ink">Student</th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-bold text-ink">Status</th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-bold text-ink">Time</th>
                    <th className="hidden sm:table-cell px-6 py-4 text-left text-sm font-bold text-ink">Marks</th>
                    <th className="hidden lg:table-cell px-6 py-4 text-left text-sm font-bold text-ink">Percentage</th>
                    <th className="hidden lg:table-cell px-6 py-4 text-left text-sm font-bold text-ink">Submitted</th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-bold text-ink">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filtered.map((s) => {
                    const name = s.studentId?.name || s.studentName || "Unknown";
                    const isGraded = s.marksAwarded !== null && s.marksAwarded !== undefined;
                    const displayPercentage = isGraded ? ((Number(s.marksAwarded) / maxMarks) * 100) : 0;

                    return (
                      <tr key={s._id} className="hover:bg-line/20 bg-surface transition-colors">
                        <td className="px-3 sm:px-6 py-3 sm:py-4">
                          <div className="flex items-center gap-2 sm:gap-3">
                            {s.studentId?.profilePhoto ? (
                              <img
                                src={`${API_BASE_URL.replace('/api', '')}/${s.studentId.profilePhoto}`}
                                alt={name}
                                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover flex-shrink-0 border border-line shadow-sm"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextElementSibling.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div
                              className="w-8 h-8 sm:w-10 sm:h-10 bg-violet-50 border border-line rounded-full flex items-center justify-center flex-shrink-0"
                              style={{ display: s.studentId?.profilePhoto ? 'none' : 'flex' }}
                            >
                              <User className="w-4 h-4 sm:w-5 sm:h-5 text-violet-dark" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-ink font-display text-xs sm:text-base truncate">{name}</p>
                              <p className="text-xs text-ink-soft truncate hidden sm:block">{s.studentId?.email}</p>
                              <p className="text-[10px] text-ink-soft/70 uppercase tracking-wide mt-0.5">ID: {s.studentId?.erpId || 'No ERP ID'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4">
                          <span className={`inline-flex items-center gap-1 px-2 sm:px-3 py-1 rounded-full text-xs font-bold border border-line ${
                            isGraded
                              ? 'bg-green-100 dark:bg-green-955/40 text-green-800 dark:text-green-300'
                              : s.submissionStatus === 'in-progress'
                                ? 'bg-blue-100 dark:bg-blue-955/40 text-blue-800 dark:text-blue-300'
                                : 'bg-amber-100 dark:bg-amber-955/40 text-amber-800 dark:text-amber-300'
                          }`}>
                            {isGraded ? (
                              <><CheckCircle className="w-3 h-3" /> <span className="hidden sm:inline">Graded</span></>
                            ) : s.submissionStatus === 'in-progress' ? (
                              <span className="hidden sm:inline">In Progress</span>
                            ) : (
                              <><AlertTriangle className="w-3 h-3" /> <span className="hidden sm:inline">Needs grading</span></>
                            )}
                          </span>
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4">
                          <span className="inline-flex items-center gap-1 text-sm text-ink-soft">
                            <Clock className="w-4 h-4" />
                            {formatDuration(s.timeTaken)}
                          </span>
                        </td>
                        <td className="hidden sm:table-cell px-6 py-4">
                          <span className="font-semibold text-ink text-sm">
                            {isGraded ? `${s.marksAwarded}` : "—"}/{maxMarks}
                          </span>
                        </td>
                        <td className="hidden lg:table-cell px-6 py-4">
                          <span className={`font-bold ${
                            isGraded
                              ? displayPercentage >= 40
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-rose-600 dark:text-rose-450'
                              : 'text-ink-soft'
                          }`}>
                            {isGraded ? `${displayPercentage.toFixed(2)}%` : "—"}
                          </span>
                        </td>
                        <td className="hidden lg:table-cell px-6 py-4">
                          <span className="text-sm text-ink-soft">
                            {s.submissionTime
                              ? new Date(s.submissionTime).toLocaleString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : "—"}
                          </span>
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4">
                          <button
                            onClick={() => openSubmission(s)}
                            className="px-3 py-1.5 btn-settings-blue text-xs font-bold rounded-xl transition-colors cursor-pointer whitespace-nowrap"
                          >
                            <Eye className="inline w-3.5 h-3.5 mr-1" />
                            Review & Grade
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Review & Grade Modal */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-3 sm:p-5"
          onClick={() => setSelected(null)}
        >
          <section
            className="bg-surface border border-line rounded-2xl w-full max-w-6xl max-h-[94vh] overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-line">
              <div>
                <h2 className="font-bold font-display text-lg">
                  {selected.studentId?.name || selected.studentName}'s Submission
                </h2>
                <p className="text-sm text-ink-soft">
                  {formatDuration(selected.timeTaken)} · {selected.submissionStatus} · Max {maxMarks} marks
                </p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="p-2 rounded-lg hover:bg-line transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-line bg-paper">
              {["html", "css", "javascript", "preview"].map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-4 sm:px-6 py-3 text-sm font-semibold transition-colors cursor-pointer ${
                    tab === t
                      ? "text-violet-dark bg-surface border-b-2 border-violet-600"
                      : "text-ink-soft hover:text-ink"
                  }`}
                >
                  {t === "preview" ? (
                    <><Eye className="inline w-4 h-4 mr-1" />PREVIEW</>
                  ) : (
                    t.toUpperCase()
                  )}
                </button>
              ))}
            </div>

            {/* Code / Preview Content */}
            <div className={`flex-1 min-h-0 ${tab === 'preview' ? 'overflow-hidden flex flex-col' : 'overflow-auto'}`}>
              {tab === "preview" ? (
                <div className="relative flex-1 flex flex-col min-h-[52vh] bg-white">
                  <iframe
                    srcDoc={`<!DOCTYPE html><html><head><style>${selected.cssCode || ""}</style></head><body>${(selected.htmlCode || "").replace(
                      /<!DOCTYPE html>|<\/?html[^>]*>|<\/?head[^>]*>|<\/?body[^>]*>|<meta[^>]*>|<title[^>]*>.*?<\/title>/gi,
                      ""
                    )}<script>${selected.jsCode || ""}<\/script></body></html>`}
                    title="Student Preview"
                    className="w-full flex-1 border-0 block"
                    sandbox="allow-scripts"
                  />
                  <button
                    onClick={() => setFullscreenPreview(true)}
                    className="absolute top-3 right-3 p-2 bg-surface/90 backdrop-blur-sm border border-line rounded-lg text-ink-soft hover:text-violet-dark hover:border-violet-400 hover:bg-surface transition-all cursor-pointer shadow-sm hover:shadow-md"
                    title="View full screen"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <pre className="p-5 text-sm font-mono bg-paper min-h-[45vh] whitespace-pre-wrap">
                  {tab === "html"
                    ? selected.htmlCode || "(empty)"
                    : tab === "css"
                      ? selected.cssCode || "(empty)"
                      : selected.jsCode || "(empty)"}
                </pre>
              )}
            </div>

            {/* Grading Footer */}
            <div className="border-t-2 border-violet-100 dark:border-line bg-gradient-to-t from-violet-50/30 to-paper dark:from-surface dark:to-surface">
              {/* Marks & Feedback Row */}
              <div className="p-4 sm:px-5 sm:py-4 grid sm:grid-cols-[240px_1fr] gap-4 items-stretch">
                {/* Marks Section */}
                <div className="flex flex-col h-full space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-violet-dark" />
                    <span className="text-[11px] font-bold text-ink-soft uppercase tracking-wider">Score</span>
                  </div>
                  <div className="flex-1 bg-surface border border-line rounded-xl p-3 flex flex-col justify-center gap-3 focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-500/10 transition-all">
                    <div className="flex items-baseline gap-1">
                      <input
                        type="number"
                        min="0"
                        max={maxMarks}
                        step="0.5"
                        value={grade}
                        onChange={(e) => setGrade(e.target.value)}
                        placeholder="0"
                        className="w-16 text-2xl font-black font-display text-ink bg-transparent outline-none border-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                      />
                      <span className="text-base font-bold text-ink-soft/50">/</span>
                      <span className="text-base font-bold text-ink-soft/50">{maxMarks}</span>
                      {grade !== "" && Number(grade) >= 0 && (
                        <span className={`ml-auto text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          Number(grade) / maxMarks >= 0.7
                            ? 'bg-green-100 text-green-700 dark:bg-green-955/40 dark:text-green-400'
                            : Number(grade) / maxMarks >= 0.4
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-955/40 dark:text-amber-400'
                              : 'bg-rose-100 text-rose-700 dark:bg-rose-955/40 dark:text-rose-400'
                        }`}>
                          {((Number(grade) / maxMarks) * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full h-1.5 bg-line rounded-full overflow-hidden mt-auto">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          grade === "" || Number(grade) < 0
                            ? 'w-0'
                            : Number(grade) / maxMarks >= 0.7
                              ? 'bg-green-500'
                              : Number(grade) / maxMarks >= 0.4
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                        }`}
                        style={{ width: grade !== "" && Number(grade) >= 0 ? `${Math.min((Number(grade) / maxMarks) * 100, 100)}%` : '0%' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Feedback Section */}
                <div className="flex flex-col h-full space-y-2">
                  <div className="flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-violet-dark" />
                    <span className="text-[11px] font-bold text-ink-soft uppercase tracking-wider">Feedback</span>
                    <span className="text-[10px] text-ink-soft/50 font-medium">(optional)</span>
                  </div>
                  <div className="flex-1 bg-surface border border-line rounded-xl p-3 flex flex-col focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-500/10 transition-colors">
                    <textarea
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="What they did well, what could be improved..."
                      className="flex-1 w-full h-full bg-transparent text-ink text-sm resize-none outline-none placeholder:text-ink-soft/40"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="px-4 sm:px-5 pb-3 sm:pb-4 flex items-center justify-end gap-2">
                <button
                  onClick={() => setSelected(null)}
                  className="px-4 py-2 text-sm font-semibold text-ink-soft hover:text-ink hover:bg-line rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={saveGrade}
                  disabled={saving || grade === "" || Number(grade) < 0 || Number(grade) > maxMarks}
                  className="px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm rounded-lg font-bold disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm shadow-violet-600/20 hover:shadow-md hover:shadow-violet-600/30"
                >
                  {saving ? (
                    <><Loader className="w-3.5 h-3.5 animate-spin" /> Saving...</>
                  ) : (
                    <><Send className="w-3.5 h-3.5" /> Save Grade</>
                  )}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Fullscreen Preview Modal */}
      {fullscreenPreview && selected && (
        <div className="fixed inset-0 bg-paper z-[60] flex flex-col">
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-line bg-surface">
            <div className="flex items-center gap-3">
              <Eye className="w-5 h-5 text-violet-dark" />
              <div>
                <h3 className="font-bold font-display text-sm text-ink">
                  {selected.studentId?.name || selected.studentName}'s Preview
                </h3>
                <p className="text-xs text-ink-soft">Full screen preview mode</p>
              </div>
            </div>
            <button
              onClick={() => setFullscreenPreview(false)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-ink-soft hover:text-ink bg-line/50 hover:bg-line rounded-lg transition-colors cursor-pointer"
            >
              <Minimize2 className="w-4 h-4" />
              Exit Full Screen
            </button>
          </div>
          <iframe
            srcDoc={`<!DOCTYPE html><html><head><style>${selected.cssCode || ""}</style></head><body>${(selected.htmlCode || "").replace(
              /<!DOCTYPE html>|<\/?html[^>]*>|<\/?head[^>]*>|<\/?body[^>]*>|<meta[^>]*>|<title[^>]*>.*?<\/title>/gi,
              ""
            )}<script>${selected.jsCode || ""}<\/script></body></html>`}
            title="Student Preview Fullscreen"
            className="flex-1 w-full border-0"
            sandbox="allow-scripts"
          />
        </div>
      )}
    </div>
  );
}
