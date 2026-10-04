// FrontendStudent/src/Pages/CodingRoundTakingPage.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Editor from "@monaco-editor/react";
import {
  Clock,
  Play,
  Send,
  Code2,
  Eye,
  AlertTriangle,
  Shield,
  Loader,
  FileCode,
  Maximize2,
  Minimize2,
  RefreshCw,
  ZoomIn,
  X,
  Info,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  CheckCircle,
} from "lucide-react";
import {
  getCodingAssessmentById,
  startCodingRound,
  saveCodingProgress,
  submitCodingRound,
} from "../api/codingAssessmentApi";
import { useFullScreenProctor } from "../hooks/useFullScreenProctor";
import ViolationAlertModal from "../components/ViolationAlertModal";
import ToastNotification from "../components/ToastNotification";

export default function CodingRoundTakingPage() {
  const { classId, assessmentId } = useParams();
  const navigate = useNavigate();

  // Core state
  const [assessment, setAssessment] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasStarted, setHasStarted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);

  // Panel resizing & stretch state
  const [leftWidth, setLeftWidth] = useState(320);
  const [rightWidth, setRightWidth] = useState(480);
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
  const [isDraggingLeft, setIsDraggingLeft] = useState(false);
  const [isDraggingRight, setIsDraggingRight] = useState(false);
  const mainContainerRef = useRef(null);

  const handleMouseDownLeft = (e) => {
    e.preventDefault();
    setIsDraggingLeft(true);
  };

  const handleMouseDownRight = (e) => {
    e.preventDefault();
    setIsDraggingRight(true);
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!mainContainerRef.current) return;
      const rect = mainContainerRef.current.getBoundingClientRect();

      if (isDraggingLeft) {
        const newLeftWidth = e.clientX - rect.left;
        const clamped = Math.max(180, Math.min(newLeftWidth, Math.min(650, rect.width - 350)));
        setLeftWidth(clamped);
      }

      if (isDraggingRight) {
        const newRightWidth = rect.right - e.clientX;
        const clamped = Math.max(220, Math.min(newRightWidth, Math.min(850, rect.width - 350)));
        setRightWidth(clamped);
      }
    };

    const handleMouseUp = () => {
      setIsDraggingLeft(false);
      setIsDraggingRight(false);
    };

    if (isDraggingLeft || isDraggingRight) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDraggingLeft, isDraggingRight]);

  const handleResetPanels = () => {
    setLeftWidth(320);
    setRightWidth(480);
    setIsLeftCollapsed(false);
  };

  // Code editor state
  const [htmlCode, setHtmlCode] = useState("");
  const [cssCode, setCssCode] = useState("");
  const [jsCode, setJsCode] = useState("");
  const [activeTab, setActiveTab] = useState("html");

  // Preview state
  const [previewDoc, setPreviewDoc] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);

  // Timer state
  const [timeLeft, setTimeLeft] = useState(null);
  const timerRef = useRef(null);
  const autoSaveRef = useRef(null);

  // Refs for latest values (avoid stale closures)
  const htmlRef = useRef("");
  const cssRef = useRef("");
  const jsRef = useRef("");
  const submissionRef = useRef(null);

  // Toast and confirmation
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: "",
    message: "",
    type: "danger",
    onConfirm: null,
  });

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
  };

  // Resume & Refresh Count state
  const [isResuming] = useState(() => !!localStorage.getItem(`coding_start_time_${assessmentId}`));
  const [resumeCount, setResumeCount] = useState(() => {
    return parseInt(localStorage.getItem(`coding_refresh_count_${assessmentId}`) || '0');
  });
  const autoSubmitAttempted = useRef(false);

  useEffect(() => {
    if (isResuming) {
      const currentCount = parseInt(localStorage.getItem(`coding_refresh_count_${assessmentId}`) || '0');
      const newCount = currentCount + 1;
      localStorage.setItem(`coding_refresh_count_${assessmentId}`, newCount.toString());
      setResumeCount(newCount);
    }
  }, [assessmentId]);

  // ==================== FULL-SCREEN PROCTORING ====================
  const {
    isFullScreen,
    showViolationAlert,
    violationMessage,
    violations,
    enterFullScreen,
    exitFullScreen,
    handleViolationAlertOk,
    setIsSubmitting: setProctorSubmitting,
    clearViolations,
  } = useFullScreenProctor({
    enabled: hasStarted,
    maxViolations: 4,
    examId: assessmentId,
    onAutoSubmit: (reason) => handleAutoSubmit(reason),
  });

  // ==================== INITIALIZATION ====================
  useEffect(() => {
    fetchAndStartExam();
  }, [assessmentId]);

  const fetchAndStartExam = async () => {
    try {
      setLoading(true);
      const data = await getCodingAssessmentById(assessmentId);
      setAssessment(data.assessment);

      const startData = await startCodingRound(assessmentId);
      setSubmission(startData.submission);
      setHtmlCode(startData.submission.htmlCode || data.assessment?.starterHtml || "");
      setCssCode(startData.submission.cssCode || data.assessment?.starterCss || "");
      setJsCode(startData.submission.jsCode || data.assessment?.starterJs || "");
      setHasStarted(true);

      // Setup timer
      setupTimer(startData.submission, data.assessment);

      // Start auto-save
      startAutoSave(startData.submission._id);

      // Trigger full screen proctoring
      setTimeout(async () => {
        try {
          await enterFullScreen();
        } catch (e) {
          console.warn("Full screen error on start:", e);
        }
      }, 100);
    } catch (error) {
      console.error("Failed to initialize coding round:", error);
      if (error.response?.status === 404) {
        setIsDeleted(true);
        localStorage.removeItem(`coding_start_time_${assessmentId}`);
        localStorage.removeItem(`coding_refresh_count_${assessmentId}`);
      } else {
        showToast("Failed to start coding round session", "error");
        setTimeout(() => {
          navigate(`/course/${classId}/coding-round`);
        }, 2000);
      }
    } finally {
      setLoading(false);
    }
  };

  // Keep refs up to date
  useEffect(() => {
    htmlRef.current = htmlCode;
  }, [htmlCode]);
  useEffect(() => {
    cssRef.current = cssCode;
  }, [cssCode]);
  useEffect(() => {
    jsRef.current = jsCode;
  }, [jsCode]);
  useEffect(() => {
    submissionRef.current = submission;
  }, [submission]);

  // ==================== TIMER ====================
  const setupTimer = (sub, assess) => {
    const assessmentData = assess || assessment;
    if (!assessmentData?.duration) return;

    const storageKey = `coding_start_time_${assessmentId}`;
    let startTime = localStorage.getItem(storageKey);

    if (!startTime) {
      startTime = new Date(sub.startTime).getTime().toString();
      localStorage.setItem(storageKey, startTime);
    }

    const elapsedSeconds = Math.floor(
      (Date.now() - parseInt(startTime)) / 1000
    );
    const durationSeconds = assessmentData.duration * 60;
    let remaining = durationSeconds - elapsedSeconds;

    // Also check endTime
    if (assessmentData.endTime) {
      const endRemaining = Math.floor(
        (new Date(assessmentData.endTime).getTime() - Date.now()) / 1000
      );
      remaining = Math.min(remaining, endRemaining);
    }

    if (remaining <= 0) {
      handleAutoSubmit("Time expired");
      return;
    }

    setTimeLeft(remaining);

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleAutoSubmit("Time expired");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // ==================== AUTO-SAVE ====================
  const startAutoSave = (subId) => {
    autoSaveRef.current = setInterval(async () => {
      try {
        await saveCodingProgress(subId, {
          htmlCode: htmlRef.current,
          cssCode: cssRef.current,
          jsCode: jsRef.current,
        });
      } catch (error) {
        // Silently fail auto-save
        if (error.response?.status === 404) {
          setIsDeleted(true);
          localStorage.removeItem(`coding_start_time_${assessmentId}`);
          localStorage.removeItem(`coding_refresh_count_${assessmentId}`);
          if (timerRef.current) clearInterval(timerRef.current);
          if (autoSaveRef.current) clearInterval(autoSaveRef.current);
          exitFullScreen();
        }
      }
    }, 30000); // Auto-save every 30 seconds
  };

  // ==================== CLEANUP ====================
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (autoSaveRef.current) clearInterval(autoSaveRef.current);
    };
  }, []);

  // ==================== PREVIEW ====================
  const handleRunPreview = () => {
    const doc = buildPreviewDoc(htmlCode, cssCode, jsCode);
    setPreviewDoc(doc);
    setShowPreview(true);
  };

  const buildPreviewDoc = (html, css, js) => {
    // Extract body content from the HTML (strip doctype, html, head, body tags)
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);

    const bodyContent = bodyMatch ? bodyMatch[1] : html;
    const headContent = headMatch ? headMatch[1] : "";

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${headContent}
  <style>${css}</style>
