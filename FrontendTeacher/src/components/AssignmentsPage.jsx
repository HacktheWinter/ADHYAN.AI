// FrontendTeacher/src/components/AssignmentsPage.jsx
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Pencil,
  Trash2,
  CheckCircle,
  FileText,
  Loader,
  X,
  Eye,
  Settings2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  getAssignmentsByClassroom,
  deleteAssignment,
  generateAssignmentWithAI,
} from "../api/assignmentApi";
import { getNotesByClassroom } from "../api/notesApi";

import PublishAssignmentModal from "./PublishAssignmentModal";
import EditAssignmentModal from "./EditAssignmentModal";
import CreateManualAssignmentModal from "./CreateManualAssignmentModal";
import AddTopicsButton from "./AddTopicsButton";
import TopicsInputCard from "./TopicsInputCard";
import ToastNotification from "./ToastNotification";
import ConfirmationCard from "./ConfirmationCard";

const AssignmentsPage = () => {
  const { classData } = useOutletContext();
  const navigate = useNavigate();

  const [drafts, setDrafts] = useState([]);
  const [published, setPublished] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showAIModal, setShowAIModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);

  const [editingAssignment, setEditingAssignment] = useState(null);
  const [publishingAssignment, setPublishingAssignment] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingNotes, setLoadingNotes] = useState(false);

  const [availableNotes, setAvailableNotes] = useState([]);
  const [selectedNotes, setSelectedNotes] = useState([]);
  const [showTopicsInput, setShowTopicsInput] = useState(false);
  const [topics, setTopics] = useState([]);

  // AI Gen Config
  const [customTitle, setCustomTitle] = useState("");
  const [questionCount, setQuestionCount] = useState(5);
  const [marksPerQuestion, setMarksPerQuestion] = useState(2);
  const [difficulty, setDifficulty] = useState("mixed");
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  // Toast & Confirmation state
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', confirmText: 'Confirm', cancelText: 'Cancel', type: 'danger', onConfirm: null });

  const showToast = useCallback((message, type = 'success') => setToast({ message, type }), []);
  const clearToast = useCallback(() => setToast({ message: '', type: 'success' }), []);
  const showConfirm = useCallback((opts) => setConfirmDialog({ isOpen: true, ...opts, confirmText: opts.confirmText || 'Confirm', cancelText: opts.cancelText || 'Cancel', type: opts.type || 'danger' }), []);
  const closeConfirm = useCallback(() => setConfirmDialog(prev => ({ ...prev, isOpen: false, onConfirm: null })), []);

  const clampQuestionCount = (value) => {
    const parsed = parseInt(value, 10);
    if (!Number.isFinite(parsed)) return 1;
    return Math.min(10, Math.max(1, parsed));
  };

  const clampMarksPerQuestion = (value) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return 1;
    return Math.min(10, Math.max(1, parsed));
  };

  useEffect(() => {
    if (classData?.id) {
      fetchAssignments();
    }
  }, [classData?.id]);

  useEffect(() => {
    const handleClickOutside = () => setShowCreateMenu(false);
    if (showCreateMenu) document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [showCreateMenu]);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const response = await getAssignmentsByClassroom(classData.id);
      const assignments = response.assignments || [];

      setDrafts(assignments.filter((a) => a.status === "draft"));
      setPublished(assignments.filter((a) => a.status === "published"));
    } catch (error) {
      console.error("Error fetching assignments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAIModal = async () => {
    setShowAIModal(true);
    setLoadingNotes(true);
    setTopics([]);
    setShowTopicsInput(false);
    // Reset config
    setCustomTitle("");
    setQuestionCount(5);
    setMarksPerQuestion(2);
    setDifficulty("mixed");
    setShowAdvancedOptions(false);

    try {
      const response = await getNotesByClassroom(classData.id);
      setAvailableNotes(response.notes || []);
    } catch (error) {
      console.error("Error fetching notes:", error);
      showToast("Failed to load notes", 'error');
    } finally {
      setLoadingNotes(false);
    }
  };

  const handleGenerateWithAI = async () => {
    if (showTopicsInput && topics.length === 0) {
      showToast("Please add at least one topic", 'error');
      return;
    }
    if (!showTopicsInput && selectedNotes.length === 0) {
      showToast("Please select at least one note", 'error');
      return;
    }

    setIsGenerating(true);

    try {
      const config = {
        customTitle: customTitle.trim(),
        questionCount,
        marksPerQuestion,
        difficulty
      };

      if (showTopicsInput) {
        config.topics = topics;
      }

      const response = await generateAssignmentWithAI(
        showTopicsInput ? [] : selectedNotes,
        classData.id,
        config
      );

      setDrafts((prev) => [response.assignment, ...prev]);

      showToast(`Assignment generated! ${response.stats.questionsGenerated} questions, ${response.stats.totalMarks} marks (${response.stats.difficulty})`, 'success');

      setSelectedNotes([]);
      setTopics([]);
      setShowTopicsInput(false);
      setCustomTitle("");
      setShowAIModal(false);
    } catch (error) {
      console.error("Generation error:", error);
      showToast(error.response?.data?.error || "Failed to generate assignment", 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const executeDeleteAssignment = async (assignmentId, status) => {
    try {
      await deleteAssignment(assignmentId);

      if (status === "draft") {
        setDrafts(drafts.filter((a) => a._id !== assignmentId));
      } else {
        setPublished(published.filter((a) => a._id !== assignmentId));
      }

      showToast("Assignment deleted successfully!", 'success');
    } catch (error) {
      console.error(error);
      showToast("Failed to delete assignment", 'error');
    }
  };

  const handleDelete = (assignmentId, status) => {
    showConfirm({
      title: 'Delete Assignment',
      message: 'Are you sure you want to delete this assignment? This action cannot be undone.',
      confirmText: 'Delete',
      type: 'danger',
      onConfirm: () => {
        closeConfirm();
        executeDeleteAssignment(assignmentId, status);
      },
    });
  };

  const handleEditAnswerKeys = (assignment) => {
    setEditingAssignment(assignment);
    setShowEditModal(true);
  };

  const handleViewSubmissions = (assignmentId) => {
    navigate(`/class/${classData.id}/assignments/${assignmentId}/submissions`);
  };

  const handleToggleTopicsInput = () => {
    setShowTopicsInput(!showTopicsInput);
    if (!showTopicsInput) {
      setSelectedNotes([]);
      setTopics([]);
    }
  };

  const handlePublish = (assignment) => {
    setPublishingAssignment(assignment);
    setShowPublishModal(true);
  };

  const toggleNoteSelection = (noteId) => {
    setSelectedNotes((prev) =>
      prev.includes(noteId)
        ? prev.filter((id) => id !== noteId)
        : [...prev, noteId]
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 font-body text-ink">
        <Loader className="w-8 h-8 text-purple-600 animate-spin" />
        <span className="ml-3 text-ink-soft font-semibold">Loading assignments...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 font-body">
      {/* HEADER */}
      <div className="bg-gradient-to-r from-violet-50 to-paper rounded-2xl p-4 sm:p-6 border border-line">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold font-display text-ink mb-1">
              📝 Assignments
            </h2>
            <p className="text-ink-soft text-sm">
              Create and manage student assignments with AI-powered question
              generation
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

            <AnimatePresence>
              {showCreateMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -8 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="absolute right-0 top-full mt-2 w-56 bg-surface rounded-xl shadow-2xl border border-line p-1.5 z-50 overflow-hidden flex flex-col gap-1"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateMenu(false);
                      handleOpenAIModal();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-ink hover:bg-violet-50 dark:hover:bg-violet-900/30 rounded-lg transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-purple-600 dark:text-[#A78BFA]" />
                    <span>Generate with AI</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateMenu(false);
                      setShowManualModal(true);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-ink hover:bg-violet-50 dark:hover:bg-violet-900/30 rounded-lg transition-colors cursor-pointer"
                  >
                    <Pencil className="w-4 h-4 text-indigo-600 dark:text-blue-400" />
                    <span>Create Manually</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ------------------- DRAFT ASSIGNMENTS ------------------- */}
      {drafts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-2 h-8 bg-yellow-500 rounded-full"></div>
            <h3 className="text-lg sm:text-xl font-semibold font-display text-ink">
              Draft Assignments
            </h3>
            <span className="px-3 py-1 bg-yellow-100 dark:bg-yellow-950/40 text-yellow-800 dark:text-yellow-350 text-xs sm:text-sm rounded-full font-semibold">
              {drafts.length}
            </span>
          </div>

          <div className="space-y-4">
            {drafts.map((assignment) => (
              <motion.div
                key={assignment._id}
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
                      <h4 className="text-base sm:text-lg font-semibold font-display text-ink mb-1 truncate">
                        {assignment.title}
                      </h4>
                      {assignment.description && (
                        <p className="text-sm text-ink-soft mb-2 line-clamp-2">
                          {assignment.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-ink-soft">
                        <span className="flex items-center gap-1">
                          <span className="font-bold text-violet-dark">
                            {assignment.questions?.length || 0}
                          </span>{" "}
                          questions
                        </span>
                        <span className="hidden sm:inline">•</span>

                        <span className="flex items-center gap-1">
                          <span className="font-bold text-violet-dark">
                            {assignment.totalMarks}
                          </span>{" "}
                          marks
                        </span>

                        <span className="hidden sm:inline">•</span>
                        <span className="px-2.5 py-1 bg-yellow-100 dark:bg-yellow-950/40 text-yellow-800 dark:text-yellow-350 text-xs rounded-full font-bold">
                          Draft
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                    <button
                      onClick={() => handleEditAnswerKeys(assignment)}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors cursor-pointer"
                      title="Edit Answer Keys"
                    >
                      <Pencil className="w-4 h-4" />
                      <span>Edit</span>
                    </button>

                    <button
                      onClick={() => handleDelete(assignment._id, "draft")}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete</span>
                    </button>

                    <button
                      onClick={() => handlePublish(assignment)}
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

      {/* ------------------- PUBLISHED ASSIGNMENTS ------------------- */}
      {published.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-2 h-8 bg-green-500 rounded-full"></div>
            <h3 className="text-lg sm:text-xl font-semibold font-display text-ink">
              Published Assignments
            </h3>
            <span className="px-3 py-1 bg-green-100 dark:bg-green-950/40 text-green-800 dark:text-green-300 text-xs sm:text-sm rounded-full font-semibold">
              {published.length}
            </span>
          </div>

          <div className="space-y-4">
            {published.map((assignment) => (
              <motion.div
                key={assignment._id}
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
                      <h4 className="text-base sm:text-lg font-semibold font-display text-ink mb-1 truncate">
                        {assignment.title}
                      </h4>
                      {assignment.description && (
                        <p className="text-sm text-ink-soft mb-2 line-clamp-2">
                          {assignment.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-ink-soft">
                        <span className="flex items-center gap-1">
                          <span className="font-bold text-violet-dark">
                            {assignment.questions?.length || 0}
                          </span>{" "}
                          questions
                        </span>

                        <span className="hidden sm:inline">•</span>

                        <span className="flex items-center gap-1">
                          <span className="font-bold text-violet-dark">
                            {assignment.totalMarks}
                          </span>{" "}
                          marks
                        </span>

                        {assignment.dueDate && (
                          <>
                            <span className="hidden sm:inline">•</span>
                            <span className="text-orange-600 dark:text-orange-400 font-bold text-xs">
                              Due:{" "}
                              {new Date(
                                assignment.dueDate
                              ).toLocaleDateString()}
                            </span>
                          </>
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
                      onClick={() =>
                        navigate(
                          `/class/${classData.id}/assignments/results/${assignment._id}`
                        )
                      }
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer"
                    >
                      <Eye className="w-4 h-4" />
                      <span>View Results</span>
                    </button>

                    <button
                      onClick={() => handleDelete(assignment._id, "published")}
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

      {/* ------------------- AI GENERATION MODAL ------------------- */}
      <AnimatePresence>
        {showAIModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 transition-opacity duration-150">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="bg-surface border border-line rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden font-body text-ink"
            >
            {/* Header */}
            <div className="p-4 sm:p-6 border-b border-line flex items-center justify-between">
              <div>
                <h3 className="text-xl sm:text-2xl font-semibold font-display text-ink">
                  Generate Assignment with AI
                </h3>
                <p className="text-sm text-ink-soft mt-1 hidden sm:block">
                  Select notes to generate assignment questions
                </p>
              </div>

              <button
                onClick={() => {
                  setShowAIModal(false);
                  setSelectedNotes([]);
                }}
                className="text-ink-soft hover:text-ink"
                disabled={isGenerating}
              >
                <X className="w-6 h-6 cursor-pointer" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 sm:p-6 flex-1 overflow-y-auto space-y-6">
              {/* Assignment Title */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-ink-soft uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-600 dark:text-[#A78BFA]" />
                  Assignment Title (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Chapter 1 Review, Weekly Homework..."
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="w-full px-4 py-2 border border-line bg-paper text-ink rounded-xl outline-none focus:ring-2 focus:ring-purple-500 focus:bg-surface transition-all text-sm"
                  disabled={isGenerating}
                />
              </div>

              {/* Notes Selection Group */}
              <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <h4 className="font-semibold text-ink flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-500" />
                {showTopicsInput ? "Enter Topics" : "Select Source Materials"}
              </h4>
              <AddTopicsButton 
                isActive={showTopicsInput}
                onClick={handleToggleTopicsInput}
              />
            </div>

            {showTopicsInput ? (
              <TopicsInputCard 
                topics={topics} 
                onAddTopic={(t) => setTopics([...topics, t])}
                onRemoveTopic={(idx) => setTopics(topics.filter((_, i) => i !== idx))}
                onBack={handleToggleTopicsInput}
                isGenerating={isGenerating}
              />
            ) : (
              <div className="grid grid-cols-1 gap-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                {loadingNotes ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader className="w-8 h-8 text-purple-600 animate-spin" />
                  </div>
                ) : availableNotes.length === 0 ? (
                  <div className="text-center py-10 bg-paper rounded-2xl border border-dashed border-line">
                    <p className="text-ink-soft text-sm">No notes found. Upload some first.</p>
                  </div>
                ) : (
                  <>
                    {availableNotes.map((note) => (
                      <label
                        key={note._id}
                        className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${
                          selectedNotes.includes(note._id)
                            ? "border-purple-500 bg-violet-50 text-violet-dark shadow-sm"
                            : "border-line bg-surface text-ink hover:border-purple-300"
                        } ${isGenerating ? "opacity-50 cursor-not-allowed" : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedNotes.includes(note._id)}
                          onChange={() => toggleNoteSelection(note._id)}
                          disabled={isGenerating}
                          className="w-4 h-4 text-purple-600 rounded border-line focus:ring-violet-600 cursor-pointer bg-paper"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">{note.title}</p>
                        </div>
                      </label>
                    ))}
                  </>
                )}
              </div>
            )}
              </div>

              {/* Advanced Customization Options */}
              <div className="border-t border-line pt-4">
                <button 
                  onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                  className="flex items-center gap-2 text-sm font-semibold text-ink hover:text-violet-600 transition-colors mb-4"
                >
                  <Settings2 className="w-4 h-4" />
                  Advanced Question Options
                  {showAdvancedOptions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showAdvancedOptions && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-paper p-4 rounded-2xl border border-line"
                  >
                    {/* Q Count */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-ink-soft uppercase tracking-wider">Question Count</label>
                      <input 
                        type="number"
                        min="1"
                        max="10"
                        step="1"
                        value={questionCount}
                        onChange={(e) => setQuestionCount(clampQuestionCount(e.target.value))}
                        className="w-full px-3 py-2 bg-surface border border-line text-ink rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                        disabled={isGenerating}
                      />
                    </div>

                    {/* Marks Per Q */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-ink-soft uppercase tracking-wider">Marks per Q</label>
                      <input 
                        type="number"
                        min="1"
                        max="10"
                        step="0.1"
                        value={marksPerQuestion}
                        onChange={(e) => setMarksPerQuestion(clampMarksPerQuestion(e.target.value))}
                        className="w-full px-3 py-2 bg-surface border border-line text-ink rounded-xl text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all"
                        disabled={isGenerating}
                      />
                    </div>

                    {/* Difficulty */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-ink-soft uppercase tracking-wider flex justify-between">
                        Difficulty
                        <span className="bg-indigo-100 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300 px-2 py-0.5 rounded text-[10px] font-black">
                          {questionCount * marksPerQuestion} MARKS TOTAL
                        </span>
                      </label>
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
            <div className="p-4 sm:p-6 border-t border-line flex flex-col sm:flex-row gap-3 bg-paper rounded-b-2xl">
              <button
                onClick={() => {
                  setShowAIModal(false);
                  setSelectedNotes([]);
                }}
                disabled={isGenerating}
                className="w-full sm:flex-1 px-6 py-3 bg-line text-ink font-bold rounded-xl hover:bg-line/80 transition-colors disabled:opacity-50 cursor-pointer text-sm"
              >
                Cancel
              </button>

              <button
                onClick={handleGenerateWithAI}
                disabled={selectedNotes.length === 0 || isGenerating}
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
                    Generate Assignment ({questionCount * marksPerQuestion} Marks)
                  </span>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>

      {/* Edit Modal */}
      {showEditModal && editingAssignment && (
        <EditAssignmentModal
          assignment={editingAssignment}
          onClose={() => {
            setShowEditModal(false);
            setEditingAssignment(null);
          }}
          onSave={() => {
            setShowEditModal(false);
            setEditingAssignment(null);
            fetchAssignments();
          }}
          showToast={showToast}
        />
      )}

      {/* Publish Modal */}
      {showPublishModal && publishingAssignment && (
        <PublishAssignmentModal
          assignment={publishingAssignment}
          onClose={() => {
            setShowPublishModal(false);
            setPublishingAssignment(null);
          }}
          onPublished={() => {
            setShowPublishModal(false);
            setPublishingAssignment(null);
            fetchAssignments();
          }}
          showToast={showToast}
        />
      )}

      {/* Create Manual Modal */}
      {showManualModal && (
        <CreateManualAssignmentModal
          classId={classData.id}
          onClose={() => setShowManualModal(false)}
          onCreated={(newAssignment) => {
            setShowManualModal(false);
            setDrafts((prev) => [newAssignment, ...prev]);
          }}
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

export default AssignmentsPage;