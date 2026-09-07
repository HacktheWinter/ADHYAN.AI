import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, User, CheckCircle, AlertTriangle, 
  FileText, Loader, Trophy, RefreshCw, MoreVertical,
  BarChart2, Users, Search, Camera, X
} from 'lucide-react';
import axios from 'axios';
import API_BASE_URL from '../config';
import ToastNotification from '../components/ToastNotification';
import ConfirmationCard from '../components/ConfirmationCard';

const QuizResultsViewer = () => {
  const { classId, quizId } = useParams();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState(null);
  const [classroom, setClassroom] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [previewPhoto, setPreviewPhoto] = useState(null);
  const [previewStudentName, setPreviewStudentName] = useState('');

  const [isPublishing, setIsPublishing] = useState(false);
  
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', type: 'danger', onConfirm: null });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
  };

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
      showToast('Failed to load quiz results', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleViewStudent = (submission) => {
    navigate(`/class/${classId}/quizzes/results/${quizId}/student/${submission.studentId._id || submission.studentId}`, {
      state: { submissionId: submission._id }
    });
  };

  const handlePublishResults = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Publish Results',
      message: 'Are you sure you want to publish results? Students will now be able to see their scores.',
      type: 'info',
      onConfirm: async () => {
        try {
          setIsPublishing(true);
          await axios.put(`${API_BASE_URL}/quiz/${quizId}/publish-results`, {}, {
            withCredentials: true
          });
          showToast("Results published successfully!", 'success');
          setQuiz({...quiz, resultsPublished: true});
        } catch (error) {
          console.error("Error publishing results:", error);
          showToast(error.response?.data?.error || "Failed to publish results", 'error');
        } finally {
          setIsPublishing(false);
        }
      }
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center font-body text-ink">
        <div className="text-center">
          <Loader className="w-12 h-12 text-violet-dark animate-spin mx-auto mb-4" />
          <p className="text-ink-soft font-semibold">Loading assessment results...</p>
        </div>
      </div>
    );
  }

  if (!quiz && submissions.length === 0) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center font-body text-ink">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-rose-500 mx-auto mb-4" />
          <p className="text-ink font-semibold font-display">Assessment not found</p>
          <p className="text-ink-soft text-sm mt-2">No assessment or submissions available</p>
          <button
            onClick={() => navigate(`/class/${classId}/quizzes`)}
            className="mt-4 px-6 py-3 btn-settings-blue text-sm rounded-xl font-bold transition cursor-pointer"
          >
            Back to Assessments
          </button>
        </div>
      </div>
    );
  }

  // Calculate stats from submissions directly (no section filtering)
  const averageScore = submissions.length > 0
    ? (submissions.reduce((sum, sub) => sum + parseFloat(sub.percentage || 0), 0) / submissions.length).toFixed(2)
    : 0;

  const passCount = submissions.filter(sub => parseFloat(sub.percentage || 0) >= 40).length;
  const failCount = submissions.filter(sub => parseFloat(sub.percentage || 0) < 40).length;

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
            Back to Assessments
          </button>
          
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold font-display text-ink mb-2" title={quiz.title}>
                {quiz.title.length > 50 ? quiz.title.substring(0, 50) + '...' : quiz.title}
              </h1>
              <p className="text-sm sm:text-base text-ink-soft">{(quiz.sections?.length > 0 ? quiz.sections.reduce((acc, sec) => acc + (sec.questions?.length || 0), 0) : (quiz.questions?.length || 0))} questions • {submissions.length} submissions</p>
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

          {quiz && !quiz.resultsPublished && (
            <button
              onClick={handlePublishResults}
              disabled={isPublishing}
              className="flex items-center justify-center gap-2 px-4 sm:px-6 py-3 bg-indigo-600 text-white text-sm sm:text-base font-bold rounded-xl hover:bg-indigo-700 transition-colors cursor-pointer disabled:opacity-50"
            >
              <CheckCircle className="w-5 h-5" />
              {isPublishing ? "Publishing..." : "Publish Results"}
            </button>
          )}
          {quiz && quiz.resultsPublished && (
            <div className="flex items-center justify-center gap-2 px-4 sm:px-6 py-3 bg-green-100 dark:bg-green-955/40 text-green-800 dark:text-green-300 text-sm sm:text-base font-bold rounded-xl border border-green-200 dark:border-green-800/30">
              <CheckCircle className="w-5 h-5" />
              Results Published
            </div>
          )}
          
          <div className="relative flex-1 sm:max-w-xs ml-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-soft" />
            <input 
              type="text" 
              placeholder="Search by name, email or ERP ID..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-3 bg-surface border border-line rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-ink text-sm sm:text-base"
            />
          </div>
        </div>

        {/* Submissions Table */}
        <div className="bg-surface rounded-2xl border border-line overflow-hidden shadow-sm">
          {submissions.length === 0 ? (
            <div className="p-8 sm:p-12 text-center bg-surface">
              <FileText className="w-12 h-12 sm:w-16 sm:h-16 text-ink-soft opacity-20 mx-auto mb-4" />
              <p className="text-ink-soft font-semibold">No submissions yet</p>
              <p className="text-ink-soft text-sm mt-1">Students haven't submitted this assessment yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface border-b border-line">
                  <tr>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-bold text-ink">Student</th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-bold text-ink">Status</th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-bold text-ink">Proctor</th>
                    <th className="hidden sm:table-cell px-6 py-4 text-left text-sm font-bold text-ink">Marks</th>
                    <th className="hidden lg:table-cell px-6 py-4 text-left text-sm font-bold text-ink">Percentage</th>
                    <th className="hidden lg:table-cell px-6 py-4 text-left text-sm font-bold text-ink">Submitted</th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-bold text-ink">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {submissions
                    .filter(sub => {
                      const searchStr = searchQuery.toLowerCase();
                      const name = (sub.studentId?.name || '').toLowerCase();
                      const email = (sub.studentId?.email || '').toLowerCase();
                      const erpId = (sub.studentId?.erpId || '').toLowerCase();
                      return name.includes(searchStr) || email.includes(searchStr) || erpId.includes(searchStr);
                    })
                    .map((submission) => {
                    const displayTotal = submission.totalMarks || submission.totalQuestions;
                    const displayPercentage = parseFloat(submission.percentage || 0);
                    return (
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
                            <p className="text-[10px] text-ink-soft/70 uppercase tracking-wide mt-0.5">ID: {submission.studentId?.erpId || 'No ERP ID'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        <span className={`inline-flex items-center gap-1 px-2 sm:px-3 py-1 rounded-full text-xs font-bold border border-line ${
                          displayPercentage >= 40
                            ? 'bg-green-100 dark:bg-green-955/40 text-green-800 dark:text-green-300'
                            : 'bg-rose-100 dark:bg-rose-955/40 text-rose-800 dark:text-rose-350'
                        }`}>
                          {displayPercentage >= 40 ? (
                            <><CheckCircle className="w-3 h-3" /> <span className="hidden sm:inline">Pass</span></>
                          ) : (
                            <><AlertTriangle className="w-3 h-3" /> <span className="hidden sm:inline">Fail</span></>
                          )}
                        </span>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        {submission.proctorPhoto ? (
                          <button
                            onClick={() => {
                              setPreviewPhoto(submission.proctorPhoto);
                              setPreviewStudentName(submission.studentId?.name || 'Unknown');
                            }}
                            className="group relative w-8 h-8 sm:w-10 sm:h-10 rounded-lg overflow-hidden border-2 border-line hover:border-violet-500 transition-all cursor-pointer shadow-sm hover:shadow-md"
                          >
                            <img
                              src={submission.proctorPhoto}
                              alt="Proctor snapshot"
                              className="w-full h-full object-cover"
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                              <Camera className="w-3 h-3 sm:w-4 sm:h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </button>
                        ) : (
                          <span className="text-xs text-ink-soft">—</span>
                        )}
                      </td>
                      <td className="hidden sm:table-cell px-6 py-4">
                        <span className="font-semibold text-ink text-sm">
                          {typeof submission.score === 'number' ? submission.score.toFixed(1) : submission.score}/{typeof displayTotal === 'number' ? displayTotal : displayTotal}
                        </span>
                      </td>
                      <td className="hidden lg:table-cell px-6 py-4">
                        <span className={`font-bold ${
                          displayPercentage >= 40 ? 'text-green-600 dark:text-green-400' : 'text-rose-600 dark:text-rose-450'
                        }`}>
                          {displayPercentage.toFixed(2)}%
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
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Proctor Photo Preview Modal */}
        {previewPhoto && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => { setPreviewPhoto(null); setPreviewStudentName(''); }}>
            <div className="relative max-w-lg w-full bg-surface rounded-2xl overflow-hidden shadow-2xl border border-line" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b border-line">
                <div className="flex items-center gap-2">
                  <Camera className="w-5 h-5 text-violet-dark" />
                  <div>
                    <span className="font-bold text-ink">Proctor Snapshot</span>
                    {previewStudentName && (
                      <p className="text-xs text-ink-soft">{previewStudentName}</p>
                    )}
                  </div>
                </div>
                <button onClick={() => { setPreviewPhoto(null); setPreviewStudentName(''); }} className="text-ink-soft hover:text-ink transition-colors cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-2">
                <img src={previewPhoto} alt="Proctor snapshot" className="w-full rounded-xl" />
              </div>
            </div>
          </div>
        )}
      </div>

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
};

export default QuizResultsViewer;
