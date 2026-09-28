import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  ChevronLeft,
  Loader,
  User,
  Award,
  CheckCircle,
  AlertTriangle,
  Layers,
  ChevronDown,
  Camera,
  X,
} from "lucide-react";
import axios from "axios";
import API_BASE_URL from "../config";

const StudentQuizResult = () => {
  const { classId, quizId, studentId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [submission, setSubmission] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [imageLoadError, setImageLoadError] = useState(false);
  const [selectedSection, setSelectedSection] = useState('all');
  const [sectionDropdownOpen, setSectionDropdownOpen] = useState(false);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const sectionDropdownRef = useRef(null);

  // Close section dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (sectionDropdownRef.current && !sectionDropdownRef.current.contains(e.target)) {
        setSectionDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    fetchSubmission();
  }, []);

  const fetchSubmission = async () => {
    try {
      setLoading(true);

      // Get submissionId from location state or fetch by studentId
      const submissionId = location.state?.submissionId;

      let response;
      if (submissionId) {
        response = await axios.get(
          `${API_BASE_URL}/quiz-submission/submission/${submissionId}`
        );
      } else {
        // Fallback: get all submissions and find by studentId
        const allSubs = await axios.get(
          `${API_BASE_URL}/quiz-submission/quiz/${quizId}`
        );
        const found = allSubs.data.submissions.find(
          (s) => (s.studentId._id || s.studentId) === studentId
        );
        if (found) {
          response = { data: { submission: found } };
        }
      }

      const submissionData = response.data.submission;
      setSubmission(submissionData);

      // Get quiz details
      if (submissionData?.quizId?._id) {
        setQuiz(submissionData.quizId);
      } else {
        const quizResponse = await axios.get(
          `${API_BASE_URL}/quiz/${quizId}`
        );
        setQuiz(quizResponse.data);
      }
    } catch (error) {
      console.error("Error fetching submission:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center font-body text-ink">
        <Loader className="w-12 h-12 text-violet-dark animate-spin" />
      </div>
    );
  }

  if (!submission || !quiz) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center font-body text-ink">
        <div className="text-center px-4">
          <p className="text-ink font-semibold font-display">Submission not found</p>
          <button
            onClick={() =>
              navigate(`/class/${classId}/quizzes/results/${quizId}`)
            }
            className="mt-4 px-6 py-3 btn-settings-blue text-sm rounded-xl font-bold transition cursor-pointer"
          >
            Back to Results
          </button>
        </div>
      </div>
    );
  }

  // Build section data for filtering
  const hasSections = quiz.sections && quiz.sections.length > 0;
  const sections = hasSections ? quiz.sections : [];

  // Calculate per-section stats
  const getSectionStats = (section) => {
    const sectionQuestionIds = section.questions.map(q => q._id);
    const sectionAnswers = submission.answers.filter(a => sectionQuestionIds.includes(a.questionId));
    let secScore = 0;
    let secMaxMarks = 0;
    sectionAnswers.forEach(a => {
      const q = section.questions.find(q => q._id === a.questionId);
      const qMarks = q?.marks || 1;
      secMaxMarks += qMarks;
      secScore += (a.marksAwarded || 0);
    });
    const secPercentage = secMaxMarks > 0 ? (secScore / secMaxMarks) * 100 : 0;
    return { score: secScore, maxMarks: secMaxMarks, percentage: secPercentage, questionCount: section.questions.length };
  };

  // Filter answers based on selected section
  const getFilteredAnswers = () => {
    if (selectedSection === 'all' || !hasSections) {
      return submission.answers;
    }
    const activeSection = sections.find(s => s._id === selectedSection);
    if (!activeSection) return submission.answers;
    const sectionQuestionIds = activeSection.questions.map(q => q._id);
    return submission.answers.filter(a => sectionQuestionIds.includes(a.questionId));
  };

  const filteredAnswers = getFilteredAnswers();
  const activeSection = selectedSection !== 'all' ? sections.find(s => s._id === selectedSection) : null;
  const activeSectionStats = activeSection ? getSectionStats(activeSection) : null;

  return (
    <div className="min-h-screen bg-paper font-body text-ink">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <button
            onClick={() => navigate(`/class/${classId}/quizzes/results/${quizId}`)}
            className="flex items-center gap-2 text-violet-dark hover:opacity-80 font-bold transition-all mb-4 cursor-pointer text-sm"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm sm:text-base">Back to All Results</span>
          </button>
        </div>

        {/* Student Header */}
        <div className="bg-surface rounded-2xl border border-line p-4 sm:p-6 mb-4 sm:mb-6 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
              {submission.studentId?.profilePhoto && !imageLoadError ? (
                <img 
                  src={`${API_BASE_URL.replace('/api', '')}/${submission.studentId.profilePhoto}`}
                  alt={submission.studentId?.name}
                  className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover flex-shrink-0 border border-line shadow-sm"
                  onError={() => setImageLoadError(true)}
                />
              ) : (
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-violet-50 text-violet-dark border border-line rounded-full flex items-center justify-center font-bold text-lg sm:text-2xl flex-shrink-0 font-display">
                  {submission.studentId?.name?.charAt(0).toUpperCase() || "?"}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h1 className="text-xl sm:text-2xl font-semibold font-display text-ink mb-1 truncate">
                  {submission.studentId?.name || "Unknown Student"}
                </h1>
                <p className="text-xs sm:text-sm text-ink-soft truncate">
                  Submitted:{" "}
                  {new Date(submission.submittedAt).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                <p className="text-xs sm:text-sm text-ink-soft mt-1 truncate font-semibold">
                  {quiz.title}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4">
              <div className="text-left sm:text-right">
                <div className="flex items-center gap-2 mb-2">
                  <Award className="w-6 h-6 sm:w-8 sm:h-8 text-violet-dark" />
                  <div className="text-2xl sm:text-3xl font-black font-display text-violet-dark">
                    {typeof submission.score === 'number' ? submission.score.toFixed(1) : submission.score}/{submission.totalMarks || submission.totalQuestions}
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-ink-soft font-semibold">
                  {submission.percentage?.toFixed(2)}% • {submission.totalQuestions} questions
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <span
                  className="inline-block px-2 sm:px-3 py-1 rounded-full text-xs font-bold border border-line whitespace-nowrap bg-green-100 dark:bg-green-955/40 text-green-800 dark:text-green-300"
                >
                  Submitted
                </span>
                <span className={`inline-flex items-center gap-1 px-2 sm:px-3 py-1 rounded-full text-xs font-bold border border-line whitespace-nowrap ${
                  parseFloat(submission.percentage) >= 40
                    ? "bg-green-100 dark:bg-green-955/40 text-green-800 dark:text-green-300"
                    : "bg-rose-100 dark:bg-rose-955/40 text-rose-800 dark:text-rose-350"
                }`}>
                  {parseFloat(submission.percentage) >= 40 ? (
                    <>
                      <CheckCircle className="w-3 h-3" /> Pass
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-3 h-3" /> Fail
                    </>
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Proctoring Snapshot Thumbnail */}
        {submission.proctorPhoto && (
          <div className="bg-surface rounded-2xl border border-line p-3 sm:p-4 mb-4 sm:mb-6 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-violet-50 flex items-center justify-center text-violet-dark border border-line shrink-0">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-ink">Proctoring Snapshot</span>
                  <span className="text-[10px] uppercase tracking-wider font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full shrink-0">AI Captured</span>
                </div>
                <p className="text-xs text-ink-soft">Click image to enlarge</p>
              </div>
            </div>
            
            <button 
              onClick={() => setIsPhotoModalOpen(true)}
              className="relative w-20 sm:w-24 aspect-video rounded-lg overflow-hidden border-2 border-line hover:border-violet-400 transition-colors shadow-sm cursor-pointer group shrink-0"
            >
              <img
                src={submission.proctorPhoto}
                alt="Proctor snapshot thumbnail"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-white text-xs font-bold tracking-wider">VIEW</span>
              </div>
            </button>
          </div>
        )}

        {/* Section Filter */}
        {hasSections && sections.length > 1 && (
          <div className="mb-4 sm:mb-6">
            <div className="bg-surface rounded-2xl border border-line p-3 sm:p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Layers className="w-4 h-4 text-violet-500" />
                <span className="text-xs font-bold text-ink-soft uppercase tracking-wider">Filter by Section</span>
              </div>
              
              {/* Desktop: Pill tabs */}
              <div className="hidden sm:flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedSection('all')}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
                    selectedSection === 'all'
                      ? 'bg-violet-600 text-white shadow-md shadow-violet-600/20'
                      : 'bg-line/50 text-ink hover:bg-line hover:shadow-sm'
                  }`}
                >
                  All Sections
                  <span className={`ml-2 text-xs ${selectedSection === 'all' ? 'text-violet-200' : 'text-ink-soft'}`}>
                    {sections.reduce((acc, sec) => acc + (sec.questions?.length || 0), 0)}q
                  </span>
                </button>

                {sections.map((sec, idx) => {
                  const stats = getSectionStats(sec);
                  return (
                    <button
                      key={sec._id}
                      onClick={() => setSelectedSection(sec._id)}
                      className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
                        selectedSection === sec._id
                          ? 'bg-violet-600 text-white shadow-md shadow-violet-600/20'
                          : 'bg-line/50 text-ink hover:bg-line hover:shadow-sm'
                      }`}
                    >
                      {sec.title || `Section ${idx + 1}`}
                      <span className={`ml-2 text-xs ${selectedSection === sec._id ? 'text-violet-200' : 'text-ink-soft'}`}>
                        {stats.questionCount}q • {typeof stats.score === 'number' ? stats.score.toFixed(1) : stats.score}/{stats.maxMarks}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Mobile: Dropdown */}
              <div className="sm:hidden relative" ref={sectionDropdownRef}>
                <button
                  onClick={() => setSectionDropdownOpen(!sectionDropdownOpen)}
                  className="w-full px-4 py-3 bg-paper border border-line rounded-xl text-ink text-sm cursor-pointer flex items-center gap-3 transition-all duration-200 hover:border-violet-400"
                >
                  <Layers className="w-4 h-4 text-violet-500 flex-shrink-0" />
                  <span className="flex-1 text-left font-semibold truncate">
                    {selectedSection === 'all'
                      ? 'All Sections'
                      : (sections.find(s => s._id === selectedSection)?.title || 'Section')}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-ink-soft transition-transform duration-300 flex-shrink-0 ${sectionDropdownOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {sectionDropdownOpen && (
                  <div
                    className="absolute left-0 top-full mt-2 w-full bg-surface border border-line rounded-xl shadow-2xl z-30 py-1.5 overflow-hidden"
                    style={{
                      animation: 'dropdownSlideIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                      boxShadow: '0 12px 40px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06)'
                    }}
                  >
                    <button
                      onClick={() => { setSelectedSection('all'); setSectionDropdownOpen(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 transition-all duration-150 cursor-pointer ${
                        selectedSection === 'all'
                          ? 'bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300 font-bold'
                          : 'text-ink hover:bg-line/50 font-medium'
                      }`}
                    >
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${selectedSection === 'all' ? 'bg-violet-500' : 'bg-transparent'}`} />
                      All Sections
                      <span className="ml-auto text-xs text-ink-soft font-normal">
                        {sections.reduce((acc, sec) => acc + (sec.questions?.length || 0), 0)}q
                      </span>
                    </button>

                    <div className="mx-3 my-1 border-t border-line" />

                    {sections.map((sec, idx) => {
                      const stats = getSectionStats(sec);
                      return (
                        <button
                          key={sec._id}
                          onClick={() => { setSelectedSection(sec._id); setSectionDropdownOpen(false); }}
                          className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 transition-all duration-150 cursor-pointer ${
                            selectedSection === sec._id
                              ? 'bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300 font-bold'
                              : 'text-ink hover:bg-line/50 font-medium'
                          }`}
                        >
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${selectedSection === sec._id ? 'bg-violet-500' : 'bg-transparent'}`} />
                          <span className="truncate">{sec.title || `Section ${idx + 1}`}</span>
                          <span className="ml-auto text-xs text-ink-soft font-normal flex-shrink-0">
                            {stats.questionCount}q • {typeof stats.score === 'number' ? stats.score.toFixed(1) : stats.score}/{stats.maxMarks}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Section Score Summary (when a specific section is selected) */}
            {activeSectionStats && (
              <div className="mt-3 bg-violet-50 dark:bg-violet-950/20 rounded-xl border border-violet-200 dark:border-violet-800/30 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-violet-600" />
                  <span className="text-sm font-bold text-violet-800 dark:text-violet-300">
                    {activeSection.title}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-semibold text-violet-700 dark:text-violet-300">
                    {typeof activeSectionStats.score === 'number' ? activeSectionStats.score.toFixed(1) : activeSectionStats.score}/{activeSectionStats.maxMarks} marks
                  </span>
                  <span className={`text-sm font-bold px-2.5 py-0.5 rounded-full ${
                    activeSectionStats.percentage >= 40
                      ? 'bg-green-100 dark:bg-green-955/40 text-green-800 dark:text-green-300'
                      : 'bg-rose-100 dark:bg-rose-955/40 text-rose-800 dark:text-rose-350'
                  }`}>
                    {activeSectionStats.percentage.toFixed(1)}%
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Questions */}
        <div className="space-y-4 sm:space-y-6">
          {filteredAnswers.map((answer, index) => {
            let question = null;
            let questionSection = null;
            if (quiz.sections && quiz.sections.length > 0) {
              for (const sec of quiz.sections) {
                const found = sec.questions.find(q => q._id === answer.questionId);
                if (found) { question = found; questionSection = sec; break; }
              }
            } else if (quiz.questions && quiz.questions.length > 0) {
              question = quiz.questions.find(q => q._id === answer.questionId);
            }

            if (!question) return null;

            const isCoding = answer.type === 'coding' || question.type === 'coding';
            
            // Determine if student attempted this question
            const isAttempted = isCoding 
              ? (answer.code && answer.code.trim() !== '') 
              : (answer.selectedAnswer && answer.selectedAnswer.trim() !== '');

            // Calculate global question number
            let globalIndex = index;
            if (selectedSection !== 'all' && hasSections) {
              // Find the original index across all answers
              globalIndex = submission.answers.findIndex(a => a.questionId === answer.questionId);
            }

            return (
              <div
                key={answer.questionId}
                className={`bg-surface rounded-2xl border p-4 sm:p-6 shadow-sm ${
                  isAttempted ? 'border-line' : 'border-amber-200 dark:border-amber-800/40 bg-amber-50/30 dark:bg-amber-950/10'
                }`}
              >
                {/* Question Title */}
                <div className="mb-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-base sm:text-lg font-semibold font-display text-ink flex items-center gap-3">
                      Question {globalIndex + 1}
                      {questionSection && selectedSection === 'all' && hasSections && sections.length > 1 && (
                        <span className="text-xs font-medium text-ink-soft bg-line/60 px-2 py-0.5 rounded-full">
                          {questionSection.title}
                        </span>
                      )}
                    </h3>
                    {!isAttempted && (
                      <span className="inline-flex items-center gap-1 px-2 sm:px-3 py-1 rounded-full text-xs font-bold border border-amber-300 dark:border-amber-700/50 bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 whitespace-nowrap">
                        <AlertTriangle className="w-3 h-3" /> Not Attempted
                      </span>
                    )}
                  </div>
                  <p className="text-sm sm:text-base text-ink mb-4 whitespace-pre-wrap leading-relaxed">
                    {question.question}
                  </p>

                  {/* Options for MCQ */}
                  {isCoding ? (
                    <div className="mb-4">
                      <h5 className="text-sm font-semibold text-gray-700 mb-2">Student Code</h5>
                      {isAttempted ? (
                        <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                          <pre className="text-gray-100 text-sm font-mono">
                            <code>{answer.code}</code>
                          </pre>
                        </div>
                      ) : (
                        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 text-center">
                          <p className="text-sm text-ink-soft italic">No code submitted</p>
                        </div>
                      )}
                      {answer.testResults && (
                        <div className="mt-4 bg-white p-4 rounded-lg border border-gray-200">
                          <h6 className="font-bold text-gray-900 mb-2">Test Results</h6>
                          <div className="text-sm">
                            Passed {answer.testResults.passed} out of {answer.testResults.total} test cases.
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    question.options && question.options.length > 0 && (
                      <div className="space-y-2">
                        {question.options.map((option, idx) => {
                          const isSelected = option === answer.selectedAnswer;
                          const isCorrect = option === answer.correctAnswer;
                          const isWrongSelection = isSelected && !answer.isCorrect;
                          
                          return (
                            <div
                              key={idx}
                              className={`p-3 rounded-xl border-2 text-sm transition-all ${
                                isCorrect
                                  ? "border-green-500 bg-green-500/10 font-medium"
                                  : isWrongSelection
                                  ? "border-rose-500 dark:border-rose-400 bg-rose-500/10 font-medium"
                                  : "border-line bg-surface"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <span
                                  className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold ${
                                    isCorrect
                                      ? "border-green-500 bg-green-500 text-white"
                                      : isWrongSelection
                                      ? "border-rose-500 bg-rose-500 text-white"
                                      : isSelected
                                      ? "border-purple-500 bg-purple-500 text-white"
                                      : "border-line bg-paper"
                                  }`}
                                >
                                  {isCorrect && "✓"}
                                  {isWrongSelection && "✗"}
                                  {isSelected && answer.isCorrect && "✓"}
                                </span>
                                <span className={`${isCorrect ? "text-green-800 dark:text-green-300" : isWrongSelection ? "text-rose-800 dark:text-rose-350" : "text-ink"} whitespace-pre-wrap leading-relaxed text-left`}>
                                  {option}
                                </span>
                                {isCorrect && isSelected && (
                                  <span className="ml-auto text-xs font-bold text-green-700 bg-green-100 dark:bg-green-950/40 text-green-800 dark:text-green-300 border border-line px-2 py-1 rounded-full">
                                    Correct Answer
                                  </span>
                                )}
                                {isCorrect && !isSelected && (
                                  <span className="ml-auto text-xs font-bold text-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border border-line px-2 py-1 rounded-full">
                                    Correct Option
                                  </span>
                                )}
                                {isWrongSelection && (
                                  <span className="ml-auto text-xs font-bold text-rose-700 bg-rose-100 dark:bg-rose-955/40 text-rose-800 dark:text-rose-350 border border-line px-2 py-1 rounded-full">
                                    Your Choice
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )
                  )}
                </div>

                {/* Result Badge */}
                <div className="flex items-center justify-between pt-4 border-t border-line">
                  <span className="text-sm text-ink-soft">
                    {isCoding ? "Coding Challenge" : "Multiple Choice Question"}
                    <span className="ml-2 font-semibold text-ink">
                      {typeof answer.marksAwarded === 'number' ? answer.marksAwarded.toFixed(1) : (answer.marksAwarded || 0)}/{question.marks || 1} marks
                    </span>
                  </span>
                  {isAttempted ? (
                    <span
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border border-line ${
                        answer.isCorrect || (isCoding && answer.marksAwarded > 0)
                          ? "bg-green-100 dark:bg-green-955/40 text-green-800 dark:text-green-300"
                          : "bg-rose-100 dark:bg-rose-955/40 text-rose-800 dark:text-rose-350"
                      }`}
                    >
                      {answer.isCorrect || (isCoding && answer.marksAwarded > 0) ? (
                        <>
                          <CheckCircle className="w-3 h-3" /> {isCoding ? `${answer.testResults?.passed || 0}/${answer.testResults?.total || 0} passed` : 'Correct'}
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-3 h-3" /> Incorrect
                        </>
                      )}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border border-amber-300 dark:border-amber-700/50 bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300">
                      — Skipped
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Photo Modal */}
      {isPhotoModalOpen && submission?.proctorPhoto && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm transition-opacity" onClick={() => setIsPhotoModalOpen(false)}>
          <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setIsPhotoModalOpen(false)}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors bg-white/10 hover:bg-white/20 p-2 rounded-full cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={submission.proctorPhoto}
              alt="Proctor snapshot full"
              className="w-full h-auto max-h-[80vh] object-contain rounded-xl shadow-2xl border-2 border-white/20"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentQuizResult;
