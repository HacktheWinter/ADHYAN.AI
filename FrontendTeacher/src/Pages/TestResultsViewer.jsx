import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, User, Clock, CheckCircle, AlertTriangle, 
  Sparkles, FileText, Loader, RefreshCw, Trophy, Search
} from 'lucide-react';
import { 
  getTestSubmissions, 
  checkTestWithAI, 
  getTestPaperById,
  publishResults
} from '../api/testPaperApi';
import API_BASE_URL from '../config';

const TestResultsViewer = () => {
  const { classId, testId } = useParams();
  const navigate = useNavigate();

  const [testPaper, setTestPaper] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [isAIChecking, setIsAIChecking] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, [testId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const testResponse = await getTestPaperById(testId);
      setTestPaper(testResponse);

      const submissionsResponse = await getTestSubmissions(testId);
      setSubmissions(submissionsResponse.submissions || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Failed to load test results');
    } finally {
      setLoading(false);
    }
  };

  const handleAIChecking = async () => {
    if (!confirm('This will check all pending submissions using AI. Continue?')) return;

    try {
      setIsAIChecking(true);

      const response = await checkTestWithAI(testId);

      alert(
        `AI Checking Complete!\n\n` +
        `Checked: ${response.checkedCount}/${response.totalSubmissions}\n` +
        `${response.failedCount > 0 ? `✗ Failed: ${response.failedCount}\n` : ''}` +
        `\nNote: Results are NOT visible to students yet.\n` +
        `Click "Publish Results" to make them visible.`
      );

      await fetchData();
    } catch (error) {
      console.error('AI checking error:', error);
      alert(error.response?.data?.error || 'Failed to check with AI');
    } finally {
      setIsAIChecking(false);
    }
  };

  const handlePublishResults = async () => {
    const checkedCount = submissions.filter(s => s.status === 'checked').length;
    
    if (checkedCount === 0) {
      alert('No checked submissions to publish. Please check submissions first.');
      return;
    }

    if (!confirm(`This will publish results for ${checkedCount} students. They will be able to see their marks. Continue?`)) {
      return;
    }

    try {
      setIsPublishing(true);

      const response = await publishResults(testId);

      alert(`Results Published!\n\n${response.count} students can now view their results.`);

      await fetchData();
    } catch (error) {
      console.error('Publish error:', error);
      alert('Failed to publish results');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleViewStudent = (submission) => {
    navigate(`/class/${classId}/test-papers/results/${testId}/student/${submission.studentId._id || submission.studentId}`, {
      state: { submissionId: submission._id }
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center font-body text-ink">
        <div className="text-center">
          <Loader className="w-12 h-12 text-violet-dark animate-spin mx-auto mb-4" />
          <p className="text-ink-soft font-semibold">Loading test results...</p>
        </div>
      </div>
    );
  }

  if (!testPaper) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center font-body text-ink">
        <div className="text-center px-4">
          <AlertTriangle className="w-16 h-16 text-rose-500 mx-auto mb-4" />
          <p className="text-ink font-semibold font-display">Test paper not found</p>
          <button
            onClick={() => navigate(`/class/${classId}/test-papers`)}
            className="mt-4 px-6 py-3 btn-settings-blue text-sm rounded-xl font-bold transition cursor-pointer"
          >
            Back to Test Papers
          </button>
        </div>
      </div>
    );
  }

  const pendingCount = submissions.filter(s => s.status === 'pending').length;
  const checkedCount = submissions.filter(s => s.status === 'checked').length;
  const publishedCount = submissions.filter(s => s.isResultPublished).length;

  const filteredSubmissions = submissions.filter(sub => {
    const searchStr = searchQuery.toLowerCase();
    const name = (sub.studentName || sub.studentId?.name || '').toLowerCase();
    const email = (sub.studentId?.email || '').toLowerCase();
    const erpId = (sub.studentId?.erpId || '').toLowerCase();
    return name.includes(searchStr) || email.includes(searchStr) || erpId.includes(searchStr);
  });

  // New metrics for quiz-style display
  const averageScore = submissions.length > 0
    ? (submissions.reduce((sum, sub) => sum + (sub.score || 0), 0) / submissions.length).toFixed(2)
    : 0;

  const passCount = submissions.filter(sub => {
    const percentage = ((sub.score || 0) / (testPaper.totalMarks || 1)) * 100;
    return percentage >= 40;
  }).length;

  const failCount = submissions.filter(sub => {
    const percentage = ((sub.score || 0) / (testPaper.totalMarks || 1)) * 100;
    return percentage < 40;
  }).length;

  return (
    <div className="min-h-screen bg-paper font-body text-ink">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <button
            onClick={() => navigate(`/class/${classId}/test-papers`)}
            className="flex items-center gap-2 text-violet-dark hover:opacity-80 font-bold transition-all mb-4 cursor-pointer text-sm"
          >
            <ChevronLeft className="w-5 h-5" />
            Back to Test Papers
          </button>
          
          <h1 className="text-2xl sm:text-3xl font-semibold font-display text-ink mb-2">{testPaper.title}</h1>
          <p className="text-sm sm:text-base text-ink-soft">{testPaper.totalMarks} marks • {submissions.length} submissions</p>
        </div>

        {/* Action Cards - Hidden on small screens */}
        <div className="hidden md:grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-surface rounded-2xl border border-line p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-ink-soft uppercase tracking-wider mb-1">Total Submissions</p>
                <p className="text-3xl font-black font-display text-ink">{submissions.length}</p>
              </div>
              <FileText className="w-10 h-10 text-ink-soft opacity-20" />
            </div>
          </div>

          <div className="bg-surface rounded-2xl border border-line p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-ink-soft uppercase tracking-wider mb-1">Average Score</p>
                <p className="text-3xl font-black font-display text-violet-dark">{averageScore}</p>
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

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4 sm:mb-6">
          {pendingCount > 0 && (
            <button
              onClick={handleAIChecking}
              disabled={isAIChecking}
              className="flex items-center justify-center gap-2 px-4 sm:px-6 py-3 btn-settings-blue text-sm sm:text-base font-bold rounded-xl disabled:opacity-50 transition-colors cursor-pointer"
            >
              {isAIChecking ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Checking with AI...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Check All with AI ({pendingCount})
                </>
              )}
            </button>
          )}

          {checkedCount > 0 && (
            <button
              onClick={handlePublishResults}
              disabled={isPublishing}
              className="flex items-center justify-center gap-2 px-4 sm:px-6 py-3 bg-green-650 hover:bg-green-750 text-white text-sm sm:text-base font-bold rounded-xl disabled:opacity-50 transition-colors cursor-pointer shadow-sm"
            >
              {isPublishing ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Publishing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-5 h-5" />
                  Publish Results ({checkedCount - publishedCount} new)
                </>
              )}
            </button>
          )}

          <button
            onClick={fetchData}
            className="flex items-center justify-center gap-2 px-4 sm:px-6 py-3 bg-line text-ink text-sm sm:text-base font-bold rounded-xl hover:bg-line/80 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-5 h-5" />
            Refresh
          </button>
          
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

        {/* Info Message */}
        {checkedCount > publishedCount && (
          <div className="bg-amber-50 border border-amber-250 rounded-xl p-4 mb-4 sm:mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-amber-900 mb-1">
                  Results Not Published Yet
                </p>
                <p className="text-sm text-amber-800">
                  {checkedCount - publishedCount} checked submission(s) are ready but not visible to students. 
                  Click "Publish Results" to make them available.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Submissions Table */}
        <div className="bg-surface rounded-2xl border border-line overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface border-b border-line">
                <tr>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-bold text-ink">Student</th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-bold text-ink">Status</th>
                  <th className="hidden sm:table-cell px-6 py-4 text-left text-sm font-bold text-ink">Published</th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-bold text-ink">Score</th>
                  <th className="hidden lg:table-cell px-6 py-4 text-left text-sm font-bold text-ink">Percentage</th>
                  <th className="hidden lg:table-cell px-6 py-4 text-left text-sm font-bold text-ink">Submitted</th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-bold text-ink">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredSubmissions.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center bg-surface">
                      <FileText className="w-12 h-12 text-ink-soft opacity-20 mx-auto mb-3" />
                      <p className="text-ink-soft font-semibold text-sm">No submissions found</p>
                    </td>
                  </tr>
                ) : (
                  filteredSubmissions.map((submission) => (
                    <tr key={submission._id} className="hover:bg-line/20 bg-surface transition-colors">
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        <div className="flex items-center gap-2 sm:gap-3">
                          {submission.studentId?.profilePhoto ? (
                            <img 
                              src={`${API_BASE_URL.replace('/api', '')}/${submission.studentId.profilePhoto}`}
                              alt={submission.studentName}
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
                            <p className="font-bold text-ink font-display text-xs sm:text-base truncate">{submission.studentName}</p>
                            <p className="text-xs text-ink-soft truncate hidden sm:block">{submission.studentId?.email}</p>
                            <p className="text-[10px] text-ink-soft/70 uppercase tracking-wide mt-0.5">ID: {submission.studentId?.erpId || 'No ERP ID'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        <span className={`inline-flex items-center gap-1 px-2 sm:px-3 py-1 rounded-full text-xs font-bold border border-line ${
                          submission.status === 'checked'
                            ? 'bg-green-100 dark:bg-green-955/40 text-green-800 dark:text-green-300'
                            : 'bg-amber-50 text-amber-800'
                        }`}>
                          {submission.status === 'checked' ? (
                            <><CheckCircle className="w-3 h-3" /> <span className="hidden sm:inline">Checked</span></>
                          ) : (
                            <><Clock className="w-3 h-3" /> <span className="hidden sm:inline">Pending</span></>
                          )}
                        </span>
                      </td>
                      <td className="hidden sm:table-cell px-6 py-4">
                        {submission.isResultPublished ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-violet-50 border border-line text-violet-dark">
                            <RefreshCw className="w-3 h-3" /> Published
                          </span>
                        ) : (
                          <span className="text-sm text-ink-soft">-</span>
                        )}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        {submission.status === 'checked' ? (
                          <span className="font-semibold text-ink text-xs sm:text-base">
                            {submission.marksObtained}/{submission.totalMarks}
                          </span>
                        ) : (
                          <span className="text-xs sm:text-sm text-ink-soft">-</span>
                        )}
                      </td>
                      <td className="hidden lg:table-cell px-6 py-4">
                        {submission.status === 'checked' ? (
                          <span className={`font-bold ${
                            submission.percentage >= 60 ? 'text-green-600 dark:text-green-400' : 'text-rose-600 dark:text-rose-450'
                          }`}>
                            {submission.percentage}%
                          </span>
                        ) : (
                          <span className="text-sm text-ink-soft">-</span>
                        )}
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestResultsViewer;