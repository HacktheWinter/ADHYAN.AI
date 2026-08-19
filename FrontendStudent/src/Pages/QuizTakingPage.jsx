// FrontendStudent/src/Pages/QuizTakingPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, AlertTriangle, CheckCircle, Loader, Shield, Info } from 'lucide-react';
import { getQuizById, submitQuiz } from '../api/quizApi';
import { useFullScreenProctor } from '../hooks/useFullScreenProctor';
import ViolationAlertModal from '../components/ViolationAlertModal';

export default function QuizTakingPage() {
  const { id: classId, quizId } = useParams();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasStarted, setHasStarted] = useState(false);

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [studentId, setStudentId] = useState(null); // Will get from localStorage or context

  const timerRef = useRef(null);
  const answersRef = useRef({});

  // ==================== FULL-SCREEN PROCTORING ====================
  const {
    isFullScreen,
    showViolationAlert,
    violationMessage,
    violations,
    exitFullScreen,
    handleViolationAlertOk,
    setIsSubmitting: setProctorSubmitting,
    requestFullScreen
  } = useFullScreenProctor({
    enabled: hasStarted, // Only enable if exam has started
    maxViolations: 2,
    onAutoSubmit: (reason) => handleAutoSubmit(reason)
  });

  // ==================== INITIALIZATION ====================
  useEffect(() => {
    // Get user info
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setStudentId(user._id);

    fetchQuiz();
  }, [quizId]);

  const fetchQuiz = async () => {
    try {
      setLoading(true);
      const res = await getQuizById(quizId);
      
      // Shuffle questions so sequence is different for each student
      const shuffledQuestions = [...res.quiz.questions];
      for (let i = shuffledQuestions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledQuestions[i], shuffledQuestions[j]] = [shuffledQuestions[j], shuffledQuestions[i]];
      }
      
      const shuffledQuiz = { ...res.quiz, questions: shuffledQuestions };
      setQuiz(shuffledQuiz);
    } catch (error) {
      console.error('Failed to fetch quiz', error);
      alert('Failed to load quiz data');
      navigate(`/course/${classId}/quiz`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  // ==================== TIMER SETUP ====================
  useEffect(() => {
    if (!hasStarted || !quiz) return;

    const setupTimer = () => {
      let calcTimeLeft = Infinity;

      // 1. Duration based constraint
      if (quiz.duration) {
        const storageKey = `quiz_start_time_${quizId}`;
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

      // 2. End Time constraint
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
  }, [hasStarted, quiz, quizId]);

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

  // ==================== START EXAM ====================
  const handleStartExam = async () => {
    try {
      await requestFullScreen();
      setHasStarted(true);
    } catch (error) {
      alert("Please allow full screen to start the exam.");
    }
  };

  // ==================== SUBMIT HANDLERS ====================
  const handleAutoSubmit = async (reason) => {
    if (isSubmitting) return;
    await handleSubmitQuiz(true, reason);
  };

  const handleSubmitClick = () => {
    if (confirm("Are you sure you want to submit your quiz? You cannot change your answers after submission.")) {
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
      
      const answersArray = quiz.questions.map(q => ({
        questionId: q._id,
        selectedAnswer: currentAnswers[q._id] || ''
      }));

      const answeredCount = Object.keys(currentAnswers).length;
      const violationsCount = violations.length;

      await submitQuiz(quiz._id, studentId, answersArray);

      // Clean up local storage
      localStorage.removeItem(`quiz_start_time_${quizId}`);

      exitFullScreen();

      const scoreMessage = autoSubmit 
        ? ` AUTO-SUBMITTED!\n\nReason: ${reason}\nViolations: ${violationsCount}\nAnswered: ${answeredCount}/${quiz.questions.length}\n\n`
        : ` Quiz Submitted!\n\n`;

      alert(
        `${scoreMessage}Your results will be available once the teacher publishes them.`
      );

      navigate(`/course/${classId}/quiz`);
    } catch (error) {
      console.error('Submit error:', error);
      exitFullScreen();
      
      const errorMsg = error.response?.data?.error || error.message || 'Failed to submit quiz';
      alert(` Error: ${errorMsg}`);
      
      setIsSubmitting(false);
      setProctorSubmitting(false);
    }
  };

  // ==================== NAVIGATION ====================
  const handleAnswerSelect = (questionId, answer) => {
    setAnswers(prev => {
      const updated = {
        ...prev,
        [questionId]: answer
      };
      answersRef.current = updated;
      return updated;
    });
  };

  const handleNext = () => {
    if (currentQuestion < quiz.questions.length - 1) {
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

  // ==================== RENDER ====================
  if (loading || !quiz) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <Loader className="w-10 h-10 text-purple-600 animate-spin mb-4" />
        <p className="text-gray-600 font-medium">Loading Exam...</p>
      </div>
    );
  }

  // --- INSTRUCTION VIEW ---
  if (!hasStarted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-8 text-center">
            <h1 className="text-3xl font-bold text-white mb-2">{quiz.title}</h1>
            <p className="text-purple-100 font-medium">Exam Instructions</p>
          </div>
          
          <div className="p-8 space-y-6">
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <p className="text-sm text-gray-500 mb-1">Total Questions</p>
                <p className="text-xl font-bold text-gray-900">{quiz.questions.length}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <p className="text-sm text-gray-500 mb-1">Duration</p>
                <p className="text-xl font-bold text-gray-900">{quiz.duration ? `${quiz.duration} Minutes` : 'No Limit'}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex gap-4 items-start bg-blue-50 p-4 rounded-xl border border-blue-100 text-blue-900">
                <Info className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold mb-1">Full Screen Required</h4>
                  <p className="text-sm leading-relaxed">This exam is proctored. You must remain in full-screen mode at all times. <strong>If you exit full-screen 2 times, your exam will be automatically submitted.</strong></p>
                </div>
              </div>
              
              <div className="flex gap-4 items-start bg-red-50 p-4 rounded-xl border border-red-100 text-red-900">
                <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold mb-1">Do Not Refresh</h4>
                  <p className="text-sm leading-relaxed">Do not refresh the page during the exam. While the timer will resume properly, refreshing may count as exiting full-screen or disrupt your session.</p>
                </div>
              </div>
            </div>
            
            <div className="pt-6 mt-6 border-t border-gray-100 flex items-center justify-between">
              <button
                onClick={() => navigate(`/course/${classId}/quiz`)}
                className="px-6 py-3 font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Go Back
              </button>
              <button
                onClick={handleStartExam}
                className="px-8 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors shadow-lg shadow-green-600/30"
              >
                Start Exam
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- EXAM VIEW ---
  const question = quiz.questions[currentQuestion];

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center z-50 font-body">
      <div className="bg-white w-screen h-screen flex flex-col">
        {/* HEADER */}
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
              Question {currentQuestion + 1} of {quiz.questions.length}
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
              style={{ width: `${((currentQuestion + 1) / quiz.questions.length) * 100}%` }}
            />
          </div>
        </div>

        {/* QUESTION */}
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
                  Answered: <strong className="text-gray-900">{getAnsweredCount()}</strong> / {quiz.questions.length}
                </span>
                {getAnsweredCount() < quiz.questions.length && (
                  <span className="text-sm text-yellow-600 font-medium flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    {quiz.questions.length - getAnsweredCount()} left
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="p-4 sm:p-6 border-t border-gray-200 bg-white">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <button
              onClick={handlePrevious}
              disabled={currentQuestion === 0 || isSubmitting || showViolationAlert}
              className="px-4 sm:px-6 py-2.5 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              Previous
            </button>

            {currentQuestion < quiz.questions.length - 1 ? (
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

      {/* VIOLATION ALERT MODAL */}
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
