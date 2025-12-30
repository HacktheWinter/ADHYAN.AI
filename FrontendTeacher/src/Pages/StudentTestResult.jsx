import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  ChevronLeft,
  Edit2,
  Save,
  X,
  Loader,
  Sparkles,
  User,
  Award,
} from "lucide-react";
import axios from "axios";

const StudentTestResult = () => {
  const { classId, testId, studentId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [submission, setSubmission] = useState(null);
  const [testPaper, setTestPaper] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingMarks, setEditingMarks] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchSubmission();
  }, []);

  const fetchSubmission = async () => {
    try {
      setLoading(true);

      // Get submissionId from location state or fetch by studentId
      const submissionId = location.state?.submissionId;

      let response;
      if (submissionId) {
        response = await axios.get(
          `http://localhost:5000/api/test-submission/submission/${submissionId}`
        );
      } else {
        // Fallback: get all submissions and find by studentId
        const allSubs = await axios.get(
          `http://localhost:5000/api/test-submission/test/${testId}`
        );
        const found = allSubs.data.submissions.find(
          (s) => (s.studentId._id || s.studentId) === studentId
        );
        if (found) {
          response = await axios.get(
            `http://localhost:5000/api/test-submission/submission/${found._id}`
          );
        }
      }

      if (response?.data?.submission) {
        setSubmission(response.data.submission);
        setTestPaper(response.data.submission.testPaperId);
      } else {
        alert("Submission not found");
        navigate(`/class/${classId}/test-papers/results/${testId}`);
      }
    } catch (error) {
      console.error("Error fetching submission:", error);
      alert("Failed to load submission");
      navigate(`/class/${classId}/test-papers/results/${testId}`);
    } finally {
      setLoading(false);
    }
  };

  const startEditingMarks = (questionId, currentMarks) => {
    setEditingMarks({ ...editingMarks, [questionId]: currentMarks });
  };

  const saveMarks = async (questionId) => {
    try {
      setIsSaving(true);
      const newMarks = editingMarks[questionId];

      const updatedAnswers = submission.answers.map((ans) =>
        ans.questionId === questionId
          ? {
              questionId: ans.questionId,
              marksAwarded: newMarks,
              teacherFeedback: ans.teacherFeedback || "",
            }
          : {
              questionId: ans.questionId,
              marksAwarded: ans.marksAwarded,
              teacherFeedback: ans.teacherFeedback || "",
            }
      );

      await axios.put(
        `http://localhost:5000/api/test-submission/update-marks/${submission._id}`,
        {
          answers: updatedAnswers,
        }
      );

      alert(
        '✅ Marks updated successfully!\n\nNote: Results are NOT automatically published to students.\nGo back and click "Publish Results" to make changes visible.'
      );

      await fetchSubmission();

      const newEditingMarks = { ...editingMarks };
      delete newEditingMarks[questionId];
      setEditingMarks(newEditingMarks);
    } catch (error) {
      console.error("Error updating marks:", error);
      alert("Failed to update marks");
    } finally {
      setIsSaving(false);
    }
  };

  const cancelEditingMarks = (questionId) => {
    const newEditingMarks = { ...editingMarks };
    delete newEditingMarks[questionId];
    setEditingMarks(newEditingMarks);
  };

  const getTextareaRows = (type) => {
    const question = testPaper?.questions?.find((q) => q._id === type);
    if (question?.type === "short") return 3;
    if (question?.type === "medium") return 6;
    if (question?.type === "long") return 12;
    return 5;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader className="w-12 h-12 text-purple-600 animate-spin" />
      </div>
    );
  }

  if (!submission || !testPaper) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center px-4">
          <p className="text-gray-700">Submission not found</p>
          <button
            onClick={() =>
              navigate(`/class/${classId}/test-papers/results/${testId}`)
            }
            className="mt-4 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Back to Results
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <button
            onClick={() =>
              navigate(`/class/${classId}/test-papers/results/${testId}`)
            }
            className="flex items-center gap-2 text-purple-600 hover:text-purple-700 mb-4 cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm sm:text-base">Back to All Results</span>
          </button>
        </div>

        {/* Student Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg sm:text-2xl flex-shrink-0">
                {submission.studentName?.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1 truncate">
                  {submission.studentName}
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 truncate">
                  Submitted:{" "}
                  {new Date(submission.submittedAt).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                <p className="text-xs sm:text-sm text-gray-600 mt-1 truncate">
                  {testPaper.title}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4">
              <div className="text-left sm:text-right">
                <div className="flex items-center gap-2 mb-2">
                  <Award className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600" />
                  <div className="text-2xl sm:text-3xl font-bold text-purple-600">
                    {submission.marksObtained}/{submission.totalMarks}
                  </div>
                </div>
                <p className="text-sm text-gray-500">
                  {submission.percentage}%
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <span
                  className={`inline-block px-2 sm:px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                    submission.status === "checked"
                      ? "bg-green-100 text-green-800"
                      : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {submission.status === "checked" ? "Checked" : "Pending"}
                </span>
                {submission.isResultPublished && (
                  <span className="inline-block px-2 sm:px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 whitespace-nowrap">
                    Published
                  </span>
                )}
              </div>
            </div>
          </div>

          {submission.status === "checked" && submission.checkedAt && (
            <div className="pt-4 border-t border-gray-200">
              <p className="text-xs sm:text-sm text-gray-600">
                Checked on:{" "}
                {new Date(submission.checkedAt).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          )}
        </div>

        {/* Questions */}
        <div className="space-y-4 sm:space-y-6">
          {submission.answers.map((answer, index) => {
            const question = testPaper.questions.find(
              (q) => q._id === answer.questionId
            );
            const isEditing = editingMarks[answer.questionId] !== undefined;

            if (!question) return null;

            return (
              <div
                key={answer.questionId}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6"
              >
                {/* Question Title */}
                <div className="mb-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                      Question {index + 1}
                    </h3>
                    <span
                      className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm whitespace-nowrap flex-shrink-0 ${
                        question.type === "short"
                          ? "bg-blue-100 text-blue-700"
                          : question.type === "medium"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-pink-100 text-pink-700"
                      }`}
                    >
                      {question.marks} marks
                    </span>
                  </div>
                  <p className="text-sm sm:text-base text-gray-700">
                    {question.question}
                  </p>
                </div>

                {/* Student Answer */}
                <div className="mb-4 p-3 sm:p-4 bg-gray-50 rounded-lg">
                  <h4 className="text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                    Student's Answer:
                  </h4>
                  <textarea
                    value={answer.studentAnswer}
                    readOnly
                    rows={getTextareaRows(question._id)}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-white border border-gray-300 rounded-lg text-sm sm:text-base text-gray-900 resize-none"
                  />
                </div>

                {/* Answer Key */}
                <div className="mb-4 p-3 sm:p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="text-xs sm:text-sm font-semibold text-blue-900 mb-2">
                    Answer Key:
                  </h4>
                  <p className="text-sm sm:text-base text-blue-800 whitespace-pre-wrap">
                    {question.answerKey}
                  </p>

                  {question.answerGuidelines && (
                    <p className="text-xs text-blue-600 mt-2">
                      <strong>Guidelines:</strong> {question.answerGuidelines}
                    </p>
                  )}
                </div>

                {/* Grading */}
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6 flex-wrap">
                    {/* AI Marks */}
                    {answer.aiMarks !== null && (
                      <>
                        <div>
                          <p className="text-xs sm:text-sm text-gray-600 mb-1">
                            AI Suggestion
                          </p>
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
                      <p className="text-xs sm:text-sm text-gray-600 mb-1">
                        Marks Awarded
                      </p>
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
                                ),
                              })
                            }
                            className="w-16 sm:w-20 px-2 sm:px-3 py-1 text-sm sm:text-base border border-gray-300 rounded outline-none focus:ring-2 focus:ring-purple-600"
                          />
                          <button
                            onClick={() => saveMarks(answer.questionId)}
                            disabled={isSaving}
                            className="p-1 text-green-600 hover:bg-green-50 rounded cursor-pointer disabled:opacity-50"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              cancelEditingMarks(answer.questionId)
                            }
                            disabled={isSaving}
                            className="p-1 text-red-600 hover:bg-red-50 rounded cursor-pointer disabled:opacity-50"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-sm sm:text-base font-bold ${
                              answer.marksAwarded === question.marks
                                ? "text-green-600"
                                : answer.marksAwarded > 0
                                ? "text-yellow-600"
                                : "text-red-600"
                            }`}
                          >
                            {answer.marksAwarded}/{question.marks}
                          </span>
                          <button
                            onClick={() =>
                              startEditingMarks(
                                answer.questionId,
                                answer.marksAwarded
                              )
                            }
                            className="p-1 text-gray-600 hover:bg-gray-100 rounded cursor-pointer"
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
                      <p className="text-xs sm:text-sm text-purple-900">
                        <span className="font-semibold">AI Feedback:</span>{" "}
                        {answer.aiFeedback}
                      </p>
                    </div>
                  )}

                  {/* Teacher Feedback */}
                  {answer.teacherFeedback && (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-xs sm:text-sm text-blue-900">
                        <span className="font-semibold">Teacher Feedback:</span>{" "}
                        {answer.teacherFeedback}
                      </p>
                    </div>
                  )}

                  {/* Checked By */}
                  <div className="mt-3">
                    <span
                      className={`inline-block px-2 py-1 text-xs font-semibold rounded ${
                        answer.checkedBy === "ai"
                          ? "bg-purple-100 text-purple-700"
                          : answer.checkedBy === "teacher"
                          ? "bg-blue-100 text-blue-700"
                          : answer.checkedBy === "both"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {answer.checkedBy === "ai" && "✨ Checked by AI"}
                      {answer.checkedBy === "teacher" &&
                        "👨‍🏫 Checked by Teacher"}
                      {answer.checkedBy === "both" &&
                        "✅ Checked by AI & Teacher"}
                      {answer.checkedBy === "pending" && "⏳ Pending"}
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
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1">
                Final Score
              </h3>
              <p className="text-xs sm:text-sm text-gray-600">
                {submission.isResultPublished
                  ? "Results published and visible to student"
                  : "Results not published yet (student cannot see)"}
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

export default StudentTestResult;
