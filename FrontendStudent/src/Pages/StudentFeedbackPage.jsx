import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Star, MessageSquare, Send, CheckCircle, AlertCircle, Loader, ArrowLeft } from "lucide-react";

const StudentFeedbackPage = () => {
  const { id: classId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);
  const [feedbackStatus, setFeedbackStatus] = useState(null);

  // student info (auto-fill)
  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");

  const [comment, setComment] = useState("");

  // answers
  const [answers, setAnswers] = useState({});

  const student = useMemo(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return {
      name: user.name || "",
      email: user.email || "",
    };
  }, []);

  useEffect(() => {
    if (student.name) setStudentName(student.name);
    if (student.email) setStudentEmail(student.email);
  }, [student]);

  useEffect(() => {
    const fetchFeedback = async () => {
      try {
        // Check active feedback
        const token = localStorage.getItem("token");

        if (!token) {
          alert("Please login again");
          navigate("/login");
          return;
        }

        const activeRes = await fetch(
          `http://localhost:5000/api/feedback/active/${classId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const activeData = await activeRes.json();

        if (!activeData.isActive) {
          setFeedbackStatus(activeData.reason);
          setLoading(false);
          return;
        }

        // Fetch feedback form (questions)
        const formRes = await fetch(
          `http://localhost:5000/api/feedback/form/${classId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const formData = await formRes.json();
        setFeedback({ ...formData, feedbackId: activeData.feedbackId });
      } catch (err) {
        console.error(err);
        alert("Failed to load feedback");
        navigate(-1);
      } finally {
        setLoading(false);
      }
    };

    fetchFeedback();
  }, [classId, navigate]);

  const handleRatingChange = (questionId, rating) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: rating,
    }));
  };

  const handleSubmit = async () => {
    if (!studentName || !studentEmail) {
      alert("Student info missing");
      return;
    }

    if (!feedback || !feedback.questions) {
      alert("Feedback not loaded yet");
      return;
    }

    if (Object.keys(answers).length !== feedback.questions.length) {
      alert("Please rate all questions");
      return;
    }

    const formattedAnswers = Object.entries(answers).map(
      ([questionId, rating]) => ({
        questionId,
        rating,
      })
    );

    try {
      const token = localStorage.getItem("token");

      const res = await fetch("http://localhost:5000/api/feedback/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          feedbackId: feedback.feedbackId,
          studentName,
          studentEmail,
          answers: formattedAnswers,
          comment,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.message || "Feedback already submitted");
        navigate(-1);
        return;
      }

      alert("✅ Feedback submitted successfully");
      navigate(-1);
    } catch (err) {
      console.error(err);
      alert("❌ Failed to submit feedback");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Loader className="w-12 h-12 text-purple-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading feedback...</p>
        </motion.div>
      </div>
    );
  }

  if (feedbackStatus === "NO_FEEDBACK") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center"
        >
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-gray-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            No Feedback Available
          </h2>
          <p className="text-gray-600 mb-6">
            Your teacher has not published any feedback form yet.
          </p>
          <button
            onClick={() => navigate(-1)}
            className="text-purple-600 hover:text-purple-700 font-medium cursor-pointer"
          >
            Go Back
          </button>
        </motion.div>
      </div>
    );
  }

  if (feedbackStatus === "ALREADY_SUBMITTED") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center"
        >
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Feedback Already Submitted
          </h2>
          <p className="text-gray-600 mb-6">
            Thank you! You have already submitted your feedback for this class.
          </p>
          <button
            onClick={() => navigate(-1)}
            className="text-purple-600 hover:text-purple-700 font-medium cursor-pointer"
          >
            Go Back
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Back Button */}
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium transition cursor-pointer bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200"
        >
          <ArrowLeft size={20} />
          Back
        </motion.button>

        {/* Header Card */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 mb-6"
        >
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Star className="w-8 h-8 text-white fill-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Teacher Evaluation Form
            </h1>
            <p className="text-gray-600">
              Your feedback helps us improve the learning experience
            </p>
          </div>
        </motion.div>

        {/* Student Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
                Student Name
              </label>
              <div className="bg-gray-50 border border-gray-200 px-4 py-3 rounded-lg">
                <p className="text-gray-800 font-medium">{studentName}</p>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
                Email Address
              </label>
              <div className="bg-gray-50 border border-gray-200 px-4 py-3 rounded-lg">
                <p className="text-gray-800 font-medium">{studentEmail}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Questions Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 mb-6"
        >
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <span className="text-purple-600 font-bold">Q</span>
            </div>
            Rate Your Experience
          </h2>

          <div className="space-y-6">
            {feedback?.questions?.length > 0 ? (
              feedback.questions.map((q, index) => (
                <motion.div
                  key={q._id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  className="p-5 bg-gray-50 border-2 border-gray-200 rounded-xl hover:border-purple-200 transition-colors"
                >
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-sm font-bold">{index + 1}</span>
                    </div>
                    <p className="text-base font-semibold text-gray-900 leading-relaxed">
                      {q.text}
                    </p>
                  </div>

                  <div className="flex gap-2 ml-10">
                    {[1, 2, 3, 4, 5].map((r) => (
                      <motion.button
                        key={r}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleRatingChange(q._id, r)}
                        className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center font-bold transition-all cursor-pointer ${
                          answers[q._id] === r
                            ? "bg-purple-600 text-white border-purple-600 shadow-lg shadow-purple-200"
                            : "bg-white text-gray-700 border-gray-300 hover:border-purple-400 hover:bg-purple-50"
                        }`}
                      >
                        {r}
                      </motion.button>
                    ))}
                  </div>

                  <div className="flex items-center justify-between mt-3 ml-10 text-xs text-gray-500">
                    <span>Poor</span>
                    <span>Excellent</span>
                  </div>
                </motion.div>
              ))
            ) : (
              <p className="text-center text-gray-500 py-8">
                No questions available.
              </p>
            )}
          </div>
        </motion.div>

        {/* Comment Section */}
        {feedback?.enableComment && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 mb-6"
          >
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <MessageSquare className="w-6 h-6 text-purple-600" />
              Additional Comments
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Share any additional thoughts or suggestions (optional)
            </p>
            <textarea
              className="w-full border-2 border-gray-200 p-4 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:outline-none transition-all resize-none"
              placeholder="Write your feedback here..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={5}
            />
          </motion.div>
        )}

        {/* Submit Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex justify-center"
        >
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSubmit}
            className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-12 py-4 rounded-xl font-semibold shadow-lg shadow-purple-200 hover:shadow-xl hover:shadow-purple-300 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Send className="w-5 h-5" />
            Submit Feedback
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
};

export default StudentFeedbackPage;