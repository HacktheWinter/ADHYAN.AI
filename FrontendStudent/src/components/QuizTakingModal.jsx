import React, { useState, useEffect, useRef } from 'react';
import { Clock, AlertTriangle, CheckCircle, Loader, Shield, Info, X } from 'lucide-react';
import { submitQuiz, autosaveQuiz } from '../api/quizApi';
import { useFullScreenProctor } from '../hooks/useFullScreenProctor';
import ViolationAlertModal from './ViolationAlertModal';
import { getStoredToken } from '../utils/authStorage';
import API_BASE_URL from '../config';

export default function QuizTakingModal({ quiz, studentId, studentName, onClose, onSubmit }) {
  const [shuffledQuiz, setShuffledQuiz] = useState(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState(() => {
    const saved = localStorage.getItem(`quiz_draft_${quiz._id}`);
    return saved ? JSON.parse(saved) : {};
  });
  const [timeLeft, setTimeLeft] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const timerRef = useRef(null);
  const answersRef = useRef({});

  useEffect(() => {
    if (quiz && !shuffledQuiz) {
      const savedLayout = localStorage.getItem(`quiz_layout_${quiz._id}`);
      if (savedLayout) {
        setShuffledQuiz(JSON.parse(savedLayout));
      } else {
        const questions = [...quiz.questions];
        for (let i = questions.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [questions[i], questions[j]] = [questions[j], questions[i]];
        }
        const newQuiz = { ...quiz, questions };
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
    enterFullScreen
  } = useFullScreenProctor({
    enabled: hasStarted,
    maxViolations: 2,
    onAutoSubmit: (reason) => handleAutoSubmit(reason)
  });

  const isResuming = !!localStorage.getItem(`quiz_start_time_${quiz._id}`);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    if (!hasStarted || !quiz) return;

    const setupTimer = () => {
      let calcTimeLeft = Infinity;

      if (quiz.duration) {
        const storageKey = `quiz_start_time_${quiz._id}`;
        let startTime = localStorage.getItem(storageKey);
        
        if (!startTime) {
          startTime = Date.now().toString();
          localStorage.setItem(storageKey, startTime);
        }

        const elapsedSeconds = Math.floor((Date.now() - parseInt(startTime)) / 1000);
        const durationSeconds = quiz.duration * 60;
        const remainingDuration = durationSeconds - elapsedSeconds;
        
        calcTimeLeft = Math.min(calcTimeLeft, remainingDuration > 0 ? remainingDuration : 0);
      }

      if (quiz.endTime) {
        const end = new Date(quiz.endTime).getTime();
        const remainingEndTime = Math.floor((end - Date.now()) / 1000);
        calcTimeLeft = Math.min(calcTimeLeft, remainingEndTime > 0 ? remainingEndTime : 0);
      }

      if (calcTimeLeft !== Infinity) {
        setTimeLeft(calcTimeLeft);
      }
    };

    setupTimer();
  }, [hasStarted, shuffledQuiz]);

  useEffect(() => {
    if (timeLeft !== null && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleAutoSubmit('Time Expired');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timeLeft]);

  const handleStartExam = async () => {
    if (quiz.endTime && new Date() > new Date(quiz.endTime)) {
      alert("Your quiz time has expired. Your previously saved answers have been safely submitted to the server.");
      localStorage.removeItem(`quiz_start_time_${quiz._id}`);
      if (shuffledQuiz) {
        localStorage.removeItem(`quiz_layout_${shuffledQuiz._id}`);
        localStorage.removeItem(`quiz_draft_${shuffledQuiz._id}`);
      }
      localStorage.removeItem('activeQuiz');
      onSubmit();
      return;
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

  const handleSubmitClick = () => {
    if (window.confirm("Are you sure you want to submit your quiz? You cannot change your answers after submission.")) {
      handleSubmitQuiz(false);
    }
  };

  const handleSubmitQuiz = async (autoSubmit = false, reason = '') => {
    try {
      if (isSubmitting) return;

      setIsSubmitting(true);
      setProctorSubmitting(true);
      
      if (timerRef.current) clearInterval(timerRef.current);

      const currentAnswers = answersRef.current;
      
      const answersArray = shuffledQuiz.questions.map(q => ({
        questionId: q._id,
        selectedAnswer: currentAnswers[q._id] || ''
      }));

      const answeredCount = Object.keys(currentAnswers).length;
      const violationsCount = violations.length;

      await submitQuiz(shuffledQuiz._id, studentId, answersArray);

      localStorage.removeItem(`quiz_start_time_${shuffledQuiz._id}`);
      localStorage.removeItem(`quiz_layout_${shuffledQuiz._id}`);
      localStorage.removeItem(`quiz_draft_${shuffledQuiz._id}`);
      exitFullScreen();

      const scoreMessage = autoSubmit 
        ? ` AUTO-SUBMITTED!\n\nReason: ${reason}\nViolations: ${violationsCount}\nAnswered: ${answeredCount}/${shuffledQuiz.questions.length}\n\n`
        : ` Quiz Submitted!\n\n`;

      alert(`${scoreMessage}Your results will be visible when the teacher publishes them.`);

      onSubmit();
    } catch (error) {
      console.error('Submit error:', error);
      exitFullScreen();
      
      const errorMsg = error.response?.data?.error || error.message || 'Failed to submit quiz';
      
      if (error.response?.status === 403 && errorMsg.toLowerCase().includes("expired")) {
        alert("Your quiz time has expired. Your previously saved answers have been safely submitted to the server.");
        localStorage.removeItem(`quiz_start_time_${shuffledQuiz._id}`);
        localStorage.removeItem(`quiz_layout_${shuffledQuiz._id}`);
        localStorage.removeItem(`quiz_draft_${shuffledQuiz._id}`);
        localStorage.removeItem('activeQuiz');
        onSubmit();
      } else {
        alert(` Error: ${errorMsg}`);
        setIsSubmitting(false);
        setProctorSubmitting(false);
      }
    }
  };

  const handleAnswerSelect = (questionId, answer) => {
    setAnswers(prev => {
      const updated = {
        ...prev,
        [questionId]: answer
      };
      answersRef.current = updated;
      localStorage.setItem(`quiz_draft_${shuffledQuiz._id}`, JSON.stringify(updated));
      
      // Fire autosave to server in background
      const answersArray = shuffledQuiz.questions.map(q => ({
        questionId: q._id,
        selectedAnswer: updated[q._id] || ''
      }));
      autosaveQuiz(shuffledQuiz._id, studentId, answersArray).catch(err => console.error("Autosave failed:", err));
      
      return updated;
    });
  };

  const handleNext = () => {
    if (currentQuestion < shuffledQuiz.questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
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

  if (!shuffledQuiz) return null;

  if (!hasStarted) {
    return (
      <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="max-w-3xl w-full bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
          {/* Header - Clean, less purple */}
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
                  <p className="text-sm font-semibold text-gray-500 mb-1">Total Questions</p>
                  <p className="text-3xl font-bold text-gray-900">{quiz.questions.length}</p>
                </div>
                <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 flex flex-col items-center justify-center">
                  <p className="text-sm font-semibold text-gray-500 mb-1">Duration</p>
                  <p className="text-3xl font-bold text-gray-900">{quiz.duration ? `${quiz.duration} Minutes` : 'No Limit'}</p>
                </div>
              </div>
            )}

            {isResuming ? (
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
                    <p className="text-sm text-gray-600 leading-relaxed">This exam is strictly proctored. You must remain in full-screen mode at all times. <strong>Exiting full-screen twice will automatically submit your exam.</strong></p>
                  </div>
                </div>

                <div className="flex gap-4 items-start p-4 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                  <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">No Tab Switching</h4>
                    <p className="text-sm text-gray-600 leading-relaxed">Do not switch tabs, open new windows, or use other applications. These actions will be recorded as full-screen violations.</p>
                  </div>
                </div>

                <div className="flex gap-4 items-start p-4 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                  <Clock className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">Timer & Auto-Submit</h4>
                    <p className="text-sm text-gray-600 leading-relaxed">The countdown begins immediately upon starting. The exam will automatically submit when the timer reaches zero.</p>
                  </div>
                </div>

                <div className="flex gap-4 items-start p-4 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                  <Info className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">Do Not Refresh</h4>
                    <p className="text-sm text-gray-600 leading-relaxed">Avoid refreshing the page. Although your timer will persist, refreshing may count as exiting full-screen and cause a violation.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Footer */}
          <div className="p-6 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-4 mt-auto">
            {isResuming ? (
              <>
                <button 
                  onClick={() => handleSubmitQuiz(false, 'Exited on Resume')} 
                  className="px-6 py-2.5 font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors shadow-md shadow-red-600/20"
                >
                  Submit & Exit Exam
                </button>
                <button 
                  onClick={handleStartExam} 
                  className="px-8 py-2.5 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors shadow-md shadow-green-600/20"
                >
                  Resume Exam
                </button>
              </>
            ) : (
              <>
                <button onClick={onClose} className="px-6 py-2.5 font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-xl transition-colors">
                  Cancel
                </button>
                <button 
                  onClick={handleStartExam} 
                  className="px-8 py-2.5 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors shadow-md shadow-green-600/20"
                >
                  I Understand, Start Exam
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  const question = shuffledQuiz.questions[currentQuestion];

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center z-50 font-body">
      <div className="bg-white w-screen h-screen flex flex-col">
        <div className="p-4 sm:p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Shield className={`w-6 h-6 ${isFullScreen ? 'text-green-600' : 'text-red-600'}`} />
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 truncate max-w-[200px] sm:max-w-md">{quiz.title}</h2>
                <p className="text-xs text-gray-600 mt-1">
                  Protected Mode {!isFullScreen && '(Full-screen exited)'}
                </p>
              </div>
            </div>
            {violations.length > 0 && (
              <div className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs sm:text-sm font-semibold">
               {violations.length}/2 Violation{violations.length > 1 ? 's' : ''}
              </div>
            )}
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Question {currentQuestion + 1} of {shuffledQuiz.questions.length}
            </span>
            {timeLeft !== null && (
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                timeLeft < 60 ? 'bg-red-100 text-red-700 font-bold animate-pulse' : 
                timeLeft < 300 ? 'bg-yellow-100 text-yellow-700' : 
                'bg-blue-100 text-blue-700'
              }`}>
                <Clock className="w-4 h-4" />
                <span className="font-semibold">{formatTime(timeLeft)}</span>
              </div>
            )}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-purple-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentQuestion + 1) / shuffledQuiz.questions.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-50">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-100 mb-6">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-6 leading-relaxed">
                {currentQuestion + 1}. {question.question}
              </h3>
              <div className="space-y-3">
                {question.options.map((option, index) => {
                  const isSelected = answers[question._id] === option;
                  
                  return (
                    <button
                      key={index}
                      onClick={() => handleAnswerSelect(question._id, option)}
                      disabled={showViolationAlert}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                        showViolationAlert ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:shadow-md hover:border-purple-300'
                      } ${
                        isSelected
                          ? 'border-purple-600 bg-purple-50 ring-2 ring-purple-600/20'
                          : 'border-gray-200 bg-white'
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

            <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">
                  Answered: <strong className="text-gray-900">{getAnsweredCount()}</strong> / {shuffledQuiz.questions.length}
                </span>
                {getAnsweredCount() < shuffledQuiz.questions.length && (
                  <span className="text-sm text-yellow-600 font-medium flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    {shuffledQuiz.questions.length - getAnsweredCount()} left
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 border-t border-gray-200 bg-white">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <button
              onClick={handlePrevious}
              disabled={currentQuestion === 0 || isSubmitting || showViolationAlert}
              className="px-4 sm:px-6 py-2.5 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              Previous
            </button>
            {currentQuestion < shuffledQuiz.questions.length - 1 ? (
              <button
                onClick={handleNext}
                disabled={isSubmitting || showViolationAlert}
                className="px-6 sm:px-8 py-2.5 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 disabled:opacity-50 transition-colors cursor-pointer shadow-md shadow-purple-600/20"
              >
                Next Question
              </button>
            ) : (
              <button
                onClick={handleSubmitClick}
                disabled={isSubmitting || showViolationAlert}
                className="px-6 sm:px-8 py-2.5 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center gap-2 cursor-pointer shadow-md shadow-green-600/20"
              >
                {isSubmitting ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    <span className="hidden sm:inline">Submitting...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Submit Exam
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      <ViolationAlertModal
        show={showViolationAlert}
        message={violationMessage}
        violationCount={violations.length}
        maxViolations={2}
        onOk={handleViolationAlertOk}
      />
    </div>
  );
}
