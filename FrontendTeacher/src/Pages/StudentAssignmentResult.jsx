// FrontendTeacher/src/Pages/StudentAssignmentResult.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, Edit2, Save, X, Loader, Sparkles, Award } from 'lucide-react';
import {
  getAssignmentSubmissions,
  getSubmissionById,
  openSubmissionPdf,
  updateMarksManually,
} from '../api/assignmentApi';
import API_BASE_URL from '../config';

const StudentAssignmentResult = () => {
  const { classId, assignmentId, studentId: _studentId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [submission, setSubmission] = useState(null);
  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [imageLoadError, setImageLoadError] = useState(false);
  const [editingMarks, setEditingMarks] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  const fetchSubmission = useCallback(async () => {
    try {
      setLoading(true);

      let submissionId = location.state?.submissionId;

      if (!submissionId) {
        const allSubmissions = await getAssignmentSubmissions(assignmentId);
        const matchingSubmission = (allSubmissions.submissions || []).find(
          (item) => (item.studentId?._id || item.studentId)?.toString() === _studentId
        );

        submissionId = matchingSubmission?._id;
      }

      if (!submissionId) {
        alert('Submission not found');
        navigate(`/class/${classId}/assignments/results/${assignmentId}`);
        return;
      }

      const response = await getSubmissionById(submissionId);

      if (response?.submission) {
        setSubmission(response.submission);
        setAssignment(response.submission.assignmentId);
      } else {
        alert('Submission not found');
        navigate(`/class/${classId}/assignments/results/${assignmentId}`);
      }
    } catch (error) {
      console.error('Error fetching submission:', error);
      alert('Failed to load submission');
      navigate(`/class/${classId}/assignments/results/${assignmentId}`);
    } finally {
      setLoading(false);
    }
  }, [location.state?.submissionId, navigate, classId, assignmentId, _studentId]);

  useEffect(() => {
    fetchSubmission();
  }, [fetchSubmission]);

  const startEditingMarks = (questionId, currentMarks) => {
    setEditingMarks({ ...editingMarks, [questionId]: currentMarks });
  };

  const saveMarks = async (questionId) => {
    try {
      setIsSaving(true);
      const newMarks = editingMarks[questionId];

      const updatedAnswers = submission.answers.map((ans) =>
        ans.questionId === questionId
          ? { questionId: ans.questionId, marksAwarded: newMarks, teacherFeedback: ans.teacherFeedback || '' }
          : { questionId: ans.questionId, marksAwarded: ans.marksAwarded, teacherFeedback: ans.teacherFeedback || '' }
      );

      await updateMarksManually(submission._id, updatedAnswers);

      alert(
        'Marks updated successfully!\n\nNote: Results are NOT automatically published to students.\nGo back and click "Publish Results" to make changes visible.'
      );

      await fetchSubmission();

      const newEditingMarks = { ...editingMarks };
      delete newEditingMarks[questionId];
      setEditingMarks(newEditingMarks);
    } catch (error) {
      console.error('Error updating marks:', error);
      alert('Failed to update marks');
    } finally {
      setIsSaving(false);
    }
  };

  const cancelEditingMarks = (questionId) => {
    const newEditingMarks = { ...editingMarks };
    delete newEditingMarks[questionId];
    setEditingMarks(newEditingMarks);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center p-4 font-body text-ink">
        <Loader className="w-12 h-12 text-violet-dark animate-spin" />
      </div>
    );
  }

  if (!submission || !assignment) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center p-4 font-body text-ink">
        <div className="text-center">
          <p className="text-ink font-semibold font-display mb-4">Submission not found</p>
          <button
            onClick={() => navigate(`/class/${classId}/assignments/results/${assignmentId}`)}
            className="px-6 py-3 btn-settings-blue text-sm rounded-xl font-bold transition cursor-pointer"
          >
            Back to Results
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper font-body text-ink">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Back Button */}
        <div className="mb-4 sm:mb-6">
          <button
            onClick={() => navigate(`/class/${classId}/assignments/results/${assignmentId}`)}
            className="flex items-center gap-2 text-violet-dark hover:opacity-80 font-bold transition-all mb-4 cursor-pointer text-sm"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm sm:text-base">Back to All Results</span>
          </button>
        </div>

        {/* Student Summary */}
        <div className="bg-surface rounded-2xl border border-line p-4 sm:p-6 mb-4 sm:mb-6 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-4">
            {/* Student Info */}
            <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
              {submission.studentId?.profilePhoto && !imageLoadError ? (
                <img 
                  src={`${API_BASE_URL.replace('/api', '')}/${submission.studentId.profilePhoto}`}
                  alt={submission.studentName}
                  className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover flex-shrink-0 border border-line shadow-sm"
                  onError={() => setImageLoadError(true)}
                />
              ) : (
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-violet-50 text-violet-dark border border-line rounded-full flex items-center justify-center font-bold text-xl sm:text-2xl flex-shrink-0 font-display">
                  {submission.studentName?.charAt(0).toUpperCase()}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-lg sm:text-2xl font-semibold font-display text-ink truncate">
                    {submission.studentName}
                  </h1>
                  {submission.submissionType === 'pdf' && (
                    <span className="px-2 py-0.5 bg-violet-50 text-violet-dark text-xs rounded-full font-bold border border-line">PDF</span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-ink-soft break-words">
                  Submitted: {new Date(submission.submittedAt).toLocaleString()}
                </p>
                <p className="text-xs sm:text-sm text-ink-soft mt-1 truncate font-medium">{assignment.title}</p>
              </div>
            </div>

            {/* Score Section */}
            <div className="w-full sm:w-auto text-left sm:text-right">
              <div className="flex items-center gap-2 mb-2">
                <Award className="w-6 h-6 sm:w-8 sm:h-8 text-violet-dark" />
                <div className="text-2xl sm:text-3xl font-black font-display text-violet-dark">
                  {submission.marksObtained}/{submission.totalMarks}
                </div>
              </div>

              <p className="text-xs sm:text-sm text-ink-soft font-semibold">{submission.percentage}%</p>

              <div className="flex flex-wrap gap-2 mt-2">
                <span
                  className={`inline-block px-3 py-1 rounded-full text-xs font-bold border border-line ${
                    submission.status === 'checked' ? 'bg-green-100 dark:bg-green-955/40 text-green-800 dark:text-green-300' : 'bg-amber-50 text-amber-800'
                  }`}
                >
                  {submission.status === 'checked' ? 'Checked' : 'Pending'}
                </span>

                {submission.isResultPublished && (
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-violet-50 text-violet-dark border border-line">
                    Published
                  </span>
                )}
              </div>
            </div>
          </div>

          {submission.status === 'checked' && submission.checkedAt && (
            <div className="pt-4 border-t border-line">
              <p className="text-xs sm:text-sm text-ink-soft">
                Checked on: {new Date(submission.checkedAt).toLocaleString()}
              </p>
            </div>
          )}
        </div>

        {submission.submissionType === 'pdf' && submission.pdfFileId && (
          <div className="bg-surface rounded-2xl border border-line p-4 sm:p-6 mb-4 sm:mb-6 flex items-center justify-between shadow-sm">
            <div>
              <h4 className="text-lg font-semibold font-display text-ink flex items-center gap-2">
                <span className="text-violet-dark">📄</span>
                Submitted PDF
              </h4>
              <p className="text-ink-soft text-sm mt-1">Review the student's original uploaded document.</p>
            </div>
            <button
              onClick={async () => {
                try {
                  await openSubmissionPdf(submission._id);
                } catch (error) {
                  console.error('Failed to open submission PDF:', error);
                  alert('Failed to open PDF');
                }
              }}
              className="px-4 py-2 bg-paper text-violet-dark border border-line rounded-xl hover:bg-violet-50 transition-colors cursor-pointer font-bold text-sm"
            >
              View Document
            </button>
          </div>
        )}

        {/* QUESTIONS SECTION */}
        <div className="space-y-4 sm:space-y-6">
          {submission.answers.map((answer, index) => {
            const question = assignment.questions.find((q) => q._id === answer.questionId);
            const isEditing = editingMarks[answer.questionId] !== undefined;
            if (!question) return null;

            return (
              <div key={answer.questionId} className="bg-surface rounded-2xl border border-line p-4 sm:p-6 shadow-sm">
                {/* Question Title */}
                <div className="mb-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-2">
                    <h3 className="text-base sm:text-lg font-semibold font-display text-ink">Question {index + 1}</h3>
                    <span className="px-3 py-1 rounded-full text-xs sm:text-sm bg-violet-50 text-violet-dark border border-line self-start font-bold">
                      {question.marks} marks
                    </span>
                  </div>
                  <p className="text-sm sm:text-base text-ink whitespace-pre-wrap break-words">
                    {question.question}
                  </p>
                </div>

                {/* Student Answer */}
                <div className="mb-4 p-3 sm:p-4 bg-paper border border-line rounded-xl">
                  <h4 className="text-xs sm:text-sm font-bold text-ink-soft uppercase tracking-wider mb-2">Student's Answer:</h4>
                  {answer.studentAnswerPoints ? (
                    <div className="w-full px-3 sm:px-4 py-3 bg-violet-50/50 border border-line rounded-xl">
                      <p className="text-xs font-bold text-violet-dark uppercase tracking-wide mb-1">Key Points Written by Student</p>
                      <p className="text-sm text-ink whitespace-pre-line leading-relaxed">
                        {answer.studentAnswerPoints}
                      </p>
                    </div>
                  ) : answer.studentAnswer === '(PDF submission)' ? (
                    <div className="w-full px-3 sm:px-4 py-3 bg-paper border border-line rounded-xl">
                      <p className="text-ink-soft italic text-sm">
                        Answer submitted via PDF — review document in attachment above
                      </p>
                    </div>
                  ) : (
                    <textarea
                      value={answer.studentAnswer || ""}
                      readOnly
                      rows={6}
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-surface border border-line rounded-xl text-sm sm:text-base text-ink resize-none"
                    />
                  )}
                </div>

                {/* Answer Key */}
                <div className="mb-4 p-3 sm:p-4 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/40 dark:border-blue-900/30 text-blue-800 dark:text-blue-300 rounded-xl">
                  <h4 className="text-xs sm:text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">Answer Key:</h4>
                  <p className="text-xs sm:text-sm text-blue-800 dark:text-blue-300 whitespace-pre-wrap break-words leading-relaxed">
                    {question.answerKey}
                  </p>

                  {question.answerGuidelines && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                      <strong>Guidelines:</strong> {question.answerGuidelines}
                    </p>
                  )}
                </div>

                {/* GRADING SECTION */}
                <div className="border-t border-line pt-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 flex-wrap">
                    {/* AI Marks */}
                    {answer.aiMarks !== null && (
                      <>
                        <div>
                          <p className="text-xs sm:text-sm text-ink-soft mb-1 font-bold uppercase tracking-wider">AI Suggestion</p>
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-violet-dark" />
                            <span className="text-sm sm:text-base font-black text-violet-dark">
                              {answer.aiMarks}/{question.marks}
                            </span>
                          </div>
                        </div>

                        <div className="hidden sm:block h-8 w-px bg-line"></div>
                      </>
                    )}

                    {/* Marks Awarded */}
                    <div>
                      <p className="text-xs sm:text-sm text-ink-soft mb-1 font-bold uppercase tracking-wider">Marks Awarded</p>

                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            max={question.marks}
                            value={editingMarks[answer.questionId]}
                            onChange={(e) =>
                              setEditingMarks({
                                ...editingMarks,
                                [answer.questionId]: Math.min(
                                  question.marks,
                                  Math.max(0, parseInt(e.target.value) || 0)
                                )
                              })
                            }
                            className="w-16 sm:w-20 px-2 sm:px-3 py-1 text-sm sm:text-base border border-line rounded-xl bg-surface outline-none focus:ring-2 focus:ring-violet-dark"
                          />

                          <button
                            onClick={() => saveMarks(answer.questionId)}
                            disabled={isSaving}
                            className="p-1 text-green-600 hover:bg-line/80 rounded-xl cursor-pointer disabled:opacity-50"
                            title="Save"
                          >
                            <Save className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => cancelEditingMarks(answer.questionId)}
                            disabled={isSaving}
                            className="p-1 text-rose-600 hover:bg-line/80 rounded-xl cursor-pointer disabled:opacity-50"
                            title="Cancel"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-sm sm:text-base font-bold ${
                              answer.marksAwarded === question.marks
                                ? 'text-green-600 dark:text-green-400'
                                : answer.marksAwarded > 0
                                ? 'text-orange-600 dark:text-orange-400'
                                : 'text-rose-600 dark:text-rose-455'
                            }`}
                          >
                            {answer.marksAwarded}/{question.marks}
                          </span>

                          <button
                            onClick={() => startEditingMarks(answer.questionId, answer.marksAwarded)}
                            className="p-1.5 text-ink-soft hover:bg-line/80 rounded-xl cursor-pointer transition-colors"
                            title="Edit marks"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* AI Feedback */}
                  {answer.aiFeedback && (
                    <div className="mt-3 p-3 bg-violet-50/50 border border-line rounded-xl">
                      <p className="text-xs sm:text-sm text-ink break-words">
                        <span className="font-bold text-violet-dark">✨ AI Feedback:</span> {answer.aiFeedback}
                      </p>
                    </div>
                  )}

                  {/* Teacher Feedback */}
                  {answer.teacherFeedback && (
                    <div className="mt-3 p-3 bg-blue-50/50 dark:bg-blue-950/10 border border-blue-200/40 dark:border-blue-900/20 rounded-xl">
                      <p className="text-xs sm:text-sm text-ink break-words">
                        <span className="font-bold text-blue-700 dark:text-blue-400">👨‍🏫 Teacher Feedback:</span> {answer.teacherFeedback}
                      </p>
                    </div>
                  )}

                  {/* Checked By */}
                  <div className="mt-3">
                    <span
                      className={`inline-block px-2 py-1 text-xs font-bold rounded border border-line ${
                        answer.checkedBy === 'ai'
                          ? 'bg-violet-50 text-violet-dark'
                          : answer.checkedBy === 'teacher'
                          ? 'bg-blue-50 text-blue-750 dark:text-blue-400'
                          : answer.checkedBy === 'both'
                          ? 'bg-green-100 dark:bg-green-955/40 text-green-800 dark:text-green-300'
                          : 'bg-line text-ink'
                      }`}
                    >
                      {answer.checkedBy === 'ai' && '✨ Checked by AI'}
                      {answer.checkedBy === 'teacher' && '👨‍🏫 Checked by Teacher'}
                      {answer.checkedBy === 'both' && '✅ Checked by AI & Teacher'}
                      {answer.checkedBy === 'pending' && '⏳ Pending'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Final Summary */}
        <div className="mt-6 sm:mt-8 bg-surface rounded-2xl border border-line p-4 sm:p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base sm:text-lg font-semibold font-display text-ink mb-1">Final Score</h3>
              <p className="text-xs sm:text-sm text-ink-soft">
                {submission.isResultPublished
                  ? 'Results published and visible to student'
                  : 'Results not published yet (student cannot see)'}
              </p>
            </div>

            <div className="text-left sm:text-right w-full sm:w-auto">
              <div className="text-2xl sm:text-3xl font-black font-display text-violet-dark mb-1">
                {submission.marksObtained}/{submission.totalMarks}
              </div>
              <p className="text-xs sm:text-sm text-ink-soft font-semibold">{submission.percentage}%</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentAssignmentResult;
