// FrontendTeacher/src/Pages/StudentAssignmentResult.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, Edit2, Save, X, Loader, Sparkles, Award } from 'lucide-react';
import { getSubmissionById, updateMarksManually } from '../api/assignmentApi';

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

      const submissionId = location.state?.submissionId;

      if (!submissionId) {
        alert('Submission ID not found');
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
  }, [location.state?.submissionId, navigate, classId, assignmentId]);

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Loader className="w-12 h-12 text-purple-600 animate-spin" />
      </div>
    );
  }

  if (!submission || !assignment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-700 mb-4">Submission not found</p>
          <button
            onClick={() => navigate(`/class/${classId}/assignments/results/${assignmentId}`)}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 cursor-pointer"
          >
            Back to Results
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Back Button */}
        <div className="mb-4 sm:mb-6">
          <button
            onClick={() => navigate(`/class/${classId}/assignments/results/${assignmentId}`)}
            className="flex items-center gap-2 text-purple-600 hover:text-purple-700 mb-4 cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm sm:text-base">Back to All Results</span>
          </button>
        </div>

        {/* Student Summary */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-4">
            {/* Student Info */}
            <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
              {submission.studentId?.profilePhoto && !imageLoadError ? (
                <img 
                  src={`http://localhost:5000/${submission.studentId.profilePhoto}`}
                  alt={submission.studentName}
                  className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover flex-shrink-0 border-2 border-purple-200"
                  onError={() => setImageLoadError(true)}
                />
              ) : (
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl sm:text-2xl flex-shrink-0">
                  {submission.studentName?.charAt(0).toUpperCase()}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-2xl font-bold text-gray-900 mb-1 truncate">
                  {submission.studentName}
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 break-words">
                  Submitted: {new Date(submission.submittedAt).toLocaleString()}
                </p>
                <p className="text-xs sm:text-sm text-gray-600 mt-1 truncate">{assignment.title}</p>
              </div>
            </div>

            {/* Score Section */}
            <div className="w-full sm:w-auto text-left sm:text-right">
              <div className="flex items-center gap-2 mb-2">
                <Award className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600" />
                <div className="text-2xl sm:text-3xl font-bold text-purple-600">
                  {submission.marksObtained}/{submission.totalMarks}
                </div>
              </div>

              <p className="text-sm text-gray-500">{submission.percentage}%</p>

              <div className="flex flex-wrap gap-2 mt-2">
                <span
                  className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                    submission.status === 'checked' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {submission.status === 'checked' ? 'Checked' : 'Pending'}
                </span>

                {submission.isResultPublished && (
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
                    Published
                  </span>
                )}
              </div>
            </div>
          </div>

          {submission.status === 'checked' && submission.checkedAt && (
            <div className="pt-4 border-t border-gray-200">
              <p className="text-xs sm:text-sm text-gray-600">
                Checked on: {new Date(submission.checkedAt).toLocaleString()}
              </p>
            </div>
          )}
        </div>

        {/* QUESTIONS SECTION */}
        <div className="space-y-4 sm:space-y-6">
          {submission.answers.map((answer, index) => {
            const question = assignment.questions.find((q) => q._id === answer.questionId);
            const isEditing = editingMarks[answer.questionId] !== undefined;
            if (!question) return null;

            return (
              <div key={answer.questionId} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
                {/* Question Title */}
                <div className="mb-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-2">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900">Question {index + 1}</h3>
                    <span className="px-3 py-1 rounded-full text-xs sm:text-sm bg-indigo-100 text-indigo-700 self-start">
                      {question.marks} marks
                    </span>
                  </div>
                  <p className="text-sm sm:text-base text-gray-700 whitespace-pre-wrap break-words">
                    {question.question}
                  </p>
                </div>

                {/* Student Answer */}
                <div className="mb-4 p-3 sm:p-4 bg-gray-50 rounded-lg">
                  <h4 className="text-xs sm:text-sm font-semibold text-gray-700 mb-2">Student's Answer:</h4>
                  <textarea
                    value={answer.studentAnswer}
                    readOnly
                    rows={6}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-white border border-gray-300 rounded-lg text-sm sm:text-base text-gray-900 resize-none"
                  />
                </div>

                {/* Answer Key */}
                <div className="mb-4 p-3 sm:p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="text-xs sm:text-sm font-semibold text-blue-900 mb-2">Answer Key:</h4>
                  <p className="text-xs sm:text-sm text-blue-800 whitespace-pre-wrap break-words leading-relaxed">
                    {question.answerKey}
                  </p>

                  {question.answerGuidelines && (
                    <p className="text-xs text-blue-600 mt-2">
                      <strong>Guidelines:</strong> {question.answerGuidelines}
                    </p>
                  )}
                </div>

                {/* GRADING SECTION */}
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 flex-wrap">
                    {/* AI Marks */}
                    {answer.aiMarks !== null && (
                      <>
                        <div>
                          <p className="text-xs sm:text-sm text-gray-600 mb-1">AI Suggestion</p>
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-purple-600" />
                            <span className="text-sm sm:text-base font-semibold text-purple-600">
                              {answer.aiMarks}/{question.marks}
                            </span>
                          </div>
                        </div>

                        <div className="hidden sm:block h-8 w-px bg-gray-300"></div>
                      </>
                    )}

                    {/* Marks Awarded */}
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600 mb-1">Marks Awarded</p>

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
                            className="w-16 sm:w-20 px-2 sm:px-3 py-1 text-sm sm:text-base border border-gray-300 rounded outline-none focus:ring-2 focus:ring-purple-600"
                          />

                          <button
                            onClick={() => saveMarks(answer.questionId)}
                            disabled={isSaving}
                            className="p-1 text-green-600 hover:bg-green-50 rounded cursor-pointer disabled:opacity-50"
                            title="Save"
                          >
                            <Save className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => cancelEditingMarks(answer.questionId)}
                            disabled={isSaving}
                            className="p-1 text-red-600 hover:bg-red-50 rounded cursor-pointer disabled:opacity-50"
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
                                ? 'text-green-600'
                                : answer.marksAwarded > 0
                                ? 'text-yellow-600'
                                : 'text-red-600'
                            }`}
                          >
                            {answer.marksAwarded}/{question.marks}
                          </span>

                          <button
                            onClick={() => startEditingMarks(answer.questionId, answer.marksAwarded)}
                            className="p-1 text-gray-600 hover:bg-gray-100 rounded cursor-pointer"
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
                    <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                      <p className="text-xs sm:text-sm text-purple-900 break-words">
                        <span className="font-semibold">✨ AI Feedback:</span> {answer.aiFeedback}
                      </p>
                    </div>
                  )}

                  {/* Teacher Feedback */}
                  {answer.teacherFeedback && (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-xs sm:text-sm text-blue-900 break-words">
                        <span className="font-semibold">👨‍🏫 Teacher Feedback:</span> {answer.teacherFeedback}
                      </p>
                    </div>
                  )}

                  {/* Checked By */}
                  <div className="mt-3">
                    <span
                      className={`inline-block px-2 py-1 text-xs font-semibold rounded ${
                        answer.checkedBy === 'ai'
                          ? 'bg-purple-100 text-purple-700'
                          : answer.checkedBy === 'teacher'
                          ? 'bg-blue-100 text-blue-700'
                          : answer.checkedBy === 'both'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
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
        <div className="mt-6 sm:mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1">Final Score</h3>
              <p className="text-xs sm:text-sm text-gray-600">
                {submission.isResultPublished
                  ? 'Results published and visible to student'
                  : 'Results not published yet (student cannot see)'}
              </p>
            </div>

            <div className="text-left sm:text-right w-full sm:w-auto">
              <div className="text-2xl sm:text-3xl font-bold text-purple-600 mb-1">
                {submission.marksObtained}/{submission.totalMarks}
              </div>
              <p className="text-sm text-gray-500">{submission.percentage}%</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentAssignmentResult;