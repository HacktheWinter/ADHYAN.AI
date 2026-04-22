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

  // Quiz customization state
  const [customTitle, setCustomTitle] = useState("");
  const [questionCount, setQuestionCount] = useState(20);
  const [marksPerQuestion, setMarksPerQuestion] = useState(1);
  const [difficulty, setDifficulty] = useState("mixed");
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

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
      alert(
        `Quiz Generated Successfully!\n\n` +
          `Details:\n` +
          `• Questions: ${stats.questionsGenerated}\n` +
          `• Marks per Q: ${stats.marksPerQuestion}\n` +
          `• Total Marks: ${stats.totalMarks}\n` +
          `• Difficulty: ${stats.difficulty}\n` +
          `• Topics: ${stats.topics.join(", ")}\n`
      );

      setTopics([]);
      setCustomTitle("");
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
      alert(
        `Quiz Generated Successfully!\n\n` +
          `Details:\n` +
          `• Questions: ${stats.questionsGenerated}\n` +
          `• Marks per Q: ${stats.marksPerQuestion}\n` +
          `• Total Marks: ${stats.totalMarks}\n` +
          `• Difficulty: ${stats.difficulty}\n` +
          `• Notes processed: ${stats.processedNotes}/${stats.totalNotes}\n`
      );

      setSelectedNotes([]);
      setCustomTitle("");
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
            <div className="px-6 py-4 flex-1 overflow-y-auto space-y-6">
              {/* Quiz Title Setup - Always Visible */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-600" />
                  Quiz Title (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Midterm Physics Quiz, Weekly Math Test..."
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
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
                    <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <Tag className="w-4 h-4 text-blue-600" />
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
                    <div className="text-center py-10 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                      <p className="text-gray-500 text-sm">No notes available. Use "Help me write" instead.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                      {availableNotes.map((note) => (
                        <label
                          key={note._id}
                          className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${
                            selectedNotes.includes(note._id)
                              ? "border-purple-500 bg-purple-50"
                              : "border-gray-200 hover:border-purple-300"
                          } ${isGenerating ? "opacity-50 cursor-not-allowed" : ""}`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedNotes.includes(note._id)}
                            onChange={() => toggleNoteSelection(note._id)}
                            disabled={isGenerating}
                            className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-600 cursor-pointer"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 text-sm truncate">
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
              <div className="border-t border-gray-100 pt-4">
                <button
                  onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                  className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-purple-600 transition-colors mb-4"
                >
                  <Settings2 className="w-4 h-4" />
                  Advanced Generation Options
                  {showAdvancedOptions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showAdvancedOptions && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100"
                  >
                    {/* Question Count */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Number of Qs</label>
                      <select
                        value={questionCount}
                        onChange={(e) => setQuestionCount(Number(e.target.value))}
                        className="w-full p-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500"
                        disabled={isGenerating}
                      >
                        {[5, 10, 15, 20].map(count => (
                          <option key={count} value={count}>{count} Questions</option>
                        ))}
                      </select>
                    </div>

                    {/* Marks Per Question */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Marks per Q</label>
                      <select
                        value={marksPerQuestion}
                        onChange={(e) => setMarksPerQuestion(Number(e.target.value))}
                        className="w-full p-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500"
                        disabled={isGenerating}
                      >
                        {[1, 2, 3, 4, 5].map(marks => (
                          <option key={marks} value={marks}>{marks} {marks === 1 ? 'Mark' : 'Marks'}</option>
                        ))}
                      </select>
                    </div>

                    {/* Difficulty Level */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Difficulty</label>
                      <select
                        value={difficulty}
                        onChange={(e) => setDifficulty(e.target.value)}
                        className="w-full p-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500"
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