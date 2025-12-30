// FrontendStudent/src/components/QuizResultModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Award, TrendingUp, Loader } from 'lucide-react';
import { getQuizResult } from '../api/quizApi';

export default function QuizResultModal({ quizId, studentId, onClose }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const answerRefs = useRef([]);

  useEffect(() => {
    fetchResult();
    answerRefs.current = [];
  }, [quizId, studentId]);

  const fetchResult = async () => {
    try {
      setLoading(true);
      const response = await getQuizResult(quizId, studentId);
      setResult(response.submission);
      setSelectedIndex(0);
    } catch (error) {
      console.error('Error fetching result:', error);
      alert('Failed to load result');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const getGrade = (percentage) => {
    if (percentage >= 90) return { grade: 'A+', color: 'text-green-600', bgColor: 'bg-green-50' };
    if (percentage >= 80) return { grade: 'A', color: 'text-green-600', bgColor: 'bg-green-50' };
    if (percentage >= 70) return { grade: 'B', color: 'text-blue-600', bgColor: 'bg-blue-50' };
    if (percentage >= 60) return { grade: 'C', color: 'text-yellow-600', bgColor: 'bg-yellow-50' };
    if (percentage >= 50) return { grade: 'D', color: 'text-orange-600', bgColor: 'bg-orange-50' };
    return { grade: 'F', color: 'text-red-600', bgColor: 'bg-red-50' };
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8">
          <div className="flex items-center gap-3">
            <Loader className="w-6 h-6 text-purple-600 animate-spin" />
            <span className="text-gray-600">Loading result...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!result) return null;

  const gradeInfo = getGrade(result.percentage);
  const quiz = result.quizId;

  const handleSelect = (idx) => {
    setSelectedIndex(idx);
    const el = answerRefs.current[idx];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-stretch justify-center z-50">
      {/* Fullscreen modal */}
      <div className="bg-white w-full h-full max-w-none rounded-none flex flex-col">

        {/* Header (sticky) */}
        <div className="p-4 md:p-6 border-b border-gray-200 sticky top-0 z-30 bg-white flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Quiz Result</h2>
            <p className="text-gray-600 mt-1 text-sm">{quiz.title}</p>
          </div>
          <button 
            onClick={onClose} 
            className="px-6 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

        {/* Main content: sidebar + detail pane */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar - question list */}
          <aside className="hidden md:flex flex-col w-80 border-r border-gray-100 bg-gray-50">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700">Questions</h3>
              <p className="text-xs text-gray-500 mt-1">Click to jump to a question</p>
            </div>

            <div className="overflow-y-auto p-2 space-y-2">
              {result.answers.map((ans, idx) => {
                const isCorrect = ans.isCorrect;
                return (
                  <button
                    key={ans.questionId}
                    onClick={() => handleSelect(idx)}
                    className={`w-full text-left p-3 rounded-lg flex flex-col gap-1 transition-colors border ${
                      selectedIndex === idx ? 'border-purple-300 bg-white shadow-sm' : 'border-transparent hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-gray-800">Q{idx + 1}</div>
                      <div className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        isCorrect ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                      }`}>
                        {isCorrect ? 'Correct' : 'Incorrect'}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 line-clamp-2 whitespace-pre-wrap">
                      {ans.selectedAnswer ? ans.selectedAnswer : 'Not answered'}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-auto p-4 border-t border-gray-200">
              <div className="text-xs text-gray-500">
                Submitted on {new Date(result.submittedAt).toLocaleDateString()} at {new Date(result.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </aside>

          {/* Detail pane */}
          <main className="flex-1 overflow-y-auto p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Answer Review</h3>

            <div className="space-y-6">
              {result.answers.map((answer, index) => {
                const question = quiz.questions.find(q => q._id === answer.questionId);
                
                return (
                  <div
                    key={answer.questionId}
                    ref={(el) => (answerRefs.current[index] = el)}
                    id={`answer-${index}`}
                    className={`p-6 rounded-lg border-2 ${
                      answer.isCorrect
                        ? 'border-green-200 bg-green-50'
                        : 'border-red-200 bg-red-50'
                    }`}
                  >
                    {/* Question Header */}
                    <div className="flex items-start justify-between mb-4 gap-4">
                      <div className="flex-1">
                        <h4 className="text-lg font-semibold text-gray-900">
                          Question {index + 1}
                        </h4>
                        <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap text-base leading-relaxed">
                          {question.question}
                        </p>
                      </div>

                      <div className="flex-shrink-0 text-right">
                        <div className={`text-sm font-semibold px-3 py-1 rounded-full ${
                          answer.isCorrect
                            ? 'bg-green-600 text-white'
                            : 'bg-red-600 text-white'
                        }`}>
                          {answer.isCorrect ? '✓ Correct' : '✗ Incorrect'}
                        </div>
                      </div>
                    </div>

                    {/* Student Answer */}
                    <div className="mb-4">
                      <h5 className="text-sm font-semibold text-gray-700 mb-2">Your Answer</h5>
                      <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <p className="text-gray-900 whitespace-pre-wrap text-sm">
                          {answer.selectedAnswer || 'Not answered'}
                        </p>
                      </div>
                    </div>

                    {/* Options */}
                    <div className="space-y-2">
                      {question.options.map((option, optIndex) => {
                        const isCorrectAnswer = option === answer.correctAnswer;
                        const isSelectedAnswer = option === answer.selectedAnswer;
                        
                        let optionClass = 'bg-white border-gray-200';
                        if (isCorrectAnswer) {
                          optionClass = 'bg-green-100 border-green-500';
                        } else if (isSelectedAnswer && !answer.isCorrect) {
                          optionClass = 'bg-red-100 border-red-500';
                        }

                        return (
                          <div
                            key={optIndex}
                            className={`p-3 rounded-lg border-2 ${optionClass}`}
                          >
                            <div className="flex items-center gap-3">
                              <span className="font-semibold text-gray-700">
                                {String.fromCharCode(65 + optIndex)}.
                              </span>
                              <span className="flex-1 text-gray-900">{option}</span>
                              {isCorrectAnswer && (
                                <span className="px-2 py-1 bg-green-600 text-white text-xs font-semibold rounded">
                                  Correct Answer
                                </span>
                              )}
                              {isSelectedAnswer && !answer.isCorrect && (
                                <span className="px-2 py-1 bg-red-600 text-white text-xs font-semibold rounded">
                                  Your Answer
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </main>
        </div>

        {/* Footer */}
        <div className="p-4 md:p-6 border-t border-gray-200 bg-white">
          <div className="max-w-7xl mx-auto flex justify-end">
            <div className="flex items-center gap-8">
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">
                  {result.score}<span className="text-gray-400">/{result.totalQuestions}</span>
                </div>
                <div className="text-sm text-gray-500 mt-1">Correct Answers</div>
              </div>
              <div className="h-12 w-px bg-gray-300"></div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">{result.percentage}%</div>
                <div className="text-sm text-gray-500 mt-1">Percentage</div>
              </div>
              <div className="h-12 w-px bg-gray-300"></div>
              <div className="text-right">
                <div className={`text-3xl font-bold ${gradeInfo.color}`}>{gradeInfo.grade}</div>
                <div className="text-sm text-gray-500 mt-1">Grade</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}