import React, { useState, useEffect } from "react";
import { useOutletContext, useParams, useNavigate } from "react-router-dom";
import {
  Send,
  Upload,
  FileText,
  X,
  Trash2,
  Loader,
  Paperclip,
  ArrowLeft,
  ChevronDown,
  Download,
} from "lucide-react";
import {
  createAnnouncement,
  getAnnouncements,
  deleteAnnouncement,
  getAnnouncementFileUrl,
} from "../api/announcementApi";
import Header from "../components/Header";

import PdfPreview from "../components/PdfPreview";

const Announcement = () => {
  const { classId } = useParams();

  const [currentUser, setCurrentUser] = useState(() => {
    return JSON.parse(localStorage.getItem("user") || "{}");
  });

  const navigate = useNavigate();

  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [message, setMessage] = useState("");
  const [file, setFile] = useState(null);

  const [deleting, setDeleting] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);
  const [className, setClassName] = useState("Class");

  useEffect(() => {
    fetchAnnouncements();
  }, [classId]);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const response = await getAnnouncements(classId);
      setAnnouncements(response.announcements || []);
    } catch (error) {
      console.error("Error fetching announcements:", error);
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
      alert("Please enter a message");
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
      setIsModalOpen(false);

      fetchAnnouncements();
    } catch (error) {
      console.error("Error posting announcement:", error);
      alert("Failed to post announcement");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this announcement?")) return;

    try {
      setDeleting(id);
      await deleteAnnouncement(id, currentUser.id || currentUser._id);
      setAnnouncements((prev) => prev.filter((a) => a._id !== id));
    } catch (error) {
      console.error("Error deleting announcement:", error);
      alert("Failed to delete announcement");
    } finally {
      setDeleting(null);
    }
  };

  const renderFilePreview = (fileId, mimeType, fileName) => {
    const url = getAnnouncementFileUrl(fileId);
    const isImage = mimeType?.startsWith("image/");
    const isPdf = mimeType === "application/pdf";

    if (isImage) {
      return (
        <div
          className="mt-2 relative group max-w-sm cursor-pointer"
          onClick={() => setPreviewFile({ url, type: "image", name: fileName })}
        >
          <img
            src={url}
            alt="Attachment"
            className="rounded-lg border border-gray-200 object-cover max-h-60 w-full sm:w-auto"
          />
        </div>
      );
    }

    return (
      <div
        className={`mt-2 flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-gray-50 border border-gray-200 rounded-lg ${isPdf ? "cursor-pointer hover:bg-gray-100 transition-colors" : ""}`}
        onClick={
          isPdf
            ? () => setPreviewFile({ url, type: "pdf", name: fileName })
            : undefined
        }
      >
        <div className="p-1.5 sm:p-2 bg-white rounded-md border border-gray-100 shadow-sm flex-shrink-0">
          <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-medium text-gray-700 truncate">
            {fileName || "Attachment"}
          </p>
          <p className="text-[10px] sm:text-xs text-gray-500">Document</p>
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 sm:p-2 text-gray-400 hover:text-purple-600 hover:bg-white rounded-full transition-all cursor-pointer flex-shrink-0"
          title="Download"
          onClick={(e) => e.stopPropagation()}
        >
          <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </a>
      </div>
    );
  };

  return (
    <div className="w-full bg-transparent">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => navigate(`/class/${classId}`)}
              className="p-1.5 sm:p-2 hover:bg-gray-200 rounded-full transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700" />
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                Announcements
              </h1>
              <p className="text-gray-500 text-xs sm:text-sm">
                Manage updates for your class
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 sm:px-6 py-2 sm:py-2.5 bg-purple-600 text-white font-semibold rounded-xl hover:bg-purple-700 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer text-sm sm:text-base w-full sm:w-auto"
          >
            <Send className="w-4 h-4" />
            Create Announcement
          </button>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Loader className="w-8 h-8 text-purple-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-500">Loading announcements...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-6 max-w-4xl mx-auto">
            {announcements.length === 0 ? (
              <div className="text-center py-12 sm:py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <p className="text-2xl sm:text-3xl">📢</p>
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                  No announcements yet
                </h3>
                <p className="text-sm sm:text-base text-gray-500 mt-1 px-4">
                  Click the button above to post your first update
                </p>
              </div>
            ) : (
              announcements.map((announcement) => (
                <div
                  key={announcement._id}
                  className="group bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
                >
                  <div className="p-4 sm:p-6">
                    <div className="flex items-start justify-between mb-3 sm:mb-4">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-base sm:text-lg shadow-sm flex-shrink-0">
                          {announcement.teacherId?.name?.charAt(0) || "T"}
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 text-sm sm:text-base">
                            {announcement.teacherId?.name || "Teacher"}
                          </h4>
                          <p className="text-[10px] sm:text-xs text-gray-500">
                            {new Date(
                              announcement.createdAt,
                            ).toLocaleDateString(undefined, {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDelete(announcement._id)}
                        disabled={deleting === announcement._id}
                        className="p-1.5 sm:p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100 flex-shrink-0"
                        title="Delete Announcement"
                      >
                        {deleting === announcement._id ? (
                          <Loader className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    <div className="sm:pl-[52px]">
                      <p className="text-gray-700 whitespace-pre-wrap leading-relaxed text-sm sm:text-base">
                        {announcement.message}
                      </p>

                      {announcement.fileId &&
                        renderFilePreview(
                          announcement.fileId,
                          announcement.mimeType,
                          announcement.fileName,
                        )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl transform transition-all scale-100 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 flex-shrink-0">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
                New Announcement
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 sm:p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handlePost}
              className="p-4 sm:p-6 flex-1 overflow-y-auto"
            >
              <div className="mb-4">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Announce something to your class"
                  className="w-full h-32 sm:h-40 p-0 text-base sm:text-lg text-gray-700 border-none outline-none resize-none placeholder:text-gray-400 focus:ring-0"
                  autoFocus
                />
              </div>

              {file && (
                <div className="mb-4 sm:mb-6 flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-purple-50 border border-purple-100 rounded-xl">
                  <div className="p-1.5 sm:p-2 bg-white rounded-lg shadow-sm flex-shrink-0">
                    <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                      {file.name}
                    </p>
                    <p className="text-[10px] sm:text-xs text-gray-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    className="p-1 hover:bg-purple-100 rounded-full text-purple-400 hover:text-purple-600 transition-colors cursor-pointer flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-gray-100 mt-2">
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    id="modal-file-upload"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  <label
                    htmlFor="modal-file-upload"
                    className="flex items-center gap-2 px-3 sm:px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors"
                  >
                    <Paperclip className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="text-xs sm:text-sm font-medium">
                      Attach File
                    </span>
                  </label>
                </div>

                <div className="flex items-center gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 sm:flex-none px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors cursor-pointer text-sm sm:text-base"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating || !message.trim()}
                    className="flex-1 sm:flex-none px-6 py-2 font-semibold rounded-lg transition-all cursor-pointer text-sm sm:text-base disabled:opacity-50 disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed bg-purple-600 text-white hover:bg-purple-700"
                    style={{ minWidth: "80px" }}
                  >
                    {creating ? (
                      <Loader className="w-4 h-4 animate-spin mx-auto" />
                    ) : (
                      "Post"
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
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
                className="max-w-full max-h-[85vh] rounded-lg shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              />
              <p className="text-white/80 mt-4 font-medium text-sm sm:text-base px-4 text-center">
                {previewFile.name}
              </p>
            </div>
          </div>
        ))}
    </div>
  );
};

export default Announcement;
