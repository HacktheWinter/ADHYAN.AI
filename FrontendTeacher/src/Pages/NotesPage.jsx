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
      if (file.type !== "application/pdf") {
        alert("Only PDF files are allowed");
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
    setPreviewNote(note);
    setOpenMenuId(null);
  };

  const closePreview = () => {
    setPreviewNote(null);
  };

  const handleDownload = (note) => {
    const url = getNoteFileUrl(note.fileId);
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
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader className="w-8 sm:w-12 h-8 sm:h-12 text-purple-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm sm:text-base">Loading notes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upload Form */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">
            Upload New Note
          </h3>

          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Note Title
              </label>
              <input
                type="text"
                value={uploadForm.title}
                onChange={(e) =>
                  setUploadForm({ ...uploadForm, title: e.target.value })
                }
                placeholder="Enter note title..."
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-600"
                disabled={uploading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                PDF File
              </label>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <input
                  type="file"
                  id="file-upload"
                  accept="application/pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={uploading}
                />
                <label
                  htmlFor="file-upload"
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 cursor-pointer transition-colors w-full sm:w-auto justify-center sm:justify-start"
                >
                  <Upload className="w-4 h-4" />
                  Choose File
                </label>
                {uploadForm.file && (
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600 w-full sm:w-auto">
                    <FileText className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate flex-1">{uploadForm.file.name}</span>
                    <span className="text-gray-400 flex-shrink-0">
                      ({formatFileSize(uploadForm.file.size)})
                    </span>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Only PDF files up to 10MB are allowed
              </p>
            </div>

            <button
              type="submit"
              disabled={
                uploading || !uploadForm.title.trim() || !uploadForm.file
              }
              className="w-full px-4 sm:px-6 py-2.5 sm:py-3 bg-purple-600 text-white text-sm sm:text-base font-semibold rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
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
            </button>
          </form>
        </div>
      </div>

      {/* Notes List */}
      <div>
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">
          Uploaded Notes ({notes.length})
        </h3>

        {notes.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 sm:p-12 text-center">
            <FileText className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium text-sm sm:text-base">No notes uploaded yet</p>
            <p className="text-gray-400 text-xs sm:text-sm mt-1">
              Upload your first note using the form above
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notes.map((note) => (
              <div
                key={note._id}
                className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="p-4 sm:p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="text-base sm:text-lg font-semibold text-gray-900 mb-1 truncate">
                        {note.title}
                      </h4>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-500">
                        <span className="truncate">Uploaded by {note.uploadedBy}</span>
                        <span className="hidden sm:inline">•</span>
                        <span className="text-xs">{formatDate(note.createdAt)}</span>
                      </div>
                    </div>

                    <div className="relative flex-shrink-0" ref={openMenuId === note._id ? menuRef : null}>
                      <button
                        onClick={() => toggleMenu(note._id)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                      >
                        <MoreVertical className="w-5 h-5 text-gray-600" />
                      </button>

                      {openMenuId === note._id && (
                        <div className="absolute right-0 bottom-full mb-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                          <button
                            onClick={() => handlePreview(note)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                          >
                            <Eye className="w-4 h-4 text-purple-600" />
                            <span>Preview</span>
                          </button>

                          <button
                            onClick={() => handleDownload(note)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                          >
                            <Download className="w-4 h-4 text-blue-600" />
                            <span>Download</span>
                          </button>

                          <button
                            onClick={() => handleDelete(note._id, note.title)}
                            disabled={deleting === note._id}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
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
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewNote && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white rounded-xl w-full max-w-6xl h-[95vh] sm:h-[90vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-3 sm:p-4 border-b">
              <h3 className="text-sm sm:text-lg font-semibold text-gray-900 truncate pr-2">
                {previewNote.title}
              </h3>
              <button
                onClick={closePreview}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0 cursor-pointer"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <iframe
                src={getNoteFileUrl(previewNote.fileId)}
                className="w-full h-full"
                title="PDF Preview"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotesPage;