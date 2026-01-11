import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, User, CheckCircle, AlertTriangle, 
  FileText, Loader, Trophy, RefreshCw
} from 'lucide-react';
import axios from 'axios';
import API_BASE_URL from '../config';

const QuizResultsViewer = () => {
  const { classId, quizId } = useParams();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 text-purple-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading quiz results...</p>
        </div>
      </div>
    );
  }

  if (!quiz && submissions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-gray-700 font-semibold">Quiz not found</p>
          <p className="text-gray-500 text-sm mt-2">No quiz or submissions available</p>
          <button
            onClick={() => navigate(`/class/${classId}/quizzes`)}
            className="mt-4 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition cursor-pointer"
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <button
            onClick={() => navigate(`/class/${classId}/quizzes`)}
            className="flex items-center gap-2 text-purple-600 hover:text-purple-700 mb-4 cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
            Back to Quizzes
          </button>
          
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">{quiz.title}</h1>
          <p className="text-sm sm:text-base text-gray-600">{quiz.questions?.length || 0} questions • {submissions.length} submissions</p>
        </div>

        {/* Stats Cards - Hidden on small screens */}
        <div className="hidden md:grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Submissions</p>
                <p className="text-3xl font-bold text-gray-900">{submissions.length}</p>
              </div>
              <FileText className="w-10 h-10 text-gray-300" />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Average Score</p>
                <p className="text-3xl font-bold text-purple-600">{averageScore}%</p>
              </div>
              <Trophy className="w-10 h-10 text-purple-300" />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Passed (≥40%)</p>
                <p className="text-3xl font-bold text-green-600">{passCount}</p>
              </div>
              <CheckCircle className="w-10 h-10 text-green-300" />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Failed (&lt;40%)</p>
                <p className="text-3xl font-bold text-red-600">{failCount}</p>
              </div>
              <AlertTriangle className="w-10 h-10 text-red-300" />
            </div>
          </div>
        </div>

        {/* Refresh Button */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4 sm:mb-6">
          <button
            onClick={fetchData}
            className="flex items-center justify-center gap-2 px-4 sm:px-6 py-3 bg-gray-200 text-gray-700 text-sm sm:text-base font-semibold rounded-lg hover:bg-gray-300 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-5 h-5" />
            Refresh
          </button>
        </div>

        {/* Submissions Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {submissions.length === 0 ? (
            <div className="p-8 sm:p-12 text-center">
              <FileText className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">No submissions yet</p>
              <p className="text-gray-400 text-sm mt-1">Students haven't submitted this quiz yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-gray-900">Student</th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-gray-900">Status</th>
                    <th className="hidden sm:table-cell px-6 py-4 text-left text-sm font-semibold text-gray-900">Score</th>
                    <th className="hidden lg:table-cell px-6 py-4 text-left text-sm font-semibold text-gray-900">Percentage</th>
                    <th className="hidden lg:table-cell px-6 py-4 text-left text-sm font-semibold text-gray-900">Submitted</th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-gray-900">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {submissions.map((submission) => (
                    <tr key={submission._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        <div className="flex items-center gap-2 sm:gap-3">
                          {submission.studentId?.profilePhoto ? (
                            <img 
                              src={`${API_BASE_URL.replace('/api', '')}/${submission.studentId.profilePhoto}`}
                              alt={submission.studentId?.name}
                              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover flex-shrink-0 border border-purple-200"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextElementSibling.style.display = 'flex';
                              }}
                            />
                          ) : (
                            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <User className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 text-xs sm:text-base truncate">{submission.studentId?.name || 'Unknown'}</p>
                            <p className="text-xs text-gray-500 truncate hidden sm:block">{submission.studentId?.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        <span className={`inline-flex items-center gap-1 px-2 sm:px-3 py-1 rounded-full text-xs font-semibold ${
                          parseFloat(submission.percentage) >= 40
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {parseFloat(submission.percentage) >= 40 ? (
                            <><CheckCircle className="w-3 h-3" /> <span className="hidden sm:inline">Pass</span></>
                          ) : (
                            <><AlertTriangle className="w-3 h-3" /> <span className="hidden sm:inline">Fail</span></>
                          )}
                        </span>
                      </td>
                      <td className="hidden sm:table-cell px-6 py-4">
                        <span className="font-semibold text-gray-900 text-sm">
                          {submission.score}/{submission.totalQuestions}
                        </span>
                      </td>
                      <td className="hidden lg:table-cell px-6 py-4">
                        <span className={`font-semibold ${
                          parseFloat(submission.percentage) >= 40 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {submission.percentage?.toFixed(2)}%
                        </span>
                      </td>
                      <td className="hidden lg:table-cell px-6 py-4">
                        <span className="text-sm text-gray-600">
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
                          className="px-2 sm:px-4 py-2 bg-purple-600 text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors cursor-pointer whitespace-nowrap"
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
