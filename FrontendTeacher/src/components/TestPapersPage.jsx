// FrontendTeacher/src/components/TestPapersPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, Pencil, Trash2, CheckCircle, Eye, Loader, FileText, X, MoreVertical, Upload, Settings2, ChevronDown, ChevronUp } from 'lucide-react';
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
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);

  const [availableNotes, setAvailableNotes] = useState([]);
  const [selectedNotes, setSelectedNotes] = useState([]);

  // AI Gen Config states
  const [customTitle, setCustomTitle] = useState("");
  const [questionCounts, setQuestionCounts] = useState({ 
    short: { count: 5, optional: 0 }, 
    medium: { count: 4, optional: 0 }, 
    long: { count: 2, optional: 0 } 
  });
  const [difficulty, setDifficulty] = useState("mixed");
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  useEffect(() => {
    if (classData?.id) {
      fetchTestPapers();
    }
  }, [classData?.id]);

  useEffect(() => {
    const handleClickOutside = () => setShowHeaderMenu(false);
    if (showHeaderMenu) document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [showHeaderMenu]);

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
    // Reset config
    setCustomTitle("");
    setQuestionCounts({ 
      short: { count: 5, optional: 0 }, 
      medium: { count: 4, optional: 0 }, 
      long: { count: 2, optional: 0 } 
    });
    setDifficulty("mixed");
    setShowAdvancedOptions(false);

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
      const config = {
        customTitle: customTitle.trim(),
        counts: questionCounts,
        difficulty
      };

      const response = await generateTestPaperWithAI(selectedNotes, classData.id, config);

      setDrafts(prev => [response.testPaper, ...prev]);

      const usage = response.usage;
      const usageLine = usage
        ? `• Today usage: ${usage.used}/${usage.dailyLimit} (remaining: ${usage.remaining})\n`
        : "";

      alert(`Test Paper Generated!\n\n` +
        `Details:\n` +
        `• Questions: ${response.stats.questionsGenerated}\n` +
        `• Total Marks: ${response.stats.totalMarks}\n` +
        `• Difficulty: ${response.stats.difficulty}\n` +
        `• Notes processed: ${response.stats.processedNotes}/${response.stats.totalNotes}\n` +
        usageLine +
        (response.alert ? `\n${response.alert}` : "")
      );

      setSelectedNotes([]);
      setCustomTitle("");
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

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleOpenAIModal}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 sm:px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl cursor-pointer"
            >
              <Sparkles className="w-5 h-5" />
              <span>Create with AI</span>
            </button>

            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowHeaderMenu(!showHeaderMenu);
                }}
                className="flex items-center justify-center w-12 h-[3.2rem] bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer shadow-sm"
              >
                <MoreVertical className="w-5 h-5 text-indigo-700" />
              </button>

              {showHeaderMenu && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50">
                  <button
                    onClick={() => {
                      setShowHeaderMenu(false);
                      navigate(`/class/${classData.id}/test-papers/upload-physical`);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    Upload Copies
                  </button>
                  <button
                    onClick={() => {
                      setShowHeaderMenu(false);
                      navigate(`/class/${classData.id}/test-papers/physical-results`);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors cursor-pointer"
                  >
                    <Eye className="w-4 h-4" />
                    See Results
                  </button>
                </div>
              )}
            </div>
          </div>
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

                  <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto relative">
                    <button
                      onClick={() => handleViewResults(test._id)}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors cursor-pointer"
                    >
                      <Eye className="w-4 h-4" />
                      <span>View Results</span>
                    </button>

                    <button
                      onClick={() => handleDelete(test._id, "published")}
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

            {/* Body */}
            <div className="p-4 sm:p-6 flex-1 overflow-y-auto space-y-6">
              {/* Custom Title Group */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-600" />
                  Test Paper Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Unit 1 Class Test, Final Examination..."
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  disabled={isGenerating}
                />
              </div>

              {/* Notes Selection Group */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Upload className="w-4 h-4 text-blue-600" />
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
                  <div className="grid grid-cols-1 gap-2 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
                    {availableNotes.map(note => (
                      <label
                        key={note._id}
                        className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                          selectedNotes.includes(note._id)
                            ? 'border-indigo-600 bg-indigo-50 shadow-sm'
                            : 'border-gray-200 hover:border-gray-300'
                        } ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                  Advanced Question Count & Difficulty
                  {showAdvancedOptions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showAdvancedOptions && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-100"
                  >
                    {/* Counts Table */}
                    <div className="space-y-3">
                      {/* Table Header */}
                      <div className="grid grid-cols-4 gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">
                        <div className="col-span-1">Section</div>
                        <div className="text-center">Required</div>
                        <div className="text-center">Optional</div>
                        <div className="text-center">Total</div>
                      </div>

                      {/* Short Qs Row */}
                      <div className="grid grid-cols-4 gap-2 items-center bg-white p-2 rounded-lg border border-gray-100">
                        <div className="text-xs font-semibold text-gray-600">Short (2m)</div>
                        <select 
                          value={questionCounts.short.count}
                          onChange={(e) => {
                            const newCount = Number(e.target.value);
                            setQuestionCounts({
                              ...questionCounts, 
                              short: { 
                                count: newCount, 
                                optional: Math.min(questionCounts.short.optional, newCount) 
                              }
                            });
                          }}
                          className="p-1 bg-gray-50 border border-gray-200 rounded text-xs outline-none"
                          disabled={isGenerating}
                        >
                          {[0, 1, 2, 3, 4, 5, 8, 10].map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <select 
                          value={questionCounts.short.optional}
                          onChange={(e) => setQuestionCounts({...questionCounts, short: {...questionCounts.short, optional: Number(e.target.value)}})}
                          className="p-1 bg-purple-50 border border-purple-100 rounded text-xs outline-none cursor-pointer"
                          disabled={isGenerating || questionCounts.short.count === 0}
                        >
                          {Array.from({ length: questionCounts.short.count + 1 }, (_, i) => i).map(c => (
                            <option key={c} value={c}>+{c} Opt</option>
                          ))}
                        </select>
                        <div className="text-center text-xs font-bold text-gray-500">
                          {questionCounts.short.count + questionCounts.short.optional}
                        </div>
                      </div>

                      {/* Medium Qs Row */}
                      <div className="grid grid-cols-4 gap-2 items-center bg-white p-2 rounded-lg border border-gray-100">
                        <div className="text-xs font-semibold text-gray-600">Medium (5m)</div>
                        <select 
                          value={questionCounts.medium.count}
                          onChange={(e) => {
                            const newCount = Number(e.target.value);
                            setQuestionCounts({
                              ...questionCounts, 
                              medium: { 
                                count: newCount, 
                                optional: Math.min(questionCounts.medium.optional, newCount) 
                              }
                            });
                          }}
                          className="p-1 bg-gray-50 border border-gray-200 rounded text-xs outline-none"
                          disabled={isGenerating}
                        >
                          {[0, 1, 2, 3, 4, 5, 8].map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <select 
                          value={questionCounts.medium.optional}
                          onChange={(e) => setQuestionCounts({...questionCounts, medium: {...questionCounts.medium, optional: Number(e.target.value)}})}
                          className="p-1 bg-purple-50 border border-purple-100 rounded text-xs outline-none cursor-pointer"
                          disabled={isGenerating || questionCounts.medium.count === 0}
                        >
                          {Array.from({ length: questionCounts.medium.count + 1 }, (_, i) => i).map(c => (
                            <option key={c} value={c}>+{c} Opt</option>
                          ))}
                        </select>
                        <div className="text-center text-xs font-bold text-gray-500">
                          {questionCounts.medium.count + questionCounts.medium.optional}
                        </div>
                      </div>

                      {/* Long Qs Row */}
                      <div className="grid grid-cols-4 gap-2 items-center bg-white p-2 rounded-lg border border-gray-100">
                        <div className="text-xs font-semibold text-gray-600">Long (10m)</div>
                        <select 
                          value={questionCounts.long.count}
                          onChange={(e) => {
                            const newCount = Number(e.target.value);
                            setQuestionCounts({
                              ...questionCounts, 
                              long: { 
                                count: newCount, 
                                optional: Math.min(questionCounts.long.optional, newCount) 
                              }
                            });
                          }}
                          className="p-1 bg-gray-50 border border-gray-200 rounded text-xs outline-none"
                          disabled={isGenerating}
                        >
                          {[0, 1, 2, 3, 4, 5].map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <select 
                          value={questionCounts.long.optional}
                          onChange={(e) => setQuestionCounts({...questionCounts, long: {...questionCounts.long, optional: Number(e.target.value)}})}
                          className="p-1 bg-purple-50 border border-purple-100 rounded text-xs outline-none cursor-pointer"
                          disabled={isGenerating || questionCounts.long.count === 0}
                        >
                          {Array.from({ length: questionCounts.long.count + 1 }, (_, i) => i).map(c => (
                            <option key={c} value={c}>+{c} Opt</option>
                          ))}
                        </select>
                        <div className="text-center text-xs font-bold text-gray-500">
                          {questionCounts.long.count + questionCounts.long.optional}
                        </div>
                      </div>
                    </div>

                    {/* Difficulty & Summary */}
                    <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
                      <div className="flex-1 w-full space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-tight">Paper Difficulty</label>
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
                      
                      <div className="flex gap-2">
                        <div className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-bold flex flex-col items-center min-w-[90px]">
                          <span className="text-[9px] opacity-70">TOTAL Qs</span>
                          <span>{ 
                            (questionCounts.short.count + questionCounts.short.optional) + 
                            (questionCounts.medium.count + questionCounts.medium.optional) + 
                            (questionCounts.long.count + questionCounts.long.optional) 
                          }</span>
                        </div>
                        <div className="px-3 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm font-bold flex flex-col items-center min-w-[90px]">
                          <span className="text-[9px] opacity-70">TOTAL MARKS</span>
                          <span>{ 
                            (questionCounts.short.count * 2) + 
                            (questionCounts.medium.count * 5) + 
                            (questionCounts.long.count * 10) 
                          }</span>
                        </div>
                      </div>
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
                className="w-full sm:flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg cursor-pointer"
              >
                {isGenerating ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader className="w-5 h-5 animate-spin" />
                    Generating {
                      (questionCounts.short.count + questionCounts.short.optional) + 
                      (questionCounts.medium.count + questionCounts.medium.optional) + 
                      (questionCounts.long.count + questionCounts.long.optional)
                    } Qs...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    Generate Test ({
                      (questionCounts.short.count * 2) + 
                      (questionCounts.medium.count * 5) + 
                      (questionCounts.long.count * 10)
                    } Marks)
                  </span>
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