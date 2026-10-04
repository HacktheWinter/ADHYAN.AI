// FrontendTeacher/src/components/TestPapersPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useOutletContext, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Pencil, Trash2, CheckCircle, Eye, Loader, FileText, X, MoreVertical, Upload, Settings2, ChevronDown, ChevronUp, Maximize, Minimize } from 'lucide-react';
import { 
  getTestPapersByClassroom, 
  deleteTestPaper,
  generateTestPaperWithAI
} from '../api/testPaperApi';
import { getNotesByClassroom } from '../api/notesApi';
import PublishTestModal from './PublishTestModal';
import EditAnswerKeysModal from './EditAnswerKeysModal';
import AddTopicsButton from "./AddTopicsButton";
import TopicsInputCard from "./TopicsInputCard";
import CreateManualTestModal from "./CreateManualTestModal";
import ToastNotification from "./ToastNotification";
import ConfirmationCard from "./ConfirmationCard";

const TestPapersPage = () => {
  const { classData } = useOutletContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewFilter, setViewFilter] = useState("all");

  const [drafts, setDrafts] = useState([]);
  const [published, setPublished] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAIModal, setShowAIModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [editingTest, setEditingTest] = useState(null);
  const [publishingTest, setPublishingTest] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [openActionMenuId, setOpenActionMenuId] = useState(null);
  const [menuDirection, setMenuDirection] = useState("down");

  const [availableNotes, setAvailableNotes] = useState([]);
  const [selectedNotes, setSelectedNotes] = useState([]);
  const [showTopicsInput, setShowTopicsInput] = useState(false);
  const [topics, setTopics] = useState([]);

  // AI Gen Config states
  const [customTitle, setCustomTitle] = useState("");
  const [questionCounts, setQuestionCounts] = useState({ 
    short: { count: 5, optional: 0 }, 
    medium: { count: 4, optional: 0 }, 
    long: { count: 2, optional: 0 } 
  });
  const [difficulty, setDifficulty] = useState("mixed");
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  // Toast & Confirmation state
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', confirmText: 'Confirm', cancelText: 'Cancel', type: 'danger', onConfirm: null });

  const showToast = useCallback((message, type = 'success') => setToast({ message, type }), []);
  const clearToast = useCallback(() => setToast({ message: '', type: 'success' }), []);
  const showConfirm = useCallback((opts) => setConfirmDialog({ isOpen: true, ...opts, confirmText: opts.confirmText || 'Confirm', cancelText: opts.cancelText || 'Cancel', type: opts.type || 'danger' }), []);
  const closeConfirm = useCallback(() => setConfirmDialog(prev => ({ ...prev, isOpen: false, onConfirm: null })), []);

  useEffect(() => {
    if (classData?.id) {
      fetchTestPapers();
    }
  }, [classData?.id]);

  useEffect(() => {
    const handleClickOutside = () => setShowHeaderMenu(false);
    if (showHeaderMenu) document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [showHeaderMenu]);

  useEffect(() => {
    const handleClickOutside = () => setShowCreateMenu(false);
    if (showCreateMenu) document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [showCreateMenu]);

  useEffect(() => {
    const handleClickOutside = () => setShowFilterMenu(false);
    if (showFilterMenu) document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [showFilterMenu]);

  useEffect(() => {
    const handleClickOutside = () => setOpenActionMenuId(null);
    if (openActionMenuId) document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [openActionMenuId]);

  useEffect(() => {
    if (location.state?.openModal) {
      if (location.state.openModal === "ai") {
        handleOpenAIModal();
      } else if (location.state.openModal === "manual") {
        setShowManualModal(true);
      }
      // Clear state so it doesn't reopen on reload
      window.history.replaceState({}, document.title)
    }
  }, [location.state]);

  const fetchTestPapers = async () => {
    try {
      setLoading(true);
      const response = await getTestPapersByClassroom(classData.id);
      const testPapers = response.testPapers || [];

      setDrafts(testPapers.filter(t => t.status === 'draft'));
      setPublished(testPapers.filter(t => t.status === 'published'));
    } catch (error) {
      console.error('Error fetching test papers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAIModal = async () => {
    setShowAIModal(true);
    setLoadingNotes(true);
    // Reset config
    setCustomTitle("");
    setTopics([]);
    setShowTopicsInput(false);
    setQuestionCounts({ 
      short: { count: 5, optional: 0 }, 
      medium: { count: 4, optional: 0 }, 
      long: { count: 2, optional: 0 } 
    });
    setDifficulty("mixed");
    setShowAdvancedOptions(false);

    try {
      const response = await getNotesByClassroom(classData.id);
      setAvailableNotes(response.notes || []);
    } catch (error) {
      console.error('Error fetching notes:', error);
      showToast('Failed to load notes', 'error');
    } finally {
      setLoadingNotes(false);
    }
  };

  const handleGenerateWithAI = async () => {
    if (showTopicsInput && topics.length === 0) {
      showToast('Please add at least one topic', 'error');
      return;
    }
    if (!showTopicsInput && selectedNotes.length === 0) {
      showToast('Please select at least one note', 'error');
      return;
    }

    setIsGenerating(true);

    try {
      const config = {
        customTitle: customTitle.trim(),
        counts: questionCounts,
        difficulty
      };

      if (showTopicsInput) {
        config.topics = topics;
      }

      const response = await generateTestPaperWithAI(
        showTopicsInput ? [] : selectedNotes, 
        classData.id, 
        config
      );

      setDrafts(prev => [response.testPaper, ...prev]);

      showToast(`Test paper generated! ${response.stats.questionsGenerated} questions, ${response.stats.totalMarks} marks (${response.stats.difficulty})`, 'success');

      setSelectedNotes([]);
      setCustomTitle("");
      setTopics([]);
      setShowTopicsInput(false);
      setShowAIModal(false);
    } catch (error) {
      console.error('Generation error:', error);
      showToast(error.response?.data?.error || 'Failed to generate test paper', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const executeDeleteTest = async (testId, status) => {
    try {
      await deleteTestPaper(testId);

      if (status === 'draft') {
        setDrafts(drafts.filter(t => t._id !== testId));
      } else {
        setPublished(published.filter(t => t._id !== testId));
      }

      showToast('Test paper deleted successfully!', 'success');
    } catch (error) {
      console.error(error);
      showToast('Failed to delete test paper', 'error');
    }
  };

  const handleDelete = (testId, status) => {
    showConfirm({
      title: 'Delete Test Paper',
      message: 'Are you sure you want to delete this test paper? This action cannot be undone.',
      confirmText: 'Delete',
      type: 'danger',
      onConfirm: () => {
        closeConfirm();
        executeDeleteTest(testId, status);
      },
    });
  };

  const handleEditAnswerKeys = (test) => {
    setEditingTest(test);
    setShowEditModal(true);
  };

  const handlePublish = (test) => {
    setPublishingTest(test);
    setShowPublishModal(true);
  };

  const handleViewResults = (testId) => {
    navigate(`/class/${classData.id}/test-papers/results/${testId}`);
  };

  const toggleNoteSelection = (noteId) => {
    setSelectedNotes(prev =>
      prev.includes(noteId)
        ? prev.filter(id => id !== noteId)
        : [...prev, noteId]
    );
  };

  const handleToggleTopicsInput = () => {
    setShowTopicsInput(!showTopicsInput);
    if (!showTopicsInput) {
      setSelectedNotes([]);
      setTopics([]);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 font-body text-ink">
        <Loader className="w-8 h-8 text-purple-600 animate-spin" />
        <span className="ml-3 text-ink-soft font-semibold">Loading test papers...</span>
      </div>
    );
  }

  return (
    <div className={isFullscreen ? "fixed inset-0 z-[100] bg-paper overflow-y-auto font-body" : "space-y-8 font-body"}>
      {/* FULLSCREEN STICKY TOP BAR */}
      {isFullscreen && (
        <div className="sticky top-0 z-10 bg-paper/80 backdrop-blur-md border-b border-line">
          <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-lg">📄</span>
              <h2 className="text-lg font-semibold font-display text-ink">Test Papers</h2>
              <span className="text-xs text-ink-soft">·</span>
              <span className="text-xs text-ink-soft">{drafts.length + published.length} total</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  onClick={(e) => { e.stopPropagation(); setShowFilterMenu(!showFilterMenu); setShowHeaderMenu(false); }}
                  className="flex items-center gap-2 h-9 px-3.5 bg-surface border border-line hover:bg-violet-50 hover:border-violet-200 hover:text-violet-700 dark:hover:bg-violet-900/20 dark:hover:border-violet-800 dark:hover:text-violet-300 rounded-lg transition-all cursor-pointer text-ink"
                >
                  <span className="text-sm font-medium capitalize">{viewFilter}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-inherit" />
                </button>
                <AnimatePresence>
                  {showFilterMenu && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -4 }}
                      transition={{ duration: 0.12 }}
                      className="absolute right-0 top-full mt-1.5 w-36 bg-surface rounded-xl shadow-xl border border-line py-1.5 z-50"
                    >
                      {["all", "published", "drafts"].map(filter => (
                        <button key={filter} type="button" onClick={(e) => { e.stopPropagation(); setViewFilter(filter); setShowFilterMenu(false); }}
                          className={`w-full flex items-center px-4 py-2 text-sm font-medium transition-colors cursor-pointer capitalize ${viewFilter === filter ? 'bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-300' : 'text-ink hover:bg-violet-50/50 dark:hover:bg-violet-900/10'}`}
                        >{filter}</button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="relative">
                <button
                  onClick={(e) => { e.stopPropagation(); setShowHeaderMenu(!showHeaderMenu); setShowFilterMenu(false); }}
                  className="flex items-center justify-center w-9 h-9 bg-surface border border-line hover:bg-violet-50 hover:border-violet-200 hover:text-violet-700 dark:hover:bg-violet-900/20 dark:hover:border-violet-800 dark:hover:text-violet-300 rounded-lg transition-all cursor-pointer text-ink"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
                <AnimatePresence>
                  {showHeaderMenu && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -4 }}
                      transition={{ duration: 0.12 }}
                      className="absolute right-0 top-full mt-1.5 w-52 bg-surface rounded-xl shadow-xl border border-line py-1.5 z-50"
                    >
                      <button type="button" onClick={() => { setShowHeaderMenu(false); navigate(`/class/${classData.id}/test-papers/upload-physical`); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-ink hover:bg-violet-50/50 dark:hover:bg-violet-900/10 transition-colors cursor-pointer"
                      >
                        <Upload className="w-4 h-4 text-violet-600" /><span>Upload Copies</span>
                      </button>
                      <button type="button" onClick={() => { setShowHeaderMenu(false); navigate(`/class/${classData.id}/test-papers/physical-results`); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-ink hover:bg-violet-50/50 dark:hover:bg-violet-900/10 transition-colors cursor-pointer"
                      >
                        <Eye className="w-4 h-4 text-blue-600" /><span>See Results</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <button onClick={() => setIsFullscreen(false)} className="flex items-center justify-center w-9 h-9 bg-surface border border-line hover:bg-violet-50 hover:border-violet-200 hover:text-violet-700 dark:hover:bg-violet-900/20 dark:hover:border-violet-800 dark:hover:text-violet-300 rounded-lg transition-all cursor-pointer text-ink" title="Exit Fullscreen">
                <Minimize className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={isFullscreen ? "max-w-5xl mx-auto px-6 py-6 space-y-8" : "space-y-8"}>
      {/* HEADER - shown in both modes but gradient only in non-fullscreen */}
      {!isFullscreen && (
      <div className="bg-surface rounded-2xl p-4 sm:p-6 border border-line">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold font-display text-ink mb-1">
              📄 Test Papers
            </h2>
            <p className="text-ink-soft text-[13px]">
              Create and manage test papers with AI-powered question generation
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowFilterMenu(!showFilterMenu);
                  setShowHeaderMenu(false);
                }}
                className="flex items-center gap-2 h-9 px-3.5 bg-surface border border-line hover:bg-violet-50 hover:border-violet-200 hover:text-violet-700 dark:hover:bg-violet-900/20 dark:hover:border-violet-800 dark:hover:text-violet-300 rounded-lg transition-all cursor-pointer text-ink"
              >
                <span className="text-sm font-medium capitalize">{viewFilter}</span>
                <ChevronDown className="w-3.5 h-3.5 text-inherit" />
              </button>

              <AnimatePresence>
                {showFilterMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                    transition={{ duration: 0.12 }}
                    className="absolute left-0 sm:right-0 sm:left-auto top-full mt-1.5 w-36 bg-surface rounded-xl shadow-xl border border-line py-1.5 z-50"
                  >
                    {["all", "published", "drafts"].map(filter => (
                      <button
                        key={filter}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewFilter(filter);
                          setShowFilterMenu(false);
                        }}
                        className={`w-full flex items-center px-4 py-2 text-sm font-medium transition-colors cursor-pointer capitalize ${viewFilter === filter ? 'bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-300' : 'text-ink hover:bg-violet-50/50 dark:hover:bg-violet-900/10'}`}
                      >
                        {filter}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsFullscreen(!isFullscreen);
              }}
              className="flex items-center justify-center w-9 h-9 bg-surface border border-line hover:bg-violet-50 hover:border-violet-200 hover:text-violet-700 dark:hover:bg-violet-900/20 dark:hover:border-violet-800 dark:hover:text-violet-300 rounded-lg transition-all cursor-pointer text-ink flex-shrink-0"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>

            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowHeaderMenu(!showHeaderMenu);
                  setShowCreateMenu(false);
                }}
                className="flex items-center justify-center w-9 h-9 bg-surface border border-line hover:bg-violet-50 hover:border-violet-200 hover:text-violet-700 dark:hover:bg-violet-900/20 dark:hover:border-violet-800 dark:hover:text-violet-300 rounded-lg transition-all cursor-pointer text-ink flex-shrink-0"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              <AnimatePresence>
                {showHeaderMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -8 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className="absolute right-0 top-full mt-2 w-56 bg-surface rounded-xl shadow-xl border border-line py-2 z-50 overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setShowHeaderMenu(false);
                        navigate(`/class/${classData.id}/test-papers/upload-physical`);
                      }}
                      className="dropdown-item w-full flex items-center gap-3 px-4 py-3 text-[15px] font-medium text-ink hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors cursor-pointer"
                    >
                      <Upload className="w-5 h-5 text-violet-600 dark:text-[#A78BFA]" />
                      <span>Upload Copies</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowHeaderMenu(false);
                        navigate(`/class/${classData.id}/test-papers/physical-results`);
                      }}
                      className="dropdown-item w-full flex items-center gap-3 px-4 py-3 text-[15px] font-medium text-ink hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors cursor-pointer"
                    >
                      <Eye className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      <span>See Results</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* EMPTY STATE */}
      {drafts.length === 0 && published.length === 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
          className="flex flex-col items-center justify-center py-16 px-4 bg-surface rounded-2xl border border-line text-center mt-4"
        >
          <div className="w-16 h-16 bg-violet-50 dark:bg-violet-900/20 rounded-full flex items-center justify-center mb-4">
            <FileText className="w-8 h-8 text-violet-500" />
          </div>
          <h3 className="text-lg font-semibold text-ink font-display mb-2">No Test Papers Here</h3>
          <p className="text-sm text-ink-soft max-w-md">
            You haven't created any test papers yet. Get started by creating your first one!
          </p>
        </motion.div>
      )}

      {/* ------------------- DRAFT TEST PAPERS ------------------- */}
      {(viewFilter === "all" || viewFilter === "drafts") && drafts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center gap-3 mb-4 font-body">
            <div className="w-2 h-8 bg-yellow-500 rounded-full"></div>
            <h3 className="text-lg sm:text-xl font-semibold font-display text-ink">Draft Test Papers</h3>
            <span className="px-3 py-1 bg-yellow-100 dark:bg-yellow-950/40 text-yellow-800 dark:text-yellow-350 text-xs sm:text-sm rounded-full font-semibold">
              {drafts.length}
            </span>
          </div>

          <div className="space-y-4">
            {drafts.map(test => (
              <motion.div
                key={test._id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
                className="bg-surface rounded-2xl border border-line p-4 sm:p-5 hover:shadow-lg transition-all font-body text-ink"
              >
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                  <div className="flex items-start gap-3 sm:gap-4 flex-1 w-full">
                    <div className="w-11 h-11 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center flex-shrink-0">
                      <FileText className="w-[22px] h-[22px] text-white" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="text-base font-semibold font-display text-ink mb-0.5 truncate">
                        {test.title}
                      </h4>

                      <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-[13px] text-ink-soft">
                        <span className="flex items-center gap-1">
                          <span className="font-bold text-violet-dark">
                            {test.questions?.length || 0}
                          </span>{' '}
                          questions
                        </span>
                        <span className="hidden sm:inline">•</span>
                        <span className="flex items-center gap-1">
                          <span className="font-bold text-violet-dark">
                            {test.totalMarks}
                          </span>{' '}
                          marks
                        </span>
                        <span className="hidden sm:inline">•</span>
                        <span className="px-2.5 py-1 bg-yellow-100 dark:bg-yellow-950/40 text-yellow-800 dark:text-yellow-350 text-xs rounded-full font-bold">
                          Draft
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="relative">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = e.currentTarget.getBoundingClientRect();
                        const spaceBelow = window.innerHeight - rect.bottom;
                        setMenuDirection(spaceBelow < 150 ? "up" : "down");
                        setOpenActionMenuId(openActionMenuId === test._id ? null : test._id);
                      }}
                      className="p-2 hover:bg-line rounded-lg transition-colors cursor-pointer text-ink-soft hover:text-ink"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </motion.button>
                    <AnimatePresence>
                      {openActionMenuId === test._id && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: menuDirection === "up" ? 4 : -4 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: menuDirection === "up" ? 4 : -4 }}
                          transition={{ duration: 0.12 }}
                          className={`absolute right-0 ${menuDirection === "up" ? "bottom-full mb-1.5" : "top-full mt-1.5"} w-40 bg-surface rounded-xl shadow-xl border border-line py-1.5 z-50 overflow-hidden`}
                        >
                          <button
                            type="button"
                            onClick={() => { setOpenActionMenuId(null); handleEditAnswerKeys(test); }}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm font-medium text-ink hover:bg-violet-50 dark:hover:bg-violet-900/20 hover:text-violet-700 dark:hover:text-violet-300 transition-colors cursor-pointer"
                          >
                            <Pencil className="w-4 h-4" />
                            <span>Edit Keys</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => { setOpenActionMenuId(null); handlePublish(test); }}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm font-medium text-ink hover:bg-violet-50 dark:hover:bg-violet-900/20 hover:text-violet-700 dark:hover:text-violet-300 transition-colors cursor-pointer"
                          >
                            <CheckCircle className="w-4 h-4" />
                            <span>Publish</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => { setOpenActionMenuId(null); handleDelete(test._id, 'draft'); }}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>Delete</span>
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ------------------- PUBLISHED TEST PAPERS ------------------- */}
      {(viewFilter === "all" || viewFilter === "published") && published.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <div className="flex items-center gap-3 mb-4 font-body">
            <div className="w-2 h-8 bg-green-500 rounded-full"></div>
            <h3 className="text-lg sm:text-xl font-semibold font-display text-ink">Published Test Papers</h3>
            <span className="px-3 py-1 bg-green-100 dark:bg-green-950/40 text-green-800 dark:text-green-300 text-xs sm:text-sm rounded-full font-semibold">
              {published.length}
            </span>
          </div>

          <div className="space-y-4">
            {published.map(test => (
              <motion.div
                key={test._id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
                className="bg-surface rounded-2xl border border-line p-4 sm:p-5 hover:shadow-lg transition-all font-body text-ink"
              >
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                  <div className="flex items-start gap-3 sm:gap-4 flex-1 w-full">
                    <div className="w-11 h-11 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center flex-shrink-0">
                      <FileText className="w-[22px] h-[22px] text-white" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="text-base font-semibold font-display text-ink mb-0.5 truncate">
                        {test.title}
                      </h4>

                      <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-[13px] text-ink-soft">
                        <span className="flex items-center gap-1">
                          <span className="font-bold text-violet-dark">
                            {test.questions?.length || 0}
                          </span>{' '}
                          questions
                        </span>
                        <span className="hidden sm:inline">•</span>
                        <span className="flex items-center gap-1">
                          <span className="font-bold text-violet-dark">
                            {test.totalMarks}
                          </span>{' '}
                          marks
                        </span>
                        <span className="hidden sm:inline">•</span>
                        <span className="px-2.5 py-1 bg-green-100 dark:bg-green-950/40 text-green-800 dark:text-green-300 text-xs rounded-full font-bold">
                          Published
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="relative">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = e.currentTarget.getBoundingClientRect();
                        const spaceBelow = window.innerHeight - rect.bottom;
                        setMenuDirection(spaceBelow < 150 ? "up" : "down");
                        setOpenActionMenuId(openActionMenuId === test._id ? null : test._id);
                      }}
                      className="p-2 hover:bg-line rounded-lg transition-colors cursor-pointer text-ink-soft hover:text-ink"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </motion.button>
                    <AnimatePresence>
                      {openActionMenuId === test._id && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: menuDirection === "up" ? 4 : -4 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: menuDirection === "up" ? 4 : -4 }}
                          transition={{ duration: 0.12 }}
                          className={`absolute right-0 ${menuDirection === "up" ? "bottom-full mb-1.5" : "top-full mt-1.5"} w-40 bg-surface rounded-xl shadow-xl border border-line py-1.5 z-50 overflow-hidden`}
                        >
                          <button
                            type="button"
                            onClick={() => { setOpenActionMenuId(null); handleViewResults(test._id); }}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm font-medium text-ink hover:bg-violet-50 dark:hover:bg-violet-900/20 hover:text-violet-700 dark:hover:text-violet-300 transition-colors cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                            <span>View Results</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => { setOpenActionMenuId(null); handleDelete(test._id, "published"); }}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>Delete</span>
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
      </div>{/* end max-w-5xl wrapper */}

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
            <div className="p-4 sm:p-6 border-b border-line flex items-center justify-between">
              <div>
                <h3 className="text-xl sm:text-2xl font-semibold font-display text-ink">
                  Generate Test Paper with AI
                </h3>
                <p className="text-sm text-ink-soft mt-1 hidden sm:block">
                  Select notes to generate test questions
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
              {/* Custom Title Group */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-ink-soft uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-600 dark:text-[#A78BFA]" />
                  Test Paper Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Unit 1 Class Test, Final Examination..."
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="w-full px-4 py-2 border border-line bg-paper text-ink rounded-xl outline-none focus:ring-2 focus:ring-purple-500 focus:bg-surface transition-all text-sm"
                  disabled={isGenerating}
                />
              </div>

              {/* Notes / Topics Selection Group */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="block text-xs font-bold text-ink-soft uppercase tracking-wider flex items-center gap-2">
                    {showTopicsInput ? (
                      <>
                        <Sparkles className="w-4 h-4 text-purple-600 dark:text-[#A78BFA]" />
                        Generate from Topics
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        Select Source Notes
                      </>
                    )}
                  </h4>
                  <AddTopicsButton
                    onClick={handleToggleTopicsInput}
                    isActive={showTopicsInput}
                    disabled={isGenerating}
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
                ) : loadingNotes ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader className="w-8 h-8 text-purple-600 animate-spin" />
                  </div>
                ) : availableNotes.length === 0 ? (
                  <div className="text-center py-10 bg-paper rounded-2xl border border-dashed border-line">
                    <p className="text-ink-soft text-sm">No notes found. Upload some first.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
                    {availableNotes.map(note => (
                      <label
                        key={note._id}
                        className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${
                          selectedNotes.includes(note._id)
                            ? 'border-purple-500 bg-violet-50 text-violet-dark shadow-sm'
                            : 'border-line bg-surface text-ink hover:border-purple-300'
                        } ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                  Advanced Question Count & Difficulty
                  {showAdvancedOptions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showAdvancedOptions && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-4 bg-paper p-4 rounded-2xl border border-line"
                  >
                    {/* Counts Table */}
                    <div className="space-y-3">
                      {/* Table Header */}
                      <div className="grid grid-cols-4 gap-2 text-[10px] font-bold text-ink-soft uppercase tracking-wider px-1">
                        <div className="col-span-1">Section</div>
                        <div className="text-center">Required</div>
                        <div className="text-center">Optional</div>
                        <div className="text-center">Total</div>
                      </div>

                      {/* Short Qs Row */}
                      <div className="grid grid-cols-4 gap-2 items-center bg-surface p-2 rounded-xl border border-line">
                        <div className="text-xs font-semibold text-ink">Short (2m)</div>
                        <select 
                          value={questionCounts.short.count}
                          onChange={(e) => {
                            const newCount = Number(e.target.value);
                            setQuestionCounts({
                              ...questionCounts, 
                              short: { 
                                count: newCount, 
                                optional: Math.min(questionCounts.short.optional, newCount) 
                              }
                            });
                          }}
                          className="p-1 bg-paper border border-line text-ink rounded-lg text-xs outline-none focus:ring-2 focus:ring-purple-500"
                          disabled={isGenerating}
                        >
                          {[0, 1, 2, 3, 4, 5, 8, 10].map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <select 
                          value={questionCounts.short.optional}
                          onChange={(e) => setQuestionCounts({...questionCounts, short: {...questionCounts.short, optional: Number(e.target.value)}})}
                          className="p-1 bg-violet-50 border border-purple-200 text-violet-dark rounded-lg text-xs outline-none cursor-pointer"
                          disabled={isGenerating || questionCounts.short.count === 0}
                        >
                          {Array.from({ length: questionCounts.short.count + 1 }, (_, i) => i).map(c => (
                            <option key={c} value={c}>+{c} Opt</option>
                          ))}
                        </select>
                        <div className="text-center text-xs font-bold text-ink">
                          {questionCounts.short.count + questionCounts.short.optional}
                        </div>
                      </div>

                      {/* Medium Qs Row */}
                      <div className="grid grid-cols-4 gap-2 items-center bg-surface p-2 rounded-xl border border-line">
                        <div className="text-xs font-semibold text-ink">Medium (5m)</div>
                        <select 
                          value={questionCounts.medium.count}
                          onChange={(e) => {
                            const newCount = Number(e.target.value);
                            setQuestionCounts({
                              ...questionCounts, 
                              medium: { 
                                count: newCount, 
                                optional: Math.min(questionCounts.medium.optional, newCount) 
                              }
                            });
                          }}
                          className="p-1 bg-paper border border-line text-ink rounded-lg text-xs outline-none focus:ring-2 focus:ring-purple-500"
                          disabled={isGenerating}
                        >
                          {[0, 1, 2, 3, 4, 5, 8].map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <select 
                          value={questionCounts.medium.optional}
                          onChange={(e) => setQuestionCounts({...questionCounts, medium: {...questionCounts.medium, optional: Number(e.target.value)}})}
                          className="p-1 bg-violet-50 border border-purple-200 text-violet-dark rounded-lg text-xs outline-none cursor-pointer"
                          disabled={isGenerating || questionCounts.medium.count === 0}
                        >
                          {Array.from({ length: questionCounts.medium.count + 1 }, (_, i) => i).map(c => (
                            <option key={c} value={c}>+{c} Opt</option>
                          ))}
                        </select>
                        <div className="text-center text-xs font-bold text-ink">
                          {questionCounts.medium.count + questionCounts.medium.optional}
                        </div>
                      </div>

                      {/* Long Qs Row */}
                      <div className="grid grid-cols-4 gap-2 items-center bg-surface p-2 rounded-xl border border-line">
                        <div className="text-xs font-semibold text-ink">Long (10m)</div>
                        <select 
                          value={questionCounts.long.count}
                          onChange={(e) => {
                            const newCount = Number(e.target.value);
                            setQuestionCounts({
                              ...questionCounts, 
                              long: { 
                                count: newCount, 
                                optional: Math.min(questionCounts.long.optional, newCount) 
                              }
                            });
                          }}
                          className="p-1 bg-paper border border-line text-ink rounded-lg text-xs outline-none focus:ring-2 focus:ring-purple-500"
                          disabled={isGenerating}
                        >
                          {[0, 1, 2, 3, 4].map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <select 
                          value={questionCounts.long.optional}
                          onChange={(e) => setQuestionCounts({...questionCounts, long: {...questionCounts.long, optional: Number(e.target.value)}})}
                          className="p-1 bg-violet-50 border border-purple-200 text-violet-dark rounded-lg text-xs outline-none cursor-pointer"
                          disabled={isGenerating || questionCounts.long.count === 0}
                        >
                          {Array.from({ length: questionCounts.long.count + 1 }, (_, i) => i).map(c => (
                            <option key={c} value={c}>+{c} Opt</option>
                          ))}
                        </select>
                        <div className="text-center text-xs font-bold text-ink">
                          {questionCounts.long.count + questionCounts.long.optional}
                        </div>
                      </div>
                    </div>

                    {/* Difficulty & Summary */}
                    <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
                      <div className="flex-1 w-full space-y-1">
                        <label className="text-xs font-bold text-ink-soft uppercase tracking-tight">Paper Difficulty</label>
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
                      
                      <div className="flex gap-2">
                        <div className="px-3 py-2 bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 rounded-xl text-sm font-bold flex flex-col items-center min-w-[90px] border border-line">
                          <span className="text-[9px] opacity-70">TOTAL Qs</span>
                          <span>{ 
                            (questionCounts.short.count + questionCounts.short.optional) + 
                            (questionCounts.medium.count + questionCounts.medium.optional) + 
                            (questionCounts.long.count + questionCounts.long.optional) 
                          }</span>
                        </div>
                        <div className="px-3 py-2 bg-violet-50 text-violet-dark rounded-xl text-sm font-bold flex flex-col items-center min-w-[90px] border border-line">
                          <span className="text-[9px] opacity-70">TOTAL MARKS</span>
                          <span>{ 
                            (questionCounts.short.count * 2) + 
                            (questionCounts.medium.count * 5) + 
                            (questionCounts.long.count * 10) 
                          }</span>
                        </div>
                      </div>
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
                type="button"
                onClick={handleGenerateWithAI}
                disabled={((showTopicsInput ? topics.length === 0 : selectedNotes.length === 0) || isGenerating)}
                className="w-full sm:flex-1 px-6 py-3 btn-settings-blue text-sm rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader className="w-5 h-5 animate-spin" />
                    Generating {
                      (questionCounts.short.count + questionCounts.short.optional) + 
                      (questionCounts.medium.count + questionCounts.medium.optional) + 
                      (questionCounts.long.count + questionCounts.long.optional)
                    } Qs...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    Generate Test ({
                      (questionCounts.short.count * 2) + 
                      (questionCounts.medium.count * 5) + 
                      (questionCounts.long.count * 10)
                    } Marks)
                  </span>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>

      {/* Edit Answer Keys Modal */}
      <AnimatePresence>
        {showEditModal && editingTest && (
          <EditAnswerKeysModal
            key="edit-test-modal"
            testPaper={editingTest}
            onClose={() => {
              setShowEditModal(false);
              setEditingTest(null);
            }}
            onSave={() => {
              setShowEditModal(false);
              setEditingTest(null);
              fetchTestPapers();
            }}
            showToast={showToast}
          />
        )}
      </AnimatePresence>

      {/* Publish Modal */}
      <AnimatePresence>
        {showPublishModal && publishingTest && (
          <PublishTestModal
            key="publish-test-modal"
            testPaper={publishingTest}
            onClose={() => {
              setShowPublishModal(false);
              setPublishingTest(null);
            }}
            onPublished={() => {
              setShowPublishModal(false);
              setPublishingTest(null);
              fetchTestPapers();
            }}
            showToast={showToast}
          />
        )}
      </AnimatePresence>

      {/* Create Manual Modal */}
      <AnimatePresence>
        {showManualModal && (
          <CreateManualTestModal
            key="create-manual-test-modal"
            classId={classData.id}
            onClose={() => setShowManualModal(false)}
            onCreated={(newTest) => {
              setShowManualModal(false);
              setDrafts((prev) => [newTest, ...prev]);
            }}
            showToast={showToast}
          />
        )}
      </AnimatePresence>

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

export default TestPapersPage;