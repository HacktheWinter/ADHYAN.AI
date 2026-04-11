import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft, FileText, Loader, Trash2, CheckCircle, Clock, User,
  Sparkles, StopCircle, AlertTriangle, XCircle, Wifi, WifiOff,
  Eye, RefreshCw, Timer, Filter, ChevronDown
} from "lucide-react";
import { io as socketIO } from "socket.io-client";
import { SOCKET_URL } from "../config";
import { v4 as uuidv4 } from "uuid";
import {
  getPhysicalSubmissionsByClass,
  deletePhysicalSubmission,
  getPhysicalSubmissionPDFUrl,
  startBulkCheck,
  stopBulkCheck,
} from "../api/physicalTestApi";

const PhysicalTestResultsPage = () => {
  const { classId } = useParams();
  const navigate = useNavigate();

  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const [selectedTitle, setSelectedTitle] = useState(() => {
    return sessionStorage.getItem(`pt-filter-${classId}`) || "all";
  });

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (selectedTitle) sessionStorage.setItem(`pt-filter-${classId}`, selectedTitle);
  }, [selectedTitle, classId]);

  // ── Real-time checking state ────────────────────────────────────────
  const [isChecking, setIsChecking] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [progress, setProgress] = useState({
    checkedCount: 0,
    totalCount: 0,
    failedCount: 0,
    needsReviewCount: 0,
    needsReviewCount: 0,
    currentStudent: "",
    recentResults: [],
    logs: [],
  });
  const [stopRequested, setStopRequested] = useState(false);
  const [showStopConfirm, setShowStopConfirm] = useState(false);

  const socketRef = useRef(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const autoCheckTriggered = useRef(false);

  useEffect(() => {
    // Read testTitle from URL query param (set by upload page)
    const urlTestTitle = searchParams.get("testTitle");
    if (urlTestTitle) {
      setSelectedTitle(urlTestTitle);
    }
    fetchSubmissions(true);
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [classId]);

  // Auto-start checking if redirected from upload page
  useEffect(() => {
    if (autoCheckTriggered.current) return;
    if (loading) return;
    const shouldAutoCheck = searchParams.get("autoCheck") === "true";
    if (!shouldAutoCheck) return;
    const urlTestTitle = searchParams.get("testTitle");

    // Check if there are pending submissions
    const pendingSubs = submissions.filter(s => {
      if (s.status !== "pending") return false;
      if (urlTestTitle && (s.testTitle || "Untitled") !== urlTestTitle) return false;
      return true;
    });

    if (pendingSubs.length > 0) {
      autoCheckTriggered.current = true;
      // Clean up URL params to prevent re-trigger on refresh
      setSearchParams({}, { replace: true });
      // Small delay to let UI render first
      setTimeout(() => handleStartChecking(urlTestTitle), 500);
    }
  }, [loading, submissions]);

  const fetchSubmissions = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const data = await getPhysicalSubmissionsByClass(classId);
      setSubmissions(data.submissions || []);
    } catch (err) {
      console.error(err);
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  const handleDelete = async (submissionId) => {
    if (!confirm("Delete this submission?")) return;
    setDeleting(submissionId);
    try {
      await deletePhysicalSubmission(submissionId);
      setSubmissions(prev => prev.filter(s => s._id !== submissionId));
    } catch {
      alert("Failed to delete");
    } finally {
      setDeleting(null);
    }
  };

  // ── Start AI Checking ─────────────────────────────────────────────
  const handleStartChecking = async (overrideTestTitle) => {
    const newSessionId = uuidv4();
    setSessionId(newSessionId);
    setStopRequested(false);
    setProgress({ checkedCount: 0, totalCount: 0, failedCount: 0, needsReviewCount: 0, currentStudent: "", recentResults: [], logs: [] });

    // Connect socket
    const socket = socketIO(SOCKET_URL, { transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join_physical_check", { sessionId: newSessionId });
    });

    socket.on("physical_check_started", (data) => {
      setIsChecking(true);
      setProgress(prev => ({ ...prev, totalCount: data.totalCount }));
    });

    socket.on("physical_check_progress", (data) => {
      setProgress(prev => {
        const recentResults = data.lastResult
          ? [data.lastResult, ...prev.recentResults].slice(0, 5)
          : prev.recentResults;
        return {
          checkedCount: data.checkedCount,
          totalCount: data.totalCount,
          failedCount: data.failedCount,
          needsReviewCount: data.needsReviewCount || prev.needsReviewCount,
          currentStudent: data.currentStudent,
          recentResults,
          logs: prev.logs,
        };
      });
    });

    socket.on("physical_check_log", (data) => {
      setProgress(prev => {
        const newLogs = [...(prev.logs || []), data.log].slice(-50);
        return { ...prev, logs: newLogs };
      });
    });

    socket.on("physical_check_error", (data) => {
      setProgress(prev => ({
        ...prev,
        recentResults: [{
          studentName: data.studentName,
          marks: 0, total: 0, pct: 0,
          status: "failed",
          errorType: data.errorType,
          errorMessage: data.errorMessage,
          needsReview: false,
        }, ...prev.recentResults].slice(0, 5),
      }));
    });

    socket.on("physical_check_stopped", () => {
      setIsChecking(false);
      setStopRequested(false);
      setShowStopConfirm(false);
      fetchSubmissions(false);
    });

    socket.on("physical_check_complete", (data) => {
      setIsChecking(false);
      setProgress(prev => ({
        ...prev,
        checkedCount: data.checkedCount,
        failedCount: data.failedCount,
        needsReviewCount: data.needsReviewCount,
        currentStudent: "",
      }));
      fetchSubmissions(false);
    });

    // Start the check
    try {
      const testTitle = overrideTestTitle || (selectedTitle !== "all" ? selectedTitle : undefined);
      await startBulkCheck(classId, newSessionId, testTitle);
      setIsChecking(true);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "Failed to start checking");
      socket.disconnect();
      socketRef.current = null;
    }
  };

  // ── Stop Checking ──────────────────────────────────────────────────
  const handleStopChecking = async () => {
    setShowStopConfirm(false);
    setStopRequested(true);
    try {
      await stopBulkCheck(sessionId);
    } catch (err) {
      console.error(err);
    }
  };

  // ── Derived values ────────────────────────────────────────────────
  const titles = ["all", ...Array.from(new Set(submissions.map(s => s.testTitle || "Untitled").filter(Boolean)))];

  const filtered = selectedTitle === "all"
    ? submissions
    : submissions.filter(s => (s.testTitle || "Untitled") === selectedTitle);

  const pendingCount = filtered.filter(s => s.status === "pending").length;
  const checkedSubs = filtered.filter(s => s.status === "checked" || s.status === "needs_review");
  const failedSubs = filtered.filter(s => s.status === "failed");
  const avgScore = checkedSubs.length > 0
    ? (checkedSubs.reduce((sum, s) => sum + s.percentage, 0) / checkedSubs.length).toFixed(1)
    : 0;

  const progressPct = progress.totalCount > 0
    ? Math.round((progress.checkedCount / progress.totalCount) * 100)
    : 0;

  // ── Error card color mapping ──────────────────────────────────────
  const errorStyles = {
    illegible: { bg: "bg-amber-50", border: "border-amber-300", text: "text-amber-800", badge: "bg-amber-100 text-amber-700", label: "Handwriting Unclear" },
    network_error: { bg: "bg-red-50", border: "border-red-300", text: "text-red-800", badge: "bg-red-100 text-red-700", label: "Network Error" },
    quota_exceeded: { bg: "bg-red-50", border: "border-red-300", text: "text-red-800", badge: "bg-red-100 text-red-700", label: "API Quota" },
    parse_error: { bg: "bg-orange-50", border: "border-orange-300", text: "text-orange-800", badge: "bg-orange-100 text-orange-700", label: "Parse Failed" },
    timeout: { bg: "bg-amber-50", border: "border-amber-300", text: "text-amber-800", badge: "bg-amber-100 text-amber-700", label: "Timeout" },
  };

  const errorMessages = {
    illegible: "Handwriting too unclear to evaluate automatically",
    network_error: "Connection lost during evaluation — student not checked",
    quota_exceeded: "AI service limit reached — remaining students not checked",
    parse_error: "AI returned unexpected response — result may be incomplete",
    timeout: "Evaluation took too long — marked for manual review",
  };

  // ── Status badge helper ───────────────────────────────────────────
  const getStatusBadge = (status, errorType) => {
    if (status === "checked") return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800"><CheckCircle className="w-3 h-3" />Checked</span>;
    if (status === "checking") return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800"><Loader className="w-3 h-3 animate-spin" />Checking</span>;
    if (status === "needs_review") return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800"><AlertTriangle className="w-3 h-3" />Needs Review</span>;
    if (status === "failed") {
      const style = errorStyles[errorType] || errorStyles.network_error;
      return <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${style.badge}`}><XCircle className="w-3 h-3" />{style.label}</span>;
    }
    return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3" />Pending</span>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader className="w-10 h-10 text-purple-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">

        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate(`/class/${classId}/test-papers`)}
            className="flex items-center gap-2 text-purple-600 hover:text-purple-700 mb-4 cursor-pointer font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Test Papers
          </button>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Physical Paper Results</h1>
              <p className="text-gray-500 text-sm mt-0.5">{submissions.length} total submission(s) across all tests</p>
            </div>
            <div className="flex items-center gap-3">
              {titles.length > 1 && (
                <div className="relative group" ref={dropdownRef}>
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center justify-between min-w-[140px] max-w-[200px] bg-white border-2 border-gray-100 rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-700 hover:border-purple-200 hover:bg-purple-50/30 focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 outline-none cursor-pointer shadow-sm transition-all"
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <Filter className="w-4 h-4 text-purple-500 group-hover:text-purple-600 transition-colors flex-shrink-0" />
                      <span className="truncate">{selectedTitle === "all" ? "All Tests" : selectedTitle}</span>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-transform duration-200 ml-2 flex-shrink-0 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isDropdownOpen && (
                    <div className="absolute z-50 w-full min-w-[180px] right-0 mt-2 bg-white border border-gray-100 rounded-xl shadow-xl shadow-purple-900/5 overflow-hidden animate-slideIn origin-top-right">
                      <div className="max-h-60 overflow-y-auto py-1.5 flex flex-col">
                        {titles.map((t) => (
                          <button
                            key={t}
                            onClick={() => {
                              setSelectedTitle(t);
                              setIsDropdownOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2 text-sm font-medium transition-colors cursor-pointer ${
                              selectedTitle === t 
                                ? 'bg-purple-50 text-purple-700' 
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            }`}
                          >
                            {t === "all" ? "All Tests" : t}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {/* Start AI Checking button */}
              {pendingCount > 0 && !isChecking && (
                <button
                  onClick={handleStartChecking}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg cursor-pointer text-sm"
                >
                  <Sparkles className="w-4 h-4" />
                  Start AI Checking ({pendingCount})
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            REAL-TIME PROGRESS CARD (visible during checking)
        ═══════════════════════════════════════════════════════════════ */}
        {isChecking && (
          <div className="bg-white rounded-2xl border border-purple-200 shadow-lg mb-6 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-purple-100">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                <h3 className="font-semibold text-gray-900">AI Checking in Progress</h3>
                <span className="text-sm text-gray-500">{progress.checkedCount} / {progress.totalCount}</span>
              </div>
              {/* Stop button */}
              {!stopRequested ? (
                <button
                  onClick={() => setShowStopConfirm(true)}
                  className="flex items-center gap-2 px-4 py-2 border-2 border-red-300 text-red-600 font-semibold rounded-xl hover:bg-red-50 transition cursor-pointer text-sm"
                >
                  <StopCircle className="w-4 h-4" />
                  Stop Checking
                </button>
              ) : (
                <span className="flex items-center gap-2 px-4 py-2 text-amber-600 text-sm font-medium">
                  <Loader className="w-4 h-4 animate-spin" />
                  Stopping after current student…
                </span>
              )}
            </div>

            {/* Progress bar */}
            <div className="px-6 pt-4">
              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                <span>{progressPct}% complete</span>
                <div className="flex items-center gap-4">
                  <span className="text-green-600">✓ {progress.checkedCount - progress.failedCount} checked</span>
                  {progress.failedCount > 0 && <span className="text-red-500">✗ {progress.failedCount} failed</span>}
                  {progress.needsReviewCount > 0 && <span className="text-amber-500">⚠ {progress.needsReviewCount} review</span>}
                </div>
              </div>
            </div>

            {/* Currently checking */}
            {progress.currentStudent && (
              <div className="flex items-center gap-3 px-6 py-3 mt-2 mx-6 bg-blue-50 border border-blue-100 rounded-xl">
                <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse" />
                <span className="text-sm text-blue-800 font-medium">Currently checking:</span>
                <span className="text-sm text-blue-900 font-semibold">{progress.currentStudent}</span>
              </div>
            )}

            {/* Recent results feed */}
            {progress.recentResults.length > 0 && (
              <div className="px-6 py-4 space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Recent Results</p>
                {progress.recentResults.map((result, i) => {
                  if (result.status === "failed" || result.errorType) {
                    const errStyle = errorStyles[result.errorType] || errorStyles.network_error;
                    return (
                      <div key={i} className={`flex items-center gap-3 p-3 ${errStyle.bg} border-l-4 ${errStyle.border} rounded-lg animate-slideIn`}>
                        <XCircle className={`w-4 h-4 ${errStyle.text} flex-shrink-0`} />
                        <span className="text-sm font-medium text-gray-800 flex-1">{result.studentName}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${errStyle.badge}`}>{errStyle.label}</span>
                      </div>
                    );
                  }

                  const pctColor = result.pct >= 75 ? "bg-green-100 text-green-700" : result.pct >= 40 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700";
                  return (
                    <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-100 rounded-lg animate-slideIn">
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span className="text-sm font-medium text-gray-800 flex-1">{result.studentName}</span>
                      <span className="text-sm font-semibold text-gray-700">{result.marks}/{result.total}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${pctColor}`}>{result.pct}%</span>
                      {result.needsReview && <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />}
                    </div>
                  );
                })}

                {/* Bouncing dots loader */}
                <div className="flex items-center justify-center gap-1.5 py-4">
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}

            {/* Agent Logs */}
            {progress.logs && progress.logs.length > 0 && (
              <div ref={el => { if (el) el.scrollTop = el.scrollHeight; }} className="px-6 py-4 bg-gray-50 mx-6 mt-4 mb-4 rounded-xl shadow-sm overflow-y-auto max-h-48 border border-gray-200">
                {progress.logs.map((log, i) => {
                  const cleanLog = log.replace(/\[AI CHECK\] /g, "").replace(/══════════════════════════════════════════════/g, "──────────");
                  return (
                    <div key={i} className="mb-2 leading-relaxed break-words whitespace-pre-wrap flex gap-3 text-sm">
                      <span className="text-gray-400 text-xs mt-0.5 whitespace-nowrap font-medium">{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}</span>
                      <span className="font-medium text-gray-700">{cleanLog}</span>
                    </div>
                  );
                })}
                <div className="flex items-center gap-2 mt-3 text-purple-600 border-t border-gray-200 pt-3 pb-1 font-semibold text-sm">
                  <Sparkles className="w-4 h-4 animate-pulse" />
                  <span className="animate-pulse">Agent is evaluating your student copies. Please wait...</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Stop Confirmation Dialog */}
        {showStopConfirm && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Stop AI Checking?</h3>
              <p className="text-sm text-gray-600 mb-6">
                Checking will stop after the current student finishes. Results checked so far will be saved. You can resume checking later.
              </p>
              <div className="flex items-center gap-3 justify-end">
                <button
                  onClick={() => setShowStopConfirm(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStopChecking}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 transition cursor-pointer"
                >
                  Stop Checking
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        {filtered.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
            {[
              { label: "Total", value: filtered.length, color: "text-purple-600" },
              { label: "Checked", value: checkedSubs.length, color: "text-green-600" },
              { label: "Pending", value: pendingCount, color: "text-yellow-600" },
              { label: "Failed", value: failedSubs.length, color: "text-red-500" },
              { label: "Avg Score", value: `${avgScore}%`, color: "text-blue-600" },
            ].map(stat => (
              <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <div className={`text-2xl font-bold ${stat.color} mb-1`}>{stat.value}</div>
                <div className="text-xs text-gray-500">{stat.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Table or Empty */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-sm">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium text-lg">No submissions yet</p>
            <button
              onClick={() => navigate(`/class/${classId}/test-papers/upload-physical`)}
              className="mt-4 px-6 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition cursor-pointer"
            >
              Upload Papers
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Student</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Test</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Score</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">%</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map(sub => (
                    <tr key={sub._id} className={`hover:bg-gray-50 transition-colors ${sub.status === "failed" ? "bg-red-50/30" : ""}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                            <User className="w-4 h-4 text-purple-600" />
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900 text-sm">{sub.studentName}</div>
                            <div className="text-xs text-gray-400">
                              {new Date(sub.uploadedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-700 font-medium">{sub.testTitle || "—"}</span>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(sub.status, sub.errorType)}
                      </td>
                      <td className="px-6 py-4">
                        {(sub.status === "checked" || sub.status === "needs_review")
                          ? <span className="font-semibold text-gray-900 text-sm">{sub.marksObtained}/{sub.totalMarks}</span>
                          : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-6 py-4">
                        {(sub.status === "checked" || sub.status === "needs_review")
                          ? <span className={`font-semibold text-sm ${sub.percentage >= 40 ? "text-green-600" : "text-red-500"}`}>{sub.percentage}%</span>
                          : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => navigate(`/class/${classId}/test-papers/physical-results/${sub._id}`)}
                            className="px-3 py-1.5 bg-purple-600 text-white text-xs font-medium rounded-lg hover:bg-purple-700 transition cursor-pointer"
                          >
                            View
                          </button>
                          <a
                            href={getPhysicalSubmissionPDFUrl(sub._id)}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition cursor-pointer"
                          >
                            PDF
                          </a>
                          <button
                            onClick={() => handleDelete(sub._id)}
                            disabled={deleting === sub._id}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition cursor-pointer disabled:opacity-50"
                          >
                            {deleting === sub._id ? <Loader className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Custom animation styles */}
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slideIn {
          animation: slideIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default PhysicalTestResultsPage;
