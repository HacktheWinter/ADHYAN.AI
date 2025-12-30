// FrontendStudent/src/components/TakeTestModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Clock, AlertTriangle, CheckCircle, Loader, Shield } from 'lucide-react';
import { submitTest } from '../api/testApi';
import { useFullScreenProctor } from '../hooks/useFullScreenProctor';
import ViolationAlertModal from './ViolationAlertModal';

export default function TakeTestModal({ testPaper, studentId, studentName, onClose, onSubmit }) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

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
    setIsSubmitting: setProctorSubmitting
  } = useFullScreenProctor({
    enabled: true,
    maxViolations: 2,
    onAutoSubmit: (reason) => handleAutoSubmit(reason)
  });

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  // ==================== TIMER SETUP ====================
  useEffect(() => {
    if (testPaper.duration) {
      setTimeLeft(testPaper.duration * 60);
    } else if (testPaper.endTime) {
      const now = new Date();
      const end = new Date(testPaper.endTime);
      const diff = Math.floor((end - now) / 1000);
      setTimeLeft(diff > 0 ? diff : 0);
    }
  }, [testPaper]);

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

  // ==================== ANSWER HANDLING ====================
  const handleAnswerChange = (questionId, answer) => {
    setAnswers(prev => {
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
      console.log("AUTO SUBMIT:", reason);
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

      exitFullScreen();

      if (autoSubmit) {
        alert(
          `🚨 AUTO-SUBMITTED!\n\nReason: ${reason}\nViolations: ${violationsCount}\nAnswered: ${answeredCount}/${testPaper.questions.length}`
        );
      } else {
        alert("✅ Test Submitted Successfully!");
      }

      onSubmit();
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

  const question = testPaper.questions[currentQuestion];

  // ==================== RENDER ====================
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
                  🔒 Protected Mode {!isFullScreen && '(Full-screen exited)'}
                </p>
              </div>
            </div>

            {violations.length > 0 && (
              <div className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-semibold">
                ⚠️ {violations.length}/2 Violation{violations.length > 1 ? 's' : ''}
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
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-6">
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

            <p className="text-gray-800 mb-4 whitespace-pre-wrap">{question.question}</p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Answer:
              </label>

              <textarea
                value={answers[question._id] || ''}
                onChange={(e) => handleAnswerChange(question._id, e.target.value)}
                placeholder="Write your answer here..."
                disabled={showViolationAlert}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 resize-none ${
                  showViolationAlert ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                rows={getTextareaRows(question.type)}
              />
            </div>
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                Answered: {getAnsweredCount()} / {testPaper.questions.length}
              </span>

              {getAnsweredCount() < testPaper.questions.length && (
                <span className="text-sm text-yellow-600 flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" />
                  {testPaper.questions.length - getAnsweredCount()} unanswered
                </span>
              )}
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="p-6 border-t">
          <div className="flex items-center justify-between">

            <button
              onClick={handlePrevious}
              disabled={currentQuestion === 0 || isSubmitting || showViolationAlert}
              className="px-6 py-2 bg-gray-200 rounded-lg disabled:opacity-50"
            >
              Previous
            </button>

            {currentQuestion < testPaper.questions.length - 1 ? (
              <button
                onClick={handleNext}
                disabled={isSubmitting || showViolationAlert}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleSubmitClick}
                disabled={isSubmitting || showViolationAlert}
                className="px-8 py-2 bg-green-600 text-white rounded-lg flex items-center gap-2 cursor-pointer"
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
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-yellow-600" />
              </div>

              <div className="flex-1">
                <h3 className="text-lg font-bold mb-2">Submit Test?</h3>
                <p className="text-gray-600">
                  You have {testPaper.questions.length - getAnsweredCount()} unanswered question(s).  
                  Are you sure you want to submit?
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmation(false)}
                className="flex-1 px-4 py-2 bg-gray-200 rounded-lg"
              >
                Go Back
              </button>

              <button
                onClick={() => handleSubmitTest(false)}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg cursor-pointer"
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
