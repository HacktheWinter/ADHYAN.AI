// FrontendStudent/src/Pages/Quiz.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { Clock, CheckCircle, Play, Eye, Loader, AlertCircle } from 'lucide-react';
import { getActiveQuizzes, checkSubmission } from '../api/quizApi';
import QuizTakingModal from '../components/QuizTakingModal';
import QuizResultModal from '../components/QuizResultModal';

export default function Quiz() {
  const { id: classId } = useParams();
  const { classInfo } = useOutletContext();
  
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState({});
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [showTakingModal, setShowTakingModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);

  // Helper function to truncate title
  const truncateTitle = (title, maxLength = 40) => {
    if (title.length <= maxLength) return title;
    return title.substring(0, maxLength) + "...";
  };

  useEffect(() => {
    fetchQuizzes();
  }, [classId]);

  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      const response = await getActiveQuizzes(classId);
      const quizzesData = response.quizzes || [];
      
      // Check submissions for each quiz
      const submissionChecks = await Promise.all(
        quizzesData.map(quiz => 
          checkSubmission(quiz._id, classInfo.studentId)
        )
      );
      
      const submissionMap = {};
      quizzesData.forEach((quiz, index) => {
        submissionMap[quiz._id] = submissionChecks[index].hasSubmitted;
      });
      
      setQuizzes(quizzesData);
      setSubmissions(submissionMap);
    } catch (error) {
      console.error('Error fetching quizzes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTakeQuiz = (quiz) => {
    setSelectedQuiz(quiz);
    setShowTakingModal(true);
  };

  const handleViewResult = (quiz) => {
    setSelectedQuiz(quiz);
    setShowResultModal(true);
  };

  const handleQuizSubmitted = () => {
    setShowTakingModal(false);
    setSelectedQuiz(null);
    fetchQuizzes(); // Refresh to update status
  };

  const getQuizStatus = (quiz) => {
    const now = new Date();
    
    if (submissions[quiz._id]) {
      return { text: 'Completed', color: 'bg-green-100 text-green-800', icon: CheckCircle };
    }
    
    if (!quiz.isActive) {
      return { text: 'Expired', color: 'bg-red-100 text-red-800', icon: AlertCircle };
    }
    
    if (quiz.startTime && now < new Date(quiz.startTime)) {
      return { text: 'Upcoming', color: 'bg-blue-100 text-blue-800', icon: Clock };
    }
    
    return { text: 'Active', color: 'bg-purple-100 text-purple-800', icon: Play };
  };

  const getRemainingTime = (quiz) => {
    if (!quiz.endTime) return 'No time limit';
    
    const now = new Date();
    const end = new Date(quiz.endTime);
    const diff = end - now;
    
    if (diff <= 0) return 'Expired';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days} day${days > 1 ? 's' : ''} left`;
    }
    
    if (hours > 0) {
      return `${hours}h ${minutes}m left`;
    }
    
    return `${minutes} minutes left`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-8 h-8 text-purple-600 animate-spin" />
        <span className="ml-3 text-gray-600">Loading quizzes...</span>
      </div>
    );
  }

  if (quizzes.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p className="text-xl font-semibold text-gray-900 mb-2">No Quizzes Available</p>
        <p className="text-gray-500">Your teacher hasn't published any quizzes yet.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {quizzes.map((quiz) => {
          const status = getQuizStatus(quiz);
          const StatusIcon = status.icon;
          const hasSubmitted = submissions[quiz._id];
          const isExpired = !quiz.isActive || (quiz.endTime && new Date() > new Date(quiz.endTime));
          const canTake = !hasSubmitted && !isExpired;

          return (
            <div 
              key={quiz._id} 
              className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 
                  className="text-lg font-semibold text-gray-900 flex-1 mr-2"
                  title={quiz.title}
                >
                  {truncateTitle(quiz.title, 40)}
                </h3>
                <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${status.color} flex-shrink-0`}>
                  <StatusIcon className="w-3 h-3" />
                  {status.text}
                </span>
              </div>

              <div className="space-y-2 text-sm text-gray-600 mb-4">
                <p className="flex items-center gap-2">
                  <span className="font-medium">❓</span> 
                  {quiz.questions?.length || 0} questions
                </p>
                
                {quiz.duration && (
                  <p className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {quiz.duration} minutes
                  </p>
                )}

                {quiz.endTime && (
                  <p className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {getRemainingTime(quiz)}
                  </p>
                )}
              </div>

              {/* Action Button */}
              {hasSubmitted ? (
                <button
                  onClick={() => handleViewResult(quiz)}
                  className="w-full py-2 rounded-lg font-medium transition-colors bg-green-600 text-white hover:bg-green-700 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Eye className="w-4 h-4" />
                  Review Result
                </button>
              ) : canTake ? (
                <button
                  onClick={() => handleTakeQuiz(quiz)}
                  className="w-full py-2 rounded-lg font-medium transition-colors bg-purple-700 text-white hover:bg-purple-800 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Play className="w-4 h-4" />
                  Take Quiz
                </button>
              ) : (
                <button
                  disabled
                  className="w-full py-2 rounded-lg font-medium bg-gray-100 text-gray-400 cursor-not-allowed"
                >
                  Quiz Expired
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Quiz Taking Modal */}
      {showTakingModal && selectedQuiz && (
        <QuizTakingModal
          quiz={selectedQuiz}
          studentId={classInfo.studentId}
          studentName={classInfo.studentName}
          onClose={() => {
            setShowTakingModal(false);
            setSelectedQuiz(null);
          }}
          onSubmit={handleQuizSubmitted}
        />
      )}

      {/* Quiz Result Modal */}
      {showResultModal && selectedQuiz && (
        <QuizResultModal
          quizId={selectedQuiz._id}
          studentId={classInfo.studentId}
          onClose={() => {
            setShowResultModal(false);
            setSelectedQuiz(null);
          }}
        />
      )}
    </div>
  );
}