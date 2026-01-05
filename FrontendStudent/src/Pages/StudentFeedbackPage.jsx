import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";

const StudentFeedbackPage = () => {
  const { id: classId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);

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
        // 1️⃣ Check active feedback
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
          alert("No active feedback available");
          navigate(-1);
          return;
        }

        if (activeData.alreadySubmitted) {
          alert("You have already submitted feedback");
          navigate(-1);
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

      alert(" Feedback submitted successfully");
      navigate(-1);
    } catch (err) {
      console.error(err);
      alert(" Failed to submit feedback");
    }
  };

  if (loading) {
    return <p className="p-6">Loading feedback...</p>;
  }

  if (!feedback) return null;

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Card */}
      <div className="bg-white rounded-2xl shadow-md border p-8">
        {/* Title */}
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          📝 Give Feedback
        </h1>

        {/* STUDENT INFO */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
          <div>
            <label className="text-sm font-medium text-gray-600">
              Student Name
            </label>
            <input
              className="mt-1 border p-3 w-full rounded-lg bg-gray-100 text-gray-800"
              value={studentName}
              disabled
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-600">Email</label>
            <input
              className="mt-1 border p-3 w-full rounded-lg bg-gray-100 text-gray-800"
              value={studentEmail}
              disabled
            />
          </div>
        </div>

        {/* QUESTIONS */}
        <div className="space-y-8">
          {feedback.questions.map((q, index) => (
            <div
              key={q._id}
              className="p-5 border rounded-xl hover:shadow-sm transition"
            >
              <div className="flex items-start gap-3 mb-4">
                {/* Question Number */}
                <span className="text-purple-600 font-bold text-lg select-none">
                  {index + 1}.
                </span>

                {/* Question Text */}
                <p className="text-lg font-semibold text-gray-900 leading-relaxed">
                  {q.text}
                </p>
              </div>

              {/* Rating buttons */}
              <div className="flex gap-3">
                {[1, 2, 3, 4, 5].map((r) => (
                  <button
                    key={r}
                    onClick={() => handleRatingChange(q._id, r)}
                    className={`w-10 h-10 rounded-full border flex items-center justify-center font-medium transition
                    ${
                      answers[q._id] === r
                        ? "bg-purple-600 text-white border-purple-600"
                        : "bg-white text-gray-700 hover:bg-purple-50"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* COMMENT */}
        {feedback.enableComment && (
          <div className="mt-10">
            <label className="text-sm font-medium text-gray-600">
              Overall Comment
            </label>
            <textarea
              className="mt-2 border p-4 w-full rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
              placeholder="Write your feedback here..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
            />
          </div>
        )}

        {/* SUBMIT */}
        <div className="mt-10 text-center">
          <button
            onClick={handleSubmit}
            className="bg-purple-600 text-white px-10 py-3 rounded-xl font-semibold
                     hover:bg-purple-700 active:scale-95 transition"
          >
            Submit Feedback
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudentFeedbackPage;
