import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, AlertTriangle, CheckCircle, Loader, Shield, Info, Bookmark, LayoutGrid, Camera, Video, Maximize2, Minimize2, X, ChevronDown } from 'lucide-react';
import { getQuizById, submitQuiz } from '../api/quizApi';
import { useFullScreenProctor } from '../hooks/useFullScreenProctor';
import { useWebcamProctor } from '../hooks/useWebcamProctor';
import ViolationAlertModal from '../components/ViolationAlertModal';
import WebcamStatusToast from '../components/WebcamStatusToast';
import QuestionPalette from '../components/QuestionPalette';
import ToastNotification from '../components/ToastNotification';
import ConfirmationCard from '../components/ConfirmationCard';
import { getStoredUser } from '../utils/authStorage';

const ExpandableQuestion = ({ questionText, questionIdx }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const textRef = useRef(null);

  // Reset when question changes
  useEffect(() => {
    setIsExpanded(false);
  }, [questionIdx]);

  useEffect(() => {
    const checkOverflow = () => {
      if (textRef.current) {
        setIsOverflowing(textRef.current.scrollHeight > textRef.current.clientHeight);
      }
    };
    
    // Check after a tiny delay to ensure DOM is painted
    const timer = setTimeout(checkOverflow, 50);
    window.addEventListener('resize', checkOverflow);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', checkOverflow);
    };
  }, [questionIdx, questionText]);

  return (
    <>
      <div className="relative mb-6 pb-4 mt-3">
        <div 
          ref={textRef}
          className="text-base sm:text-lg font-semibold text-gray-900 leading-relaxed whitespace-pre-wrap rounded-xl max-h-[150px] overflow-hidden"
        >
          {questionIdx + 1}. {questionText}
        </div>
        
        {isOverflowing && (
          <div className="absolute bottom-0 left-0 w-full pt-12 pb-1 bg-gradient-to-t from-white via-white/90 to-transparent flex items-end">
            <button
              onClick={() => setIsExpanded(true)}
              className="text-gray-500 hover:text-gray-700 transition-colors z-10 flex items-center gap-1 text-sm font-medium cursor-pointer"
            >
              Show more
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Expanded Question Modal */}
      {isExpanded && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm">
          <div 
            className="bg-white rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <LayoutGrid className="w-5 h-5 text-purple-600" />
                Question {questionIdx + 1}
              </h3>
              <button
                onClick={() => setIsExpanded(false)}
                className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Body */}
            <div className="p-6 overflow-y-auto custom-scrollbar">
              <div className="text-base sm:text-lg font-medium text-gray-800 leading-relaxed whitespace-pre-wrap">
                {questionText}
              </div>
            </div>
            
            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end">
              <button
                onClick={() => setIsExpanded(false)}
                className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition-colors cursor-pointer"
              >
                Close & View Options
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

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
  const [studentId, setStudentId] = useState(null);
  const [visitedQuestions, setVisitedQuestions] = useState(new Set([0]));
  const [markedForReview, setMarkedForReview] = useState({});
  const [isMobilePaletteOpen, setIsMobilePaletteOpen] = useState(false);
  const [totalStudents, setTotalStudents] = useState(0);

  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', type: 'danger', onConfirm: null });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
  };

  // ==================== WEBCAM PROCTORING STATE ====================
  const [webcamStream, setWebcamStream] = useState(null);
  const [cameraPermission, setCameraPermission] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const webcamVideoRef = useRef(null);
  const proctorPhotoUrlRef = useRef(null);

  useEffect(() => {
    setVisitedQuestions(prev => new Set(prev).add(currentQuestion));
  }, [currentQuestion]);

  const handleToggleMarkForReview = (questionId) => {
    setMarkedForReview(prev => ({
      ...prev,
      [questionId]: !prev[questionId]
    }));
  };

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
    requestFullScreen,
    clearViolations
  } = useFullScreenProctor({
    enabled: hasStarted, // Only enable if exam has started
    maxViolations: 2,
    examId: quizId,
    onAutoSubmit: (reason) => handleAutoSubmit(reason)
  });

  // ==================== WEBCAM PROCTORING ====================
  const {
    activeWarning,
    warningCount,
    photoCaptured,
    capturedPhotoUrl,
    dismissWarning,
    captureBeforeSubmit,
  } = useWebcamProctor({
    enabled: quiz?.webcamEnabled && hasStarted,
    examStarted: hasStarted,
    totalStudents,
    examDurationMinutes: quiz?.duration || null,
    videoRef: webcamVideoRef,
    stream: webcamStream,
    quizId: quizId || null,
    studentId: studentId || null,
    onPhotoUploaded: (url) => {
      proctorPhotoUrlRef.current = url;
    },
  });

  // Sync webcam stream to video element
  useEffect(() => {
    if (webcamVideoRef.current && webcamStream) {
      webcamVideoRef.current.srcObject = webcamStream;
    }
  }, [webcamStream, hasStarted]);

  // Cleanup webcam stream on unmount
  useEffect(() => {
    return () => {
      if (webcamStream) {
        webcamStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [webcamStream]);

  // Camera enable function (called from instruction screen)
  const handleEnableCamera = async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: false,
      });
      setWebcamStream(stream);
      setCameraPermission(true);
    } catch (err) {
      console.error('Camera permission denied:', err);
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Camera access denied. Please allow camera permission in your browser settings and try again.'
          : 'Failed to access camera. Please ensure your device has a working camera.'
      );
    }
  };

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
      const quizData = res.quiz || res;
      let allQuestions = [];
      if (quizData.sections && quizData.sections.length > 0) {
        allQuestions = quizData.sections.flatMap(s => s.questions || []);
      } else if (quizData.questions && quizData.questions.length > 0) {
        allQuestions = quizData.questions;
      }
      
      // Shuffle questions so sequence is different for each student
      const shuffledQuestions = [...allQuestions];
      for (let i = shuffledQuestions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledQuestions[i], shuffledQuestions[j]] = [shuffledQuestions[j], shuffledQuestions[i]];
      }
      
      const shuffledQuiz = { ...quizData, questions: shuffledQuestions };
      setQuiz(shuffledQuiz);
    } catch (error) {
      console.error('Failed to fetch quiz', error);
      showToast('Failed to load quiz data', 'error');
      setTimeout(() => navigate(`/course/${classId}/quiz`), 2000);
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
      showToast("Please allow full screen to start the exam.", "error");
    }
  };

  // ==================== SUBMIT HANDLERS ====================
  const handleAutoSubmit = async (reason) => {
    if (isSubmitting) return;
    await handleSubmitQuiz(true, reason);
  };

  const handleSubmitClick = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Submit Quiz?',
      message: 'Are you sure you want to submit your quiz? You cannot change your answers after submission.',
      type: 'warning',
      onConfirm: () => {
        handleSubmitQuiz(false);
      }
    });
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

      // Capture proctor photo if not captured yet
      let finalPhotoUrl = proctorPhotoUrlRef.current;
      if (quiz?.webcamEnabled && typeof captureBeforeSubmit === 'function') {
        const capturedUrl = await captureBeforeSubmit();
        if (capturedUrl) finalPhotoUrl = capturedUrl;
      }

      await submitQuiz(quiz._id, studentId, answersArray, finalPhotoUrl);

      // Clean up local storage
      localStorage.removeItem(`quiz_start_time_${quizId}`);
      clearViolations();

      // Stop webcam stream
      if (webcamStream) {
        webcamStream.getTracks().forEach(track => track.stop());
        setWebcamStream(null);
      }

      exitFullScreen();

      const scoreMessage = autoSubmit 
        ? `AUTO-SUBMITTED! Reason: ${reason}. Answered: ${answeredCount}/${quiz.questions.length}. `
        : `Quiz Submitted! `;

      showToast(
        `${scoreMessage}Your results will be available once the teacher publishes them.`, 'success'
      );

      setTimeout(() => {
        navigate(`/course/${classId}/quiz`);
      }, 3000);
    } catch (error) {
      console.error('Submit error:', error);
      exitFullScreen();
      
      const errorMsg = error.response?.data?.error || error.message || 'Failed to submit quiz';
      showToast(`Error: ${errorMsg}`, 'error');
      
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

              {/* Webcam Proctoring Card */}
              {quiz.webcamEnabled && (
                <div className={`flex gap-4 items-start p-4 rounded-xl border mt-4 ${
                  cameraPermission 
                    ? 'bg-green-50 border-green-200 text-green-900' 
                    : 'bg-purple-50 border-purple-200 text-purple-900'
                }`}>
                  <Camera className={`w-6 h-6 flex-shrink-0 mt-0.5 ${
                    cameraPermission ? 'text-green-600' : 'text-purple-600'
                  }`} />
                  <div className="flex-1">
                    <h4 className="font-bold mb-1">
                      {cameraPermission ? '✓ Camera Active' : 'Webcam Required'}
                    </h4>
                    <p className="text-sm leading-relaxed mb-3">
                      {cameraPermission 
                        ? 'Your camera is active and AI monitoring will track your activity throughout the exam. Any suspicious behavior will be flagged automatically.'
                        : 'This exam requires webcam access. Your camera will be monitored by AI throughout the exam to detect any suspicious activity. Please enable your camera to proceed.'
                      }
                    </p>
                    
                    {!cameraPermission ? (
                      <div>
                        <button
                          onClick={handleEnableCamera}
                          className="px-5 py-2.5 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition-colors shadow-md shadow-purple-600/20 flex items-center gap-2 text-sm cursor-pointer"
                        >
                          <Video className="w-4 h-4" />
                          Enable Camera
                        </button>
                        {cameraError && (
                          <p className="text-red-600 text-xs mt-2 font-medium">{cameraError}</p>
                        )}
                      </div>
                    ) : (
                      <div className="w-48 aspect-video rounded-xl overflow-hidden border-2 border-green-300 shadow-sm">
                        <video
                          ref={webcamVideoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-full object-cover mirror"
                          style={{ transform: 'scaleX(-1)' }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
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
                disabled={quiz.webcamEnabled && !cameraPermission}
                className={`px-8 py-3 font-bold rounded-xl transition-colors shadow-lg flex items-center gap-2 cursor-pointer ${
                  quiz.webcamEnabled && !cameraPermission
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none'
                    : 'bg-green-600 text-white hover:bg-green-700 shadow-green-600/30'
                }`}
              >
                {quiz.webcamEnabled && !cameraPermission ? (
                  <>
                    <Camera className="w-5 h-5" />
                    Enable Camera First
                  </>
                ) : (
                  'Start Exam'
                )}
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
        <div className="p-3 sm:p-5 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Shield className={`w-6 h-6 ${isFullScreen ? 'text-green-600' : 'text-red-600'}`} />
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 truncate max-w-[200px] sm:max-w-md">{quiz.title}</h2>
                <p className="text-xs text-gray-600 mt-0.5">
                  Protected Mode {!isFullScreen && '(Full-screen exited)'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Mobile Palette Toggle Button */}
              <button
                onClick={() => setIsMobilePaletteOpen(!isMobilePaletteOpen)}
                className="md:hidden flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 text-purple-700 hover:bg-purple-200 rounded-lg text-xs font-bold transition-colors"
              >
                <LayoutGrid className="w-4 h-4" />
                <span>Questions</span>
              </button>

              {/* Camera Active Badge */}
              {quiz.webcamEnabled && cameraPermission && (
                <div className="flex items-center gap-1.5 bg-green-100 text-green-700 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm border border-green-200">
                  <Camera className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Camera Active</span>
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse ml-1" />
                </div>
              )}

              {violations.length > 0 && (
                <div className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs sm:text-sm font-semibold">
                 {violations.length}/2 Violation{violations.length > 1 ? 's' : ''}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between mt-2">
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

        {/* MAIN BODY (Side Palette + Question Area) */}
        <div className="flex-1 overflow-hidden flex bg-gray-50">
          {/* Question Palette Sidebar */}
          <QuestionPalette
            questions={quiz.questions}
            currentQuestion={currentQuestion}
            answers={answers}
            visitedQuestions={visitedQuestions}
            markedForReview={markedForReview}
            onSelectQuestion={(idx) => setCurrentQuestion(idx)}
            isMobileOpen={isMobilePaletteOpen}
            setIsMobileOpen={setIsMobilePaletteOpen}
          />

          {/* Question Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="max-w-3xl mx-auto">
              <div className="bg-white p-5 sm:p-8 rounded-2xl shadow-sm border border-gray-100 mb-5 min-h-[450px]">
                <div className="flex items-center justify-between mb-3 border-b border-gray-100 pb-2.5">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Question {currentQuestion + 1} of {quiz.questions.length}
                  </span>

                  <div className="flex items-center gap-2">
                    {answers[question._id] && (
                      <button
                        onClick={() => handleAnswerSelect(question._id, '')}
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

                <ExpandableQuestion questionText={question.question} questionIdx={currentQuestion} />

                <div className="space-y-3">
                  {question.options.map((option, index) => {
                    const isSelected = answers[question._id] === option;
                    
                    return (
                      <button
                        key={index}
                        onClick={() => handleAnswerSelect(question._id, option)}
                        disabled={showViolationAlert}
                        className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${
                          showViolationAlert ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:shadow-md hover:border-purple-300'
                        } ${
                          isSelected
                            ? 'border-purple-600 bg-purple-50 ring-2 ring-purple-600/20'
                            : 'border-gray-200 bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                            isSelected ? 'border-purple-600 bg-purple-600' : 'border-gray-300'
                          }`}>
                            {isSelected && <CheckCircle className="w-3 h-3 text-white" />}
                          </div>
                          <span className="font-semibold text-gray-700 flex-shrink-0 text-sm sm:text-base">
                            {String.fromCharCode(65 + index)}.
                          </span>
                          <span className="flex-1 text-gray-900 text-[15px] sm:text-base whitespace-pre-wrap text-left leading-relaxed">{option}</span>
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
        </div>

        {/* FOOTER */}
        <div className="p-4 sm:p-6 border-t border-gray-200 bg-white">
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
            <button
              onClick={handlePrevious}
              disabled={currentQuestion === 0 || isSubmitting || showViolationAlert}
              style={{ color: '#000000' }}
              className="px-4 sm:px-6 py-2.5 bg-gray-200 text-black font-bold rounded-xl hover:bg-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer border border-gray-300 shadow-2xs"
            >
              Previous
            </button>

            <div className="flex items-center gap-3">
              <button
                onClick={() => handleToggleMarkForReview(question._id)}
                className={`hidden sm:flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                  markedForReview[question._id]
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100'
                }`}
              >
                <Bookmark className={`w-4 h-4 ${markedForReview[question._id] ? 'fill-yellow-300 text-purple-900' : ''}`} />
                {markedForReview[question._id] ? 'Marked' : 'Mark for Review'}
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
      </div>

      {/* WEBCAM PREVIEW PIP */}
      {quiz.webcamEnabled && cameraPermission && !isMobilePaletteOpen && (
        <div className="fixed bottom-4 right-4 z-[100] w-20 sm:w-28 aspect-video rounded-lg overflow-hidden shadow-xl border-2 border-surface">
          <video
            ref={webcamVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover mirror"
            style={{ transform: 'scaleX(-1)' }}
          />
          <div className="absolute top-1 right-1 flex gap-1">
            <div className="bg-red-500 w-1.5 h-1.5 rounded-full animate-pulse shadow-[0_0_6px_rgba(239,68,68,0.8)]" />
          </div>
        </div>
      )}

      {/* WEBCAM WARNING TOAST */}
      <WebcamStatusToast
        show={!!activeWarning}
        message={activeWarning}
        onDismiss={dismissWarning}
      />

      {/* VIOLATION ALERT MODAL */}
      <ViolationAlertModal
        show={showViolationAlert}
        message={violationMessage}
        violationCount={violations.length}
        maxViolations={2}
        onOk={handleViolationAlertOk}
      />

      <ToastNotification
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ ...toast, show: false })}
      />
      <ConfirmationCard
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type={confirmDialog.type}
        onConfirm={() => {
          confirmDialog.onConfirm();
          setConfirmDialog({ ...confirmDialog, isOpen: false });
        }}
        onCancel={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
      />
    </div>
  );
}
