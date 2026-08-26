// FrontendStudent/src/Pages/Quiz.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { Clock, CheckCircle, Play, Eye, Loader, AlertCircle } from 'lucide-react';
import { getActiveQuizzes, checkSubmission, submitQuiz, autosaveQuiz } from '../api/quizApi';
import QuizTakingModal from '../components/QuizTakingModal';
import QuizResultModal from '../components/QuizResultModal';

export default function Quiz() {
  const { id: classId } = useParams();
  const { classInfo } = useOutletContext();
  
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState({});
  const [selectedQuiz, setSelectedQuiz] = useState(() => {
    const saved = localStorage.getItem('activeQuiz');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.endTime && new Date() > new Date(parsed.endTime)) {
        return null;
      }
      return parsed;
    }
    return null;
  });
  const [showTakingModal, setShowTakingModal] = useState(() => {
    const saved = localStorage.getItem('activeQuiz');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.endTime && new Date() > new Date(parsed.endTime)) {
        return false;
      }
      return true;
    }
    return false;
  });
  const [showResultModal, setShowResultModal] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Helper function to truncate title
  const truncateTitle = (title, maxLength = 40) => {
    if (title.length <= maxLength) return title;
    return title.substring(0, maxLength) + "...";
  };

  const getTotalQuestions = (quiz) => {
    if (quiz.sections && quiz.sections.length > 0) {
      return quiz.sections.reduce((acc, sec) => acc + (sec.questions?.length || 0), 0);
    }
    return quiz.questions?.length || 0;
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
      
      let needsRefresh = false;
      for (const quiz of quizzesData) {
        if (!submissionMap[quiz._id]) {
          let isExpired = quiz.quizStatus === 'expired' || (quiz.endTime && new Date() > new Date(quiz.endTime));
          
          if (!isExpired && quiz.duration) {
            const startTimeStr = localStorage.getItem(`quiz_start_time_${quiz._id}`);
            if (startTimeStr) {
              const elapsedMs = Date.now() - parseInt(startTimeStr);
              if (elapsedMs > quiz.duration * 60000) {
                isExpired = true;
              }
            }
          }

          if (isExpired) {
            const draft = localStorage.getItem(`quiz_draft_${quiz._id}`);
            const layout = localStorage.getItem(`quiz_layout_${quiz._id}`);
            if (draft && layout) {
              let answersArray = [];
              try {
                const parsedDraft = JSON.parse(draft);
                const parsedLayout = JSON.parse(layout);
                // Build answers from sections (standard) or legacy questions
                const allQuestions = parsedLayout.sections?.length > 0
                  ? parsedLayout.sections.flatMap(s => s.questions || [])
                  : (parsedLayout.questions || []);
                answersArray = allQuestions.map(q => {
                  const a = parsedDraft[q._id];
                  if (q.type === 'coding' || a?.type === 'coding') {
                    return {
                      questionId: q._id,
                      type: 'coding',
                      code: a?.code || '',
                      language: a?.language || 'javascript'
                    };
                  }
                  return {
                    questionId: q._id,
                    type: 'mcq',
                    selectedAnswer: a?.selectedAnswer || (typeof a === 'string' ? a : '')
                  };
                });
                
                await submitQuiz(quiz._id, classInfo.studentId, answersArray);
              } catch (error) {
                console.error("Failed to auto-submit expired draft:", error);
                // If submit was rejected (expired/forbidden), try autosave as fallback.
                // The server-side cron will finalize this draft into a graded submission.
                if (error.response?.status === 403 || error.response?.status === 400) {
                  try {
                    await autosaveQuiz(quiz._id, classInfo.studentId, answersArray);
                    console.log("Fallback autosave succeeded — server cron will finalize");
                  } catch (saveErr) {
                    console.error("Fallback autosave also failed:", saveErr);
                  }
                }
              } finally {
                // Always clear local storage for an expired draft, regardless of API success
                localStorage.removeItem(`quiz_draft_${quiz._id}`);
                localStorage.removeItem(`quiz_layout_${quiz._id}`);
                localStorage.removeItem(`quiz_start_time_${quiz._id}`);
                localStorage.removeItem(`quiz_refresh_count_${quiz._id}`);
                
                const active = localStorage.getItem('activeQuiz');
                if (active) {
                  const parsedActive = JSON.parse(active);
                  if (parsedActive._id === quiz._id) {
                    localStorage.removeItem('activeQuiz');
                    setShowTakingModal(false);
                    setSelectedQuiz(null);
                  }
                }
                
                needsRefresh = true;
              }
            }
          }
        }
      }
      
      if (needsRefresh) {
        return fetchQuizzes(); // Refetch to get updated status
      }

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
    localStorage.setItem('activeQuiz', JSON.stringify(quiz));
  };

  const handleViewResult = (quiz) => {
    setSelectedQuiz(quiz);
    setShowResultModal(true);
  };

  const handleQuizSubmitted = () => {
    setShowTakingModal(false);
    setSelectedQuiz(null);
    localStorage.removeItem('activeQuiz');
    fetchQuizzes(); // Refresh to update status
  };

  const getQuizStatus = (quiz) => {
    if (submissions[quiz._id]) {
      return { text: 'Completed', color: 'bg-green-100 text-green-800', icon: CheckCircle };
    }
    
    if (quiz.endTime && currentTime > new Date(quiz.endTime)) {
      return { text: 'Expired', color: 'bg-red-100 text-red-800', icon: AlertCircle };
    }
    
    if (quiz.startTime && currentTime < new Date(quiz.startTime)) {
      return { text: 'Upcoming', color: 'bg-blue-100 text-blue-800', icon: Clock };
    }

    if (quiz.quizStatus === 'expired' && !quiz.endTime) {
      return { text: 'Expired', color: 'bg-red-100 text-red-800', icon: AlertCircle };
    }
    
    if (quiz.quizStatus === 'upcoming' && !quiz.startTime) {
      return { text: 'Upcoming', color: 'bg-blue-100 text-blue-800', icon: Clock };
    }
    
    return { text: 'Active', color: 'bg-purple-100 text-purple-800', icon: Play };
  };

  const getRemainingTime = (quiz) => {
    if (quiz.startTime && currentTime < new Date(quiz.startTime)) {
      const diff = new Date(quiz.startTime) - currentTime;
      const minutes = Math.ceil(diff / (1000 * 60));
      if (minutes > 60) {
         const hours = Math.floor(minutes / 60);
         return `Starts in ${hours}h ${minutes % 60}m`;
      }
      return `Starts in ${minutes} min`;
    }

    if (!quiz.endTime) return 'No time limit';
    
    const end = new Date(quiz.endTime);
    const diff = end - currentTime;
    
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
        <span className="ml-3 text-gray-600">Loading assessments...</span>
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
        <p className="text-xl font-semibold text-gray-900 mb-2">No Assessments Available</p>
        <p className="text-gray-500">Your teacher hasn't published any assessments yet.</p>
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
          const isExpired = status.text === 'Expired';
          const isUpcoming = status.text === 'Upcoming';
          const canTake = !hasSubmitted && !isExpired && !isUpcoming;

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
                  {getTotalQuestions(quiz)} questions
                  {quiz.sections?.length > 1 && ` in ${quiz.sections.length} sections`}
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
                  onClick={async () => {
                    if (!quiz.questions) {
                      setLoading(true);
                      try {
                        const response = await getActiveQuizzes(classId);
                        const updatedQuiz = response.quizzes.find(q => q._id === quiz._id);
                        if (updatedQuiz && updatedQuiz.questions) {
                          handleTakeQuiz(updatedQuiz);
                        } else {
                          alert("Assessment is not active yet or failed to fetch questions.");
                        }
                      } catch (err) {
                        console.error(err);
                      } finally {
                        setLoading(false);
                      }
                    } else {
                      handleTakeQuiz(quiz);
                    }
                  }}
                  className="w-full py-2 rounded-lg font-medium transition-colors bg-purple-700 text-white hover:bg-purple-800 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Play className="w-4 h-4" />
                  Take Assessment
                </button>
              ) : isUpcoming ? (
                <button
                  disabled
                  className="w-full py-2 rounded-lg font-medium bg-blue-100 text-blue-400 cursor-not-allowed"
                >
                  Starts Soon
                </button>
              ) : (
                <button
                  disabled
                  className="w-full py-2 rounded-lg font-medium bg-gray-100 text-gray-400 cursor-not-allowed"
                >
                  Assessment Expired
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
            localStorage.removeItem('activeQuiz');
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