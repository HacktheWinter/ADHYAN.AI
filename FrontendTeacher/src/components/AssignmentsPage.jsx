// FrontendTeacher/src/components/AssignmentsPage.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { motion } from "framer-motion";
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

const AssignmentsPage = () => {
  const { classData } = useOutletContext();
  const navigate = useNavigate();

  const [drafts, setDrafts] = useState([]);
  const [published, setPublished] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showAIModal, setShowAIModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);

  const [editingAssignment, setEditingAssignment] = useState(null);
  const [publishingAssignment, setPublishingAssignment] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingNotes, setLoadingNotes] = useState(false);

  const [availableNotes, setAvailableNotes] = useState([]);
  const [selectedNotes, setSelectedNotes] = useState([]);

  // AI Gen Config
  const [customTitle, setCustomTitle] = useState("");
  const [questionCount, setQuestionCount] = useState(5);
  const [marksPerQuestion, setMarksPerQuestion] = useState(2);
  const [difficulty, setDifficulty] = useState("mixed");
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

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
      alert("Failed to load notes");
    } finally {
      setLoadingNotes(false);
    }
  };

  const handleGenerateWithAI = async () => {
    if (selectedNotes.length === 0) {
      alert("Please select at least one note");
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

      const response = await generateAssignmentWithAI(
        selectedNotes,
        classData.id,
        config
      );

      setDrafts((prev) => [response.assignment, ...prev]);

      alert(
        "Assignment Generated!\n\n" +
          "Details:\n" +
          `• Questions: ${response.stats.questionsGenerated}\n` +
          `• Marks per Q: ${response.stats.marksPerQuestion}\n` +
          `• Total Marks: ${response.stats.totalMarks}\n` +
          `• Difficulty: ${response.stats.difficulty}\n` +
          `• Notes processed: ${response.stats.processedNotes}/${response.stats.totalNotes}\n`
      );

      setSelectedNotes([]);
      setCustomTitle("");
      setShowAIModal(false);
    } catch (error) {
      console.error("Generation error:", error);
      alert(error.response?.data?.error || "Failed to generate assignment");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDelete = async (assignmentId, status) => {
    if (!confirm("Are you sure you want to delete this assignment?")) return;

    try {
      await deleteAssignment(assignmentId);

      if (status === "draft") {
        setDrafts(drafts.filter((a) => a._id !== assignmentId));
      } else {
        setPublished(published.filter((a) => a._id !== assignmentId));
      }

      alert("Assignment deleted successfully!");
    } catch (error) {
      console.error(error);
      alert("Failed to delete assignment");
    }
  };

  const handleEditAnswerKeys = (assignment) => {
    setEditingAssignment(assignment);
    setShowEditModal(true);
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
      <div className="flex items-center justify-center py-12">
        <Loader className="w-8 h-8 text-purple-600 animate-spin" />
        <span className="ml-3 text-gray-600">Loading assignments...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 sm:p-6 border border-indigo-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
              📝 Assignments
            </h2>
            <p className="text-gray-600 text-sm">
              Create and manage student assignments with AI-powered question
              generation
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

      {/* ------------------- DRAFT ASSIGNMENTS ------------------- */}
      {drafts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-2 h-8 bg-yellow-500 rounded-full"></div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-900">
              Draft Assignments
            </h3>
            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs sm:text-sm rounded-full font-semibold">
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
                className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 hover:shadow-lg transition-all"
              >
                <div className="flex flex-col lg:flex-row items-start justify-between gap-4">
                  <div className="flex items-start gap-3 sm:gap-4 flex-1 w-full">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="text-base sm:text-lg font-semibold text-gray-900 mb-1 truncate">
                        {assignment.title}
                      </h4>
                      {assignment.description && (
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                          {assignment.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <span className="font-medium text-indigo-600">
                            {assignment.questions?.length || 0}
                          </span>{" "}
                          questions
                        </span>
                        <span className="hidden sm:inline">•</span>

                        <span className="flex items-center gap-1">
                          <span className="font-medium text-indigo-600">
                            {assignment.totalMarks}
                          </span>{" "}
                          marks
                        </span>

                        <span className="hidden sm:inline">•</span>
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full font-semibold">
                          Draft
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                    <button
                      onClick={() => handleEditAnswerKeys(assignment)}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
                      title="Edit Answer Keys"
                    >
                      <Pencil className="w-4 h-4" />
                      <span>Edit</span>
                    </button>

                    <button
                      onClick={() => handleDelete(assignment._id, "draft")}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete</span>
                    </button>

                    <button
                      onClick={() => handlePublish(assignment)}
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

      {/* ------------------- PUBLISHED ASSIGNMENTS ------------------- */}
      {published.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-2 h-8 bg-green-500 rounded-full"></div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-900">
              Published Assignments
            </h3>
            <span className="px-3 py-1 bg-green-100 text-green-800 text-xs sm:text-sm rounded-full font-semibold">
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
                className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 hover:shadow-lg transition-all"
              >
                <div className="flex flex-col lg:flex-row items-start justify-between gap-4">
                  <div className="flex items-start gap-3 sm:gap-4 flex-1 w-full">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="text-base sm:text-lg font-semibold text-gray-900 mb-1 truncate">
                        {assignment.title}
                      </h4>
                      {assignment.description && (
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                          {assignment.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <span className="font-medium text-indigo-600">
                            {assignment.questions?.length || 0}
                          </span>{" "}
                          questions
                        </span>

                        <span className="hidden sm:inline">•</span>

                        <span className="flex items-center gap-1">
                          <span className="font-medium text-indigo-600">
                            {assignment.totalMarks}
                          </span>{" "}
                          marks
                        </span>

                        {assignment.dueDate && (
                          <>
                            <span className="hidden sm:inline">•</span>
                            <span className="text-orange-600 font-medium text-xs">
                              Due:{" "}
                              {new Date(
                                assignment.dueDate
                              ).toLocaleDateString()}
                            </span>
                          </>
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
                      onClick={() =>
                        navigate(
                          `/class/${classData.id}/assignments/results/${assignment._id}`
                        )
                      }
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors cursor-pointer"
                    >
                      <Eye className="w-4 h-4" />
                      <span>View Results</span>
                    </button>

                    <button
                      onClick={() => handleDelete(assignment._id, "published")}
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

      {/* ------------------- AI GENERATION MODAL ------------------- */}
      {showAIModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="p-4 sm:p-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900">
                  Generate Assignment with AI
                </h3>
                <p className="text-sm text-gray-600 mt-1 hidden sm:block">
                  Select notes to generate assignment questions
                </p>
              </div>

              <button
                onClick={() => {
                  setShowAIModal(false);
                  setSelectedNotes([]);
                }}
                className="text-gray-400 hover:text-gray-600"
                disabled={isGenerating}
              >
                <X className="w-6 h-6 cursor-pointer" />
              </button>
            </div>

            {/* Body */}
            {/* Body */}
            <div className="p-4 sm:p-6 flex-1 overflow-y-auto space-y-6">
              {/* Assignment Title */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-600" />
                  Assignment Title (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Chapter 1 Review, Weekly Homework..."
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  disabled={isGenerating}
                />
              </div>

              {/* Notes Selection Group */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  Select Source Notes
                </h4>

                {loadingNotes ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader className="w-8 h-8 text-purple-600 animate-spin" />
                  </div>
                ) : availableNotes.length === 0 ? (
                  <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                    <p className="text-gray-500 text-sm">No notes found. Upload some first.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                    {availableNotes.map((note) => (
                      <label
                        key={note._id}
                        className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                          selectedNotes.includes(note._id)
                            ? "border-indigo-600 bg-indigo-50 shadow-sm"
                            : "border-gray-200 hover:border-gray-300"
                        } ${isGenerating ? "opacity-50 cursor-not-allowed" : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedNotes.includes(note._id)}
                          onChange={() => toggleNoteSelection(note._id)}
                          disabled={isGenerating}
                          className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-600 cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 text-sm truncate">{note.title}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Advanced Customization Options */}
              <div className="border-t border-gray-100 pt-4">
                <button 
                  onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                  className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-purple-600 transition-colors mb-4"
                >
                  <Settings2 className="w-4 h-4" />
                  Advanced Question Options
                  {showAdvancedOptions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showAdvancedOptions && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100"
                  >
                    {/* Q Count */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-tight">Question Count</label>
                      <input 
                        type="number"
                        min="1"
                        max="10"
                        step="1"
                        value={questionCount}
                        onChange={(e) => setQuestionCount(clampQuestionCount(e.target.value))}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                        disabled={isGenerating}
                      />
                    </div>

                    {/* Marks Per Q */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-tight">Marks per Q</label>
                      <input 
                        type="number"
                        min="1"
                        max="10"
                        step="0.1"
                        value={marksPerQuestion}
                        onChange={(e) => setMarksPerQuestion(clampMarksPerQuestion(e.target.value))}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all"
                        disabled={isGenerating}
                      />
                    </div>

                    {/* Difficulty */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-tight flex justify-between">
                        Difficulty
                        <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-black">
                          {questionCount * marksPerQuestion} MARKS TOTAL
                        </span>
                      </label>
                      <select 
                        value={difficulty}
                        onChange={(e) => setDifficulty(e.target.value)}
                        className="w-full p-2 bg-white border border-gray-200 rounded-lg text-sm"
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
            <div className="p-4 sm:p-6 border-t border-gray-200 flex flex-col sm:flex-row gap-3 bg-gray-50 rounded-b-xl">
              <button
                onClick={() => {
                  setShowAIModal(false);
                  setSelectedNotes([]);
                }}
                disabled={isGenerating}
                className="w-full sm:flex-1 px-6 py-3 bg-white text-gray-700 font-semibold rounded-lg hover:bg-gray-100 border border-gray-200 transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>

              <button
                onClick={handleGenerateWithAI}
                disabled={selectedNotes.length === 0 || isGenerating}
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
                    Generate Assignment ({questionCount * marksPerQuestion} Marks)
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

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
        />
      )}
    </div>
  );
};

export default AssignmentsPage;