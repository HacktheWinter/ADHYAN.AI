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
} from "lucide-react";
import axios from "axios";
import { getNotesByClassroom } from "../api/notesApi";
import API_BASE_URL from "../config";
import PublishQuizModal from "./PublishQuizModal";
import EditQuizModal from "./EditQuizModal";
import AddTopicsButton from "./AddTopicsButton";
import TopicsInputCard from "./TopicsInputCard";

const QuizzesPage = () => {
  const { classId } = useParams();
  const navigate = useNavigate();

  const [drafts, setDrafts] = useState([]);
  const [published, setPublished] = useState([]);
  const [showAIModal, setShowAIModal] = useState(false);
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

  // Helper function to truncate title
  const truncateTitle = (title, maxLength = 50) => {
    if (title.length <= maxLength) return title;
    return title.substring(0, maxLength) + "...";
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

  const handleOpenAIModal = async () => {
    setShowAIModal(true);
    setTopics([]);
    setShowTopicsInput(false);
    setLoadingNotes(true);

    try {
      const response = await getNotesByClassroom(classId);
      setAvailableNotes(response.notes || []);
    } catch (error) {
      console.error("Error fetching notes:", error);
      alert("Failed to load notes");
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
      alert("Please add at least one topic");
      return;
    }

    setIsGenerating(true);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/quiz/generate-from-topics`,
        { topics, classroomId: classId },
        { headers: { "Content-Type": "application/json" } }
      );

      setDrafts((prev) => [response.data.quiz, ...prev]);

      const stats = response.data.stats;
      alert(
        `Quiz Generated Successfully!\n\n` +
          `Details:\n` +
          `• Questions: ${stats.questionsGenerated}\n` +
          `• Topics: ${stats.topics.join(", ")}`
      );

      setTopics([]);
      setShowTopicsInput(false);
      setShowAIModal(false);
    } catch (err) {
      console.error("Generation error:", err);
      alert(err.response?.data?.error || "Failed to generate quiz");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateWithAI = async () => {
    if (selectedNotes.length === 0) {
      alert("Please select at least one note");
      return;
    }

    setIsGenerating(true);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/quiz/generate-ai`,
        { noteIds: selectedNotes, classroomId: classId },
        { headers: { "Content-Type": "application/json" } }
      );

      setDrafts((prev) => [response.data.quiz, ...prev]);

      const stats = response.data.stats;
      alert(
        `Quiz Generated Successfully!\n\n` +
          `Details:\n` +
          `• Questions: ${stats.questionsGenerated}\n` +
          `• Notes processed: ${stats.processedNotes}/${stats.totalNotes}`
      );

      setSelectedNotes([]);
      setShowAIModal(false);
    } catch (err) {
      console.error("Generation error:", err);
      alert(err.response?.data?.error || "Failed to generate quiz");
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

  const handleSaveQuiz = async (updatedQuiz) => {
    try {
      await axios.put(`${API_BASE_URL}/quiz/${updatedQuiz._id}`, {
        title: updatedQuiz.title,
        questions: updatedQuiz.questions,
        status: updatedQuiz.status,
      });

      if (updatedQuiz.status === "draft") {
        setDrafts(drafts.map((q) => (q._id === updatedQuiz._id ? updatedQuiz : q)));
      } else {
        setPublished(published.map((q) => (q._id === updatedQuiz._id ? updatedQuiz : q)));
      }

      setEditingQuiz(null);
      setShowEditModal(false);
      alert("Quiz updated successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to update quiz");
    }
  };

  const handleDelete = async (id, status) => {
    if (!confirm("Are you sure you want to delete this quiz?")) return;

    try {
      await axios.delete(`${API_BASE_URL}/quiz/${id}`);

      if (status === "draft") {
        setDrafts(drafts.filter((q) => q._id !== id));
      } else {
        setPublished(published.filter((q) => q._id !== id));
      }

      alert("Quiz deleted successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to delete quiz");
    }
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
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 sm:p-6 border border-purple-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
              🎯 Quizzes
            </h2>
            <p className="text-gray-600 text-sm">
              Create and manage quizzes with AI-powered question generation
            </p>
          </div>

          <button
            onClick={handleOpenAIModal}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 sm:px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl cursor-pointer"
          >
            <Sparkles className="w-5 h-5" />
            <span>Create with AI</span>
          </button>
        </div>
      </div>

      {/* DRAFT QUIZZES */}
      {drafts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-2 h-8 bg-yellow-500 rounded-full"></div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-900">Draft Quizzes</h3>
            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs sm:text-sm rounded-full font-semibold">
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
                className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 hover:shadow-lg transition-all"
              >
                <div className="flex flex-col lg:flex-row items-start justify-between gap-4">
                  <div className="flex items-start gap-3 sm:gap-4 flex-1 w-full">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 
                        className="text-base sm:text-lg font-semibold text-gray-900 mb-1"
                        title={quiz.title}
                      >
                        {truncateTitle(quiz.title, 50)}
                      </h4>

                      <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <span className="font-medium text-purple-600">
                            {quiz.questions?.length || 0}
                          </span>{" "}
                          questions
                        </span>

                        <span className="hidden sm:inline">•</span>

                        {quiz.generatedFromTopics && quiz.generatedFromTopics.length > 0 ? (
                          <span className="flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full font-semibold">
                            <Tag className="w-3 h-3" />
                            From Topics
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-semibold">
                            <FileText className="w-3 h-3" />
                            From Notes
                          </span>
                        )}

                        <span className="hidden sm:inline">•</span>
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full font-semibold">
                          Draft
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                    <button
                      onClick={() => handleEdit(quiz)}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
                    >
                      <Pencil className="w-4 h-4" />
                      <span>Edit</span>
                    </button>

                    <button
                      onClick={() => handleDelete(quiz._id, "draft")}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete</span>
                    </button>

                    <button
                      onClick={() => handlePublish(quiz)}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors cursor-pointer"
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
          <div className="flex items-center gap-3 mb-4">
            <div className="w-2 h-8 bg-green-500 rounded-full"></div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-900">Published Quizzes</h3>
            <span className="px-3 py-1 bg-green-100 text-green-800 text-xs sm:text-sm rounded-full font-semibold">
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
                className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 hover:shadow-lg transition-all"
              >
                <div className="flex flex-col lg:flex-row items-start justify-between gap-4">
                  <div className="flex items-start gap-3 sm:gap-4 flex-1 w-full">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 
                        className="text-base sm:text-lg font-semibold text-gray-900 mb-1"
                        title={quiz.title}
                      >
                        {truncateTitle(quiz.title, 50)}
                      </h4>

                      <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <span className="font-medium text-purple-600">
                            {quiz.questions?.length || 0}
                          </span>{" "}
                          questions
                        </span>

                        <span className="hidden sm:inline">•</span>

                        {quiz.generatedFromTopics && quiz.generatedFromTopics.length > 0 ? (
                          <span className="flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full font-semibold">
                            <Tag className="w-3 h-3" />
                            From Topics
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-semibold">
                            <FileText className="w-3 h-3" />
                            From Notes
                          </span>
                        )}

                        <span className="hidden sm:inline">•</span>
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-semibold">
                          Published
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                    <button
                      onClick={() => handleViewResults(quiz._id)}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors cursor-pointer"
                    >
                      <Eye className="w-4 h-4" />
                      <span>View Results</span>
                    </button>

                    <button
                      onClick={() => handleDelete(quiz._id, "published")}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors cursor-pointer"
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
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
            {/* Header */}
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">
                  Generate Quiz with AI
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Select notes or add topics to generate quiz questions
                </p>
              </div>

              <button
                onClick={() => {
                  setShowAIModal(false);
                  setSelectedNotes([]);
                  setTopics([]);
                  setShowTopicsInput(false);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                disabled={isGenerating}
              >
                <X className="w-6 h-6 cursor-pointer" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-4 flex-1 overflow-y-auto">
              {/* Topics Input Card (shown when active) */}
              {showTopicsInput ? (
                <TopicsInputCard
                  topics={topics}
                  onAddTopic={handleAddTopic}
                  onRemoveTopic={handleRemoveTopic}
                  onBack={handleBackToNotes}
                  isGenerating={isGenerating}
                />
              ) : (
                <>
                  {/* Header with Add Topics Button */}
                  <div className="flex items-center justify-between mb-6">
                    <h4 className="text-lg font-semibold text-gray-900">
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
                    <div className="flex items-center justify-center py-16">
                      <Loader className="w-8 h-8 text-purple-600 animate-spin" />
                      <span className="ml-3 text-gray-600 font-medium">Loading notes...</span>
                    </div>
                  ) : availableNotes.length === 0 ? (
                    <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                      <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-600 font-semibold text-lg">No notes uploaded yet</p>
                      <p className="text-gray-500 text-sm mt-2">
                        Upload notes first or click "Help me write" button above
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {availableNotes.map((note) => (
                        <label
                          key={note._id}
                          className={`flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                            selectedNotes.includes(note._id)
                              ? "border-purple-500 bg-purple-50 shadow-md"
                              : "border-gray-200 hover:border-purple-300 hover:bg-purple-50/50"
                          } ${isGenerating ? "opacity-50 cursor-not-allowed" : ""}`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedNotes.includes(note._id)}
                            onChange={() => toggleNoteSelection(note._id)}
                            disabled={isGenerating}
                            className="w-5 h-5 text-purple-600 rounded border-gray-300 focus:ring-purple-600 cursor-pointer"
                          />
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                              <FileText className="w-6 h-6 text-purple-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-gray-900 text-base truncate">
                                {note.title}
                              </p>
                              <p className="text-sm text-gray-500 truncate">
                                Uploaded by {note.uploadedBy} •{" "}
                                {new Date(note.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => {
                  setShowAIModal(false);
                  setSelectedNotes([]);
                  setTopics([]);
                  setShowTopicsInput(false);
                }}
                disabled={isGenerating}
                className="w-full sm:flex-1 px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={showTopicsInput ? handleGenerateFromTopics : handleGenerateWithAI}
                disabled={
                  isGenerating ||
                  (showTopicsInput ? topics.length === 0 : selectedNotes.length === 0)
                }
                className="w-full sm:flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-lg hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg cursor-pointer"
              >
                {isGenerating ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader className="w-5 h-5 animate-spin" />
                    Generating...
                  </span>
                ) : showTopicsInput ? (
                  `Generate Quiz (${topics.length} ${topics.length === 1 ? 'topic' : 'topics'})`
                ) : (
                  `Generate Quiz (${selectedNotes.length} ${selectedNotes.length === 1 ? 'note' : 'notes'})`
                )}
              </button>
            </div>
          </div>
        </div>
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
        />
      )}

      {/* Publish Quiz Modal */}
      {showPublishModal && publishingQuiz && (
        <PublishQuizModal
          quiz={publishingQuiz}
          onClose={() => {
            setShowPublishModal(false);
            setPublishingQuiz(null);
          }}
          onPublished={handlePublished}
        />
      )}
    </div>
  );
};

export default QuizzesPage;