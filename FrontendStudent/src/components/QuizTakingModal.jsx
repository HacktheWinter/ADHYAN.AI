// FrontendStudent/src/components/QuizTakingModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Clock, AlertTriangle, CheckCircle, Loader, Shield } from 'lucide-react';
import { submitQuiz } from '../api/quizApi';
import { useFullScreenProctor } from '../hooks/useFullScreenProctor';
import ViolationAlertModal from './ViolationAlertModal';

export default function QuizTakingModal({ quiz, studentId, studentName, onClose, onSubmit }) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
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
    if (quiz.duration) {
      setTimeLeft(quiz.duration * 60);
    } else if (quiz.endTime) {
      const now = new Date();
      const end = new Date(quiz.endTime);
      const diff = Math.floor((end - now) / 1000);
      setTimeLeft(diff > 0 ? diff : 0);
    }
  }, [quiz]);

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

  // ==================== SUBMIT HANDLERS ====================
  const handleAutoSubmit = async (reason) => {
    if (isSubmitting) return;
    await handleSubmitQuiz(true, reason);
  };

  const handleSubmitClick = () => {
    handleSubmitQuiz(false);
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

      const response = await submitQuiz(quiz._id, studentId, answersArray);

      exitFullScreen();

      const scoreMessage = autoSubmit 
        ? ` AUTO-SUBMITTED!\n\nReason: ${reason}\nViolations: ${violationsCount}\nAnswered: ${answeredCount}/${quiz.questions.length}\n\n`
        : ` Quiz Submitted!\n\n`;

      alert(
        `${scoreMessage}Score: ${response.submission.score}/${response.submission.totalQuestions}\n` +
        `Percentage: ${response.submission.percentage}%\n` +
        `Correct: ${response.submission.score} | Wrong: ${response.submission.totalQuestions - response.submission.score}`
      );

      onSubmit();
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

  const question = quiz.questions[currentQuestion];

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
                <h2 className="text-2xl font-bold text-gray-900">{quiz.title}</h2>
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
              Question {currentQuestion + 1} of {quiz.questions.length}
            </span>
            {timeLeft !== null && (
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
                timeLeft < 60 ? 'bg-red-100 text-red-700' : 
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
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              {question.question}
            </h3>

            <div className="space-y-3">
              {question.options.map((option, index) => {
                const isSelected = answers[question._id] === option;
                
                return (
                  <button
                    key={index}
                    onClick={() => handleAnswerSelect(question._id, option)}
                    disabled={showViolationAlert}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                      showViolationAlert ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:shadow-md'
                    } ${
                      isSelected
                        ? 'border-purple-600 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        isSelected ? 'border-purple-600 bg-purple-600' : 'border-gray-300'
                      }`}>
                        {isSelected && <CheckCircle className="w-4 h-4 text-white" />}
                      </div>
                      <span className="font-medium text-gray-700">
                        {String.fromCharCode(65 + index)}.
                      </span>
                      <span className="flex-1 text-gray-900">{option}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                Answered: {getAnsweredCount()} / {quiz.questions.length}
              </span>
              {getAnsweredCount() < quiz.questions.length && (
                <span className="text-sm text-yellow-600 flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" />
                  {quiz.questions.length - getAnsweredCount()} unanswered
                </span>
              )}
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="p-6 border-t border-gray-200 bg-white">
          <div className="flex items-center justify-between">
            <button
              onClick={handlePrevious}
              disabled={currentQuestion === 0 || isSubmitting || showViolationAlert}
              className="px-6 py-2 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              Previous
            </button>

            {currentQuestion < quiz.questions.length - 1 ? (
              <button
                onClick={handleNext}
                disabled={isSubmitting || showViolationAlert}
                className="px-6 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors cursor-pointer"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleSubmitClick}
                disabled={isSubmitting || showViolationAlert}
                className="px-8 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Submit Quiz
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