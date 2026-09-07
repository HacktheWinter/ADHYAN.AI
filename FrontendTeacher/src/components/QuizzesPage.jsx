// FrontendTeacher/src/components/QuizzesPage.jsx
import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Sparkles,
  Pencil,
  Trash2,
  CheckCircle,
  Eye,
  X,
  FileText,
  Loader,
  Tag,
  ChevronDown,
  ChevronUp,
  Settings2,
} from "lucide-react";
import axios from "axios";
import { getNotesByClassroom } from "../api/notesApi";
import API_BASE_URL from "../config";
import PublishQuizModal from "./PublishQuizModal";
import EditQuizModal from "./EditQuizModal";
import AddTopicsButton from "./AddTopicsButton";
import TopicsInputCard from "./TopicsInputCard";
import CreateManualQuizModal from "./CreateManualQuizModal";
import ToastNotification from "./ToastNotification";
import ConfirmationCard from "./ConfirmationCard";

const QuizzesPage = () => {
  const { classId } = useParams();
  const navigate = useNavigate();

  const [drafts, setDrafts] = useState([]);
  const [published, setPublished] = useState([]);
  const [showAIModal, setShowAIModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingNotes, setLoadingNotes] = useState(false);

  const [availableNotes, setAvailableNotes] = useState([]);
  const [selectedNotes, setSelectedNotes] = useState([]);

  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishingQuiz, setPublishingQuiz] = useState(null);

  // Topics state
  const [showTopicsInput, setShowTopicsInput] = useState(false);
  const [topics, setTopics] = useState([]);

  // Quiz customization state
  const [customTitle, setCustomTitle] = useState("");
  const [questionCount, setQuestionCount] = useState(20);
  const [marksPerQuestion, setMarksPerQuestion] = useState(1);
  const [difficulty, setDifficulty] = useState("mixed");

  // Toast & Confirmation state
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', confirmText: 'Confirm', cancelText: 'Cancel', type: 'danger', onConfirm: null });

  const showToast = useCallback((message, type = 'success') => setToast({ message, type }), []);
  const clearToast = useCallback(() => setToast({ message: '', type: 'success' }), []);
  const showConfirm = useCallback((opts) => setConfirmDialog({ isOpen: true, ...opts, confirmText: opts.confirmText || 'Confirm', cancelText: opts.cancelText || 'Cancel', type: opts.type || 'danger' }), []);
  const closeConfirm = useCallback(() => setConfirmDialog(prev => ({ ...prev, isOpen: false, onConfirm: null })), []);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  const truncateTitle = (title, maxLength = 50) => {
    if (title.length <= maxLength) return title;
    return title.substring(0, maxLength) + "...";
  };

  const getTotalQuestions = (quiz) => {
    if (quiz.sections && quiz.sections.length > 0) {
      return quiz.sections.reduce((acc, sec) => acc + (sec.questions?.length || 0), 0);
    }
    return quiz.questions?.length || 0;
  };

  const fetchQuizzes = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/quiz/classroom/${classId}`);
      const quizzes = res.data.quizzes || [];

      setDrafts(quizzes.filter((q) => q.status === "draft"));
      setPublished(quizzes.filter((q) => q.status === "published"));
    } catch (err) {
      console.error("Error fetching quizzes:", err);
    }
  }, [classId]);

  useEffect(() => {
    fetchQuizzes();
  }, [fetchQuizzes]);

  useEffect(() => {
    const handleClickOutside = () => setShowCreateMenu(false);
    if (showCreateMenu) document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [showCreateMenu]);

  const handleOpenAIModal = async () => {
    setShowAIModal(true);
    setTopics([]);
    setShowTopicsInput(false);
    // Reset customization
    setCustomTitle("");
    setQuestionCount(20);
    setMarksPerQuestion(1);
    setDifficulty("mixed");
    setShowAdvancedOptions(false);
    
    setLoadingNotes(true);

    try {
      const response = await getNotesByClassroom(classId);
      setAvailableNotes(response.notes || []);
    } catch (error) {
      console.error("Error fetching notes:", error);
      showToast("Failed to load notes", 'error');
    } finally {
      setLoadingNotes(false);
    }
  };

  const handleAddTopic = (topic) => {
    setTopics([...topics, topic]);
  };

  const handleRemoveTopic = (index) => {
    setTopics(topics.filter((_, i) => i !== index));
  };

  const handleToggleTopicsInput = () => {
    setShowTopicsInput(!showTopicsInput);
    if (!showTopicsInput) {
      setSelectedNotes([]);
    } else {
      setTopics([]);
    }
  };

  const handleBackToNotes = () => {
    setShowTopicsInput(false);
    setTopics([]);
  };

  const handleGenerateFromTopics = async () => {
    if (topics.length === 0) {
      showToast("Please add at least one topic", 'error');
      return;
    }

    setIsGenerating(true);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/quiz/generate-from-topics`,
        { 
          topics, 
          classroomId: classId,
          customTitle,
          questionCount,
          marksPerQuestion,
          difficulty 
        },
        { headers: { "Content-Type": "application/json" } }
      );

      setDrafts((prev) => [response.data.quiz, ...prev]);

      const stats = response.data.stats;
      showToast(`Assessment generated! ${stats.questionsGenerated} questions, ${stats.totalMarks} marks (${stats.difficulty})`, 'success');

      setTopics([]);
      setCustomTitle("");
      setShowTopicsInput(false);
      setShowAIModal(false);
    } catch (err) {
      console.error("Generation error:", err);
      showToast(err.response?.data?.error || "Failed to generate assessment", 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateWithAI = async () => {
    if (selectedNotes.length === 0) {
      showToast("Please select at least one note", 'error');
      return;
    }

    setIsGenerating(true);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/quiz/generate-ai`,
        { 
          noteIds: selectedNotes, 
          classroomId: classId,
          customTitle,
          questionCount,
          marksPerQuestion,
          difficulty 
        },
        { headers: { "Content-Type": "application/json" } }
      );

      setDrafts((prev) => [response.data.quiz, ...prev]);

      const stats = response.data.stats;
      showToast(`Assessment generated! ${stats.questionsGenerated} questions, ${stats.totalMarks} marks (${stats.processedNotes}/${stats.totalNotes} notes)`, 'success');

      setSelectedNotes([]);
      setCustomTitle("");
      setShowAIModal(false);
    } catch (err) {
      console.error("Generation error:", err);
      showToast(err.response?.data?.error || "Failed to generate assessment", 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEdit = (quiz) => {
    setEditingQuiz(quiz);
    setShowEditModal(true);
  };

  const handleViewResults = (quizId) => {
    navigate(`/class/${classId}/quizzes/results/${quizId}`);
  };

  const handleSaveQuiz = (updatedQuiz) => {
    if (updatedQuiz.status === "draft") {
      setDrafts(drafts.map((q) => (q._id === updatedQuiz._id ? updatedQuiz : q)));
    } else {
      setPublished(published.map((q) => (q._id === updatedQuiz._id ? updatedQuiz : q)));
    }

    setEditingQuiz(null);
    setShowEditModal(false);
  };

  const executeDeleteQuiz = async (id, status) => {
    try {
      await axios.delete(`${API_BASE_URL}/quiz/${id}`);

      if (status === "draft") {
        setDrafts(drafts.filter((q) => q._id !== id));
      } else {
        setPublished(published.filter((q) => q._id !== id));
      }

      showToast("Assessment deleted successfully!", 'success');
    } catch (err) {
      console.error(err);
      showToast("Failed to delete assessment", 'error');
    }
  };

  const handleDelete = (id, status) => {
    showConfirm({
      title: 'Delete Assessment',
      message: 'Are you sure you want to delete this assessment? This action cannot be undone.',
      confirmText: 'Delete',
      type: 'danger',
      onConfirm: () => {
        closeConfirm();
        executeDeleteQuiz(id, status);
      },
    });
  };

  const handlePublish = (quiz) => {
    setPublishingQuiz(quiz);
    setShowPublishModal(true);
  };

  const handlePublished = () => {
    setShowPublishModal(false);
    setPublishingQuiz(null);
    fetchQuizzes();
  };

  const toggleNoteSelection = (noteId) => {
    setSelectedNotes((prev) =>
      prev.includes(noteId) ? prev.filter((id) => id !== noteId) : [...prev, noteId]
    );
  };

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div className="bg-gradient-to-r from-violet-50 to-paper rounded-2xl p-4 sm:p-6 border border-line">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold font-display text-ink mb-1">
              🎯 Assessments
            </h2>
            <p className="text-ink-soft text-sm">
              Create and manage assessments with AI-powered question generation
            </p>
          </div>

          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowCreateMenu(!showCreateMenu);
              }}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 sm:px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-purple-600 dark:to-indigo-650 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl cursor-pointer text-sm sm:text-base"
            >
              <span>Create Question</span>
              <ChevronDown className="w-5 h-5 text-white" />
            </button>

            {showCreateMenu && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-surface rounded-xl shadow-2xl border border-line p-1.5 z-50 overflow-hidden flex flex-col gap-1">
                <button
                  onClick={() => {
                    setShowCreateMenu(false);
                    handleOpenAIModal();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-ink hover:bg-violet-50 dark:hover:bg-violet-900/30 rounded-lg transition-colors cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-purple-600 dark:text-[#A78BFA]" />
                  <span>AI Quick Generate</span>
                </button>
                <button
                  onClick={() => {
                    setShowCreateMenu(false);
                    setShowManualModal(true);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-ink hover:bg-violet-50 dark:hover:bg-violet-900/30 rounded-lg transition-colors cursor-pointer"
                >
                  <Pencil className="w-4 h-4 text-indigo-600 dark:text-blue-400" />
                  <span>AI Custom Create</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* DRAFT QUIZZES */}
      {drafts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center gap-3 mb-4 font-body">
            <div className="w-2 h-8 bg-yellow-500 rounded-full"></div>
            <h3 className="text-lg sm:text-xl font-semibold font-display text-ink">Draft Assessments</h3>
            <span className="px-3 py-1 bg-yellow-100 dark:bg-yellow-950/40 text-yellow-800 dark:text-yellow-350 text-xs sm:text-sm rounded-full font-semibold">
              {drafts.length}
            </span>
          </div>

          <div className="space-y-4">
            {drafts.map((quiz) => (
              <motion.div
                key={quiz._id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
                className="bg-surface rounded-2xl border border-line p-4 sm:p-6 hover:shadow-lg transition-all font-body text-ink"
              >
                <div className="flex flex-col lg:flex-row items-start justify-between gap-4">
                  <div className="flex items-start gap-3 sm:gap-4 flex-1 w-full">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 
                        className="text-base sm:text-lg font-semibold font-display text-ink mb-1"
                        title={quiz.title}
                      >
                        {truncateTitle(quiz.title, 50)}
                      </h4>

                      <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-ink-soft">
                        <span className="flex items-center gap-1">
                          <span className="font-bold text-violet-dark">
                            {getTotalQuestions(quiz)}
                          </span>{" "}
                          questions
                        </span>

                        <span className="hidden sm:inline">•</span>

                        {quiz.generatedFromTopics && quiz.generatedFromTopics.length > 0 ? (
                          <span className="flex items-center gap-1 px-2.5 py-1 bg-violet-50 text-violet-dark text-xs rounded-full font-bold">
                            <Tag className="w-3.5 h-3.5" />
                            From Topics
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 px-2.5 py-1 bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 text-xs rounded-full font-bold">
                            <FileText className="w-3.5 h-3.5" />
                            From Notes
                          </span>
                        )}

                        <span className="hidden sm:inline">•</span>
                        <span className="px-2.5 py-1 bg-yellow-100 dark:bg-yellow-950/40 text-yellow-800 dark:text-yellow-350 text-xs rounded-full font-bold">
                          Draft
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                    <button
                      onClick={() => handleEdit(quiz)}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors cursor-pointer"
                    >
                      <Pencil className="w-4 h-4" />
                      <span>Edit</span>
                    </button>

                    <button
                      onClick={() => handleDelete(quiz._id, "draft")}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete</span>
                    </button>

                    <button
                      onClick={() => handlePublish(quiz)}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 btn-settings-blue text-sm font-semibold rounded-xl transition-colors cursor-pointer"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Publish</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* PUBLISHED QUIZZES */}
      {published.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <div className="flex items-center gap-3 mb-4 font-body">
            <div className="w-2 h-8 bg-green-500 rounded-full"></div>
            <h3 className="text-lg sm:text-xl font-semibold font-display text-ink">Published Assessments</h3>
            <span className="px-3 py-1 bg-green-100 dark:bg-green-950/40 text-green-800 dark:text-green-300 text-xs sm:text-sm rounded-full font-semibold">
              {published.length}
            </span>
          </div>

          <div className="space-y-4">
            {published.map((quiz) => (
              <motion.div
                key={quiz._id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
                className="bg-surface rounded-2xl border border-line p-4 sm:p-6 hover:shadow-lg transition-all font-body text-ink"
              >
                <div className="flex flex-col lg:flex-row items-start justify-between gap-4">
                  <div className="flex items-start gap-3 sm:gap-4 flex-1 w-full">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 
                        className="text-base sm:text-lg font-semibold font-display text-ink mb-1"
                        title={quiz.title}
                      >
                        {truncateTitle(quiz.title, 50)}
                      </h4>

                      <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-ink-soft">
                        <span className="flex items-center gap-1">
                          <span className="font-bold text-violet-dark">
                            {getTotalQuestions(quiz)}
                          </span>{" "}
                          questions
                        </span>

                        <span className="hidden sm:inline">•</span>

                        {quiz.generatedFromTopics && quiz.generatedFromTopics.length > 0 ? (
                          <span className="flex items-center gap-1 px-2.5 py-1 bg-violet-50 text-violet-dark text-xs rounded-full font-bold">
                            <Tag className="w-3.5 h-3.5" />
                            From Topics
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 px-2.5 py-1 bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 text-xs rounded-full font-bold">
                            <FileText className="w-3.5 h-3.5" />
                            From Notes
                          </span>
                        )}

                        <span className="hidden sm:inline">•</span>
                        <span className="px-2.5 py-1 bg-green-100 dark:bg-green-950/40 text-green-800 dark:text-green-300 text-xs rounded-full font-bold">
                          Published
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                    <button
                      onClick={() => handleViewResults(quiz._id)}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer"
                    >
                      <Eye className="w-4 h-4" />
                      <span>View Results</span>
                    </button>

                    <button
                      onClick={() => handleDelete(quiz._id, "published")}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* AI GENERATION MODAL */}
      {showAIModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-surface border border-line rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-line flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-semibold font-display text-ink">
                  Generate Assessment with AI
                </h3>
                <p className="text-sm text-ink-soft mt-1">
                  Select notes or add topics to generate assessment questions
                </p>
              </div>

              <button
                onClick={() => {
                  setShowAIModal(false);
                  setSelectedNotes([]);
                  setTopics([]);
                  setShowTopicsInput(false);
                }}
                className="text-ink-soft hover:text-ink transition-colors"
                disabled={isGenerating}
              >
                <X className="w-6 h-6 cursor-pointer" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-4 flex-1 overflow-y-auto space-y-6">
              {/* Quiz Title Setup - Always Visible */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-ink-soft uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-600 dark:text-[#A78BFA]" />
                  Assessment Title (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Midterm Physics Assessment, Weekly Math Test..."
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="w-full px-4 py-2 border border-line bg-paper text-ink rounded-xl focus:ring-2 focus:ring-purple-500 focus:bg-surface outline-none transition-all text-sm"
                  disabled={isGenerating}
                />
              </div>

              {/* Topics or Notes Section */}
              {showTopicsInput ? (
                <TopicsInputCard
                  topics={topics}
                  onAddTopic={handleAddTopic}
                  onRemoveTopic={handleRemoveTopic}
                  onBack={handleBackToNotes}
                  isGenerating={isGenerating}
                />
              ) : (
                <div className="space-y-4">
                  {/* Header with Add Topics Button */}
                  <div className="flex items-center justify-between">
                    <h4 className="block text-xs font-bold text-ink-soft uppercase tracking-wider flex items-center gap-2">
                      <Tag className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      Select Source Notes
                    </h4>
                    <AddTopicsButton
                      onClick={handleToggleTopicsInput}
                      isActive={showTopicsInput}
                      disabled={isGenerating}
                    />
                  </div>

                  {/* Notes Selection */}
                  {loadingNotes ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader className="w-8 h-8 text-purple-600 animate-spin" />
                    </div>
                  ) : availableNotes.length === 0 ? (
                    <div className="text-center py-10 bg-paper rounded-2xl border-2 border-dashed border-line">
                      <p className="text-ink-soft text-sm">No notes available. Use "Help me write" instead.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                      {availableNotes.map((note) => (
                        <label
                          key={note._id}
                          className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${
                            selectedNotes.includes(note._id)
                              ? "border-purple-500 bg-violet-50 text-violet-dark"
                              : "border-line bg-surface text-ink hover:border-purple-300"
                          } ${isGenerating ? "opacity-50 cursor-not-allowed" : ""}`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedNotes.includes(note._id)}
                            onChange={() => toggleNoteSelection(note._id)}
                            disabled={isGenerating}
                            className="w-4 h-4 text-purple-600 rounded border-line focus:ring-purple-600 cursor-pointer bg-paper"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate">
                              {note.title}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Advanced Customization Options */}
              <div className="border-t border-line pt-4">
                <button
                  onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                  className="flex items-center gap-2 text-sm font-semibold text-ink hover:text-violet-600 transition-colors mb-4"
                >
                  <Settings2 className="w-4 h-4" />
                  Advanced Generation Options
                  {showAdvancedOptions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showAdvancedOptions && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-paper p-4 rounded-2xl border border-line"
                  >
                    {/* Question Count */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-ink-soft uppercase tracking-wider">Number of Qs</label>
                      <select
                         value={questionCount}
                         onChange={(e) => setQuestionCount(Number(e.target.value))}
                         className="w-full p-2 bg-surface border border-line text-ink rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500"
                         disabled={isGenerating}
                      >
                        {[5, 10, 15, 20, 25, 30, 40, 50].map(count => (
                          <option key={count} value={count}>{count} Questions</option>
                        ))}
                      </select>
                    </div>

                    {/* Marks Per Question */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-ink-soft uppercase tracking-wider">Marks per Q</label>
                      <select
                        value={marksPerQuestion}
                        onChange={(e) => setMarksPerQuestion(Number(e.target.value))}
                        className="w-full p-2 bg-surface border border-line text-ink rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500"
                        disabled={isGenerating}
                      >
                        {[1, 2, 3, 4, 5].map(marks => (
                          <option key={marks} value={marks}>{marks} {marks === 1 ? 'Mark' : 'Marks'}</option>
                        ))}
                      </select>
                    </div>

                    {/* Difficulty Level */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-ink-soft uppercase tracking-wider">Difficulty</label>
                      <select
                        value={difficulty}
                        onChange={(e) => setDifficulty(e.target.value)}
                        className="w-full p-2 bg-surface border border-line text-ink rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500"
                        disabled={isGenerating}
                      >
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                        <option value="mixed">Mixed</option>
                      </select>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-line flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => {
                  setShowAIModal(false);
                  setSelectedNotes([]);
                  setTopics([]);
                  setShowTopicsInput(false);
                }}
                disabled={isGenerating}
                className="w-full sm:flex-1 px-6 py-3 bg-line text-ink font-bold rounded-xl hover:bg-line/80 transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={showTopicsInput ? handleGenerateFromTopics : handleGenerateWithAI}
                disabled={
                  isGenerating ||
                  (showTopicsInput ? topics.length === 0 : selectedNotes.length === 0)
                }
                className="w-full sm:flex-1 px-6 py-3 btn-settings-blue text-sm rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader className="w-5 h-5 animate-spin" />
                    Generating {questionCount} Qs...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    Generate {questionCount} Questions
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Manual Modal */}
      {showManualModal && (
        <CreateManualQuizModal
          classId={classId}
          onClose={() => setShowManualModal(false)}
          onCreated={(newQuiz) => {
            setShowManualModal(false);
            setDrafts((prev) => [newQuiz, ...prev]);
          }}
          showToast={showToast}
        />
      )}

      {/* Publish Modal */}
      {showPublishModal && publishingQuiz && (
        <PublishQuizModal
          quiz={publishingQuiz}
          onClose={() => {
            setShowPublishModal(false);
            setPublishingQuiz(null);
          }}
          onPublished={handlePublished}
          showToast={showToast}
        />
      )}

      {/* Edit Modal */}
      {showEditModal && editingQuiz && (
        <EditQuizModal
          quiz={editingQuiz}
          onClose={() => {
            setShowEditModal(false);
            setEditingQuiz(null);
          }}
          onSave={handleSaveQuiz}
          showToast={showToast}
        />
      )}
      
      {/* Toast Notification */}
      <ToastNotification message={toast.message} type={toast.type} onClose={clearToast} />

      {/* Confirmation Card */}
      <ConfirmationCard
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        cancelText={confirmDialog.cancelText}
        type={confirmDialog.type}
        onConfirm={confirmDialog.onConfirm}
        onCancel={closeConfirm}
      />
    </div>
  );
};

export default QuizzesPage;