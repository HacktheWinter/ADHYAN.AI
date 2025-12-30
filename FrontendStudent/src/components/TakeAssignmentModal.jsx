import React, { useState, useRef, useEffect } from 'react';
import { AlertTriangle, CheckCircle, Loader, Shield } from 'lucide-react';
import { submitAssignment } from '../api/assignmentApi';
import { useFullScreenProctor } from '../hooks/useFullScreenProctor';
import ViolationAlertModal from './ViolationAlertModal';

export default function TakeAssignmentModal({ assignment, studentId, studentName, onClose, onSubmit }) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  
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

  // ==================== ANSWER HANDLING ====================
  const handleAnswerChange = (questionId, answer) => {
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
    if (currentQuestion < assignment.questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  // ==================== SUBMIT HANDLERS ====================
  const handleAutoSubmit = async (reason) => {
    if (isSubmitting) return;
    console.log('⏰ Auto-submitting assignment:', reason);
    await handleSubmitAssignment(true, reason);
  };

  const handleSubmitClick = () => {
    const unanswered = assignment.questions.length - Object.keys(answers).length;
    if (unanswered > 0) {
      setShowConfirmation(true);
    } else {
      handleSubmitAssignment(false);
    }
  };

  const handleSubmitAssignment = async (autoSubmit = false, reason = '') => {
    try {
      if (isSubmitting) return;

      setIsSubmitting(true);
      setProctorSubmitting(true);

      const currentAnswers = answersRef.current;

      const answersArray = assignment.questions.map(q => ({
        questionId: q._id,
        answer: currentAnswers[q._id] || ''
      }));

      const answeredCount = Object.keys(currentAnswers).length;
      const violationsCount = violations.length;

      console.log(' Submitting assignment:', { assignmentId: assignment._id, studentId });

      await submitAssignment(assignment._id, studentId, answersArray);

      exitFullScreen();

      if (autoSubmit) {
        alert(
          ` AUTO-SUBMITTED!\n\n` +
          `Reason: ${reason}\n` +
          `Violations: ${violationsCount}\n` +
          `Answered: ${answeredCount}/${assignment.questions.length}\n\n` +
          `Your assignment has been submitted. Results will be available after evaluation.`
        );
      } else {
        alert(' Assignment Submitted Successfully!\n\nYour answers have been submitted. Results will be available after evaluation.');
      }

      onSubmit();
    } catch (error) {
      console.error(' Submit error:', error);
      exitFullScreen();
      alert(error.response?.data?.error || 'Failed to submit assignment. Please try again.');
      
      setIsSubmitting(false);
      setProctorSubmitting(false);
      setShowConfirmation(false);
    }
  };

  const getAnsweredCount = () => Object.keys(answers).length;

  const question = assignment.questions[currentQuestion];

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
                <h2 className="text-2xl font-bold text-gray-900">{assignment.title}</h2>
                {assignment.description && (
                  <p className="text-xs text-gray-600 mt-1">{assignment.description}</p>
                )}
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
              Question {currentQuestion + 1} of {assignment.questions.length}
            </span>
            {assignment.dueDate && (
              <span className="text-sm text-orange-600 font-medium">
                Due: {new Date(assignment.dueDate).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            )}
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-purple-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentQuestion + 1) / assignment.questions.length) * 100}%` }}
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
              <span className="px-3 py-1 rounded-full text-sm font-semibold bg-indigo-100 text-indigo-800">
                {question.marks} marks
              </span>
            </div>

            <p className="text-gray-800 mb-4 text-base leading-relaxed whitespace-pre-wrap">{question.question}</p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Answer:
              </label>
              <textarea
                value={answers[question._id] || ''}
                onChange={(e) => handleAnswerChange(question._id, e.target.value)}
                placeholder="Write your answer here... Be detailed and comprehensive."
                disabled={showViolationAlert}
                className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 resize-none ${
                  showViolationAlert ? 'cursor-not-allowed opacity-50' : ''
                }`}
                rows={12}
              />
              <p className="text-xs text-gray-500 mt-1">
                 Tip: Provide a detailed and well-structured answer for maximum marks
              </p>
            </div>
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                Answered: {getAnsweredCount()} / {assignment.questions.length}
              </span>
              {getAnsweredCount() < assignment.questions.length && (
                <span className="text-sm text-yellow-600 flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" />
                  {assignment.questions.length - getAnsweredCount()} unanswered
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

            {currentQuestion < assignment.questions.length - 1 ? (
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
                    Submit Assignment
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

      {/* CONFIRMATION MODAL */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  Submit Assignment?
                </h3>
                <p className="text-gray-600">
                  You have {assignment.questions.length - getAnsweredCount()} unanswered question(s). 
                  Are you sure you want to submit?
                </p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmation(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition-colors cursor-pointer"
              >
                Go Back
              </button>
              <button
                onClick={() => handleSubmitAssignment(false)}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors cursor-pointer"
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