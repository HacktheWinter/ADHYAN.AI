// FrontendTeacher/src/components/CodingRoundPage.jsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useOutletContext, useNavigate, useParams, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

import {
  Plus,
  Code2,
  Clock,
  Eye,
  EyeOff,
  Trash2,
  Pencil,
  Users,
  ChevronDown,
  FileCode,
  CheckCircle,
  Loader,
  Send,
  X,
  ImagePlus,
  Maximize,
  Maximize2,
  Minimize,
  Minimize2,
  FileText,
  Calendar,
  AlertCircle,
  MoreVertical,
} from "lucide-react";
import {
  getCodingAssessmentsByClassroom,
  createCodingAssessment,
  deleteCodingAssessment,
  publishCodingAssessment,
  updateCodingAssessment,
  uploadReferenceImage,
} from "../api/codingAssessmentApi";
import ToastNotification from "./ToastNotification";
import ConfirmationCard from "./ConfirmationCard";

export default function CodingRoundPage() {
  useOutletContext();
  const { classId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewFilter, setViewFilter] = useState("all");

  const [drafts, setDrafts] = useState([]);
  const [published, setPublished] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [editingAssessment, setEditingAssessment] = useState(null);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [openActionMenuId, setOpenActionMenuId] = useState(null);
  const [menuDirection, setMenuDirection] = useState("down");

  // Toast & Confirmation state
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', confirmText: 'Confirm', cancelText: 'Cancel', type: 'danger', onConfirm: null });

  const showToast = useCallback((message, type = 'success') => setToast({ message, type }), []);
  const clearToast = useCallback(() => setToast({ message: '', type: 'success' }), []);
  const showConfirm = useCallback((opts) => setConfirmDialog({ isOpen: true, ...opts, confirmText: opts.confirmText || 'Confirm', cancelText: opts.cancelText || 'Cancel', type: opts.type || 'danger' }), []);
  const closeConfirm = useCallback(() => setConfirmDialog(prev => ({ ...prev, isOpen: false, onConfirm: null })), []);

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

  const fetchAssessments = useCallback(async (showLoader = false) => {
    try {
      if (showLoader) setLoading(true);
      const data = await getCodingAssessmentsByClassroom(classId);
      const all = data.assessments || [];
      setDrafts(all.filter(a => a.status !== "published"));
      setPublished(all.filter(a => a.status === "published"));
    } catch (error) {
      console.error("Error fetching coding assessments:", error);
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    fetchAssessments(true);
  }, [fetchAssessments]);

  useEffect(() => {
    if (location.state?.openCreate) {
      setShowCreateModal(true);
      window.history.replaceState({}, document.title)
    }
  }, [location.state]);

  const handleCreate = async (formData) => {
    try {
      await createCodingAssessment({ ...formData, classroomId: classId });
      showToast("Coding round created successfully!");
      setShowCreateModal(false);
      fetchAssessments();
    } catch (error) {
      console.error("Error creating coding assessment:", error);
      showToast("Failed to create coding round", "error");
    }
  };

  const handleUpdate = async (assessmentId, formData) => {
    try {
      await updateCodingAssessment(assessmentId, formData);
      showToast("Coding round updated successfully!");
      setEditingAssessment(null);
      fetchAssessments();
    } catch (error) {
      console.error("Error updating:", error);
      showToast("Failed to update", "error");
    }
  };

  const executeDelete = async (assessmentId, status) => {
    try {
      await deleteCodingAssessment(assessmentId);
      if (status === "published") {
        setPublished(prev => prev.filter(a => a._id !== assessmentId));
      } else {
        setDrafts(prev => prev.filter(a => a._id !== assessmentId));
      }
      showToast("Coding round deleted");
    } catch (error) {
      console.error("Error deleting:", error);
      showToast("Failed to delete", "error");
    }
  };

  const handleDelete = (assessmentId, status) => {
    showConfirm({
      title: 'Delete Coding Round',
      message: 'Are you sure you want to delete this coding round? This will permanently delete all student submissions. This action cannot be undone.',
      confirmText: 'Delete',
      type: 'danger',
      onConfirm: () => {
        closeConfirm();
        executeDelete(assessmentId, status);
      },
    });
  };

  const handlePublish = async (assessmentId, publishData) => {
    try {
      await publishCodingAssessment(assessmentId, publishData);
      showToast(
        publishData.status === "published"
          ? "Coding round published!"
          : "Coding round unpublished"
      );
      setShowPublishModal(false);
      setSelectedAssessment(null);
      fetchAssessments();
    } catch (error) {
      console.error("Error publishing:", error);
      showToast("Failed to publish", "error");
    }
  };

  const handleViewSubmissions = (assessmentId) => {
    navigate(`/class/${classId}/coding-round/submissions/${assessmentId}`);
  };

  const formatDate = (date) => {
    if (!date) return "Not set";
    return new Date(date).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 font-body text-ink">
        <Loader className="w-8 h-8 text-purple-600 animate-spin" />
        <span className="ml-3 text-ink-soft font-semibold">Loading coding rounds...</span>
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
              <span className="text-lg">💻</span>
              <h2 className="text-lg font-semibold font-display text-ink">Machine Coding Rounds</h2>
              <span className="text-xs text-ink-soft">·</span>
              <span className="text-xs text-ink-soft">{drafts.length + published.length} total</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  onClick={(e) => { e.stopPropagation(); setShowFilterMenu(!showFilterMenu); setShowCreateMenu(false); }}
                  className="flex items-center gap-2 h-9 px-3.5 bg-surface border border-line hover:bg-violet-50 hover:border-violet-200 hover:text-violet-700 dark:hover:bg-violet-900/20 dark:hover:border-violet-800 dark:hover:text-violet-300 rounded-lg transition-all cursor-pointer text-ink"
                >
                  <span className="text-sm font-medium capitalize">{viewFilter}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-inherit" />
                </button>
                <AnimatePresence>
                  {showFilterMenu && (
                    <motion.div initial={{ opacity: 0, scale: 0.95, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -4 }} transition={{ duration: 0.12 }}
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
              <button onClick={() => setIsFullscreen(false)} className="flex items-center justify-center w-9 h-9 bg-surface border border-line hover:bg-violet-50 hover:border-violet-200 hover:text-violet-700 dark:hover:bg-violet-900/20 dark:hover:border-violet-800 dark:hover:text-violet-300 rounded-lg transition-all cursor-pointer text-ink" title="Exit Fullscreen">
                <Minimize className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={isFullscreen ? "max-w-5xl mx-auto px-6 py-6 space-y-8" : "space-y-8"}>
      {!isFullscreen && (
      <div className="bg-surface rounded-2xl p-4 sm:p-6 border border-line">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold font-display text-ink mb-1">
              💻 Machine Coding Rounds
            </h2>
            <p className="text-ink-soft text-[13px]">
              Create and manage coding assessments for your students
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowFilterMenu(!showFilterMenu);
                  setShowCreateMenu(false);
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
            <Code2 className="w-8 h-8 text-violet-500" />
          </div>
          <h3 className="text-lg font-semibold text-ink font-display mb-2">No Coding Rounds Here</h3>
          <p className="text-sm text-ink-soft max-w-md">
            You haven't created any coding rounds yet. Get started by creating your first one!
          </p>
        </motion.div>
      )}

      {/* ------------------- DRAFT CODING ROUNDS ------------------- */}
      {(viewFilter === "all" || viewFilter === "drafts") && drafts.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-4 font-body">
            <div className="w-2 h-8 bg-yellow-500 rounded-full"></div>
            <h3 className="text-[15px] font-semibold font-display text-ink">Draft Coding Rounds</h3>
            <span className="px-3 py-1 bg-yellow-100 dark:bg-yellow-950/40 text-yellow-800 dark:text-yellow-350 text-xs rounded-full font-semibold">
              {drafts.length}
            </span>
          </div>

          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {drafts.map(assessment => (
                <motion.div
                  key={assessment._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="bg-surface rounded-2xl border border-line p-4 sm:p-5 hover:shadow-lg transition-all font-body text-ink"
                >
                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                    <div className="flex items-start gap-3 sm:gap-4 flex-1 w-full">
                      <div className="w-11 h-11 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Code2 className="w-[22px] h-[22px] text-white" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="text-base font-semibold font-display text-ink mb-0.5 truncate">
                          {assessment.title}
                        </h4>

                        <div className="flex flex-wrap items-center gap-3 text-[13px] text-ink-soft">
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span className="font-bold text-violet-dark">
                              {assessment.duration ? `${assessment.duration} min` : "No Time Limit"}
                            </span>
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
                              setOpenActionMenuId(openActionMenuId === assessment._id ? null : assessment._id);
                            }}
                            className="p-2 hover:bg-line rounded-lg transition-colors cursor-pointer text-ink-soft hover:text-ink"
                          >
                            <MoreVertical className="w-5 h-5" />
                          </motion.button>
                          <AnimatePresence>
                            {openActionMenuId === assessment._id && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: menuDirection === "up" ? 4 : -4 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: menuDirection === "up" ? 4 : -4 }}
                                transition={{ duration: 0.12 }}
                                className={`absolute right-0 ${menuDirection === "up" ? "bottom-full mb-1.5" : "top-full mt-1.5"} w-36 bg-surface rounded-xl shadow-xl border border-line py-1.5 z-50 overflow-hidden`}
                              >
                              <button
                                type="button"
                                onClick={() => { setOpenActionMenuId(null); setEditingAssessment(assessment); }}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm font-medium text-ink hover:bg-violet-50 dark:hover:bg-violet-900/20 hover:text-violet-700 dark:hover:text-violet-300 transition-colors cursor-pointer"
                              >
                                <Pencil className="w-4 h-4" />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => { 
                                  setOpenActionMenuId(null);
                                  setSelectedAssessment(assessment);
                                  setShowPublishModal(true);
                                }}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm font-medium text-ink hover:bg-violet-50 dark:hover:bg-violet-900/20 hover:text-violet-700 dark:hover:text-violet-300 transition-colors cursor-pointer"
                              >
                                <CheckCircle className="w-4 h-4" />
                                <span>Publish</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => { setOpenActionMenuId(null); handleDelete(assessment._id, 'draft'); }}
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
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* ------------------- PUBLISHED CODING ROUNDS ------------------- */}
      {(viewFilter === "all" || viewFilter === "published") && published.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-4 font-body">
            <div className="w-2 h-8 bg-green-500 rounded-full"></div>
            <h3 className="text-[15px] font-semibold font-display text-ink">Published Coding Rounds</h3>
            <span className="px-3 py-1 bg-green-100 dark:bg-green-950/40 text-green-800 dark:text-green-300 text-xs rounded-full font-semibold">
              {published.length}
            </span>
          </div>

          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {published.map(assessment => (
                <motion.div
                  key={assessment._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="bg-surface rounded-2xl border border-line p-4 sm:p-5 hover:shadow-lg transition-all font-body text-ink"
                >
                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                    <div className="flex items-start gap-3 sm:gap-4 flex-1 w-full">
                      <div className="w-11 h-11 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Code2 className="w-[22px] h-[22px] text-white" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="text-base font-semibold font-display text-ink mb-0.5 truncate">
                          {assessment.title}
                        </h4>

                        <div className="flex flex-wrap items-center gap-3 text-[13px] text-ink-soft">
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span className="font-bold text-violet-dark">
                              {assessment.duration ? `${assessment.duration} min` : "No Time Limit"}
                            </span>
                          </span>
                          {assessment.startTime && (
                            <>
                              <span className="hidden sm:inline">•</span>
                              <span className="flex items-center gap-1">
                                Start: {formatDate(assessment.startTime)}
                              </span>
                            </>
                          )}
                          {assessment.endTime && (
                            <>
                              <span className="hidden sm:inline">•</span>
                              <span className="flex items-center gap-1">
                                End: {formatDate(assessment.endTime)}
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

                      <div className="relative">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            const rect = e.currentTarget.getBoundingClientRect();
                            const spaceBelow = window.innerHeight - rect.bottom;
                            setMenuDirection(spaceBelow < 150 ? "up" : "down");
                            setOpenActionMenuId(openActionMenuId === assessment._id ? null : assessment._id);
                          }}
                          className="p-2 hover:bg-line rounded-lg transition-colors cursor-pointer text-ink-soft hover:text-ink"
                        >
                          <MoreVertical className="w-5 h-5" />
                        </motion.button>
                        <AnimatePresence>
                          {openActionMenuId === assessment._id && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95, y: menuDirection === "up" ? 4 : -4 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: menuDirection === "up" ? 4 : -4 }}
                              transition={{ duration: 0.12 }}
                              className={`absolute right-0 ${menuDirection === "up" ? "bottom-full mb-1.5" : "top-full mt-1.5"} w-48 bg-surface rounded-xl shadow-xl border border-line py-1.5 z-50 overflow-hidden`}
                            >
                              <button
                                type="button"
                                onClick={() => { setOpenActionMenuId(null); handleViewSubmissions(assessment._id); }}
                                className="w-full flex items-center gap-3 px-4 py-2 text-sm font-medium text-ink hover:bg-violet-50 dark:hover:bg-violet-900/20 hover:text-violet-700 dark:hover:text-violet-300 transition-colors cursor-pointer whitespace-nowrap"
                              >
                                <Eye className="w-4 h-4 shrink-0" />
                                <span>View Results</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => { setOpenActionMenuId(null); handleDelete(assessment._id, "published"); }}
                                className="w-full flex items-center gap-3 px-4 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors cursor-pointer whitespace-nowrap"
                              >
                                <Trash2 className="w-4 h-4 shrink-0" />
                                <span>Delete</span>
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}
      </div>{/* end max-w-5xl wrapper */}

      {/* Create/Edit Modal */}
      {(showCreateModal || editingAssessment) && (
        <CreateCodingRoundModal
          assessment={editingAssessment}
          onClose={() => {
            setShowCreateModal(false);
            setEditingAssessment(null);
          }}
          onSubmit={async (data) => {
            if (editingAssessment) {
              await handleUpdate(editingAssessment._id, data);
            } else {
              await handleCreate(data);
            }
          }}
        />
      )}

      {/* Publish Modal */}
      {showPublishModal && selectedAssessment && (
        <PublishModal
          assessment={selectedAssessment}
          onClose={() => {
            setShowPublishModal(false);
            setSelectedAssessment(null);
          }}
          onPublish={async (data) => {
            await handlePublish(selectedAssessment._id, data);
          }}
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
}

// ==================== EXPANDABLE TEXTAREA ====================

const ExpandableTextarea = ({ value, onChange, placeholder, title, isCode = false }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current && !isExpanded) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = Math.min(scrollHeight, 150) + 'px';
    }
  }, [value, isExpanded]);

  return (
    <>
      <div className="relative group">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full px-4 py-3 pr-10 border border-line bg-paper text-ink rounded-xl outline-none focus:ring-2 focus:ring-purple-500 focus:bg-surface transition-all text-sm resize-none overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] ${isCode ? "font-mono" : ""}`}
          style={{ minHeight: '6rem' }}
          spellCheck={!isCode}
        />
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className="absolute top-2 right-2 p-1.5 bg-surface shadow-sm border border-line rounded-lg text-ink-soft hover:text-purple-600 hover:bg-violet-50 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
          title="Expand to Full Screen"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {isExpanded && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-200">
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-line">
            <div className="flex items-center justify-between px-6 py-4 border-b border-line bg-paper">
              <h3 className="font-bold text-ink flex items-center gap-2">
                {isCode ? <Code2 className="w-5 h-5 text-purple-600" /> : <FileText className="w-5 h-5 text-purple-600" />}
                {title}
              </h3>
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="p-2 text-ink-soft hover:text-ink hover:bg-line rounded-full transition-colors"
              >
                <Minimize2 className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 flex-1 flex flex-col overflow-hidden">
              <textarea
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                className={`w-full h-full p-6 border-2 border-line rounded-xl bg-paper focus:bg-surface focus:ring-2 focus:ring-purple-500 outline-none resize-none text-base leading-relaxed transition-all shadow-inner [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] ${isCode ? "font-mono" : ""}`}
                spellCheck={!isCode}
              />
            </div>
            <div className="px-6 py-4 border-t border-line bg-paper flex justify-end">
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="px-6 py-2.5 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition-all flex items-center gap-2 cursor-pointer"
              >
                <CheckCircle className="w-5 h-5" /> Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// ==================== CREATE/EDIT MODAL ====================

function CreateCodingRoundModal({ assessment, onClose, onSubmit }) {
  const isEditing = !!assessment;
  const [form, setForm] = useState({
    title: assessment?.title || "",
    problemStatement: assessment?.problemStatement || "",
    requirements: assessment?.requirements || "",
    maxMarks: assessment?.maxMarks ?? 10,
    duration: assessment?.duration || 60,
    starterHtml:
      assessment?.starterHtml ||
      '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>My Project</title>\n</head>\n<body>\n  \n</body>\n</html>',
    starterCss: assessment?.starterCss || "/* Write your CSS here */\n",
    starterJs: assessment?.starterJs || "// Write your JavaScript here\n",
    referenceImageUrl: assessment?.referenceImageUrl || null,
  });
  const [activeCodeTab, setActiveCodeTab] = useState("html");
  const [submitting, setSubmitting] = useState(false);
  const [referenceImageFile, setReferenceImageFile] = useState(null);
  const [referenceImagePreview, setReferenceImagePreview] = useState(
    assessment?.referenceImageUrl || null
  );

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setReferenceImageFile(file);
      setReferenceImagePreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveImage = () => {
    setReferenceImageFile(null);
    setReferenceImagePreview(null);
    handleChange("referenceImageUrl", null);
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.problemStatement.trim()) return;
    setSubmitting(true);
    
    let updatedForm = { ...form };
    if (referenceImageFile) {
      try {
        const formData = new FormData();
        formData.append("image", referenceImageFile);
        const res = await uploadReferenceImage(formData);
        if (res.success) {
          updatedForm.referenceImageUrl = res.url;
        }
      } catch (error) {
        console.error("Failed to upload reference image", error);
      }
    }

    await onSubmit(updatedForm);
    setSubmitting(false);
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 transition-opacity duration-150"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className="bg-surface border border-line rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden font-body text-ink"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-line flex items-center justify-between">
          <div>
            <h3 className="text-xl sm:text-2xl font-semibold font-display text-ink">
              {isEditing ? "Edit Coding Round" : "Create Coding Round"}
            </h3>
            <p className="text-sm text-ink-soft mt-1 hidden sm:block">
              {isEditing ? "Update your coding assessment details" : "Set up a new machine coding assessment"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-ink-soft hover:text-ink cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 flex-1 overflow-y-auto space-y-5">
          {/* Title */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-ink-soft uppercase tracking-wider flex items-center gap-2">
              <Code2 className="w-4 h-4 text-purple-600 dark:text-[#A78BFA]" />
              Title *
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => handleChange("title", e.target.value)}
              placeholder="e.g., Build a Landing Page"
              className="w-full px-4 py-2 border border-line bg-paper text-ink rounded-xl outline-none focus:ring-2 focus:ring-purple-500 focus:bg-surface transition-all text-sm"
            />
          </div>

          {/* Problem Statement */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-ink-soft uppercase tracking-wider">
              Problem Statement *
            </label>
            <ExpandableTextarea
              value={form.problemStatement}
              onChange={(val) => handleChange("problemStatement", val)}
              placeholder="Describe the coding problem in detail..."
              title="Edit Problem Statement"
            />
          </div>

          {/* Requirements */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-ink-soft uppercase tracking-wider">
              Requirements / Instructions
            </label>
            <ExpandableTextarea
              value={form.requirements}
              onChange={(val) => handleChange("requirements", val)}
              placeholder="List specific requirements, constraints, or grading criteria..."
              title="Edit Requirements"
            />
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-bold text-ink-soft uppercase tracking-wider">Question Marks</label>
            <div className="inline-flex items-center gap-0 border-2 border-line rounded-xl overflow-hidden transition-all focus-within:border-violet-500 focus-within:ring-2 focus-within:ring-violet-500/20 bg-paper">
              <button
                type="button"
                onClick={() => {
                  const current = Number(form.maxMarks) || 1;
                  if (current > 1) handleChange("maxMarks", current - 1);
                }}
                className="flex items-center justify-center w-11 h-11 text-ink-soft hover:bg-violet-50 hover:text-violet-600 transition-colors cursor-pointer border-r border-line text-lg font-bold select-none"
                aria-label="Decrease marks"
              >
                −
              </button>
              <input
                type="number"
                min="1"
                value={form.maxMarks}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "" || Number(val) >= 1) handleChange("maxMarks", val);
                }}
                className="w-20 h-11 text-center text-lg font-bold text-ink bg-transparent outline-none border-none appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                aria-label="Maximum marks"
              />
              <button
                type="button"
                onClick={() => {
                  const current = Number(form.maxMarks) || 0;
                  handleChange("maxMarks", current + 1);
                }}
                className="flex items-center justify-center w-11 h-11 text-ink-soft hover:bg-violet-50 hover:text-violet-600 transition-colors cursor-pointer border-l border-line text-lg font-bold select-none"
                aria-label="Increase marks"
              >
                +
              </button>
              <span className="px-4 text-sm font-semibold text-ink-soft border-l border-line h-11 flex items-center bg-surface">marks</span>
            </div>
            <p className="text-xs text-ink-soft">Enter the maximum marks a student can be awarded for this question.</p>
          </div>

          {/* Reference Image */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-ink-soft uppercase tracking-wider">
              Reference / Preview Image (Optional)
            </label>
            {referenceImagePreview ? (
              <div className="relative inline-block border border-line rounded-xl overflow-hidden group">
                <img
                  src={referenceImagePreview}
                  alt="Reference Preview"
                  className="max-h-48 object-contain bg-paper"
                />
                <button
                  onClick={handleRemoveImage}
                  className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  title="Remove Image"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-line border-dashed rounded-xl cursor-pointer bg-paper hover:bg-surface transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <ImagePlus className="w-8 h-8 text-ink-soft mb-2" />
                    <p className="text-sm text-ink-soft font-semibold">
                      Click to upload an image
                    </p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                </label>
              </div>
            )}
            <p className="text-xs text-ink-soft mt-2">
              Upload an image showing the expected UI or design for this problem.
            </p>
          </div>

          {/* Starter Code */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-ink-soft uppercase tracking-wider">
              Starter Code (Optional)
            </label>
            <div className="border border-line rounded-xl overflow-hidden">
              <div className="flex border-b border-line bg-paper">
                {["html", "css", "js"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveCodeTab(tab)}
                    className={`px-5 py-2.5 text-sm font-semibold transition-colors cursor-pointer ${
                      activeCodeTab === tab
                        ? "text-purple-600 dark:text-[#A78BFA] bg-surface border-b-2 border-purple-600"
                        : "text-ink-soft hover:text-ink"
                    }`}
                  >
                    {tab.toUpperCase()}
                  </button>
                ))}
              </div>
              <ExpandableTextarea
                value={
                  activeCodeTab === "html"
                    ? form.starterHtml
                    : activeCodeTab === "css"
                    ? form.starterCss
                    : form.starterJs
                }
                onChange={(val) =>
                  handleChange(
                    activeCodeTab === "html"
                      ? "starterHtml"
                      : activeCodeTab === "css"
                      ? "starterCss"
                      : "starterJs",
                    val
                  )
                }
                placeholder={`Write starter ${activeCodeTab.toUpperCase()} code here...`}
                title={`Edit Starter ${activeCodeTab.toUpperCase()} Code`}
                isCode={true}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 border-t border-line flex flex-col sm:flex-row gap-3 bg-paper rounded-b-2xl">
          <button
            onClick={onClose}
            className="w-full sm:flex-1 px-6 py-3 bg-line text-ink font-bold rounded-xl hover:bg-line/80 transition-colors cursor-pointer text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !form.title.trim() || !form.problemStatement.trim()}
            className="w-full sm:flex-1 px-6 py-3 btn-settings-blue text-sm rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {submitting && <Loader className="w-4 h-4 animate-spin" />}
            {isEditing ? "Save Changes" : "Create Coding Round"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ==================== PUBLISH MODAL ====================

function PublishModal({ assessment, onClose, onPublish }) {
  const isPublished = assessment.status === "published";
  const [timingOption, setTimingOption] = useState("no-limit");
  const [duration, setDuration] = useState(60); // minutes
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [publishing, setPublishing] = useState(false);

  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 5);
    return now.toISOString().slice(0, 16);
  };

  const handlePublish = async () => {
    setPublishing(true);

    if (isPublished) {
      // Unpublish
      await onPublish({ status: "draft" });
    } else {
      let payload = {
        status: "published",
        duration: null,
        startTime: null,
        endTime: null,
      };

      if (timingOption === "duration") {
        if (!duration || duration < 1) {
          alert("Please enter a valid duration");
          setPublishing(false);
          return;
        }
        payload.duration = parseInt(duration);
        payload.startTime = new Date().toISOString();

        const end = new Date();
        end.setMinutes(end.getMinutes() + parseInt(duration));
        payload.endTime = end.toISOString();
      } else if (timingOption === "schedule") {
        if (!startTime || !endTime) {
          alert("Please select both start and end time");
          setPublishing(false);
          return;
        }

        const start = new Date(startTime);
        const end = new Date(endTime);
        const now = new Date();

        if (start < now) {
          alert("Start time cannot be in the past");
          setPublishing(false);
          return;
        }

        if (end <= start) {
          alert("End time must be after start time");
          setPublishing(false);
          return;
        }

        payload.startTime = start.toISOString();
        payload.endTime = end.toISOString();
        const durationMinutes = Math.floor((end - start) / 60000);
        payload.duration = durationMinutes;
      }

      await onPublish(payload);
    }

    setPublishing(false);
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 transition-opacity duration-150"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className="bg-surface border border-line rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col shadow-2xl font-body text-ink"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-line sticky top-0 bg-surface z-10 flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold font-display text-ink">
              {isPublished ? "Unpublish Coding Round" : "Publish Coding Round"}
            </h2>
            <p className="text-ink-soft text-sm mt-1">{assessment.title}</p>
          </div>
          <button
            onClick={onClose}
            disabled={publishing}
            className="text-ink-soft hover:text-ink disabled:opacity-50"
          >
            <X className="w-6 h-6 cursor-pointer" />
          </button>
        </div>

        <div className="p-6 space-y-6 flex-1 overflow-y-auto bg-surface">
          <div className="bg-violet-50 rounded-xl p-4 border border-line">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-5 h-5 text-violet-dark" />
              <span className="font-bold text-violet-dark">Assessment Information</span>
            </div>
            <p className="text-sm text-violet-dark font-medium">
              Coding Round • {assessment.problemStatement ? "Problem statement set" : "No problem statement"}
            </p>
          </div>

          {!isPublished ? (
            <div>
              <label className="block text-xs font-bold text-ink-soft uppercase tracking-wider mb-3">
                Set Assessment Timing
              </label>

              <div className="space-y-3">
                {/* No Time Limit */}
                <label
                  className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer transition-all ${
                    timingOption === "no-limit"
                      ? "border-violet-600 bg-violet-50 text-violet-dark shadow-sm"
                      : "border-line bg-surface text-ink hover:border-purple-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="timing"
                    value="no-limit"
                    checked={timingOption === "no-limit"}
                    onChange={(e) => setTimingOption(e.target.value)}
                    className="mt-1 text-purple-600 rounded border-line focus:ring-violet-600 cursor-pointer bg-paper"
                  />
                  <div className="flex-1">
                    <div className="font-bold text-ink mb-1">No Time Limit</div>
                    <p className="text-sm text-ink-soft">
                      Students can take this assessment anytime without time restrictions
                    </p>
                  </div>
                </label>

                {/* Duration */}
                <label
                  className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer transition-all ${
                    timingOption === "duration"
                      ? "border-violet-600 bg-violet-50 text-violet-dark shadow-sm"
                      : "border-line bg-surface text-ink hover:border-purple-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="timing"
                    value="duration"
                    checked={timingOption === "duration"}
                    onChange={(e) => setTimingOption(e.target.value)}
                    className="mt-1 text-purple-600 rounded border-line focus:ring-violet-600 cursor-pointer bg-paper"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="w-5 h-5 text-purple-600 dark:text-[#A78BFA]" />
                      <span className="font-bold text-ink">Set Duration</span>
                    </div>
                    <p className="text-sm text-ink-soft mb-3">
                      Students must complete within specified time from start
                    </p>

                    {timingOption === "duration" && (
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          min="1"
                          max="180"
                          value={duration}
                          onChange={(e) => setDuration(e.target.value)}
                          className="w-24 px-3 py-2 border border-line bg-paper text-ink rounded-xl outline-none focus:ring-2 focus:ring-purple-500"
                        />
                        <span className="text-sm text-ink-soft font-medium">minutes</span>
                      </div>
                    )}
                  </div>
                </label>

                {/* Schedule */}
                <label
                  className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer transition-all ${
                    timingOption === "schedule"
                      ? "border-violet-600 bg-violet-50 text-violet-dark shadow-sm"
                      : "border-line bg-surface text-ink hover:border-purple-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="timing"
                    value="schedule"
                    checked={timingOption === "schedule"}
                    onChange={(e) => setTimingOption(e.target.value)}
                    className="mt-1 text-purple-600 rounded border-line focus:ring-violet-600 cursor-pointer bg-paper"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="w-5 h-5 text-purple-600 dark:text-[#A78BFA]" />
                      <span className="font-bold text-ink">Schedule Assessment</span>
                    </div>
                    <p className="text-sm text-ink-soft mb-3">
                      Set specific start and end time for the assessment
                    </p>

                    {timingOption === "schedule" && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-bold text-ink-soft uppercase tracking-wider mb-1">
                            Start Time
                          </label>
                          <input
                            type="datetime-local"
                            min={getMinDateTime()}
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                            className="w-full px-3 py-2 border border-line bg-paper text-ink rounded-xl outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-ink-soft uppercase tracking-wider mb-1">
                            End Time
                          </label>
                          <input
                            type="datetime-local"
                            min={startTime || getMinDateTime()}
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                            className="w-full px-3 py-2 border border-line bg-paper text-ink rounded-xl outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </label>
              </div>

              <div className="bg-amber-50 border border-amber-250 rounded-xl p-4 mt-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-amber-900 mb-1">Important Note</p>
                    <p className="text-sm text-amber-800">
                      Once published, students will be able to see and attempt this coding round.
                      You cannot edit the problem or change timing after publishing.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <EyeOff className="w-16 h-16 text-amber-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-ink font-display mb-2">
                Unpublish Coding Round?
              </h3>
              <p className="text-ink-soft text-sm">
                Students will no longer be able to access this coding round.
              </p>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-line bg-paper sticky bottom-0 flex gap-3 rounded-b-2xl">
          <button
            onClick={onClose}
            disabled={publishing}
            className="flex-1 px-6 py-3 bg-line text-ink font-bold rounded-xl hover:bg-line/80 transition-colors disabled:opacity-50 cursor-pointer text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handlePublish}
            disabled={publishing}
            className="flex-1 px-6 py-3 btn-settings-blue text-sm rounded-xl font-bold disabled:opacity-50 transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            {publishing ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                {isPublished ? "Unpublishing..." : "Publishing..."}
              </>
            ) : (
              <>
                {isPublished ? <EyeOff className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                {isPublished ? "Unpublish Assessment" : "Publish Assessment"}
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
