import React, { useState, useEffect } from "react";
import { useOutletContext, useParams } from "react-router-dom";
import { FileText, Download, Eye, X, Loader } from "lucide-react";
import axios from "axios";

import PdfPreview from "../components/PdfPreview";
import API_BASE_URL from "../config";

const StudentNotesPage = () => {
  const { id: classId } = useParams();
  const { classInfo } = useOutletContext();

  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [previewNote, setPreviewNote] = useState(null);

  // Fetch notes for this classroom
  useEffect(() => {
    fetchNotes();
  }, [classId]);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.get(
        `${API_BASE_URL}/notes/classroom/${classId}`
      );

      setNotes(response.data.notes || []);
    } catch (error) {
      console.error("Error fetching notes:", error);
      setError("Failed to load notes. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = (note) => {
    setPreviewNote(note);
  };

  const closePreview = () => {
    setPreviewNote(null);
  };

  const handleDownload = (note) => {
    const url = `${API_BASE_URL}/notes/file/${note.fileId}`;
    window.open(url, "_blank");
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader className="w-12 h-12 text-purple-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading notes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600 text-sm">{error}</p>
          <button
            onClick={fetchNotes}
            className="mt-2 text-sm text-red-700 underline hover:text-red-800"
          >
            Retry
          </button>
        </div>
      )}

      {/* Notes List */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Course Notes ({notes.length})
        </h3>

        {notes.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No notes available yet</p>
            <p className="text-gray-400 text-sm mt-1">
              Your teacher hasn't uploaded any notes for this class
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notes.map((note) => (
              <div
                key={note._id}
                className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText className="w-6 h-6 text-purple-600" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="text-lg font-semibold text-gray-900 mb-1">
                        {note.title}
                      </h4>
                      <div className="flex items-center gap-3 text-sm text-gray-500 mb-3">
                        <span>Uploaded by {note.uploadedBy}</span>
                        <span>•</span>
                        <span>{formatDate(note.createdAt)}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handlePreview(note)}
                          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                          Preview
                        </button>

                        <button
                          onClick={() => handleDownload(note)}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
                        >
                          <Download className="w-4 h-4" />
                          Download
                        </button>
                      </div>
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

        <PdfPreview
          url={`${API_BASE_URL}/notes/file/${previewNote.fileId}`}
          title={previewNote.title}
          onClose={closePreview}
        />

       
      )}
    </div>
  );
};

export default StudentNotesPage;
