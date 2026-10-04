// FrontendStudent/src/Pages/StudentClasswork.jsx
import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  useOutletContext,
  useParams,
  useSearchParams,
  useNavigate,
} from "react-router-dom";
import {
  FileText,
  Target,
  Code2,
  ClipboardList,
  BookOpen,
  Loader,
  Clock,
  CheckCircle,
  AlertCircle,
  Play,
  Eye,
  Download,
  MoreVertical,
  Upload,
  HelpCircle,
  X,
  FileCode,
  Shield,
  Info,
} from "lucide-react";
import axios from "axios";
import API_BASE_URL from "../config";
import PdfPreview from "../components/PdfPreview";
import { getActiveQuizzes, checkSubmission as checkQuizSubmission } from "../api/quizApi";
import QuizTakingModal from "../components/QuizTakingModal";
import QuizResultModal from "../components/QuizResultModal";
import { getActiveAssignments, checkSubmission as checkAssignmentSubmission, submitAssignmentPDF } from "../api/assignmentApi";
import TakeAssignmentModal from "../components/TakeAssignmentModal";
import AssignmentResultModal from "../components/AssignmentResultModal";
import { getActiveTestPapers, checkSubmission as checkTestSubmission } from "../api/testApi";
import TakeTestModal from "../components/TakeTestModal";
import TestResultModal from "../components/TestResultModal";
import { getActiveCodingAssessments } from "../api/codingAssessmentApi";
import { autosaveQuiz, submitQuiz } from "../api/quizApi";

const TABS = [
  { id: "all", label: "All", icon: null },
  { id: "notes", label: "Notes", icon: FileText },
  { id: "quiz", label: "Assessments", icon: Target },
  { id: "assignment", label: "Assignments", icon: ClipboardList },
  { id: "test", label: "Tests", icon: BookOpen },
  { id: "coding-round", label: "Coding", icon: Code2 },
];