</head>
<body>
  ${bodyContent}
  <script>${js}<\/script>
</body>
</html>`;
  };

  // ==================== SUBMIT ====================
  const handleSubmitConfirm = () => {
    setConfirmDialog({
      isOpen: true,
      title: "Submit Coding Round?",
      message:
        "Are you sure you want to submit? You won't be able to make changes after submission.",
      type: "danger",
      onConfirm: () => {
        // We don't close the dialog here so the button shows the loading state
        handleSubmit(false);
      },
    });
  };

  // Auto-submit if refreshed more than allowed times (4)
  useEffect(() => {
    if (hasStarted && resumeCount > 4 && !isSubmitting && !isSubmitted && !autoSubmitAttempted.current) {
      autoSubmitAttempted.current = true;
      const timer = setTimeout(() => {
        handleAutoSubmit('Exceeded maximum allowed refreshes/tab closes (4)');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [hasStarted, resumeCount, isSubmitting, isSubmitted]);

  const handleSubmit = async (isAuto = false, reason = null) => {
    if (isSubmitting || isSubmitted) return;

    setIsSubmitting(true);
    setProctorSubmitting(true);

    try {
      if (timerRef.current) clearInterval(timerRef.current);
      if (autoSaveRef.current) clearInterval(autoSaveRef.current);

      await submitCodingRound(submissionRef.current._id, {
        htmlCode: htmlRef.current,
        cssCode: cssRef.current,
        jsCode: jsRef.current,
        autoSubmitted: isAuto,
        autoSubmitReason: reason,
        violations: violations || [],
      });

      setIsSubmitted(true);

      // Clean up
      localStorage.removeItem(`coding_start_time_${assessmentId}`);
      localStorage.removeItem(`coding_refresh_count_${assessmentId}`);
      clearViolations();
      exitFullScreen();

      showToast(
        isAuto
          ? "Your code has been auto-submitted"
          : "Code submitted successfully!"
      );

      setTimeout(() => {
        navigate(`/course/${classId}/classwork?tab=coding-round`, { replace: true });
      }, 3000);
    } catch (error) {
      console.error("Failed to submit:", error);
      if (error.response?.status === 404) {
        setIsDeleted(true);
        localStorage.removeItem(`coding_start_time_${assessmentId}`);
        localStorage.removeItem(`coding_refresh_count_${assessmentId}`);
        clearViolations();
        exitFullScreen();
      } else {
        showToast("Failed to submit. Please try again.", "error");
      }
      setIsSubmitting(false);
      setProctorSubmitting(false);
    }
  };

  const handleAutoSubmit = (reason) => {
    handleSubmit(true, reason);
  };

  // ==================== FORMAT TIME ====================
  const formatTime = (seconds) => {
    if (seconds === null || seconds === undefined) return "--:--";
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  // ==================== LOADING STATE ====================
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center space-y-4">
        <Loader className="w-10 h-10 text-purple-600 animate-spin" />
        <p className="text-gray-600 font-medium">Setting up your coding environment...</p>
      </div>
    );
  }

  // ==================== DELETED STATE ====================
  if (isDeleted) {
    return (
      <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden p-8 text-center border border-gray-100">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            <AlertTriangle className="w-10 h-10 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Assessment Unavailable</h2>
          <p className="text-gray-600 mb-6">
            This assessment is no longer available. It may have been deleted by your teacher.
          </p>
          <button 
            onClick={() => navigate(`/course/${classId}/classwork?tab=coding-round`, { replace: true })} 
            className="w-full py-3 px-4 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition-colors shadow-md cursor-pointer"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // ==================== SUBMITTED STATE ====================
  if (isSubmitted) {
    return (
      <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden p-8 text-center border border-gray-100">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Exam Submitted Successfully!</h2>
          <p className="text-gray-600 mb-2">
            Your results will be available once the teacher publishes them.
          </p>
          <div className="mt-8">
            <button 
              onClick={() => navigate(`/course/${classId}/classwork?tab=coding-round`, { replace: true })}
              className="w-full py-3 px-4 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors shadow-md shadow-green-600/20 cursor-pointer"
            >
              Go Back to Classwork
            </button>
          </div>
        </div>
      </div>
    );
  }



  // ==================== EXAM INTERFACE ====================
  const isTimeWarning = timeLeft !== null && timeLeft <= 300;
  const isTimeCritical = timeLeft !== null && timeLeft <= 60;

  return (
    <div className="h-screen bg-gray-950 flex flex-col overflow-hidden select-none">
      {/* Top Bar */}
      <div className="h-14 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Code2 className="w-5 h-5 text-purple-400" />
          <h1 className="text-white font-semibold text-sm truncate max-w-xs">
            {assessment?.title}
          </h1>
          {isFullScreen && (
            <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded-md text-xs font-medium border border-green-500/30">
              Secure Mode
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Timer */}
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono font-bold text-lg ${
              isTimeCritical
                ? "bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse"
                : isTimeWarning
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                : "bg-gray-800 text-white border border-gray-700"
            }`}
          >
            <Clock className="w-4 h-4" />
            {formatTime(timeLeft)}
          </div>

          {/* Run button */}
          <button
            onClick={handleRunPreview}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm transition-colors cursor-pointer"
          >
            <Play className="w-4 h-4" />
            Run
          </button>

          {/* Submit button */}
          <button
            onClick={handleSubmitConfirm}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold text-sm transition-colors cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Submit
          </button>
        </div>
      </div>

      {/* Main Content — Resizable 3 Panels */}
      <div
        ref={mainContainerRef}
        className="flex-1 flex overflow-hidden relative select-none"
      >
        {/* Left Panel — Problem Statement */}
        <div
          style={{
            width: isLeftCollapsed ? "44px" : `${leftWidth}px`,
            transition: isDraggingLeft ? "none" : "width 150ms ease-out",
          }}
          className="bg-gray-900 border-r border-gray-800 flex flex-col flex-shrink-0 overflow-hidden"
        >
          <div className="px-3 py-2.5 border-b border-gray-800 flex items-center justify-between flex-shrink-0 bg-gray-900/90">
            {!isLeftCollapsed && (
              <h2 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2 truncate">
                <FileCode className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                Problem Statement
              </h2>
            )}
            <button
              onClick={() => setIsLeftCollapsed(!isLeftCollapsed)}
              className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors cursor-pointer ml-auto"
              title={isLeftCollapsed ? "Expand Problem Panel" : "Collapse Problem Panel"}
            >
              {isLeftCollapsed ? (
                <ChevronRight className="w-4 h-4 text-purple-400" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>
          </div>

          {!isLeftCollapsed && (
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 custom-scrollbar">
              <div>
                <h3 className="text-white font-bold text-base mb-2">
                  {assessment?.title}
                </h3>
                <p className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">
                  {assessment?.problemStatement}
                </p>
              </div>
              {assessment?.referenceImageUrl && (
                <div>
                  <h4 className="text-gray-400 font-semibold text-xs uppercase tracking-wider mb-2">
                    Reference UI
                  </h4>
                  <div
                    className="relative group rounded-xl overflow-hidden border border-gray-700 bg-gray-800 cursor-pointer"
                    onClick={() => setIsZoomed(true)}
                  >
                    <img
                      src={assessment.referenceImageUrl}
                      alt="Reference UI"
                      className="w-full object-contain transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="bg-gray-900/80 text-white p-2 rounded-full backdrop-blur-sm">
                        <ZoomIn className="w-5 h-5" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {assessment?.requirements && (
                <div>
                  <h4 className="text-gray-400 font-semibold text-xs uppercase tracking-wider mb-2">
                    Requirements
                  </h4>
                  <p className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">
                    {assessment?.requirements}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Splitter Handle 1: Problem <-> Editor */}
        {!isLeftCollapsed && (
          <div
            onMouseDown={handleMouseDownLeft}
            className={`w-2 relative flex flex-col items-center justify-center cursor-col-resize z-20 group select-none transition-colors ${
              isDraggingLeft
                ? "bg-purple-600/60"
                : "bg-gray-900 hover:bg-purple-600/40 border-r border-l border-gray-800"
            }`}
            title="Drag to stretch/resize Problem & Code Editor"
          >
            <div className="w-1 h-8 rounded-full bg-gray-700 group-hover:bg-purple-400 transition-colors" />
          </div>
        )}

        {/* Center Panel — Code Editors */}
        <div className="flex-1 min-w-[280px] flex flex-col overflow-hidden bg-gray-950">
          {/* Editor Tabs & Controls */}
          <div className="flex items-center justify-between bg-gray-900 border-b border-gray-800 flex-shrink-0 px-2">
            <div className="flex">
              {[
                { id: "html", label: "HTML", color: "text-orange-400" },
                { id: "css", label: "CSS", color: "text-blue-400" },
                { id: "js", label: "JavaScript", color: "text-yellow-400" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2.5 text-xs font-bold transition-all cursor-pointer border-b-2 flex items-center gap-1.5 ${
                    activeTab === tab.id
                      ? `${tab.color} border-current bg-gray-800/60 shadow-inner`
                      : "text-gray-400 border-transparent hover:text-gray-200 hover:bg-gray-800/30"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 pr-2">
              <button
                onClick={handleResetPanels}
                className="px-2.5 py-1 text-[11px] font-semibold text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                title="Reset layout sizes"
              >
                <RotateCcw className="w-3 h-3" />
                Reset Layout
              </button>
            </div>
          </div>

          {/* Monaco Editor */}
          <div className="flex-1 overflow-hidden">
            {activeTab === "html" && (
              <Editor
                height="100%"
                language="html"
                theme="vs-dark"
                value={htmlCode}
                onChange={(value) => setHtmlCode(value || "")}
                options={{
                  fontSize: 14,
                  minimap: { enabled: false },
                  wordWrap: "on",
                  automaticLayout: true,
                  scrollBeyondLastLine: false,
                  tabSize: 2,
                  lineNumbers: "on",
                  renderLineHighlight: "line",
                  padding: { top: 10 },
                  scrollbar: {
                    vertical: "visible",
                    horizontal: "visible",
                    verticalScrollbarSize: 8,
                    horizontalScrollbarSize: 8,
                    useShadows: false,
                    verticalHasArrows: false,
                    horizontalHasArrows: false,
                  },
                }}
              />
            )}
            {activeTab === "css" && (
              <Editor
                height="100%"
                language="css"
                theme="vs-dark"
                value={cssCode}
                onChange={(value) => setCssCode(value || "")}
                options={{
                  fontSize: 14,
                  minimap: { enabled: false },
                  wordWrap: "on",
                  automaticLayout: true,
                  scrollBeyondLastLine: false,
                  tabSize: 2,
                  lineNumbers: "on",
                  renderLineHighlight: "line",
                  padding: { top: 10 },
                  scrollbar: {
                    vertical: "visible",
                    horizontal: "visible",
                    verticalScrollbarSize: 8,
                    horizontalScrollbarSize: 8,
                    useShadows: false,
                    verticalHasArrows: false,
                    horizontalHasArrows: false,
                  },
                }}
              />
            )}
            {activeTab === "js" && (
              <Editor
                height="100%"
                language="javascript"
                theme="vs-dark"
                value={jsCode}
                onChange={(value) => setJsCode(value || "")}
                options={{
                  fontSize: 14,
                  minimap: { enabled: false },
                  wordWrap: "on",
                  automaticLayout: true,
                  scrollBeyondLastLine: false,
                  tabSize: 2,
                  lineNumbers: "on",
                  renderLineHighlight: "line",
                  padding: { top: 10 },
                  scrollbar: {
                    vertical: "visible",
                    horizontal: "visible",
                    verticalScrollbarSize: 8,
                    horizontalScrollbarSize: 8,
                    useShadows: false,
                    verticalHasArrows: false,
                    horizontalHasArrows: false,
                  },
                }}
              />
            )}
          </div>
        </div>

        {/* Splitter Handle 2: Editor <-> Preview */}
        {showPreview && (
          <div
            onMouseDown={handleMouseDownRight}
            className={`w-2 relative flex flex-col items-center justify-center cursor-col-resize z-20 group select-none transition-colors ${
              isDraggingRight
                ? "bg-purple-600/60"
                : "bg-gray-900 hover:bg-purple-600/40 border-r border-l border-gray-800"
            }`}
            title="Drag to stretch/resize Code Editor & Live Preview"
          >
            <div className="w-1 h-8 rounded-full bg-gray-700 group-hover:bg-purple-400 transition-colors" />
          </div>
        )}

        {/* Right Panel — Preview */}
        {showPreview && (
          <div
            style={{ width: `${rightWidth}px` }}
            className="bg-white border-l border-gray-800 flex flex-col flex-shrink-0 overflow-hidden min-w-[220px]"
          >
            <div className="px-4 py-2.5 bg-gray-900 border-b border-gray-800 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-bold text-gray-200 uppercase tracking-wider">
                  Live Preview
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleRunPreview}
                  className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors cursor-pointer"
                  title="Refresh Preview"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setShowPreview(false)}
                  className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors cursor-pointer"
                  title="Close Preview"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <iframe
              srcDoc={previewDoc}
              title="Live Preview"
              className={`flex-1 w-full border-0 ${
                isDraggingLeft || isDraggingRight ? "pointer-events-none" : ""
              }`}
              sandbox="allow-scripts"
            />
          </div>
        )}

        {/* Preview Toggle (when hidden) */}
        {!showPreview && (
          <button
            onClick={handleRunPreview}
            className="w-10 bg-gray-900 border-l border-gray-800 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 transition-colors cursor-pointer flex-shrink-0"
            title="Open Live Preview"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Full Screen Mode Required Overlay (on refresh / exit fullscreen) */}
      {hasStarted && !isFullScreen && !isSubmitted && !isSubmitting && !showViolationAlert && resumeCount <= 4 && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[9990] flex items-center justify-center p-4 animate-in fade-in duration-200 select-none">
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 max-w-md w-full text-center space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-20 h-20 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center mx-auto shadow-sm">
              <Maximize2 className="w-10 h-10" />
            </div>
            <div>
              <span className="inline-block px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2 bg-indigo-50 text-indigo-700 border border-indigo-200">
                FULL-SCREEN MODE REQUIRED
              </span>
              <h3 className="text-xl font-bold text-slate-900 mt-1">Full Screen Mode Disconnected</h3>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                You must remain in full-screen mode for proctoring while completing your coding assessment. Click below to return to full-screen mode.
              </p>
            </div>
            <button
              onClick={() => enterFullScreen()}
              className="w-full py-3.5 px-6 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold rounded-xl shadow-md shadow-indigo-200 active:scale-[0.98] transition-all text-sm cursor-pointer flex items-center justify-center gap-2"
            >
              <Maximize2 className="w-4 h-4" />
              <span>Enter Full Screen & Continue Exam</span>
            </button>
          </div>
        </div>
      )}

      {/* Maximum Refreshes Exceeded Overlay Modal */}
      {resumeCount > 4 && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[10000] flex items-center justify-center p-4 select-none">
          <div className="bg-white border border-red-200 p-8 rounded-3xl max-w-md w-full text-center space-y-5 shadow-2xl animate-in zoom-in-95">
            <div className="w-20 h-20 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto border border-red-200 shadow-sm">
              <AlertTriangle className="w-10 h-10 animate-bounce" />
            </div>
            <div>
              <span className="inline-block px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2 bg-red-50 text-red-700 border border-red-200">
                PROCTORING VIOLATION
              </span>
              <h3 className="text-xl font-bold text-slate-900">Maximum Refreshes Exceeded</h3>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                You have refreshed or re-opened the page more than 4 times. Your coding assessment is being automatically submitted.
              </p>
            </div>
            <div className="pt-2">
              <div className="inline-flex items-center gap-2.5 px-5 py-3 bg-red-50 text-red-700 rounded-xl text-sm font-semibold border border-red-200">
                <Loader className="w-4 h-4 animate-spin text-red-600" />
                <span>Auto-Submitting Assessment...</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Violation Alert Modal */}
      <ViolationAlertModal
        show={showViolationAlert}
        message={violationMessage}
        violationCount={violations?.length || 0}
        maxViolations={4}
        onOk={handleViolationAlertOk}
      />

      {/* Toast Notification */}
      {toast.show && (
        <ToastNotification
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ show: false, message: "", type: "success" })}
        />
      )}

      {/* Manual Submission Warning Modal */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl flex flex-col items-center text-center animate-in fade-in zoom-in duration-200 z-10 relative">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 bg-green-100 text-green-600">
              <CheckCircle className="w-8 h-8" />
            </div>
            
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Submit Entire Exam?
            </h3>
            
            <p className="text-gray-600 mb-6 text-sm leading-relaxed">
              Are you sure you want to submit the exam? Once submitted, you cannot change your answers.
            </p>
            
            <div className="flex gap-3 w-full">
              <button
                onClick={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
                className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => confirmDialog.onConfirm()}
                disabled={isSubmitting}
                className={`flex-1 px-4 py-2.5 font-bold rounded-xl transition-colors text-white flex justify-center items-center gap-2 ${
                  isSubmitting ? 'bg-green-600/70 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 cursor-pointer'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    <span>Please wait...</span>
                  </>
                ) : (
                  "Yes, Submit Exam"
                )}
              </button>
            </div>
          </div>
          {/* Backdrop click handler */}
          <div 
            className="absolute inset-0 z-0" 
            onClick={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
          />
        </div>
      )}

      {/* Auto-Submitting Overlay Warning */}
      {isSubmitting && !confirmDialog.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[10000] flex items-center justify-center p-4 select-none">
          <div className="bg-white border border-indigo-100 p-8 rounded-3xl max-w-md w-full text-center space-y-6 shadow-2xl animate-in zoom-in-95">
            <div className="w-20 h-20 bg-indigo-50 border border-indigo-200 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
              <Loader className="w-10 h-10 animate-spin" />
            </div>
            <div>
              <span className="inline-block px-3.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
                FINAL SUBMISSION IN PROGRESS
              </span>
              <h3 className="text-xl font-bold text-slate-900">Submitting Assessment</h3>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                Saving your HTML, CSS, and JavaScript solutions securely to the server...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Reference Image Zoom Modal */}
      {isZoomed && assessment?.referenceImageUrl && (
        <div 
          className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setIsZoomed(false)}
        >
          <button
            className="absolute top-6 right-6 text-white/70 hover:text-white p-2 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-md transition-colors"
            onClick={() => setIsZoomed(false)}
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={assessment.referenceImageUrl}
            alt="Reference UI Fullscreen"
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
