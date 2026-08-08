import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  ChevronLeft,
  Loader,
  User,
  Award,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import axios from "axios";
import API_BASE_URL from "../config";

const StudentQuizResult = () => {
  const { classId, quizId, studentId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [submission, setSubmission] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [imageLoadError, setImageLoadError] = useState(false);

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
          `${API_BASE_URL}/quiz-submission/submission/${submissionId}`
        );
      } else {
        // Fallback: get all submissions and find by studentId
        const allSubs = await axios.get(
          `${API_BASE_URL}/quiz-submission/quiz/${quizId}`
        );
        const found = allSubs.data.submissions.find(
          (s) => (s.studentId._id || s.studentId) === studentId
        );
        if (found) {
          response = { data: { submission: found } };
        }
      }

      const submissionData = response.data.submission;
      setSubmission(submissionData);

      // Get quiz details
      if (submissionData?.quizId?._id) {
        setQuiz(submissionData.quizId);
      } else {
        const quizResponse = await axios.get(
          `${API_BASE_URL}/quiz/${quizId}`
        );
        setQuiz(quizResponse.data.quiz);
      }
    } catch (error) {
      console.error("Error fetching submission:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center font-body text-ink">
        <Loader className="w-12 h-12 text-violet-dark animate-spin" />
      </div>
    );
  }

  if (!submission || !quiz) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center font-body text-ink">
        <div className="text-center px-4">
          <p className="text-ink font-semibold font-display">Submission not found</p>
          <button
            onClick={() =>
              navigate(`/class/${classId}/quizzes/results/${quizId}`)
            }
            className="mt-4 px-6 py-3 btn-settings-blue text-sm rounded-xl font-bold transition cursor-pointer"
          >
            Back to Results
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper font-body text-ink">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <button
            onClick={() => navigate(`/class/${classId}/quizzes/results/${quizId}`)}
            className="flex items-center gap-2 text-violet-dark hover:opacity-80 font-bold transition-all mb-4 cursor-pointer text-sm"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm sm:text-base">Back to All Results</span>
          </button>
        </div>

        {/* Student Header */}
        <div className="bg-surface rounded-2xl border border-line p-4 sm:p-6 mb-4 sm:mb-6 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
              {submission.studentId?.profilePhoto && !imageLoadError ? (
                <img 
                  src={`${API_BASE_URL.replace('/api', '')}/${submission.studentId.profilePhoto}`}
                  alt={submission.studentId?.name}
                  className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover flex-shrink-0 border border-line shadow-sm"
                  onError={() => setImageLoadError(true)}
                />
              ) : (
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-violet-50 text-violet-dark border border-line rounded-full flex items-center justify-center font-bold text-lg sm:text-2xl flex-shrink-0 font-display">
                  {submission.studentId?.name?.charAt(0).toUpperCase() || "?"}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h1 className="text-xl sm:text-2xl font-semibold font-display text-ink mb-1 truncate">
                  {submission.studentId?.name || "Unknown Student"}
                </h1>
                <p className="text-xs sm:text-sm text-ink-soft truncate">
                  Submitted:{" "}
                  {new Date(submission.submittedAt).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                <p className="text-xs sm:text-sm text-ink-soft mt-1 truncate font-semibold">
                  {quiz.title}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4">
              <div className="text-left sm:text-right">
                <div className="flex items-center gap-2 mb-2">
                  <Award className="w-6 h-6 sm:w-8 sm:h-8 text-violet-dark" />
                  <div className="text-2xl sm:text-3xl font-black font-display text-violet-dark">
                    {submission.score}/{submission.totalQuestions}
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-ink-soft font-semibold">
                  {submission.percentage?.toFixed(2)}%
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <span
                  className="inline-block px-2 sm:px-3 py-1 rounded-full text-xs font-bold border border-line whitespace-nowrap bg-green-100 dark:bg-green-955/40 text-green-800 dark:text-green-300"
                >
                  Submitted
                </span>
                <span className={`inline-flex items-center gap-1 px-2 sm:px-3 py-1 rounded-full text-xs font-bold border border-line whitespace-nowrap ${
                  parseFloat(submission.percentage) >= 40
                    ? "bg-green-100 dark:bg-green-955/40 text-green-800 dark:text-green-300"
                    : "bg-rose-100 dark:bg-rose-955/40 text-rose-800 dark:text-rose-350"
                }`}>
                  {parseFloat(submission.percentage) >= 40 ? (
                    <>
                      <CheckCircle className="w-3 h-3" /> Pass
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-3 h-3" /> Fail
                    </>
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Questions */}
        <div className="space-y-4 sm:space-y-6">
          {submission.answers.map((answer, index) => {
            const question = quiz.questions.find(
              (q) => q._id === answer.questionId
            );

            if (!question) return null;

            return (
              <div
                key={answer.questionId}
                className="bg-surface rounded-2xl border border-line p-4 sm:p-6 shadow-sm"
              >
                {/* Question Title */}
                <div className="mb-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-base sm:text-lg font-semibold font-display text-ink">
                      Question {index + 1}
                    </h3>
                  </div>
                  <p className="text-sm sm:text-base text-ink mb-4">
                    {question.question}
                  </p>

                  {/* Options for MCQ */}
                  {question.options && question.options.length > 0 && (
                    <div className="space-y-2">
                      {question.options.map((option, idx) => {
                        const isSelected = option === answer.selectedAnswer;
                        const isCorrect = option === answer.correctAnswer;
                        const isWrongSelection = isSelected && !answer.isCorrect;
                        
                        return (
                          <div
                            key={idx}
                            className={`p-3 rounded-xl border-2 text-sm transition-all ${
                              isCorrect
                                ? "border-green-500 bg-green-500/10 font-medium"
                                : isWrongSelection
                                ? "border-rose-500 dark:border-rose-400 bg-rose-500/10 font-medium"
                                : "border-line bg-surface"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span
                                className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold ${
                                  isCorrect
                                    ? "border-green-500 bg-green-500 text-white"
                                    : isWrongSelection
                                    ? "border-rose-500 bg-rose-500 text-white"
                                    : isSelected
                                    ? "border-purple-500 bg-purple-500 text-white"
                                    : "border-line bg-paper"
                                }`}
                              >
                                {isCorrect && "✓"}
                                {isWrongSelection && "✗"}
                                {isSelected && answer.isCorrect && "✓"}
                              </span>
                              <span className={isCorrect ? "text-green-800 dark:text-green-300" : isWrongSelection ? "text-rose-800 dark:text-rose-350" : "text-ink"}>
                                {option}
                              </span>
                              {isCorrect && (
                                <span className="ml-auto text-xs font-bold text-green-700 bg-green-100 dark:bg-green-950/40 text-green-800 dark:text-green-300 border border-line px-2 py-1 rounded-full">
                                  Correct Answer
                                </span>
                              )}
                              {isWrongSelection && (
                                <span className="ml-auto text-xs font-bold text-rose-700 bg-rose-100 dark:bg-rose-955/40 text-rose-800 dark:text-rose-350 border border-line px-2 py-1 rounded-full">
                                  Wrong Choice
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Result Badge */}
                <div className="flex items-center justify-between pt-4 border-t border-line">
                  <span className="text-sm text-ink-soft">
                    Multiple Choice Question
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border border-line ${
                      answer.isCorrect
                        ? "bg-green-100 dark:bg-green-955/40 text-green-800 dark:text-green-300"
                        : "bg-rose-100 dark:bg-rose-955/40 text-rose-800 dark:text-rose-350"
                    }`}
                  >
                    {answer.isCorrect ? (
                      <>
                        <CheckCircle className="w-3 h-3" /> Correct
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-3 h-3" /> Incorrect
                      </>
                    )}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default StudentQuizResult;