// ────────── Time helpers ──────────
function timeAgo(dateString) {
  if (!dateString) return "";
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function StudentClasswork() {
  const { id: classId } = useParams();
  const { classInfo } = useOutletContext();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const scrollRef = useRef(null);

  const activeTab = searchParams.get("tab") || "all";

  // ─── Notes state ───
  const [notes, setNotes] = useState([]);
  const [notesLoading, setNotesLoading] = useState(true);
  const [previewNote, setPreviewNote] = useState(null);

  // ─── Quiz state ───
  const [quizzes, setQuizzes] = useState([]);
  const [quizzesLoading, setQuizzesLoading] = useState(true);
  const [quizSubmissions, setQuizSubmissions] = useState({});
  const [selectedQuiz, setSelectedQuiz] = useState(() => {
    try {
      const saved = localStorage.getItem("activeQuiz");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.endTime && new Date() > new Date(parsed.endTime)) return null;
        return parsed;
      }
    } catch { localStorage.removeItem("activeQuiz"); }
    return null;
  });
  const [showQuizTaking, setShowQuizTaking] = useState(() => {
    try {
      const saved = localStorage.getItem("activeQuiz");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.endTime && new Date() > new Date(parsed.endTime)) return false;
        return true;
      }
    } catch {}
    return false;
  });
  const [showQuizResult, setShowQuizResult] = useState(false);

  // ─── Assignment state ───
  const [assignments, setAssignments] = useState([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(true);
  const [assignmentSubmissions, setAssignmentSubmissions] = useState({});
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [showAssignTaking, setShowAssignTaking] = useState(false);
  const [showAssignResult, setShowAssignResult] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileError, setFileError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [showQuestionsModal, setShowQuestionsModal] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState(null);

  // ─── Test state ───
  const [testPapers, setTestPapers] = useState([]);
  const [testsLoading, setTestsLoading] = useState(true);
  const [testSubmissions, setTestSubmissions] = useState({});
  const [selectedTest, setSelectedTest] = useState(() => {
    const saved = localStorage.getItem("activeTest");
    return saved ? JSON.parse(saved) : null;
  });
  const [showTestTaking, setShowTestTaking] = useState(() => !!localStorage.getItem("activeTest"));
  const [showTestResult, setShowTestResult] = useState(false);

  // ─── Coding state ───
  const [codingAssessments, setCodingAssessments] = useState([]);
  const [codingLoading, setCodingLoading] = useState(true);
  const [showInstructionModal, setShowInstructionModal] = useState(false);
  const [selectedCoding, setSelectedCoding] = useState(null);

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (!e.target.closest(".dropdown-container")) setOpenDropdownId(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ─── Fetch all data ───
  useEffect(() => { fetchNotes(); }, [classId]);
  useEffect(() => { fetchQuizzes(); }, [classId]);
  useEffect(() => { fetchAssignments(); }, [classId]);
  useEffect(() => { fetchTestPapers(); }, [classId]);
  useEffect(() => { fetchCoding(); }, [classId]);

  const fetchNotes = async () => {
    try {
      setNotesLoading(true);
      const res = await axios.get(`${API_BASE_URL}/notes/classroom/${classId}`);
      setNotes(res.data.notes || []);
    } catch (err) { console.error("Error fetching notes:", err); }
    finally { setNotesLoading(false); }
  };

  const fetchQuizzes = async () => {
    try {
      setQuizzesLoading(true);
      const res = await getActiveQuizzes(classId);
      const quizzesData = res.quizzes || [];

      const checks = await Promise.allSettled(
        quizzesData.map((q) => checkQuizSubmission(q._id, classInfo.studentId))
      );
      const map = {};
      quizzesData.forEach((q, i) => {
        map[q._id] = checks[i].status === "fulfilled" ? checks[i].value?.hasSubmitted : false;
      });

      // Handle expired drafts auto-submit (same logic as original Quiz.jsx)
      let needsRefresh = false;
      for (const quiz of quizzesData) {
        if (!map[quiz._id]) {
          let isExpired = quiz.quizStatus === 'expired' || (quiz.endTime && new Date() > new Date(quiz.endTime));
          if (!isExpired && quiz.duration) {
            const startTimeStr = localStorage.getItem(`quiz_start_time_${quiz._id}`);
            if (startTimeStr) {
              const elapsedMs = Date.now() - parseInt(startTimeStr);
              if (elapsedMs > quiz.duration * 60000) isExpired = true;
            }
          }
          if (isExpired) {
            const draft = localStorage.getItem(`quiz_draft_${quiz._id}`);
            const layout = localStorage.getItem(`quiz_layout_${quiz._id}`);
            if (draft && layout) {
              let answersArray = [];
              try {
                const parsedDraft = JSON.parse(draft);
                const parsedLayout = JSON.parse(layout);
                const allQuestions = parsedLayout.sections?.length > 0
                  ? parsedLayout.sections.flatMap(s => s.questions || [])
                  : (parsedLayout.questions || []);
                answersArray = allQuestions.map(q => {
                  const a = parsedDraft[q._id];
                  if (q.type === 'coding' || a?.type === 'coding') {
                    return { questionId: q._id, type: 'coding', code: a?.code || '', language: a?.language || 'javascript' };
                  }
                  return { questionId: q._id, type: 'mcq', selectedAnswer: a?.selectedAnswer || (typeof a === 'string' ? a : '') };
                });
                await submitQuiz(quiz._id, classInfo.studentId, answersArray);
              } catch (error) {
                if (error.response?.status === 403 || error.response?.status === 400) {
                  try { await autosaveQuiz(quiz._id, classInfo.studentId, answersArray); } catch {}
                }
              } finally {
                localStorage.removeItem(`quiz_draft_${quiz._id}`);
                localStorage.removeItem(`quiz_layout_${quiz._id}`);
                localStorage.removeItem(`quiz_start_time_${quiz._id}`);
                localStorage.removeItem(`quiz_refresh_count_${quiz._id}`);
                const active = localStorage.getItem('activeQuiz');
                if (active) {
                  try {
                    if (JSON.parse(active)._id === quiz._id) {
                      localStorage.removeItem('activeQuiz');
                      setShowQuizTaking(false);
                      setSelectedQuiz(null);
                    }
                  } catch {}
                }
                needsRefresh = true;
              }
            }
          }
        }
      }
      if (needsRefresh) return fetchQuizzes();

      // Check if active quiz was deleted
      const activeStr = localStorage.getItem('activeQuiz');
      if (activeStr) {
        try {
          const activeQ = JSON.parse(activeStr);
          if (!quizzesData.some(q => q._id === activeQ._id)) {
            // Quiz was deleted, clean up
            localStorage.removeItem('activeQuiz');
            localStorage.removeItem(`quiz_start_time_${activeQ._id}`);
            localStorage.removeItem(`quiz_layout_${activeQ._id}`);
            localStorage.removeItem(`quiz_draft_${activeQ._id}`);
            localStorage.removeItem(`quiz_refresh_count_${activeQ._id}`);
            localStorage.removeItem(`quiz_selected_language_${activeQ._id}`);
            setShowQuizTaking(false);
            setSelectedQuiz(null);
          }
        } catch (e) {}
      }

      setQuizzes(quizzesData);
      setQuizSubmissions(map);
    } catch (err) { console.error("Error fetching quizzes:", err); }
    finally { setQuizzesLoading(false); }
  };

  const fetchAssignments = async () => {
    try {
      setAssignmentsLoading(true);
      const res = await getActiveAssignments(classId);
      const data = res.assignments || [];
      const checks = await Promise.all(
        data.map((a) => checkAssignmentSubmission(a._id, classInfo.studentId))
      );
      const map = {};
      data.forEach((a, i) => {
        map[a._id] = { hasSubmitted: checks[i].hasSubmitted, status: checks[i].status };
      });
      setAssignments(data);
      setAssignmentSubmissions(map);
    } catch (err) { console.error("Error fetching assignments:", err); }
    finally { setAssignmentsLoading(false); }
  };

  const fetchTestPapers = async () => {
    try {
      setTestsLoading(true);
      const res = await getActiveTestPapers(classId);
      const data = res.testPapers || [];
      const checks = await Promise.all(
        data.map((t) => checkTestSubmission(t._id, classInfo.studentId))
      );
      const map = {};
      data.forEach((t, i) => {
        map[t._id] = { hasSubmitted: checks[i].hasSubmitted, status: checks[i].status };
      });
      setTestPapers(data);
      setTestSubmissions(map);
    } catch (err) { console.error("Error fetching tests:", err); }
    finally { setTestsLoading(false); }
  };

  const fetchCoding = async () => {
    try {
      setCodingLoading(true);
      const res = await getActiveCodingAssessments(classId);
      setCodingAssessments(res.assessments || []);
    } catch (err) { console.error("Error fetching coding:", err); }
    finally { setCodingLoading(false); }
  };

  // ─── Tab switching ───
  const setTab = (tabId) => {
    setSearchParams({ tab: tabId });
  };

  // ─── Status helpers ───
  const getQuizStatus = (quiz) => {
    if (quizSubmissions[quiz._id]) return { text: "Completed", color: "bg-green-50 text-green-700 border-green-100", icon: CheckCircle };
    if (quiz.endTime && currentTime > new Date(quiz.endTime)) return { text: "Expired", color: "bg-red-50 text-red-600 border-red-100", icon: AlertCircle };
    if (quiz.startTime && currentTime < new Date(quiz.startTime)) return { text: "Upcoming", color: "bg-blue-50 text-blue-600 border-blue-100", icon: Clock };
    if (quiz.quizStatus === "expired" && !quiz.endTime) return { text: "Expired", color: "bg-red-50 text-red-600 border-red-100", icon: AlertCircle };
    if (quiz.quizStatus === "upcoming" && !quiz.startTime) return { text: "Upcoming", color: "bg-blue-50 text-blue-600 border-blue-100", icon: Clock };
    return { text: "Active", color: "bg-purple-50 text-purple-700 border-purple-100", icon: Play };
  };

  const getAssignmentStatus = (assignment) => {
    const sub = assignmentSubmissions[assignment._id];
    if (sub?.hasSubmitted) {
      return sub.status === "checked"
        ? { text: "Completed", color: "bg-green-50 text-green-700 border-green-100", icon: CheckCircle }
        : { text: "Pending", color: "bg-yellow-50 text-yellow-700 border-yellow-100", icon: Clock };
    }
    if (!assignment.isActive) return { text: "Expired", color: "bg-red-50 text-red-600 border-red-100", icon: AlertCircle };
    if (assignment.dueDate && new Date() > new Date(assignment.dueDate)) return { text: "Overdue", color: "bg-red-50 text-red-600 border-red-100", icon: AlertCircle };
    return { text: "Active", color: "bg-purple-50 text-purple-700 border-purple-100", icon: Play };
  };

  const getTestStatus = (test) => {
    const sub = testSubmissions[test._id];
    if (sub?.hasSubmitted) {
      return sub.status === "checked"
        ? { text: "Completed", color: "bg-green-50 text-green-700 border-green-100", icon: CheckCircle }
        : { text: "Pending", color: "bg-yellow-50 text-yellow-700 border-yellow-100", icon: Clock };
    }
    if (!test.isActive) return { text: "Expired", color: "bg-red-50 text-red-600 border-red-100", icon: AlertCircle };
    if (test.startTime && currentTime < new Date(test.startTime)) return { text: "Upcoming", color: "bg-blue-50 text-blue-600 border-blue-100", icon: Clock };
    return { text: "Active", color: "bg-purple-50 text-purple-700 border-purple-100", icon: Play };
  };

  const getCodingStatus = (a) => {
    if (a.alreadySubmitted) return { text: "Submitted", color: "bg-green-50 text-green-700 border-green-100", icon: CheckCircle };
    if (a.endTime && new Date() > new Date(a.endTime)) return { text: "Expired", color: "bg-red-50 text-red-600 border-red-100", icon: AlertCircle };
    if (a.startTime && new Date() < new Date(a.startTime)) return { text: "Upcoming", color: "bg-blue-50 text-blue-600 border-blue-100", icon: Clock };
    return { text: "Active", color: "bg-purple-50 text-purple-700 border-purple-100", icon: Play };
  };

  const getRemainingTime = (endTime) => {
    if (!endTime) return null;
    const diff = new Date(endTime) - currentTime;
    if (diff <= 0) return "Expired";
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    if (h > 24) return `${Math.floor(h / 24)}d left`;
    if (h > 0) return `${h}h ${m}m left`;
    return `${m}m left`;
  };

  const getTotalQuestions = (quiz) => {
    if (quiz.sections?.length > 0) return quiz.sections.reduce((a, s) => a + (s.questions?.length || 0), 0);
    return quiz.questions?.length || 0;
  };

  // ─── Action handlers (preserved from originals) ───
  const handleNotePreview = (note) => {
    const isWord = note.mimetype === "application/msword" || note.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || note.title?.toLowerCase().match(/\.(doc|docx)$/);
    const isExcel = note.mimetype === "application/vnd.ms-excel" || note.mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" || note.title?.toLowerCase().match(/\.(xls|xlsx)$/);
    if (isWord) {
      const url = note.fileUrl || `${API_BASE_URL}/notes/file/${note.fileId}`;
      window.open(`https://docs.google.com/viewer?url=${encodeURIComponent(url)}`, "_blank");
    } else if (isExcel) {
      const url = note.fileUrl || `${API_BASE_URL}/notes/file/${note.fileId}`;
      window.open(`https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(url)}`, "_blank");
    } else {
      setPreviewNote(note);
    }
  };

  const handleNoteDownload = (note) => {
    window.open(note.fileUrl || `${API_BASE_URL}/notes/file/${note.fileId}`, "_blank");
  };

  const handleTakeQuiz = (quiz) => {
    setSelectedQuiz(quiz);
    setShowQuizTaking(true);
    localStorage.setItem("activeQuiz", JSON.stringify(quiz));
  };

  const handleQuizSubmitted = () => {
    setShowQuizTaking(false);
    setSelectedQuiz(null);
    localStorage.removeItem("activeQuiz");
    fetchQuizzes();
  };

  const handleViewQuizResult = (quiz) => {
    setSelectedQuiz(quiz);
    setShowQuizResult(true);
  };

  const handleTakeAssignment = (a) => { setSelectedAssignment(a); setShowAssignTaking(true); };
  const handleOpenQuestions = (a) => { setSelectedAssignment(a); setShowQuestionsModal(true); };
  const handleViewAssignmentResult = (a) => { setSelectedAssignment(a); setShowAssignResult(true); };
  const handleUploadPDF = (a) => { setSelectedAssignment(a); setSelectedFile(null); setFileError(""); setShowUploadModal(true); };
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type !== "application/pdf") { setFileError("Please select a valid PDF file."); setSelectedFile(null); return; }
    if (file.size > 4 * 1024 * 1024) { setFileError("File too large. Maximum size is 4MB."); setSelectedFile(null); return; }
    setFileError(""); setSelectedFile(file);
  };
  const handlePDFSubmit = async () => {
    if (!selectedFile || !selectedAssignment) return;
    try {
      setUploading(true);
      await submitAssignmentPDF(selectedAssignment._id, classInfo.studentId, selectedFile);
      setShowUploadModal(false); setSelectedFile(null); setSelectedAssignment(null);
      fetchAssignments();
    } catch (err) {
      setFileError(err.response?.data?.error || "Failed to upload PDF.");
    } finally { setUploading(false); }
  };
  const handleAssignmentSubmitted = () => {
    setShowAssignTaking(false); setSelectedAssignment(null); fetchAssignments();
  };

  const handleTakeTest = (t) => { setSelectedTest(t); setShowTestTaking(true); localStorage.setItem("activeTest", JSON.stringify(t)); };
  const handleViewTestResult = (t) => { setSelectedTest(t); setShowTestResult(true); };
  const handleTestSubmitted = () => {
    setShowTestTaking(false); setSelectedTest(null); localStorage.removeItem("activeTest"); fetchTestPapers();
  };

  const [isStartingCoding, setIsStartingCoding] = useState(false);

  const handleStartCoding = (a) => { setSelectedCoding(a); setShowInstructionModal(true); };
  const handleConfirmCoding = () => {
    if (!selectedCoding) return;
    setIsStartingCoding(true);
    setTimeout(() => {
      const id = selectedCoding._id;
      setShowInstructionModal(false); setSelectedCoding(null);
      setIsStartingCoding(false);
      navigate(`/coding-round/${classId}/${id}`);
    }, 800);
  };

  // ─── Loading ───
  const isLoading = notesLoading || quizzesLoading || assignmentsLoading || testsLoading || codingLoading;

  // ─── Build unified items for "All" tab ───
  const allItems = useMemo(() => {
    if (activeTab !== "all") return [];
    const items = [];
    notes.forEach((n) => items.push({ type: "note", data: n, date: n.createdAt }));
    quizzes.forEach((q) => items.push({ type: "quiz", data: q, date: q.createdAt || q.startTime }));
    assignments.forEach((a) => items.push({ type: "assignment", data: a, date: a.createdAt }));
    testPapers.forEach((t) => items.push({ type: "test", data: t, date: t.createdAt || t.startTime }));
    codingAssessments.forEach((c) => items.push({ type: "coding", data: c, date: c.createdAt || c.startTime }));
    items.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    return items;
  }, [activeTab, notes, quizzes, assignments, testPapers, codingAssessments]);

  // ─── Render individual item row ───
  const renderItemRow = (type, data, isAllTab = false) => {
    const handleAllTabClick = () => {
      if (isAllTab) {
        const tabMap = {
          note: "notes",
          quiz: "quiz",
          assignment: "assignment",
          test: "test",
          coding: "coding-round"
        };
        setTab(tabMap[type] || "all");
      }
    };

    const containerProps = isAllTab ? {
      className: "classwork-item group cursor-pointer hover:bg-gray-50",
      onClick: handleAllTabClick
    } : {
      className: "classwork-item group"
    };

    switch (type) {
      case "note":
        return (
          <div key={`note-${data._id}`} {...containerProps}>
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div className="classwork-icon bg-purple-50">
                <FileText className="w-6 h-6 text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-semibold text-gray-900 truncate">{data.title}</p>
                <p className="text-sm text-gray-500 mt-0.5">
                  {data.uploadedBy && <span>By {data.uploadedBy} • </span>}
                  {timeAgo(data.createdAt)}
                </p>
              </div>
            </div>
            {!isAllTab && (
              <div className="flex items-center gap-2">
                <button onClick={() => handleNotePreview(data)} className="classwork-action-btn" title="Preview">
                  <Eye className="w-5 h-5" />
                </button>
                <button onClick={() => handleNoteDownload(data)} className="classwork-action-btn" title="Download">
                  <Download className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        );

      case "quiz": {
        const status = getQuizStatus(data);
        const StatusIcon = status.icon;
        const submitted = quizSubmissions[data._id];
        const isExpired = status.text === "Expired";
        const isUpcoming = status.text === "Upcoming";
        const canTake = !submitted && !isExpired && !isUpcoming;
        const totalQ = getTotalQuestions(data);
        return (
          <div key={`quiz-${data._id}`} {...containerProps}>
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div className="classwork-icon bg-amber-50">
                <Target className="w-6 h-6 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <p className="text-base font-semibold text-gray-900 truncate">{data.title}</p>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${status.color}`}>
                    <StatusIcon className="w-3.5 h-3.5" /> {status.text}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {totalQ} Questions{data.duration ? ` • ${data.duration} min` : ""}
                  {data.endTime && !isExpired ? ` • ${getRemainingTime(data.endTime)}` : ""}
                </p>
              </div>
            </div>
            {!isAllTab && (
              <div>
                {submitted ? (
                  <button onClick={() => handleViewQuizResult(data)} className="classwork-btn-green">
                    <Eye className="w-4 h-4" /> Result
                  </button>
                ) : canTake ? (
                  <button
                    onClick={async () => {
                      if (!data.questions) {
                        try {
                          const res = await getActiveQuizzes(classId);
                          const updated = res.quizzes.find((q) => q._id === data._id);
                          if (updated?.questions) handleTakeQuiz(updated);
                          else alert("Assessment is not active yet.");
                        } catch {}
                      } else {
                        handleTakeQuiz(data);
                      }
                    }}
                    className="classwork-btn-primary"
                  >
                    <Play className="w-4 h-4" /> Start
                  </button>
                ) : isUpcoming ? (
                  <span className="classwork-btn-disabled">Soon</span>
                ) : (
                  <span className="classwork-btn-disabled">Expired</span>
                )}
              </div>
            )}
          </div>
        );
      }

      case "assignment": {
        const status = getAssignmentStatus(data);
        const StatusIcon = status.icon;
        const sub = assignmentSubmissions[data._id];
        const isExpired = !data.isActive || (data.dueDate && new Date() > new Date(data.dueDate));
        const canTake = !sub?.hasSubmitted && !isExpired;
        return (
          <div key={`assign-${data._id}`} {...containerProps}>
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div className="classwork-icon bg-emerald-50">
                <ClipboardList className="w-6 h-6 text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <p className="text-base font-semibold text-gray-900 truncate">{data.title}</p>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${status.color}`}>
                    <StatusIcon className="w-3.5 h-3.5" /> {status.text}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {data.questions?.length || 0} Questions • {data.totalMarks || 0} Marks
                  {data.dueDate && !isExpired && (
                    <span> • Due {new Date(data.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                  )}
                </p>
              </div>
            </div>
            {!isAllTab && (
              <div className="relative">
                {sub?.hasSubmitted ? (
                  sub.status === "checked" ? (
                    <button onClick={() => handleViewAssignmentResult(data)} className="classwork-btn-green">
                      <Eye className="w-4 h-4" /> Result
                    </button>
                  ) : (
                    <span className="classwork-btn-disabled"><Clock className="w-4 h-4" /> Pending</span>
                  )
                ) : canTake ? (
                  <div className="flex items-center gap-2 dropdown-container">
                    <button onClick={() => handleOpenQuestions(data)} className="classwork-btn-primary">
                      <HelpCircle className="w-4 h-4" /> View
                    </button>
                    <button
                      onClick={() => setOpenDropdownId(openDropdownId === data._id ? null : data._id)}
                      className="p-2 rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>
                    {openDropdownId === data._id && (
                      <div className="absolute right-0 bottom-full mb-1 w-44 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-1 overflow-hidden">
                        <button onClick={() => { setOpenDropdownId(null); handleTakeAssignment(data); }} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 cursor-pointer">
                          <Play className="w-4 h-4 text-purple-600" /> Start Online
                        </button>
                        <button onClick={() => { setOpenDropdownId(null); handleUploadPDF(data); }} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 cursor-pointer">
                          <Upload className="w-4 h-4 text-purple-600" /> Upload PDF
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="classwork-btn-disabled">Expired</span>
                )}
              </div>
            )}
          </div>
        );
      }

      case "test": {
        const status = getTestStatus(data);
        const StatusIcon = status.icon;
        const sub = testSubmissions[data._id];
        const isExpired = !data.isActive || (data.endTime && new Date() > new Date(data.endTime));
        const canTake = !sub?.hasSubmitted && !isExpired;
        return (
          <div key={`test-${data._id}`} {...containerProps}>
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div className="classwork-icon bg-blue-50">
                <BookOpen className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <p className="text-base font-semibold text-gray-900 truncate">{data.title}</p>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${status.color}`}>
                    <StatusIcon className="w-3.5 h-3.5" /> {status.text}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {data.questions?.length || 0} Questions • {data.totalMarks || 0} Marks
                  {data.duration ? ` • ${data.duration} min` : ""}
                  {data.endTime && !isExpired ? ` • ${getRemainingTime(data.endTime)}` : ""}
                </p>
              </div>
            </div>
            {!isAllTab && (
              <div>
                {sub?.hasSubmitted ? (
                  sub.status === "checked" ? (
                    <button onClick={() => handleViewTestResult(data)} className="classwork-btn-green">
                      <Eye className="w-4 h-4" /> Result
                    </button>
                  ) : (
                    <span className="classwork-btn-disabled"><Clock className="w-4 h-4" /> Pending</span>
                  )
                ) : canTake ? (
                  <button onClick={() => handleTakeTest(data)} className="classwork-btn-primary">
                    <Play className="w-4 h-4" /> Start
                  </button>
                ) : (
                  <span className="classwork-btn-disabled">Expired</span>
                )}
              </div>
            )}
          </div>
        );
      }

      case "coding": {
        const status = getCodingStatus(data);
        const StatusIcon = status.icon;
        const isExpired = data.endTime && new Date() > new Date(data.endTime);
        const canTake = !data.alreadySubmitted && !isExpired;
        return (
          <div key={`coding-${data._id}`} {...containerProps}>
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div className="classwork-icon bg-violet-50">
                <Code2 className="w-6 h-6 text-violet-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <p className="text-base font-semibold text-gray-900 truncate">{data.title}</p>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${status.color}`}>
                    <StatusIcon className="w-3.5 h-3.5" /> {status.text}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  HTML+CSS+JS{data.duration ? ` • ${data.duration} min` : ""}
                  {data.endTime && !isExpired ? ` • ${getRemainingTime(data.endTime)}` : ""}
                </p>
              </div>
            </div>
            {!isAllTab && (
              <div>
                {data.alreadySubmitted ? (
                  <span className="classwork-btn-disabled"><CheckCircle className="w-4 h-4" /> Done</span>
                ) : canTake ? (
                  <button onClick={() => handleStartCoding(data)} className="classwork-btn-primary">
                    <Play className="w-4 h-4" /> Start
                  </button>
                ) : (
                  <span className="classwork-btn-disabled">Expired</span>
                )}
              </div>
            )}
          </div>
        );
      }
      default: return null;
    }
  };

  const renderSkeletonRow = () => (
    <div className="classwork-item flex items-center justify-between animate-pulse">
      <div className="flex items-center gap-4 flex-1">
        <div className="classwork-icon bg-gray-200 flex-shrink-0" />
        <div className="flex-1 space-y-2.5">
          <div className="h-4 bg-gray-200 rounded w-1/3" />
          <div className="h-3 bg-gray-200 rounded w-1/5" />
        </div>
      </div>
      <div className="w-20 h-9 bg-gray-200 rounded-lg" />
    </div>
  );

  const renderSkeletons = () => (
    <div className="space-y-4">
      {[1, 2, 3].map(i => <React.Fragment key={i}>{renderSkeletonRow()}</React.Fragment>)}
    </div>
  );

  // ─── Render content for active tab ───
  const renderTabContent = () => {
    if (isLoading) {
      return renderSkeletons();
    }

    if (activeTab === "all") {
      if (allItems.length === 0) return renderEmpty("No classwork available", "Your teacher hasn't added any content yet.");
      return <div className="classwork-list space-y-4">{allItems.map((item) => renderItemRow(item.type, item.data, true))}</div>;
    }

    if (activeTab === "notes") {
      if (notesLoading) return renderSkeletons();
      if (notes.length === 0) return renderEmpty("No notes yet", "Your teacher hasn't uploaded any notes.");
      return <div className="classwork-list space-y-4">{notes.map((n) => renderItemRow("note", n))}</div>;
    }

    if (activeTab === "quiz") {
      if (quizzesLoading) return renderSkeletons();
      if (quizzes.length === 0) return renderEmpty("No assessments", "Your teacher hasn't published any assessments yet.");
      return <div className="classwork-list space-y-4">{quizzes.map((q) => renderItemRow("quiz", q))}</div>;
    }

    if (activeTab === "assignment") {
      if (assignmentsLoading) return renderSkeletons();
      if (assignments.length === 0) return renderEmpty("No assignments", "Your teacher hasn't published any assignments yet.");
      return <div className="classwork-list space-y-4">{assignments.map((a) => renderItemRow("assignment", a))}</div>;
    }

    if (activeTab === "test") {
      if (testsLoading) return renderSkeletons();
      if (testPapers.length === 0) return renderEmpty("No test papers", "Your teacher hasn't published any test papers yet.");
      return <div className="classwork-list space-y-4">{testPapers.map((t) => renderItemRow("test", t))}</div>;
    }

    if (activeTab === "coding-round") {
      if (codingLoading) return renderSkeletons();
      if (codingAssessments.length === 0) return renderEmpty("No coding rounds", "Your teacher hasn't published any coding rounds yet.");
      return <div className="classwork-list space-y-4">{codingAssessments.map((c) => renderItemRow("coding", c))}</div>;
    }
  };

  const renderEmpty = (title, subtitle) => (
    <div className="text-center py-12">
      <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center mx-auto mb-3 border border-gray-100">
        <FileText className="w-6 h-6 text-gray-300" />
      </div>
      <p className="text-gray-500 font-medium text-sm">{title}</p>
      <p className="text-gray-400 text-xs mt-1">{subtitle}</p>
    </div>
  );

  // ─── Tab counts ───
  const tabCounts = useMemo(() => ({
    all: notes.length + quizzes.length + assignments.length + testPapers.length + codingAssessments.length,
    notes: notes.length,
    quiz: quizzes.length,
    assignment: assignments.length,
    test: testPapers.length,
    "coding-round": codingAssessments.length,
  }), [notes, quizzes, assignments, testPapers, codingAssessments]);

  return (
    <div className="max-w-4xl mx-auto pb-10 space-y-2">
      {/* Filter Tabs */}
      <div className="mb-4">
        <div
          ref={scrollRef}
          className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const count = tabCounts[tab.id];
            return (
              <button
                key={tab.id}
                onClick={() => setTab(tab.id)}
                className={`classwork-filter-tab ${isActive ? "classwork-filter-tab-active" : "classwork-filter-tab-inactive"}`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      {renderTabContent()}

      {/* ═══ MODALS (preserved from originals) ═══ */}

      {/* PDF Preview */}
      {previewNote && (
        <PdfPreview
          url={previewNote.fileUrl || `${API_BASE_URL}/notes/file/${previewNote.fileId}`}
          title={previewNote.title}
          onClose={() => setPreviewNote(null)}
        />
      )}

      {/* Quiz Taking */}
      {showQuizTaking && selectedQuiz && (
        <QuizTakingModal
          quiz={selectedQuiz}
          studentId={classInfo.studentId}
          studentName={classInfo.studentName}
          onClose={() => { setShowQuizTaking(false); setSelectedQuiz(null); localStorage.removeItem("activeQuiz"); }}
          onSubmit={handleQuizSubmitted}
        />
      )}

      {/* Quiz Result */}
      {showQuizResult && selectedQuiz && (
        <QuizResultModal
          quizId={selectedQuiz._id}
          studentId={classInfo.studentId}
          onClose={() => { setShowQuizResult(false); setSelectedQuiz(null); }}
        />
      )}

      {/* Assignment Taking */}
      {showAssignTaking && selectedAssignment && (
        <TakeAssignmentModal
          assignment={selectedAssignment}
          studentId={classInfo.studentId}
          studentName={classInfo.studentName}
          onClose={() => { setShowAssignTaking(false); setSelectedAssignment(null); }}
          onSubmit={handleAssignmentSubmitted}
        />
      )}

      {/* Assignment Result */}
      {showAssignResult && selectedAssignment && (
        <AssignmentResultModal
          assignmentId={selectedAssignment._id}
          studentId={classInfo.studentId}
          onClose={() => { setShowAssignResult(false); setSelectedAssignment(null); }}
        />
      )}

      {/* PDF Upload Modal */}
      {showUploadModal && selectedAssignment && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Upload Assignment</h3>
              <button onClick={() => { setShowUploadModal(false); setSelectedFile(null); setFileError(""); }} className="text-gray-400 hover:text-gray-600 cursor-pointer" disabled={uploading}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mb-5">
              <p className="font-medium text-gray-900 text-sm">{selectedAssignment.title}</p>
              <p className="text-xs text-gray-500">{selectedAssignment.questions?.length || 0} questions • {selectedAssignment.totalMarks} marks</p>
            </div>
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-5 text-center mb-4">
              <Upload className="w-7 h-7 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-700 mb-1">Select a PDF file</p>
              <p className="text-xs text-gray-400 mb-3">Maximum size: 4MB</p>
              <input type="file" id="pdf-upload" accept="application/pdf" className="hidden" onChange={handleFileChange} disabled={uploading} />
              <label htmlFor="pdf-upload" className={`inline-block px-4 py-1.5 bg-purple-50 text-purple-700 font-medium rounded-lg text-sm ${uploading ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-purple-100"} transition-colors`}>
                Browse Files
              </label>
            </div>
            {selectedFile && (
              <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-200 mb-3">
                <div className="flex items-center gap-2 overflow-hidden">
                  <FileText className="w-4 h-4 text-purple-600 flex-shrink-0" />
                  <span className="text-sm text-gray-700 truncate">{selectedFile.name}</span>
                </div>
                {!uploading && (
                  <button onClick={() => setSelectedFile(null)} className="text-gray-400 hover:text-red-500 cursor-pointer"><X className="w-4 h-4" /></button>
                )}
              </div>
            )}
            {fileError && <p className="text-red-500 text-xs mb-3">{fileError}</p>}
            <button onClick={handlePDFSubmit} disabled={!selectedFile || uploading} className="w-full py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 cursor-pointer text-sm">
              {uploading ? (<><Loader className="w-4 h-4 animate-spin" /> Uploading...</>) : "Submit Assignment"}
            </button>
          </div>
        </div>
      )}

      {/* Questions Modal */}
      {showQuestionsModal && selectedAssignment && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{selectedAssignment.title}</h3>
                <p className="text-sm text-gray-500 mt-0.5">{selectedAssignment.questions?.length || 0} questions • {selectedAssignment.totalMarks} marks</p>
              </div>
              <button onClick={() => { setShowQuestionsModal(false); setSelectedAssignment(null); }} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {selectedAssignment.questions?.map((q, idx) => (
                <div key={q._id || idx} className="bg-gray-50 rounded-xl border border-gray-100 p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-gray-800 text-sm">Question {idx + 1}</h4>
                    <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full uppercase">{q.marks} Marks</span>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{q.question}</p>
                </div>
              ))}
              {(!selectedAssignment.questions || selectedAssignment.questions.length === 0) && (
                <div className="text-center py-8">
                  <HelpCircle className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">No questions available.</p>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-gray-100 flex justify-end gap-2 bg-gray-50">
              <button onClick={() => { setShowQuestionsModal(false); handleUploadPDF(selectedAssignment); }} className="px-4 py-2 border-2 border-purple-600 text-purple-700 font-semibold rounded-lg hover:bg-purple-50 flex items-center gap-2 cursor-pointer text-sm">
                <Upload className="w-4 h-4" /> Upload PDF
              </button>
              <button onClick={() => { setShowQuestionsModal(false); handleTakeAssignment(selectedAssignment); }} className="px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 flex items-center gap-2 cursor-pointer text-sm shadow-sm">
                <Play className="w-4 h-4" /> Start Online
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Test Taking */}
      {showTestTaking && selectedTest && (
        <TakeTestModal
          testPaper={selectedTest}
          studentId={classInfo.studentId}
          studentName={classInfo.studentName}
          onClose={() => { setShowTestTaking(false); setSelectedTest(null); localStorage.removeItem("activeTest"); }}
          onSubmit={handleTestSubmitted}
        />
      )}

      {/* Test Result */}
      {showTestResult && selectedTest && (
        <TestResultModal
          testPaperId={selectedTest._id}
          studentId={classInfo.studentId}
          onClose={() => { setShowTestResult(false); setSelectedTest(null); }}
        />
      )}

      {/* Coding Instructions Modal */}
      {showInstructionModal && selectedCoding && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="max-w-3xl w-full bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-white px-8 py-6 border-b border-gray-100 flex items-center justify-between sticky top-0 z-10">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-1">{selectedCoding.title}</h1>
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Coding Round Instructions</p>
              </div>
              <button onClick={() => { setShowInstructionModal(false); setSelectedCoding(null); }} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-colors cursor-pointer">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-8 overflow-y-auto space-y-6">
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 flex flex-col items-center justify-center">
                  <p className="text-sm font-semibold text-gray-500 mb-1 flex items-center gap-1.5"><Clock className="w-4 h-4 text-purple-600" /> Time Limit</p>
                  <p className="text-3xl font-bold text-gray-900">{selectedCoding.duration ? `${selectedCoding.duration} Min` : "No Limit"}</p>
                </div>
                <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 flex flex-col items-center justify-center">
                  <p className="text-sm font-semibold text-gray-500 mb-1 flex items-center gap-1.5"><FileCode className="w-4 h-4 text-purple-600" /> Environment</p>
                  <p className="text-3xl font-bold text-gray-900">HTML+CSS+JS</p>
                </div>
              </div>
              <div className="space-y-3">
                <h3 className="text-lg font-bold text-gray-900 border-b pb-2">Important Guidelines</h3>
                <div className="flex gap-4 items-start p-4 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                  <Shield className="w-6 h-6 text-purple-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">Full Screen Proctored</h4>
                    <p className="text-sm text-gray-600 leading-relaxed">Remain in full-screen mode. <strong>Exiting 4 times auto-submits your attempt.</strong></p>
                  </div>
                </div>
                <div className="flex gap-4 items-start p-4 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                  <Info className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">Auto-Save & Live Preview</h4>
                    <p className="text-sm text-gray-600 leading-relaxed">Code auto-saves every 30s. Live HTML/CSS/JS preview available.</p>
                  </div>
                </div>
                <div className="flex gap-4 items-start p-4 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                  <AlertCircle className="w-6 h-6 text-orange-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">Do Not Switch Tabs</h4>
                    <p className="text-sm text-gray-600 leading-relaxed">Tab switching records violations. <strong>4+ refreshes auto-submits.</strong></p>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-4 mt-auto">
              <button onClick={() => { setShowInstructionModal(false); setSelectedCoding(null); }} disabled={isStartingCoding} className="px-5 py-2.5 font-bold text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer text-sm disabled:opacity-50 disabled:cursor-not-allowed">Cancel</button>
              <button onClick={handleConfirmCoding} disabled={isStartingCoding} className="px-6 py-2.5 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl transition-colors shadow-md cursor-pointer flex items-center gap-2 text-sm disabled:opacity-70 disabled:cursor-not-allowed">
                {isStartingCoding ? <Loader className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
                {isStartingCoding ? "Starting..." : "Start Exam"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
