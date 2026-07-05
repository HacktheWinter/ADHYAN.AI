import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, User, CheckCircle, AlertTriangle, 
  FileText, Loader, Trophy, RefreshCw, MoreVertical,
  BarChart2, Users
} from 'lucide-react';
import axios from 'axios';
import API_BASE_URL from '../config';

const QuizResultsViewer = () => {
  const { classId, quizId } = useParams();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState(null);
  const [classroom, setClassroom] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    fetchData();
  }, [quizId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch quiz submissions first (this is most important)
      let submissionsData = [];
      let quizData = null;
      
      try {
        const submissionsResponse = await axios.get(`${API_BASE_URL}/quiz-submission/quiz/${quizId}`);
        submissionsData = submissionsResponse.data.submissions || [];
        
        // Extract quiz info from first submission if available
        if (submissionsData.length > 0 && submissionsData[0].quizId) {
          quizData = submissionsData[0].quizId;
        }
      } catch (submissionError) {
        console.error('Error fetching submissions:', submissionError);
      }

      // Always fetch classroom data to get total students count
      try {
        const classResponse = await axios.get(`${API_BASE_URL}/classroom/${classId}`);
        setClassroom(classResponse.data.classroom);
      } catch (classError) {
        console.error('Error fetching classroom:', classError);
      }

      // If quiz data not available from submissions, try direct fetch
      if (!quizData) {
        try {
          const quizResponse = await axios.get(`${API_BASE_URL}/quiz/${quizId}`);
          quizData = quizResponse.data.quiz;
        } catch (quizError) {
          console.error('Error fetching quiz details:', quizError);
          // Create a minimal quiz object if both methods fail
          if (submissionsData.length > 0) {
            quizData = {
              _id: quizId,
              title: 'Quiz Results',
              questions: []
            };
          }
        }
      }

      setQuiz(quizData);
      setSubmissions(submissionsData);
    } catch (error) {
      console.error('Error in fetchData:', error);
      alert('Failed to load quiz results');
    } finally {
      setLoading(false);
    }
  };

  const handleViewStudent = (submission) => {
    navigate(`/class/${classId}/quizzes/results/${quizId}/student/${submission.studentId._id || submission.studentId}`, {
      state: { submissionId: submission._id }
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center font-body text-ink">
        <div className="text-center">
          <Loader className="w-12 h-12 text-violet-dark animate-spin mx-auto mb-4" />
          <p className="text-ink-soft font-semibold">Loading quiz results...</p>
        </div>
      </div>
    );
  }

  if (!quiz && submissions.length === 0) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center font-body text-ink">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-rose-500 mx-auto mb-4" />
          <p className="text-ink font-semibold font-display">Quiz not found</p>
          <p className="text-ink-soft text-sm mt-2">No quiz or submissions available</p>
          <button
            onClick={() => navigate(`/class/${classId}/quizzes`)}
            className="mt-4 px-6 py-3 btn-settings-blue text-sm rounded-xl font-bold transition cursor-pointer"
          >
            Back to Quizzes
          </button>
        </div>
      </div>
    );
  }

  const averageScore = submissions.length > 0
    ? (submissions.reduce((sum, sub) => sum + parseFloat(sub.percentage), 0) / submissions.length).toFixed(2)
    : 0;

  const passCount = submissions.filter(sub => parseFloat(sub.percentage) >= 40).length;
  const failCount = submissions.filter(sub => parseFloat(sub.percentage) < 40).length;

  const totalStudents = classroom?.students?.length || 0;
  const submittedCount = submissions.length;
  const pendingCount = Math.max(0, totalStudents - submittedCount);

  return (
    <div className="min-h-screen bg-paper font-body text-ink">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <button
            onClick={() => navigate(`/class/${classId}/quizzes`)}
            className="flex items-center gap-2 text-violet-dark hover:opacity-80 font-bold transition-all mb-4 cursor-pointer text-sm"
          >
            <ChevronLeft className="w-5 h-5" />
            Back to Quizzes
          </button>
          
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold font-display text-ink mb-2" title={quiz.title}>
                {quiz.title.length > 50 ? quiz.title.substring(0, 50) + '...' : quiz.title}
              </h1>
              <p className="text-sm sm:text-base text-ink-soft">{quiz.questions?.length || 0} questions • {submissions.length} submissions</p>
            </div>

            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 hover:bg-line/60 rounded-xl text-ink-soft hover:text-ink transition-colors cursor-pointer"
              >
                <MoreVertical className="w-5 h-5" />
              </button>

              {showMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-10"
                    onClick={() => setShowMenu(false)}
                  ></div>
                  <div className="absolute right-0 top-full mt-2 w-48 bg-surface rounded-xl shadow-xl border border-line z-20 py-1 overflow-hidden">
                    <button
                      onClick={() => navigate(`/class/${classId}/dashboard`)}
                      className="w-full text-left px-4 py-2.5 text-sm text-ink hover:bg-violet-50 hover:text-violet-dark flex items-center gap-2 transition-colors cursor-pointer font-medium"
                    >
                      <BarChart2 className="w-4 h-4 text-violet-dark" />
                      Class Dashboard
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Stats Cards - Hidden on small screens */}
        <div className="hidden md:grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-surface rounded-2xl border border-line p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-ink-soft uppercase tracking-wider mb-1">Submission</p>
                <div className="flex items-baseline gap-2">
                    <p className="text-xl font-black font-display text-ink">
                      {submissions.length} <span className="text-xs font-normal font-body text-ink-soft">out of {totalStudents} students</span>
                    </p>
                </div>
              </div>
              <FileText className="w-10 h-10 text-ink-soft opacity-20" />
            </div>
          </div>

          <div className="bg-surface rounded-2xl border border-line p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-ink-soft uppercase tracking-wider mb-1">Average Score</p>
                <p className="text-3xl font-black font-display text-violet-dark">{averageScore}%</p>
              </div>
              <Trophy className="w-10 h-10 text-ink-soft opacity-20" />
            </div>
          </div>

          <div className="bg-surface rounded-2xl border border-line p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-ink-soft uppercase tracking-wider mb-1">Passed (≥40%)</p>
                <p className="text-3xl font-black font-display text-green-600 dark:text-green-400">{passCount}</p>
              </div>
              <CheckCircle className="w-10 h-10 text-ink-soft opacity-20" />
            </div>
          </div>

          <div className="bg-surface rounded-2xl border border-line p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-ink-soft uppercase tracking-wider mb-1">Failed (&lt;40%)</p>
                <p className="text-3xl font-black font-display text-rose-600 dark:text-rose-450">{failCount}</p>
              </div>
              <AlertTriangle className="w-10 h-10 text-ink-soft opacity-20" />
            </div>
          </div>
        </div>

        {/* Refresh Button */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4 sm:mb-6">
          <button
            onClick={fetchData}
            className="flex items-center justify-center gap-2 px-4 sm:px-6 py-3 bg-line text-ink text-sm sm:text-base font-bold rounded-xl hover:bg-line/80 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-5 h-5" />
            Refresh
          </button>
        </div>

        {/* Submissions Table */}
        <div className="bg-surface rounded-2xl border border-line overflow-hidden shadow-sm">
          {submissions.length === 0 ? (
            <div className="p-8 sm:p-12 text-center bg-surface">
              <FileText className="w-12 h-12 sm:w-16 sm:h-16 text-ink-soft opacity-20 mx-auto mb-4" />
              <p className="text-ink-soft font-semibold">No submissions yet</p>
              <p className="text-ink-soft text-sm mt-1">Students haven't submitted this quiz yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface border-b border-line">
                  <tr>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-bold text-ink">Student</th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-bold text-ink">Status</th>
                    <th className="hidden sm:table-cell px-6 py-4 text-left text-sm font-bold text-ink">Score</th>
                    <th className="hidden lg:table-cell px-6 py-4 text-left text-sm font-bold text-ink">Percentage</th>
                    <th className="hidden lg:table-cell px-6 py-4 text-left text-sm font-bold text-ink">Submitted</th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-bold text-ink">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {submissions.map((submission) => (
                    <tr key={submission._id} className="hover:bg-line/20 bg-surface transition-colors">
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        <div className="flex items-center gap-2 sm:gap-3">
                          {submission.studentId?.profilePhoto ? (
                            <img 
                              src={`${API_BASE_URL.replace('/api', '')}/${submission.studentId.profilePhoto}`}
                              alt={submission.studentId?.name}
                              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover flex-shrink-0 border border-line shadow-sm"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextElementSibling.style.display = 'flex';
                              }}
                            />
                          ) : (
                            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-violet-50 border border-line rounded-full flex items-center justify-center flex-shrink-0">
                              <User className="w-4 h-4 sm:w-5 sm:h-5 text-violet-dark" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-bold text-ink font-display text-xs sm:text-base truncate">{submission.studentId?.name || 'Unknown'}</p>
                            <p className="text-xs text-ink-soft truncate hidden sm:block">{submission.studentId?.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        <span className={`inline-flex items-center gap-1 px-2 sm:px-3 py-1 rounded-full text-xs font-bold border border-line ${
                          parseFloat(submission.percentage) >= 40
                            ? 'bg-green-100 dark:bg-green-955/40 text-green-800 dark:text-green-300'
                            : 'bg-rose-100 dark:bg-rose-955/40 text-rose-800 dark:text-rose-350'
                        }`}>
                          {parseFloat(submission.percentage) >= 40 ? (
                            <><CheckCircle className="w-3 h-3" /> <span className="hidden sm:inline">Pass</span></>
                          ) : (
                            <><AlertTriangle className="w-3 h-3" /> <span className="hidden sm:inline">Fail</span></>
                          )}
                        </span>
                      </td>
                      <td className="hidden sm:table-cell px-6 py-4">
                        <span className="font-semibold text-ink text-sm">
                          {submission.score}/{submission.totalQuestions}
                        </span>
                      </td>
                      <td className="hidden lg:table-cell px-6 py-4">
                        <span className={`font-bold ${
                          parseFloat(submission.percentage) >= 40 ? 'text-green-600 dark:text-green-400' : 'text-rose-600 dark:text-rose-450'
                        }`}>
                          {submission.percentage?.toFixed(2)}%
                        </span>
                      </td>
                      <td className="hidden lg:table-cell px-6 py-4">
                        <span className="text-sm text-ink-soft">
                          {new Date(submission.submittedAt).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        <button
                          onClick={() => handleViewStudent(submission)}
                          className="px-3 py-1.5 btn-settings-blue text-xs font-bold rounded-xl transition-colors cursor-pointer whitespace-nowrap"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuizResultsViewer;
