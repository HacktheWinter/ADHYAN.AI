import React, { useState, useEffect, useRef } from "react";
import { useOutletContext, useParams } from "react-router-dom";
import {
  Upload,
  FileText,
  X,
  Download,
  Eye,
  Trash2,
  Loader,
  MoreVertical,
} from "lucide-react";
import {
  getNotesByClassroom,
  uploadNote,
  getNoteFileUrl,
  deleteNote,
} from "../api/notesApi";

import PdfPreview from "../components/PdfPreview";
import { motion, AnimatePresence } from "framer-motion";
import PageTransition from "../components/PageTransition";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 }
};

const NotesPage = () => {
  const { classId } = useParams();
  const { currentUser } = useOutletContext();

  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [previewNote, setPreviewNote] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);

  const [uploadForm, setUploadForm] = useState({
    title: "",
    file: null,
  });

  const menuRef = useRef(null);

  useEffect(() => {
    fetchNotes();
  }, [classId]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const response = await getNotesByClassroom(classId);
      setNotes(response.notes || []);
    } catch (error) {
      console.error("Error fetching notes:", error);
      alert("Failed to load notes");
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const allowedTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ];
      if (!allowedTypes.includes(file.type)) {
        alert("Only PDF, Word (.doc/.docx), and Excel (.xls/.xlsx) files are allowed");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        alert("File size must be less than 10MB");
        return;
      }
      setUploadForm({ ...uploadForm, file });
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();

    if (!uploadForm.title.trim()) {
      alert("Please enter a title");
      return;
    }

    if (!uploadForm.file) {
      alert("Please select a file");
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append("title", uploadForm.title.trim());
      formData.append("file", uploadForm.file);
      formData.append("uploadedBy", currentUser.name);
      formData.append("classroomId", classId);

      const response = await uploadNote(formData);

      setNotes([response.note, ...notes]);
      setUploadForm({ title: "", file: null });

      document.getElementById("file-upload").value = "";

      alert("Note uploaded successfully!");
    } catch (error) {
      console.error("Error uploading note:", error);
      alert(error.response?.data?.message || "Failed to upload note");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (noteId, noteTitle) => {
    if (!window.confirm(`Are you sure you want to delete "${noteTitle}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeleting(noteId);
      setOpenMenuId(null);

      await deleteNote(noteId);

      setNotes(notes.filter(note => note._id !== noteId));

      alert("Note deleted successfully!");
    } catch (error) {
      console.error("Error deleting note:", error);
      alert(error.response?.data?.message || "Failed to delete note");
    } finally {
      setDeleting(null);
    }
  };

  const handlePreview = (note) => {
    const isWord = note.mimetype === 'application/msword' || 
                   note.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
                   note.title?.toLowerCase().match(/\.(doc|docx)$/);
                   
    const isExcel = note.mimetype === 'application/vnd.ms-excel' || 
                    note.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                    note.title?.toLowerCase().match(/\.(xls|xlsx)$/);

    if (isWord) {
      const url = note.fileUrl || getNoteFileUrl(note.fileId);
      const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(url)}`;
      window.open(viewerUrl, "_blank");
      setOpenMenuId(null);
    } else if (isExcel) {
      const url = note.fileUrl || getNoteFileUrl(note.fileId);
      const viewerUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(url)}`;
      window.open(viewerUrl, "_blank");
      setOpenMenuId(null);
    } else {
      setPreviewNote(note);
      setOpenMenuId(null);
    }
  };

  const closePreview = () => {
    setPreviewNote(null);
  };

  const handleDownload = (note) => {
    const url = note.fileUrl || getNoteFileUrl(note.fileId);
    window.open(url, "_blank");
    setOpenMenuId(null);
  };

  const toggleMenu = (noteId) => {
    setOpenMenuId(openMenuId === noteId ? null : noteId);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] font-body text-ink">
        <div className="text-center">
          <Loader className="w-8 sm:w-12 h-8 sm:h-12 text-purple-600 animate-spin mx-auto mb-4" />
          <p className="text-ink-soft text-sm sm:text-base font-semibold">Loading notes...</p>
        </div>
      </div>
    );
  }

  return (
    <PageTransition className="space-y-6">
      {/* Upload Form */}
      <div className="bg-surface rounded-2xl border border-line shadow-sm">
        <div className="p-4 sm:p-6 font-body">
          <h3 className="text-base sm:text-lg font-semibold font-display text-ink mb-4">
            Upload New Note
          </h3>

          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-ink-soft uppercase tracking-wider mb-2">
                Note Title
              </label>
              <input
                type="text"
                value={uploadForm.title}
                onChange={(e) =>
                  setUploadForm({ ...uploadForm, title: e.target.value })
                }
                placeholder="Enter note title..."
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-line bg-paper text-ink rounded-xl outline-none focus:ring-2 focus:ring-purple-600 focus:bg-surface transition-all"
                disabled={uploading}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-ink-soft uppercase tracking-wider mb-2">
                Upload File (PDF, Word, Excel)
              </label>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <input
                  type="file"
                  id="file-upload"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={uploading}
                />
                <label
                  htmlFor="file-upload"
                  className="flex items-center gap-2 px-4 py-2 border border-line bg-surface text-ink hover:bg-line text-xs font-bold rounded-xl shadow-sm cursor-pointer w-full sm:w-auto justify-center sm:justify-start transition-colors"
                >
                  <Upload className="w-4 h-4 text-purple-600 dark:text-[#A78BFA]" />
                  Choose File
                </label>
                {uploadForm.file && (
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-ink w-full sm:w-auto">
                    <FileText className="w-4 h-4 flex-shrink-0 text-purple-600 dark:text-[#A78BFA]" />
                    <span className="truncate flex-1 font-semibold">{uploadForm.file.name}</span>
                    <span className="text-ink-soft flex-shrink-0 text-xs">
                      ({formatFileSize(uploadForm.file.size)})
                    </span>
                  </div>
                )}
              </div>
              <p className="text-xs text-ink-soft mt-1">
                PDF, Word, or Excel files up to 10MB are allowed
              </p>
            </div>

            <motion.button
              type="submit"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              disabled={
                uploading || !uploadForm.title.trim() || !uploadForm.file
              }
              className="w-full btn-settings-blue py-2.5 sm:py-3 text-sm sm:text-base rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload Note
                </>
              )}
            </motion.button>
          </form>
        </div>
      </div>

      {/* Notes List */}
      <div>
        <h3 className="text-base sm:text-lg font-semibold font-display text-ink mb-4">
          Uploaded Notes ({notes.length})
        </h3>

        {notes.length === 0 ? (
          <div className="bg-surface rounded-2xl border border-line p-8 sm:p-12 text-center font-body">
            <FileText className="w-12 h-12 sm:w-16 sm:h-16 text-line mx-auto mb-4" />
            <p className="text-ink font-semibold text-sm sm:text-base">No notes uploaded yet</p>
            <p className="text-ink-soft text-xs sm:text-sm mt-1">
              Upload your first note using the form above
            </p>
          </div>
        ) : (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-3"
          >
            {notes.map((note) => (
              <motion.div
                key={note._id}
                variants={itemVariants}
                whileHover={{ scale: 1.005 }}
                className="bg-surface rounded-2xl border border-line shadow-sm hover:shadow-md transition-shadow font-body"
              >
                <div className="p-4 sm:p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-violet-50 rounded-xl flex items-center justify-center flex-shrink-0 border border-line">
                      <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-violet-dark" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="text-base sm:text-lg font-semibold text-ink mb-1 truncate">
                        {note.title}
                      </h4>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-ink-soft">
                        <span className="truncate">Uploaded by {note.uploadedBy}</span>
                        <span className="hidden sm:inline">•</span>
                        <span className="text-xs">{formatDate(note.createdAt)}</span>
                      </div>
                    </div>

                    <div className="relative flex-shrink-0" ref={openMenuId === note._id ? menuRef : null}>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => toggleMenu(note._id)}
                        className="p-2 hover:bg-line rounded-lg transition-colors cursor-pointer text-ink-soft hover:text-ink"
                      >
                        <MoreVertical className="w-5 h-5" />
                      </motion.button>

                      <AnimatePresence>
                        {openMenuId === note._id && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.98, y: -2 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.98, y: -2 }}
                            transition={{ duration: 0.1 }}
                            className="absolute right-0 bottom-full mb-2 w-48 bg-surface rounded-xl shadow-lg border border-line py-1.5 z-10"
                          >
                            <button
                              onClick={() => handlePreview(note)}
                              className="dropdown-item w-full flex items-center gap-3 px-4 py-2.5 text-sm text-ink transition-colors cursor-pointer"
                            >
                              <Eye className="w-4 h-4 text-purple-600 dark:text-[#A78BFA]" />
                              <span>Preview</span>
                            </button>

                            <button
                              onClick={() => handleDownload(note)}
                              className="dropdown-item w-full flex items-center gap-3 px-4 py-2.5 text-sm text-ink transition-colors cursor-pointer"
                            >
                              <Download className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                              <span>Download</span>
                            </button>

                            <button
                              onClick={() => handleDelete(note._id, note.title)}
                              disabled={deleting === note._id}
                              className="dropdown-item-danger w-full flex items-center gap-3 px-4 py-2.5 text-sm text-rose-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                            >
                              {deleting === note._id ? (
                                <>
                                  <Loader className="w-4 h-4 animate-spin" />
                                  <span>Deleting...</span>
                                </>
                              ) : (
                                <>
                                  <Trash2 className="w-4 h-4" />
                                  <span>Delete</span>
                                </>
                              )}
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      {/* Preview Modal */}
      {previewNote && (
        <PdfPreview
          url={previewNote.fileUrl || getNoteFileUrl(previewNote.fileId)}
          title={previewNote.title}
          onClose={closePreview}
        />
      )}
    </PageTransition>
  );
};

export default NotesPage;