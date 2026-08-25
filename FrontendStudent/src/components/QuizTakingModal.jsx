import React, { useState, useEffect, useRef } from 'react';
import { Clock, AlertTriangle, CheckCircle, Loader, Shield, Info, X, Bookmark, LayoutGrid, ChevronRight } from 'lucide-react';
import { submitQuiz, autosaveQuiz, runCode } from '../api/quizApi';
import { useFullScreenProctor } from '../hooks/useFullScreenProctor';
import ViolationAlertModal from './ViolationAlertModal';
import QuestionPalette from './QuestionPalette';
import CodeEditorWorkspace from './CodeEditorWorkspace';
import { getStoredToken } from '../utils/authStorage';
import API_BASE_URL from '../config';

export default function QuizTakingModal({ quiz, studentId, studentName, onClose, onSubmit }) {
  const [shuffledQuiz, setShuffledQuiz] = useState(null);
  const [hasStarted, setHasStarted] = useState(false);
  
  // Section and Question tracking
  const [currentSectionIdx, setCurrentSectionIdx] = useState(0);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  
  const [answers, setAnswers] = useState(() => {
    const saved = localStorage.getItem(`quiz_draft_${quiz._id}`);
    return saved ? JSON.parse(saved) : {};
  });
  
  // Time tracking
  const [globalTimeLeft, setGlobalTimeLeft] = useState(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [visitedQuestions, setVisitedQuestions] = useState(new Set([0])); // Needs update based on section
  const [markedForReview, setMarkedForReview] = useState({});
  const [isMobilePaletteOpen, setIsMobilePaletteOpen] = useState(false);
  const [sectionModal, setSectionModal] = useState({ show: false, type: '', title: '' });
  const [resumeCount, setResumeCount] = useState(() => {
    return parseInt(localStorage.getItem(`quiz_refresh_count_${quiz._id}`) || '0');
  });

  // Code execution state
  const [isExecuting, setIsExecuting] = useState(false);
  const [runResults, setRunResults] = useState({});
  
  // Language persistence: remember last selected language across questions
  const [lastSelectedLanguage, setLastSelectedLanguage] = useState(() => {
    const saved = localStorage.getItem(`quiz_selected_language_${quiz._id}`);
    return saved || null; // null means use question default
  });

  const globalTimerRef = useRef(null);
  const answersRef = useRef((() => {
    const saved = localStorage.getItem(`quiz_draft_${quiz._id}`);
    return saved ? JSON.parse(saved) : {};
  })());

  // Setup Quiz Layout
  useEffect(() => {
    if (quiz && !shuffledQuiz) {
      const savedLayout = localStorage.getItem(`quiz_layout_${quiz._id}`);
      if (savedLayout) {
        setShuffledQuiz(JSON.parse(savedLayout));
      } else {
        // Deep copy sections to avoid mutating original
        let sections = JSON.parse(JSON.stringify(quiz.sections || []));
        
        // Handle legacy quizzes that have questions but no sections
        if (sections.length === 0 && quiz.questions && quiz.questions.length > 0) {
          sections = [{
            _id: "default-section",
            title: "Quiz Questions",
            questions: JSON.parse(JSON.stringify(quiz.questions))
          }];
        }
        
        // Shuffle questions within each section
        sections.forEach(sec => {
          const questions = sec.questions;
          for (let i = questions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [questions[i], questions[j]] = [questions[j], questions[i]];
          }
        });
        
        const newQuiz = { ...quiz, sections };
        setShuffledQuiz(newQuiz);
        localStorage.setItem(`quiz_layout_${quiz._id}`, JSON.stringify(newQuiz));
      }
    }
  }, [quiz, shuffledQuiz]);

  const {
    isFullScreen,
    showViolationAlert,
    violationMessage,
    violations,
    exitFullScreen,
    handleViolationAlertOk,
    setIsSubmitting: setProctorSubmitting,
    enterFullScreen,
    clearViolations
  } = useFullScreenProctor({
    enabled: hasStarted,
    maxViolations: 4,
    examId: quiz._id,
    onAutoSubmit: (reason) => handleAutoSubmit(reason)
  });

  const isResuming = !!localStorage.getItem(`quiz_start_time_${quiz._id}`) || !!localStorage.getItem(`quiz_draft_${quiz._id}`);

  useEffect(() => {
    if (isResuming && !hasStarted) {
      const currentCount = parseInt(localStorage.getItem(`quiz_refresh_count_${quiz._id}`) || '0');
      const newCount = currentCount + 1;
      localStorage.setItem(`quiz_refresh_count_${quiz._id}`, newCount.toString());
      setResumeCount(newCount);
    }
  }, []);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  // Global Timer (Quiz Overall Duration / EndTime)
  useEffect(() => {
    if (!hasStarted || !shuffledQuiz) return;

    let calcGlobalTimeLeft = Infinity;

    if (shuffledQuiz.duration) {
      const storageKey = `quiz_start_time_${shuffledQuiz._id}`;
      let startTime = localStorage.getItem(storageKey);
      if (!startTime) {
        startTime = Date.now().toString();
        localStorage.setItem(storageKey, startTime);
      }
      const elapsedSeconds = Math.floor((Date.now() - parseInt(startTime)) / 1000);
      const remaining = (shuffledQuiz.duration * 60) - elapsedSeconds;
      calcGlobalTimeLeft = Math.min(calcGlobalTimeLeft, remaining > 0 ? remaining : 0);
    }

    if (shuffledQuiz.endTime) {
      const end = new Date(shuffledQuiz.endTime).getTime();
      const remaining = Math.floor((end - Date.now()) / 1000);
      calcGlobalTimeLeft = Math.min(calcGlobalTimeLeft, remaining > 0 ? remaining : 0);
    }

    if (calcGlobalTimeLeft !== Infinity) {
      setGlobalTimeLeft(calcGlobalTimeLeft);
    }

  }, [hasStarted, shuffledQuiz]);

  // Timer interval
  useEffect(() => {
    if (globalTimeLeft !== null && globalTimeLeft > 0) {
      globalTimerRef.current = setInterval(() => {
        setGlobalTimeLeft(prev => {
          if (prev <= 1) {
            handleAutoSubmit('Time Expired');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(globalTimerRef.current);
  }, [globalTimeLeft]);

  const moveToNextSection = () => {
    if (currentSectionIdx < shuffledQuiz.sections.length - 1) {
      setCurrentSectionIdx(prev => prev + 1);
      setCurrentQuestionIdx(0);
    } else {
      handleAutoSubmit('All sections completed');
    }
  };

  const moveToPreviousSection = () => {
    if (currentSectionIdx > 0) {
      setCurrentSectionIdx(prev => prev - 1);
      setCurrentQuestionIdx(shuffledQuiz.sections[currentSectionIdx - 1].questions.length - 1);
    }
  };

  const autoSubmitAttempted = useRef(false);

  useEffect(() => {
    if (shuffledQuiz && resumeCount > 4 && !isSubmitting && !autoSubmitAttempted.current) {
      autoSubmitAttempted.current = true;
      const timer = setTimeout(() => {
        handleAutoSubmit('Exceeded maximum allowed refreshes/tab closes (4)');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [shuffledQuiz, resumeCount, isSubmitting]);

  const handleStartExam = async () => {
    if (quiz.endTime && new Date() > new Date(quiz.endTime)) {
      alert("Your assessment time has expired. Your previously saved answers have been safely submitted to the server.");
      cleanupStorage();
      onSubmit();
      return;
    }

    const storageKey = `quiz_start_time_${quiz._id}`;
    if (!localStorage.getItem(storageKey)) {
      localStorage.setItem(storageKey, Date.now().toString());
    }

    try {
      setHasStarted(true);
      setTimeout(async () => {
        await enterFullScreen();
      }, 50);
    } catch (error) {
      alert("Please allow full screen to start the exam.");
    }
  };

  const handleAutoSubmit = async (reason) => {
    if (isSubmitting) return;
    await handleSubmitQuiz(true, reason);
  };

  const handleFinishSectionClick = () => {
    setSectionModal({ show: true, type: 'manual-next', title: shuffledQuiz.sections[currentSectionIdx].title });
  };

  const handleCompleteQuizClick = () => {
    setSectionModal({ show: true, type: 'submit-quiz', title: 'Submit Exam' });
  };

  const handleSectionModalConfirm = () => {
    const type = sectionModal.type;
    setSectionModal({ show: false, type: '', title: '' });
    
    if (type === 'timeout' || type === 'manual-next') {
      moveToNextSection();
    } else if (type === 'submit-quiz') {
      handleSubmitQuiz(false);
    }
  };

  const cleanupStorage = () => {
    if (shuffledQuiz) {
      localStorage.removeItem(`quiz_start_time_${shuffledQuiz._id}`);
      localStorage.removeItem(`quiz_layout_${shuffledQuiz._id}`);
      localStorage.removeItem(`quiz_draft_${shuffledQuiz._id}`);
      localStorage.removeItem(`quiz_refresh_count_${shuffledQuiz._id}`);
      localStorage.removeItem(`quiz_selected_language_${shuffledQuiz._id}`);
      clearViolations();
    }
    localStorage.removeItem('activeQuiz');
  };

  const buildAnswersArray = () => {
    const arr = [];
    // Use answersRef as primary source, fall back to answers state for safety
    const currentAnswers = Object.keys(answersRef.current).length > 0 
      ? answersRef.current 
      : answers;
    shuffledQuiz.sections.forEach(sec => {
      sec.questions.forEach(q => {
        const a = currentAnswers[q._id];
        if (q.type === 'coding') {
          arr.push({ 
            questionId: q._id, 
            type: 'coding', 
            code: a?.code || q.coding?.starterCode?.[0]?.code || '', 
            language: a?.language || lastSelectedLanguage || q.coding?.starterCode?.[0]?.language || 'javascript' 
          });
        } else {
          // Always include MCQ questions, even if unanswered
          arr.push({ 
            questionId: q._id, 
            type: 'mcq', 
            selectedAnswer: a?.selectedAnswer || '' 
          });
        }
      });
    });
    return arr;
  };

  const triggerAutosave = () => {
    const answersArray = buildAnswersArray();
    autosaveQuiz(shuffledQuiz._id, studentId, answersArray).catch(err => console.error("Autosave failed:", err));
  };

  useEffect(() => {
    if (!hasStarted || !shuffledQuiz || isSubmitting) return;
    const intervalId = setInterval(() => {
      triggerAutosave();
    }, 30000); // Autosave every 30 seconds
    return () => clearInterval(intervalId);
  }, [hasStarted, shuffledQuiz, isSubmitting, answers]);

  const handleSubmitQuiz = async (autoSubmit = false, reason = '') => {
    try {
      if (isSubmitting) return;

      setIsSubmitting(true);
      setProctorSubmitting(true);
      
      if (globalTimerRef.current) clearInterval(globalTimerRef.current);

      const answersArray = buildAnswersArray();
      const answeredCount = answersArray.length;
      const totalQuestions = shuffledQuiz.sections.reduce((acc, s) => acc + s.questions.length, 0);
      const violationsCount = violations.length;

      await submitQuiz(shuffledQuiz._id, studentId, answersArray);

      cleanupStorage();
      exitFullScreen();

      const scoreMessage = autoSubmit 
        ? ` AUTO-SUBMITTED!\n\nReason: ${reason}\nViolations: ${violationsCount}\nAnswered: ${answeredCount}/${totalQuestions}\n\n`
        : ` Assessment Submitted!\n\n`;

      alert(`${scoreMessage}Your results will be visible when the teacher publishes them.`);

      onSubmit();
    } catch (error) {
      console.error('Submit error:', error);
      exitFullScreen();
      
      const errorMsg = error.response?.data?.error || error.message || 'Failed to submit assessment';
      
      if (error.response?.status === 403 && errorMsg.toLowerCase().includes("expired")) {
        alert("Your assessment time has expired. Your previously saved answers have been safely submitted to the server.");
        cleanupStorage();
        onSubmit();
      } else if (error.response?.status === 404 || errorMsg.toLowerCase().includes("not found")) {
        alert("This assessment is no longer available or was deleted.");
        cleanupStorage();
        onSubmit();
      } else {
        alert(` Error: ${errorMsg}`);
        setIsSubmitting(false);
        setProctorSubmitting(false);
      }
    }
  };

  const handleMCQAnswerSelect = (questionId, answer) => {
    setAnswers(prev => {
      const updated = {
        ...prev,
        [questionId]: { type: 'mcq', selectedAnswer: answer }
      };
      answersRef.current = updated;
      localStorage.setItem(`quiz_draft_${shuffledQuiz._id}`, JSON.stringify(updated));
      return updated;
    });
  };

  const handleCodeChange = (questionId, code, language) => {
    setAnswers(prev => {
      const current = prev[questionId] || { language: language || 'javascript' };
      const updated = {
        ...prev,
        [questionId]: { type: 'coding', code, language: language || current.language }
      };
      answersRef.current = updated;
      localStorage.setItem(`quiz_draft_${shuffledQuiz._id}`, JSON.stringify(updated));
      return updated;
    });
  };

  const handleLanguageChange = (questionId, language) => {
    // Update the last selected language for persistence across questions
    setLastSelectedLanguage(language);
    localStorage.setItem(`quiz_selected_language_${quiz._id}`, language);
    
    setAnswers(prev => {
      const current = prev[questionId] || { code: '' };
      const updated = {
        ...prev,
        [questionId]: { type: 'coding', code: current.code, language }
      };
      answersRef.current = updated;
      localStorage.setItem(`quiz_draft_${shuffledQuiz._id}`, JSON.stringify(updated));
      return updated;
    });
  };

  const handleRunCode = async (questionId, code, language) => {
    setIsExecuting(true);
    try {
      const res = await runCode(shuffledQuiz._id, questionId, code, language);
      setRunResults(prev => ({ ...prev, [questionId]: res.results }));
      
    } catch (error) {
      // Set error as a result so it shows in the error panel
      setRunResults(prev => ({ 
        ...prev, 
        [questionId]: [{
          input: "",
          expectedOutput: "",
          actualOutput: "",
          compileOutput: "",
          runError: error.response?.data?.error || error.message || "Failed to execute code",
          exitCode: 1,
          passed: false
        }]
      }));
    } finally {
      setIsExecuting(false);
    }
  };

  const handleNext = () => {
    const currentSec = shuffledQuiz.sections[currentSectionIdx];
    if (currentQuestionIdx < currentSec.questions.length - 1) {
      setCurrentQuestionIdx(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIdx > 0) {
      setCurrentQuestionIdx(prev => prev - 1);
    }
  };

  const getAnsweredCount = () => Object.keys(answers).length;

  const formatTime = (seconds) => {
    if (seconds === null) return 'No time limit';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const handleToggleMarkForReview = (questionId) => {
    setMarkedForReview(prev => ({
      ...prev,
      [questionId]: !prev[questionId]
    }));
  };

  // Intro Screen
  if (!shuffledQuiz) return null;

  if (!hasStarted) {
    return (
      <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="max-w-3xl w-full bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="bg-white px-8 py-6 border-b border-gray-100 flex items-center justify-between sticky top-0 z-10">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">{quiz.title}</h1>
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">
                {isResuming ? 'Resume Your Exam' : 'Exam Instructions'}
              </p>
            </div>
            {!isResuming && (
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-colors">
                <X className="w-6 h-6" />
              </button>
            )}
          </div>
          
          <div className="p-8 overflow-y-auto">
            {!isResuming && (
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 flex flex-col items-center justify-center">
                  <p className="text-sm font-semibold text-gray-500 mb-1">Sections / Questions</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {shuffledQuiz.sections.length} / {shuffledQuiz.sections.reduce((a, s) => a + s.questions.length, 0)}
                  </p>
                </div>
                <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 flex flex-col items-center justify-center">
                  <p className="text-sm font-semibold text-gray-500 mb-1">Total Time Limit</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {shuffledQuiz.duration ? `${shuffledQuiz.duration} Min` : 'No Limit'}
                  </p>
                </div>
              </div>
            )}

            {resumeCount > 4 ? (
              <div className="bg-red-50/80 p-8 rounded-xl border border-red-100 text-center space-y-4 my-8">
                <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-bold text-red-900">Maximum Refreshes Exceeded</h3>
                <p className="text-base text-red-800">You have refreshed or closed the tab too many times. Your exam is being automatically submitted.</p>
              </div>
            ) : isResuming ? (
              <div className="bg-blue-50/80 p-8 rounded-xl border border-blue-100 text-center space-y-4 my-8">
                <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-10 h-10 animate-pulse" />
                </div>
                <h3 className="text-2xl font-bold text-blue-900">Exam in Progress</h3>
                <p className="text-base text-blue-800">You have already started this exam. Click resume to re-enter full screen and continue.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Important Guidelines</h3>
                
                <div className="flex gap-4 items-start p-4 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                  <Shield className="w-6 h-6 text-indigo-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">Full Screen Proctored</h4>
                    <p className="text-sm text-gray-600 leading-relaxed">This exam is strictly proctored. You must remain in full-screen mode at all times. <strong>Exiting full-screen four times will automatically submit your exam.</strong></p>
                  </div>
                </div>

                <div className="flex gap-4 items-start p-4 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                  <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">No Tab Switching</h4>
                    <p className="text-sm text-gray-600 leading-relaxed">Do not switch tabs, open new windows, or use other applications. These actions will be recorded as full-screen violations.</p>
                  </div>
                </div>

                {shuffledQuiz.sections.length > 1 && (
                  <div className="flex gap-4 items-start p-4 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                    <LayoutGrid className="w-6 h-6 text-indigo-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-gray-900 mb-1">Sections</h4>
                      <p className="text-sm text-gray-600 leading-relaxed">This assessment may include one or more sections. You can navigate between sections during the exam.</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="p-4 sm:p-6 bg-gray-50 border-t border-gray-100 flex flex-col-reverse sm:flex-row items-center justify-end gap-3 sm:gap-4 mt-auto">
            {resumeCount > 4 ? (
              <button disabled className="w-full sm:w-auto px-8 py-2.5 bg-gray-400 text-white font-bold rounded-xl cursor-not-allowed shadow-md">
                Auto-Submitting...
              </button>
            ) : isResuming ? (
              <>
                <button onClick={() => handleSubmitQuiz(false, 'Exited on Resume')} className="w-full sm:w-auto px-6 py-3 sm:py-2.5 font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors shadow-md shadow-red-600/20">
                  Submit & Exit Exam
                </button>
                <button onClick={handleStartExam} className="w-full sm:w-auto px-8 py-3 sm:py-2.5 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors shadow-md shadow-green-600/20">
                  Resume Exam
                </button>
              </>
            ) : (
              <>
                <button onClick={onClose} className="w-full sm:w-auto px-6 py-3 sm:py-2.5 font-bold text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-xl transition-colors">
                  Cancel
                </button>
                <button onClick={handleStartExam} className="w-full sm:w-auto px-8 py-3 sm:py-2.5 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors shadow-md shadow-green-600/20">
                  I Understand, Start Exam
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  const currentSection = shuffledQuiz.sections[currentSectionIdx];
  const question = currentSection.questions[currentQuestionIdx];
  const totalQuizQuestions = shuffledQuiz.sections.reduce((a, s) => a + s.questions.length, 0);

  // When a question is selected in the palette, it only selects within the current section
  const handlePaletteSelect = (idx) => {
    setCurrentQuestionIdx(idx);
    setVisitedQuestions(prev => new Set(prev).add(idx));
  };

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center z-50 font-body">
      <div className="bg-white w-screen h-screen flex flex-col">
        {/* HEADER */}
        <div className="p-4 sm:p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Shield className={`w-6 h-6 ${isFullScreen ? 'text-green-600' : 'text-red-600'}`} />
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 truncate max-w-[200px] sm:max-w-md">{quiz.title}</h2>
                <p className="text-xs text-gray-600 mt-0.5">
                  Section {currentSectionIdx + 1} of {shuffledQuiz.sections.length}: <span className="font-bold text-indigo-700">{currentSection.title}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsMobilePaletteOpen(!isMobilePaletteOpen)}
                className="md:hidden flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 text-purple-700 hover:bg-purple-200 rounded-lg text-xs font-bold transition-colors"
              >
                <LayoutGrid className="w-4 h-4" />
                <span>Questions</span>
              </button>

              {violations.length > 0 && (
                <div className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs sm:text-sm font-semibold">
                 {violations.length}/4 Violation{violations.length !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2 gap-2">
            <span className="text-sm font-medium text-gray-700">
              Question {currentQuestionIdx + 1} of {currentSection.questions.length}
            </span>
            
            <div className="flex items-center gap-3">
              {globalTimeLeft !== null && (
                <div
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm shadow-sm ${
                    globalTimeLeft < 60 
                      ? 'bg-red-100 text-red-700 font-bold animate-pulse' 
                      : globalTimeLeft < 300
                        ? 'bg-yellow-100 text-yellow-700 font-bold'
                        : 'bg-blue-100 text-blue-700 font-bold'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  <span>{formatTime(globalTimeLeft)}</span>
                </div>
              )}

              {/* Top button for next section */}
              {currentSectionIdx < shuffledQuiz.sections.length - 1 && (
                <button
                  onClick={handleFinishSectionClick}
                  disabled={isSubmitting || showViolationAlert}
                  className="px-4 py-1.5 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 rounded-lg text-sm font-bold transition-colors shadow-sm"
                >
                  Finish Section & Next
                </button>
              )}
            </div>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentQuestionIdx + 1) / currentSection.questions.length) * 100}%` }}
            />
          </div>
        </div>

        {/* MAIN BODY */}
        <div className="flex-1 overflow-hidden flex bg-gray-50">
          <QuestionPalette
            questions={currentSection.questions}
            currentQuestion={currentQuestionIdx}
            answers={answers}
            visitedQuestions={visitedQuestions}
            markedForReview={markedForReview}
            onSelectQuestion={handlePaletteSelect}
            isMobileOpen={isMobilePaletteOpen}
            setIsMobileOpen={setIsMobilePaletteOpen}
          />

          <div className={`flex-1 overflow-y-auto ${question.type === 'coding' ? 'p-0' : 'p-4 sm:p-6'}`}>
            {question.type === 'mcq' ? (
              <div className="max-w-4xl mx-auto">
                <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-100 mb-6">
                  <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                      MCQ
                    </span>
                    <div className="flex items-center gap-2">
                      {answers[question._id]?.selectedAnswer && (
                        <button
                          onClick={() => handleMCQAnswerSelect(question._id, '')}
                          className="text-xs font-semibold text-gray-500 hover:text-rose-600 transition-colors px-2 py-1"
                        >
                          Clear Response
                        </button>
                      )}
                      <button
                        onClick={() => handleToggleMarkForReview(question._id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          markedForReview[question._id]
                            ? 'bg-purple-600 text-white shadow-sm'
                            : 'bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100'
                        }`}
                      >
                        <Bookmark className={`w-3.5 h-3.5 ${markedForReview[question._id] ? 'fill-yellow-300 text-purple-900' : ''}`} />
                        {markedForReview[question._id] ? 'Marked for Review' : 'Mark for Review'}
                      </button>
                    </div>
                  </div>

                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-6 leading-relaxed">
                    {currentQuestionIdx + 1}. {question.question}
                  </h3>
                  
                  <div className="space-y-3">
                    {question.options.map((option, index) => {
                      const isSelected = answers[question._id]?.selectedAnswer === option;
                      return (
                        <button
                          key={index}
                          onClick={() => handleMCQAnswerSelect(question._id, option)}
                          disabled={showViolationAlert}
                          className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                            showViolationAlert ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:shadow-md hover:border-purple-300'
                          } ${
                            isSelected ? 'border-purple-600 bg-purple-50 ring-2 ring-purple-600/20' : 'border-gray-200 bg-white'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                              isSelected ? 'border-purple-600 bg-purple-600' : 'border-gray-300'
                            }`}>
                              {isSelected && <CheckCircle className="w-3 h-3 text-white" />}
                            </div>
                            <span className="font-semibold text-gray-700 flex-shrink-0">
                              {String.fromCharCode(65 + index)}.
                            </span>
                            <span className="flex-1 text-gray-900 text-sm sm:text-base">{option}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full w-full p-4">
                <CodeEditorWorkspace 
                  question={question}
                  code={answers[question._id]?.code !== undefined ? answers[question._id].code : undefined}
                  language={answers[question._id]?.language || lastSelectedLanguage || question.coding?.starterCode?.[0]?.language || "javascript"}
                  onCodeChange={(code) => handleCodeChange(question._id, code, answers[question._id]?.language || lastSelectedLanguage || question.coding?.starterCode?.[0]?.language || "javascript")}
                  onLanguageChange={(lang) => handleLanguageChange(question._id, lang)}
                  onRunCode={() => {
                    const currentLang = answers[question._id]?.language || lastSelectedLanguage || question.coding?.starterCode?.[0]?.language || "javascript";
                    const fallbackCode = question.coding?.starterCode?.find(s => s.language === currentLang)?.code;
                    const currentCode = answers[question._id]?.code !== undefined ? answers[question._id].code : (fallbackCode || "");
                    handleRunCode(question._id, currentCode, currentLang);
                  }}
                  isExecuting={isExecuting}
                  runResult={runResults[question._id]}
                />
              </div>
            )}
          </div>
        </div>

        {/* FOOTER */}
        <div className="p-4 sm:p-6 border-t border-gray-200 bg-white">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
            <button
              onClick={() => {
                if (currentQuestionIdx > 0) {
                  handlePrevious();
                } else {
                  moveToPreviousSection();
                }
              }}
              disabled={(currentSectionIdx === 0 && currentQuestionIdx === 0) || isSubmitting || showViolationAlert}
              style={{ color: '#000000' }}
              className="px-4 sm:px-6 py-2.5 bg-gray-200 text-black font-bold rounded-xl hover:bg-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer border border-gray-300 shadow-2xs"
            >
              Previous
            </button>

            <div className="flex items-center gap-3">
              {currentQuestionIdx < currentSection.questions.length - 1 ? (
                <button
                  onClick={handleNext}
                  disabled={isSubmitting || showViolationAlert}
                  className="px-6 sm:px-8 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors cursor-pointer shadow-md shadow-indigo-600/20"
                >
                  Next Question
                </button>
              ) : currentSectionIdx < shuffledQuiz.sections.length - 1 ? (
                <button
                  onClick={handleFinishSectionClick}
                  disabled={isSubmitting || showViolationAlert}
                  className="px-6 sm:px-8 py-2.5 font-bold rounded-xl disabled:opacity-50 transition-colors flex items-center gap-2 cursor-pointer shadow-md bg-blue-600 text-white hover:bg-blue-700 shadow-blue-600/20"
                >
                  <ChevronRight className="w-5 h-5" />
                  Next Section
                </button>
              ) : (
                <button
                  onClick={handleCompleteQuizClick}
                  disabled={isSubmitting || showViolationAlert}
                  className="px-6 sm:px-8 py-2.5 font-bold rounded-xl disabled:opacity-50 transition-colors flex items-center gap-2 cursor-pointer shadow-md bg-green-600 text-white hover:bg-green-700 shadow-green-600/20"
                >
                  {isSubmitting ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      <span className="hidden sm:inline">Please wait...</span>
                    </>
                  ) : (
                    <>Submit Exam</>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <ViolationAlertModal
        show={showViolationAlert}
        message={violationMessage}
        violationCount={violations.length}
        maxViolations={4}
        onOk={handleViolationAlertOk}
      />

      {/* Section Transition Modal */}
      {sectionModal.show && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl flex flex-col items-center text-center animate-in fade-in zoom-in duration-200">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
              sectionModal.type === 'timeout' ? 'bg-amber-100 text-amber-600' :
              sectionModal.type === 'submit-quiz' ? 'bg-green-100 text-green-600' :
              'bg-blue-100 text-blue-600'
            }`}>
              {sectionModal.type === 'timeout' ? <Clock className="w-8 h-8" /> :
               sectionModal.type === 'submit-quiz' ? <CheckCircle className="w-8 h-8" /> :
               <ChevronRight className="w-8 h-8" />}
            </div>
            
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {sectionModal.type === 'timeout' ? "Time's Up!" : 
               sectionModal.type === 'submit-quiz' ? "Submit Entire Exam?" : 
               "Finish Section?"}
            </h3>
            
            <p className="text-gray-600 mb-6 text-sm leading-relaxed">
              {sectionModal.type === 'timeout' ? (
                <>The time limit for <strong>{sectionModal.title}</strong> has expired. Your answers are saved and we will now move to the next section.</>
              ) : sectionModal.type === 'submit-quiz' ? (
                <>Are you sure you want to submit the exam? Once submitted, you cannot change your answers.</>
              ) : (
                <>Are you sure you want to finish <strong>{sectionModal.title}</strong> early? You will <strong>not</strong> be able to return to this section later.</>
              )}
            </p>
            
            <div className="flex gap-3 w-full">
              {sectionModal.type !== 'timeout' && (
                <button
                  onClick={() => setSectionModal({ show: false, type: '', title: '' })}
                  className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={handleSectionModalConfirm}
                className={`flex-1 px-4 py-2.5 font-bold rounded-xl transition-colors text-white ${
                  sectionModal.type === 'timeout' ? 'bg-amber-600 hover:bg-amber-700' :
                  sectionModal.type === 'submit-quiz' ? 'bg-green-600 hover:bg-green-700' :
                  'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {sectionModal.type === 'timeout' ? "Continue to Next Section" : 
                 sectionModal.type === 'submit-quiz' ? "Yes, Submit Exam" : 
                 "Yes, Finish Section"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
