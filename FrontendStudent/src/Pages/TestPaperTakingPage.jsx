// FrontendStudent/src/Pages/TestPaperTakingPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, AlertTriangle, CheckCircle, Loader, Shield, Info } from 'lucide-react';
import { getTestPaperById, submitTest } from '../api/testApi';
import { useFullScreenProctor } from '../hooks/useFullScreenProctor';
import ViolationAlertModal from '../components/ViolationAlertModal';

export default function TestPaperTakingPage() {
  const { id: classId, testId } = useParams();
  const navigate = useNavigate();

  const [testPaper, setTestPaper] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasStarted, setHasStarted] = useState(false);

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [studentId, setStudentId] = useState(null);

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
    enabled: hasStarted,
    maxViolations: 2,
    onAutoSubmit: (reason) => handleAutoSubmit(reason)
  });

  // ==================== INITIALIZATION ====================
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setStudentId(user._id);

    fetchTestPaper();
  }, [testId]);

  const fetchTestPaper = async () => {
    try {
      setLoading(true);
      const res = await getTestPaperById(testId);
      setTestPaper(res.testPaper);
    } catch (error) {
      console.error('Failed to fetch test paper', error);
      alert('Failed to load test paper data');
      navigate(`/course/${classId}/test`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  // ==================== TIMER SETUP ====================
  useEffect(() => {
    if (!hasStarted || !testPaper) return;

    const setupTimer = () => {
      let calcTimeLeft = Infinity;

      if (testPaper.duration) {
        const storageKey = `test_start_time_${testId}`;
        let startTime = localStorage.getItem(storageKey);
        
        if (!startTime) {
          startTime = Date.now().toString();
          localStorage.setItem(storageKey, startTime);
        }

        const elapsedSeconds = Math.floor((Date.now() - parseInt(startTime)) / 1000);
        const durationSeconds = testPaper.duration * 60;
        const remainingDuration = durationSeconds - elapsedSeconds;
        
        calcTimeLeft = Math.min(calcTimeLeft, remainingDuration > 0 ? remainingDuration : 0);
      }

      if (testPaper.endTime) {
        const end = new Date(testPaper.endTime).getTime();
        const remainingEndTime = Math.floor((end - Date.now()) / 1000);
        calcTimeLeft = Math.min(calcTimeLeft, remainingEndTime > 0 ? remainingEndTime : 0);
      }

      if (calcTimeLeft !== Infinity) {
        setTimeLeft(calcTimeLeft);
      }
    };

    setupTimer();
  }, [hasStarted, testPaper, testId]);

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

    return () => timerRef.current && clearInterval(timerRef.current);
  }, [timeLeft]);

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

  // ==================== START EXAM ====================
  const handleStartExam = async () => {
    try {
      await requestFullScreen();
      setHasStarted(true);
    } catch (error) {
      alert("Please allow full screen to start the exam.");
    }
  };

  // ==================== ANSWER HANDLING ====================
  const handleAnswerChange = (questionId, answer) => {
    setAnswers(prev => {
      const currentQ = testPaper.questions.find(q => q._id === questionId);
      
      if (!answer.trim()) {
        const updated = { ...prev };
        delete updated[questionId];
        answersRef.current = updated;
        return updated;
      }

      if (currentQ?.choiceGroup) {
        const otherInGroup = testPaper.questions.find(
          q => q.choiceGroup === currentQ.choiceGroup && q._id !== questionId
        );
        if (otherInGroup && prev[otherInGroup._id]) {
          alert(`You have already answered ${otherInGroup.choiceLabel || 'another choice'} in this group. Please clear that answer first if you want to switch.`);
          return prev;
        }
      }

      const updated = { ...prev, [questionId]: answer };
      answersRef.current = updated;
      return updated;
    });
  };

  const handleNext = () => {
    if (currentQuestion < testPaper.questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  // ==================== SUBMIT HANDLING ====================
  const handleAutoSubmit = async (reason) => {
    if (!isSubmitting) {
      await handleSubmitTest(true, reason);
    }
  };

  const handleSubmitClick = () => {
    const unanswered = testPaper.questions.length - Object.keys(answers).length;
    if (unanswered > 0) {
      setShowConfirmation(true);
    } else {
      handleSubmitTest(false);
    }
  };

  const handleSubmitTest = async (autoSubmit = false, reason = '') => {
    try {
      if (isSubmitting) return;

      setIsSubmitting(true);
      setProctorSubmitting(true);

      timerRef.current && clearInterval(timerRef.current);

      const currentAnswers = answersRef.current;

      const answersArray = testPaper.questions.map(q => ({
        questionId: q._id,
        answer: currentAnswers[q._id] || ''
      }));

      const violationsCount = violations.length;
      const answeredCount = Object.keys(currentAnswers).length;

      await submitTest(testPaper._id, studentId, answersArray);

      // Clean up local storage
      localStorage.removeItem(`test_start_time_${testId}`);

      exitFullScreen();

      if (autoSubmit) {
        alert(
          ` AUTO-SUBMITTED!\n\nReason: ${reason}\nViolations: ${violationsCount}\nAnswered: ${answeredCount}/${testPaper.questions.length}`
        );
      } else {
        alert(" Test Submitted Successfully!");
      }

      navigate(`/course/${classId}/test`);
    } catch (error) {
      console.error('Submit error:', error);
      exitFullScreen();
      alert(error.response?.data?.error || 'Failed to submit test.');
      setIsSubmitting(false);
      setProctorSubmitting(false);
    }
  };

  const getAnsweredCount = () => Object.keys(answers).length;

  const getTextareaRows = (type) => {
    if (type === 'short') return 3;
    if (type === 'medium') return 6;
    if (type === 'long') return 12;
    return 5;
  };

  // ==================== RENDER ====================
  if (loading || !testPaper) {
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
            <h1 className="text-3xl font-bold text-white mb-2">{testPaper.title}</h1>
            <p className="text-purple-100 font-medium">Test Instructions</p>
          </div>
          
          <div className="p-8 space-y-6">
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <p className="text-sm text-gray-500 mb-1">Total Questions</p>
                <p className="text-xl font-bold text-gray-900">{testPaper.questions.length}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <p className="text-sm text-gray-500 mb-1">Duration</p>
                <p className="text-xl font-bold text-gray-900">{testPaper.duration ? `${testPaper.duration} Minutes` : 'No Limit'}</p>
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
                onClick={() => navigate(`/course/${classId}/test`)}
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

  const question = testPaper.questions[currentQuestion];

  // --- EXAM VIEW ---
  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
      <div className="bg-white w-screen h-screen flex flex-col">

        {/* HEADER */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Shield className={`w-6 h-6 ${isFullScreen ? 'text-green-600' : 'text-red-600'}`} />
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{testPaper.title}</h2>
                <p className="text-xs text-gray-600 mt-1">
                   Protected Mode {!isFullScreen && '(Full-screen exited)'}
                </p>
              </div>
            </div>

            {violations.length > 0 && (
              <div className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-semibold">
               {violations.length}/2 Violation{violations.length > 1 ? 's' : ''}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Question {currentQuestion + 1} of {testPaper.questions.length}
            </span>

            {timeLeft !== null && (
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
                timeLeft < 60 ? 'bg-red-100 text-red-700'
                : timeLeft < 300 ? 'bg-yellow-100 text-yellow-700'
                : 'bg-blue-100 text-blue-700'
              }`}>
                <Clock className="w-4 h-4" />
                <span className="font-semibold">{formatTime(timeLeft)}</span>
              </div>
            )}
          </div>

          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-purple-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentQuestion + 1) / testPaper.questions.length) * 100}%` }}
            />
          </div>
        </div>

        {/* QUESTION CONTENT */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          <div className="max-w-4xl mx-auto">
            <div className="mb-6 bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900">
                  Question {currentQuestion + 1}
                </h3>

                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  question.type === 'short'
                    ? 'bg-blue-100 text-blue-700'
                    : question.type === 'medium'
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-pink-100 text-pink-700'
                }`}>
                  {question.marks} marks
                </span>
              </div>

              <p className="text-gray-800 mb-6 whitespace-pre-wrap leading-relaxed">{question.question}</p>

              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center justify-between">
                  <span>Your Answer:</span>
                  {question.choiceGroup && (
                    <span className="text-[10px] uppercase font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-100">
                      Optional Choice Group
                    </span>
                  )}
                </label>

                {question.choiceGroup && testPaper.questions.some(q => q.choiceGroup === question.choiceGroup && q._id !== question._id && answers[q._id]) ? (
                  <div className="absolute inset-0 z-10 bg-gray-50/80 flex items-center justify-center rounded-lg border border-dashed border-gray-300">
                     <div className="text-center px-4">
                       <AlertTriangle className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                       <p className="text-sm font-semibold text-gray-700">Choice already answered</p>
                       <p className="text-xs text-gray-500 mt-1">You can only answer one question from this choice group.</p>
                     </div>
                  </div>
                ) : null}

                <textarea
                  value={answers[question._id] || ''}
                  onChange={(e) => handleAnswerChange(question._id, e.target.value)}
                  placeholder={question.choiceGroup ? "Select and write your answer for this choice..." : "Write your answer here..."}
                  disabled={showViolationAlert}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 resize-none transition-all ${
                    showViolationAlert ? 'opacity-50 cursor-not-allowed' : ''
                  } ${answers[question._id] ? 'border-purple-300 ring-2 ring-purple-100' : 'border-gray-300'}`}
                  rows={getTextareaRows(question.type)}
                />
              </div>
            </div>

            <div className="mt-6 p-4 bg-blue-50/50 rounded-xl border border-blue-100">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-gray-700">
                    Total Requirements Met: {Object.keys(answers).length} / {testPaper.questions.filter(q => !q.isOptional).length}
                  </span>
                  <span className="text-[10px] text-gray-500 italic mt-0.5">
                    (Includes both mandatory and selected optional choices)
                  </span>
                </div>

                {Object.keys(answers).length < testPaper.questions.filter(q => !q.isOptional).length && (
                  <span className="text-sm text-orange-600 font-medium flex items-center gap-1.5 animate-pulse">
                    <AlertTriangle className="w-4 h-4" />
                    Still some mandatory tasks remaining
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="p-6 border-t bg-white">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <button
              onClick={handlePrevious}
              disabled={currentQuestion === 0 || isSubmitting || showViolationAlert}
              className="px-6 py-2.5 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 disabled:opacity-50 transition-colors cursor-pointer"
            >
              Previous
            </button>

            {currentQuestion < testPaper.questions.length - 1 ? (
              <button
                onClick={handleNext}
                disabled={isSubmitting || showViolationAlert}
                className="px-8 py-2.5 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 disabled:opacity-50 transition-colors shadow-md shadow-purple-600/20"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleSubmitClick}
                disabled={isSubmitting || showViolationAlert}
                className="px-8 py-2.5 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 flex items-center gap-2 cursor-pointer shadow-md shadow-green-600/20"
              >
                {isSubmitting ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Submit Test
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* VIOLATION MODAL */}
      <ViolationAlertModal
        show={showViolationAlert}
        message={violationMessage}
        violationCount={violations.length}
        maxViolations={2}
        onOk={handleViolationAlertOk}
      />

      {/* CONFIRMATION MODAL */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-yellow-600" />
              </div>

              <div className="flex-1 pt-1">
                <h3 className="text-xl font-bold mb-2">Submit Test?</h3>
                <p className="text-gray-600 text-sm">
                  You have <strong>{testPaper.questions.length - getAnsweredCount()}</strong> unanswered question(s).  
                  Are you sure you want to submit?
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmation(false)}
                className="flex-1 px-4 py-3 bg-gray-100 font-semibold text-gray-700 rounded-xl hover:bg-gray-200 transition-colors cursor-pointer"
              >
                Go Back
              </button>

              <button
                onClick={() => handleSubmitTest(false)}
                disabled={isSubmitting}
                className="flex-1 px-4 py-3 bg-green-600 font-semibold text-white rounded-xl hover:bg-green-700 transition-colors cursor-pointer"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Anyway'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
