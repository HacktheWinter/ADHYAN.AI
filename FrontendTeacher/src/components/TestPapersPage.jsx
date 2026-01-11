// FrontendTeacher/src/components/TestPapersPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, Pencil, Trash2, CheckCircle, Eye, Loader, FileText, X } from 'lucide-react';
import { 
  getTestPapersByClassroom, 
  deleteTestPaper,
  generateTestPaperWithAI
} from '../api/testPaperApi';
import { getNotesByClassroom } from '../api/notesApi';
import PublishTestModal from './PublishTestModal';
import EditAnswerKeysModal from './EditAnswerKeysModal';

const TestPapersPage = () => {
  const { classData } = useOutletContext();
  const navigate = useNavigate();

  const [drafts, setDrafts] = useState([]);
  const [published, setPublished] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAIModal, setShowAIModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [editingTest, setEditingTest] = useState(null);
  const [publishingTest, setPublishingTest] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingNotes, setLoadingNotes] = useState(false);

  const [availableNotes, setAvailableNotes] = useState([]);
  const [selectedNotes, setSelectedNotes] = useState([]);

  useEffect(() => {
    if (classData?.id) {
      fetchTestPapers();
    }
  }, [classData?.id]);

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

    try {
      const response = await getNotesByClassroom(classData.id);
      setAvailableNotes(response.notes || []);
    } catch (error) {
      console.error('Error fetching notes:', error);
      alert('Failed to load notes');
    } finally {
      setLoadingNotes(false);
    }
  };

  const handleGenerateWithAI = async () => {
    if (selectedNotes.length === 0) {
      alert('Please select at least one note');
      return;
    }

    setIsGenerating(true);

    try {
      const response = await generateTestPaperWithAI(selectedNotes, classData.id);

      setDrafts(prev => [response.testPaper, ...prev]);

      alert(`Test Paper Generated!\n\n` +
        `Details:\n` +
        `• Questions: ${response.stats.questionsGenerated}\n` +
        `• Total Marks: ${response.stats.totalMarks}\n` +
        `• Notes processed: ${response.stats.processedNotes}/${response.stats.totalNotes}`
      );

      setSelectedNotes([]);
      setShowAIModal(false);
    } catch (error) {
      console.error('Generation error:', error);
      alert(error.response?.data?.error || 'Failed to generate test paper');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDelete = async (testId, status) => {
    if (!confirm('Are you sure you want to delete this test paper?')) return;

    try {
      await deleteTestPaper(testId);

      if (status === 'draft') {
        setDrafts(drafts.filter(t => t._id !== testId));
      } else {
        setPublished(published.filter(t => t._id !== testId));
      }

      alert('Test paper deleted successfully!');
    } catch (error) {
      console.error(error);
      alert('Failed to delete test paper');
    }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-8 h-8 text-purple-600 animate-spin" />
        <span className="ml-3 text-gray-600">Loading test papers...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 sm:p-6 border border-blue-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
              📄 Test Papers
            </h2>
            <p className="text-gray-600 text-sm">
              Create and manage test papers with AI-powered question generation
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

      {/* ------------------- DRAFT TEST PAPERS ------------------- */}
      {drafts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-2 h-8 bg-yellow-500 rounded-full"></div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-900">Draft Test Papers</h3>
            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs sm:text-sm rounded-full font-semibold">
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
                className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 hover:shadow-lg transition-all"
              >
                <div className="flex flex-col lg:flex-row items-start justify-between gap-4">
                  <div className="flex items-start gap-3 sm:gap-4 flex-1 w-full">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="text-base sm:text-lg font-semibold text-gray-900 mb-1 truncate">
                        {test.title}
                      </h4>

                      <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <span className="font-medium text-indigo-600">
                            {test.questions?.length || 0}
                          </span>{' '}
                          questions
                        </span>
                        <span className="hidden sm:inline">•</span>
                        <span className="flex items-center gap-1">
                          <span className="font-medium text-indigo-600">
                            {test.totalMarks}
                          </span>{' '}
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
                      onClick={() => handleEditAnswerKeys(test)}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
                      title="Edit Answer Keys"
                    >
                      <Pencil className="w-4 h-4" />
                      <span>Edit</span>
                    </button>

                    <button
                      onClick={() => handleDelete(test._id, 'draft')}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete</span>
                    </button>

                    <button
                      onClick={() => handlePublish(test)}
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

      {/* ------------------- PUBLISHED TEST PAPERS ------------------- */}
      {published.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-2 h-8 bg-green-500 rounded-full"></div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-900">Published Test Papers</h3>
            <span className="px-3 py-1 bg-green-100 text-green-800 text-xs sm:text-sm rounded-full font-semibold">
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
                className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 hover:shadow-lg transition-all"
              >
                <div className="flex flex-col lg:flex-row items-start justify-between gap-4">
                  <div className="flex items-start gap-3 sm:gap-4 flex-1 w-full">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="text-base sm:text-lg font-semibold text-gray-900 mb-1 truncate">
                        {test.title}
                      </h4>

                      <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <span className="font-medium text-indigo-600">
                            {test.questions?.length || 0}
                          </span>{' '}
                          questions
                        </span>
                        <span className="hidden sm:inline">•</span>
                        <span className="flex items-center gap-1">
                          <span className="font-medium text-indigo-600">
                            {test.totalMarks}
                          </span>{' '}
                          marks
                        </span>
                        <span className="hidden sm:inline">•</span>
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-semibold">
                          Published
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                    <button
                      onClick={() => handleViewResults(test._id)}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors cursor-pointer"
                    >
                      <Eye className="w-4 h-4" />
                      <span>View Results</span>
                    </button>

                    <button
                      onClick={() => handleDelete(test._id, 'published')}
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
            <div className="p-4 sm:p-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900">
                  Generate Test Paper with AI
                </h3>
                <p className="text-sm text-gray-600 mt-1 hidden sm:block">
                  Select notes to generate test questions
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

            <div className="p-4 sm:p-6 flex-1 overflow-y-auto">
              <h4 className="font-semibold text-gray-900 mb-4">
                Select Source Notes
              </h4>

              {loadingNotes ? (
                <div className="flex items-center justify-center py-12">
                  <Loader className="w-8 h-8 text-purple-600 animate-spin" />
                  <span className="ml-3 text-gray-600">Loading notes...</span>
                </div>
              ) : availableNotes.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">No notes uploaded yet</p>
                  <p className="text-gray-400 text-sm mt-1">
                    Please upload notes first in the Notes tab
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {availableNotes.map(note => (
                    <label
                      key={note._id}
                      className={`flex items-center gap-3 sm:gap-4 p-3 sm:p-4 border rounded-lg cursor-pointer transition-all ${
                        selectedNotes.includes(note._id)
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      } ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedNotes.includes(note._id)}
                        onChange={() => toggleNoteSelection(note._id)}
                        disabled={isGenerating}
                        className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-600"
                      />
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm sm:text-base truncate">{note.title}</p>
                          <p className="text-xs sm:text-sm text-gray-500 truncate">
                            Uploaded by {note.uploadedBy} • {new Date(note.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 sm:p-6 border-t border-gray-200 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => {
                  setShowAIModal(false);
                  setSelectedNotes([]);
                }}
                disabled={isGenerating}
                className="w-full sm:flex-1 px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateWithAI}
                disabled={selectedNotes.length === 0 || isGenerating}
                className="w-full sm:flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                {isGenerating ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader className="w-4 h-4 animate-spin" />
                    Generating...
                  </span>
                ) : (
                  `Generate Test Paper (${selectedNotes.length} notes)`
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Answer Keys Modal */}
      {showEditModal && editingTest && (
        <EditAnswerKeysModal
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
        />
      )}

      {/* Publish Modal */}
      {showPublishModal && publishingTest && (
        <PublishTestModal
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
        />
      )}
    </div>
  );
};

export default TestPapersPage;