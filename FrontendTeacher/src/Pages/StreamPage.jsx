// FrontendTeacher/src/Pages/StreamPage.jsx
import React, { useState, useEffect, useRef } from "react";
import { useOutletContext, useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Upload,
  FileText,
  X,
  Trash2,
  Loader,
  Paperclip,
  Download,
  Megaphone,
  MoreVertical,
  ClipboardList,
  Code2,
  FileCode,
  PenLine,
} from "lucide-react";
import {
  createAnnouncement,
  getAnnouncements,
  deleteAnnouncement,
  getAnnouncementFileUrl,
} from "../api/announcementApi";
import { getAssignmentsByClassroom } from "../api/assignmentApi";
import { getTestPapersByClassroom } from "../api/testPaperApi";
import { getCodingAssessmentsByClassroom } from "../api/codingAssessmentApi";
import { getNotesByClassroom } from "../api/notesApi";
import axios from "axios";
import API_BASE_URL from "../config";
import PdfPreview from "../components/PdfPreview";
import ToastNotification from "../components/ToastNotification";
import ConfirmationCard from "../components/ConfirmationCard";

const StreamPage = () => {
  const { classId } = useParams();
  const navigate = useNavigate();
  const { classData, currentUser } = useOutletContext();

  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [isComposerOpen, setIsComposerOpen] = useState(false);

  // Form State
  const [message, setMessage] = useState("");
  const [file, setFile] = useState(null);

  const [deleting, setDeleting] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);

  const [toast, setToast] = useState({ message: "", type: "success" });
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: "",
    message: "",
    confirmText: "Confirm",
    cancelText: "Cancel",
    type: "danger",
    onConfirm: null,
  });

  const showToast = (message, type = "success") => setToast({ message, type });
  const clearToast = () => setToast({ message: "", type: "success" });

  const showConfirm = (opts) =>
    setConfirmDialog({
      isOpen: true,
      ...opts,
      confirmText: opts.confirmText || "Confirm",
      cancelText: opts.cancelText || "Cancel",
      type: opts.type || "danger",
    });
  const closeConfirm = () =>
    setConfirmDialog((prev) => ({ ...prev, isOpen: false, onConfirm: null }));

  const composerRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    fetchAnnouncements();
  }, [classId]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const [
        announcementsRes,
        assignmentsRes,
        testPapersRes,
        codingRoundsRes,
        quizzesRes,
        notesRes,
      ] = await Promise.all([
        getAnnouncements(classId).catch(() => ({ announcements: [] })),
        getAssignmentsByClassroom(classId).catch(() => ({ assignments: [] })),
        getTestPapersByClassroom(classId).catch(() => ({ testPapers: [] })),
        getCodingAssessmentsByClassroom(classId).catch(() => ({ assessments: [] })),
        axios.get(`${API_BASE_URL}/quiz/classroom/${classId}`).then(r => r.data).catch(() => ({ quizzes: [] })),
        getNotesByClassroom(classId).catch(() => ({ notes: [] })),
      ]);

      const feed = [];
      
      (announcementsRes.announcements || []).forEach(item => {
        feed.push({ ...item, feedType: 'announcement' });
      });

      (assignmentsRes.assignments || []).forEach(item => {
        if (item.status === 'published') {
          feed.push({ ...item, feedType: 'assignment', createdAt: item.createdAt });
        }
      });

      (testPapersRes.testPapers || []).forEach(item => {
        if (item.status === 'published') {
          feed.push({ ...item, feedType: 'testPaper', createdAt: item.createdAt });
        }
      });

      (codingRoundsRes.assessments || []).forEach(item => {
        if (item.status === 'published') {
          feed.push({ ...item, feedType: 'codingRound', createdAt: item.createdAt });
        }
      });

      (quizzesRes.quizzes || []).forEach(item => {
        if (item.status === 'published') {
          feed.push({ ...item, feedType: 'quiz', createdAt: item.createdAt });
        }
      });

      (notesRes.notes || []).forEach(item => {
        feed.push({ ...item, feedType: 'note', createdAt: item.createdAt });
      });

      feed.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setAnnouncements(feed);
    } catch (error) {
      console.error("Error fetching feed:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.size > 10 * 1024 * 1024) {
        alert("File size must be less than 10MB");
        return;
      }
      setFile(selectedFile);
    }
  };

  const handlePost = async (e) => {
    e.preventDefault();

    if (!message.trim()) {
      showToast("Please enter a message", "error");
      return;
    }

    try {
      setCreating(true);

      const formData = new FormData();
      formData.append("teacherId", currentUser.id || currentUser._id);
      formData.append("classroomId", classId);
      formData.append("message", message.trim());
      if (file) {
        formData.append("file", file);
      }

      await createAnnouncement(formData);

      // Reset and Close
      setMessage("");
      setFile(null);
      setIsComposerOpen(false);

      showToast("Announcement created successfully!", "success");
      fetchAnnouncements();
    } catch (error) {
      console.error("Error posting announcement:", error);
      showToast(error.response?.data?.message || "Failed to post announcement", "error");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = (id) => {
    showConfirm({
      title: "Delete Announcement",
      message: "Are you sure you want to delete this announcement? This action cannot be undone.",
      confirmText: "Delete",
      onConfirm: async () => {
        try {
          setDeleting(id);
          setConfirmDialog((prev) => ({ ...prev, isLoading: true }));
          await deleteAnnouncement(id, currentUser.id || currentUser._id);
          setAnnouncements((prev) => prev.filter((a) => a._id !== id));
          showToast("Announcement deleted successfully!", "success");
          setConfirmDialog((prev) => ({ ...prev, isOpen: false, isLoading: false }));
        } catch (error) {
          console.error("Error deleting announcement:", error);
          showToast(error.response?.data?.message || "Failed to delete announcement", "error");
          setConfirmDialog((prev) => ({ ...prev, isLoading: false }));
        } finally {
          setDeleting(null);
        }
      },
    });
  };

  const renderFilePreview = (fileId, mimeType, fileName) => {
    const url = getAnnouncementFileUrl(fileId);
    const isImage = mimeType?.startsWith("image/");
    const isPdf = mimeType === "application/pdf";

    if (isImage) {
      return (
        <div
          className="mt-3 relative group inline-block cursor-pointer"
          onClick={() => setPreviewFile({ url, type: "image", name: fileName })}
        >
          <img
            src={url}
            alt="Attachment"
            className="rounded-xl border border-line object-contain max-h-[120px] sm:max-h-[140px] w-auto max-w-[240px] sm:max-w-xs bg-surface"
          />
        </div>
      );
    }

    return (
      <div
        className={`mt-3 flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 bg-paper border border-line rounded-xl ${isPdf ? "cursor-pointer hover:bg-violet-50 dark:hover:bg-violet-950/20 transition-colors" : ""}`}
        onClick={
          isPdf
            ? () => setPreviewFile({ url, type: "pdf", name: fileName })
            : undefined
        }
      >
        <div className="p-1.5 sm:p-2 bg-violet-50 dark:bg-violet-950/30 rounded-lg border border-line flex-shrink-0">
          <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-violet-700 dark:text-violet-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-semibold text-ink truncate">
            {fileName || "Attachment"}
          </p>
          <p className="text-[10px] sm:text-xs text-ink-soft">Document</p>
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 sm:p-2 text-ink-soft hover:text-violet-700 dark:hover:text-violet-400 hover:bg-surface rounded-lg transition-all cursor-pointer flex-shrink-0"
          title="Download"
          onClick={(e) => e.stopPropagation()}
        >
          <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </a>
      </div>
    );
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* ─── Announcement Composer ─── */}
      <div className="mb-6">
        {!isComposerOpen ? (
          <button
            onClick={() => setIsComposerOpen(true)}
            className="w-full flex items-center gap-3 px-5 py-4 bg-surface border border-line rounded-xl shadow-sm hover:shadow-md hover:border-purple-200 dark:hover:border-violet-700/40 transition-all cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
              {currentUser?.name?.charAt(0) || "T"}
            </div>
            <span className="text-ink-soft text-sm font-medium group-hover:text-ink transition-colors">
              Announce something to your class...
            </span>
          </button>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-surface border border-line rounded-xl shadow-md overflow-hidden"
            ref={composerRef}
          >
            <form onSubmit={handlePost}>
              <div className="p-4 sm:p-5">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Announce something to your class..."
                  className="w-full h-28 sm:h-32 bg-transparent resize-none outline-none text-ink placeholder:text-ink-soft/40 text-sm leading-relaxed"
                  autoFocus
                />

                {file && (
                  <div className="mt-3 flex items-center gap-2 sm:gap-3 p-2.5 bg-violet-50 dark:bg-violet-950/20 border border-line rounded-xl">
                    <div className="p-1.5 bg-surface rounded-lg border border-line flex-shrink-0">
                      <FileText className="w-4 h-4 text-violet-700 dark:text-violet-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-semibold text-ink truncate">
                        {file.name}
                      </p>
                      <p className="text-[10px] sm:text-xs text-ink-soft">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFile(null)}
                      className="p-1 hover:bg-violet-100 dark:hover:bg-violet-900/30 rounded-full text-violet-600 hover:text-violet-800 transition-colors cursor-pointer flex-shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-t border-line bg-paper/50">
                <div className="flex items-center gap-1">
                  <input
                    type="file"
                    id="stream-file-upload"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  <label
                    htmlFor="stream-file-upload"
                    className="flex items-center gap-2 px-3 py-1.5 text-ink-soft hover:text-ink hover:bg-surface rounded-lg cursor-pointer transition-colors text-sm font-medium"
                  >
                    <Paperclip className="w-4 h-4" />
                    <span className="hidden sm:inline">Attach</span>
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsComposerOpen(false);
                      setMessage("");
                      setFile(null);
                    }}
                    className="px-3 sm:px-4 py-1.5 text-ink-soft hover:text-ink hover:bg-surface rounded-lg transition-colors cursor-pointer text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating || !message.trim()}
                    className="px-4 sm:px-5 py-1.5 font-semibold rounded-lg transition-all cursor-pointer text-sm disabled:opacity-40 disabled:cursor-not-allowed bg-violet-700 text-white hover:bg-violet-800 dark:bg-violet-600 dark:hover:bg-violet-500 shadow-sm flex items-center gap-2"
                  >
                    {creating ? (
                      <Loader className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        Post
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        )}
      </div>

      {/* ─── Announcements Feed ─── */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <Loader className="w-7 h-7 text-violet-600 animate-spin mx-auto mb-3" />
            <p className="text-ink-soft text-sm font-medium">
              Loading announcements...
            </p>
          </div>
        </div>
      ) : announcements.length === 0 ? (
        <div className="text-center py-16 bg-surface rounded-xl border border-line">
          <div className="w-14 h-14 bg-violet-50 dark:bg-violet-950/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Megaphone className="w-7 h-7 text-violet-500" />
          </div>
          <h3 className="text-base font-semibold text-ink mb-1">
            No activity yet
          </h3>
          <p className="text-sm text-ink-soft max-w-sm mx-auto">
            Use the composer above to share updates, or create assignments, quizzes, and test papers to see them appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((item) => {
            if (item.feedType === 'announcement') {
              return (
            <motion.div
              key={`announcement-${item._id}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="group bg-surface rounded-xl border border-line hover:border-purple-100 dark:hover:border-violet-800/30 shadow-sm hover:shadow-md transition-all duration-200"
            >
              <div className="p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 mt-0.5">
                      {item.teacherId?.name?.charAt(0) || "T"}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-ink text-sm">
                          {item.teacherId?.name || "Teacher"}
                        </span>
                        <span className="text-ink-soft/40 text-xs">•</span>
                        <span className="text-xs text-ink-soft">
                          {formatDate(item.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* More Actions */}
                  <div className="relative flex-shrink-0" ref={openMenuId === item._id ? menuRef : null}>
                    <button
                      onClick={() => setOpenMenuId(openMenuId === item._id ? null : item._id)}
                      className="p-1.5 text-ink-soft hover:text-ink hover:bg-paper rounded-lg transition-colors cursor-pointer opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    <AnimatePresence>
                      {openMenuId === item._id && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="absolute right-0 top-full mt-1 w-40 bg-surface rounded-lg shadow-xl border border-line py-1 z-50"
                        >
                          <button
                            onClick={() => {
                              setOpenMenuId(null);
                              handleDelete(item._id);
                            }}
                            disabled={deleting === item._id}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-error hover:bg-error/5 transition-colors cursor-pointer"
                          >
                            {deleting === item._id ? (
                              <Loader className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                            <span>Delete</span>
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Message */}
                <div className="mt-2 sm:pl-12">
                  <p className="text-ink whitespace-pre-wrap leading-relaxed text-sm">
                    {item.message}
                  </p>

                  {item.fileId &&
                    renderFilePreview(
                      item.fileId,
                      item.mimeType,
                      item.fileName
                    )}
                </div>
              </div>
            </motion.div>
              );
            }

            // Other resource types
            let icon = null;
            let actionText = "";
            let redirectPath = "";
            let displayTitle = item.title || item.topic || "Untitled";

            switch (item.feedType) {
              case 'quiz':
                icon = <ClipboardList className="w-6 h-6 text-orange-500" />;
                actionText = "posted a new assessment:";
                redirectPath = `/class/${classId}/classwork/quizzes`;
                break;
              case 'assignment':
                icon = <PenLine className="w-6 h-6 text-orange-500" />;
                actionText = "posted a new assignment:";
                redirectPath = `/class/${classId}/classwork/assignments`;
                break;
              case 'testPaper':
                icon = <FileCode className="w-6 h-6 text-orange-500" />;
                actionText = "posted a new test paper:";
                redirectPath = `/class/${classId}/classwork/test-papers`;
                break;
              case 'codingRound':
                icon = <Code2 className="w-6 h-6 text-orange-500" />;
                actionText = "posted a new coding round:";
                redirectPath = `/class/${classId}/classwork/coding-round`;
                break;
              case 'note':
                icon = <FileText className="w-6 h-6 text-orange-500" />;
                actionText = "posted a new note:";
                redirectPath = `/class/${classId}/classwork/notes`;
                break;
              default:
                return null;
            }

            return (
              <motion.div
                key={`${item.feedType}-${item._id}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => navigate(redirectPath)}
                className="group flex items-center gap-4 bg-surface rounded-xl border border-line p-4 sm:p-5 hover:border-purple-200 dark:hover:border-violet-700/40 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer"
              >
                <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                  {icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-ink font-semibold text-sm truncate">
                    {currentUser?.name || "Teacher"} {actionText} {displayTitle}
                  </p>
                  <p className="text-ink-soft text-xs mt-0.5">
                    {formatDate(item.createdAt)}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Preview Overlay */}
      {previewFile &&
        (previewFile.type === "pdf" ? (
          <PdfPreview
            url={previewFile.url}
            title={previewFile.name}
            onClose={() => setPreviewFile(null)}
          />
        ) : (
          <div
            className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4"
            onClick={() => setPreviewFile(null)}
          >
            <div className="relative max-w-5xl w-full max-h-[90vh] flex flex-col items-center">
              <button
                onClick={() => setPreviewFile(null)}
                className="absolute -top-8 sm:-top-12 right-0 p-2 text-white/70 hover:text-white transition-colors"
              >
                <X className="w-6 h-6 sm:w-8 sm:h-8" />
              </button>
              <img
                src={previewFile.url}
                alt={previewFile.name}
                className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              />
              <p className="text-white/80 mt-4 font-medium text-sm sm:text-base px-4 text-center">
                {previewFile.name}
              </p>
            </div>
          </div>
        ))}

      <ToastNotification
        message={toast.message}
        type={toast.type}
        onClose={clearToast}
      />

      <ConfirmationCard
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        cancelText={confirmDialog.cancelText}
        onConfirm={confirmDialog.onConfirm}
        onCancel={closeConfirm}
        isLoading={confirmDialog.isLoading}
      />
    </div>
  );
};

export default StreamPage;
