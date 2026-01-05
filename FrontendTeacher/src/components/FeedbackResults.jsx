import { useEffect, useState } from "react";

const FeedbackResults = ({ classId }) => {
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);

  // 🔹 NEW: history state
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // =======================
  // Fetch CURRENT feedback
  // =======================
  useEffect(() => {
    const fetchResults = async () => {
      try {
        const res = await fetch(
          `http://localhost:5000/api/feedback/results/${classId}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );

        const data = await res.json();
        setResponses(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to fetch feedback results", err);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [classId]);

  // =======================
  // Fetch ALL feedbacks
  // =======================
  const fetchHistory = async () => {
    try {
      setHistoryLoading(true);

      const res = await fetch(
        `http://localhost:5000/api/feedback/results/all/${classId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      const data = await res.json();
      setHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch feedback history", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  if (loading) {
    return <p className="p-6 text-gray-500">Loading results...</p>;
  }

  // =======================
  // Helpers
  // =======================
  const getAverageRating = (answers = []) => {
    if (!Array.isArray(answers) || answers.length === 0) return 0;

    const sum = answers.reduce(
      (acc, curr) => acc + (curr.rating || 0),
      0
    );

    return sum / answers.length;
  };

  const getRoundAverage = (responses = []) => {
    if (!responses.length) return "N/A";

    const total = responses.reduce((sum, r) => {
      return sum + getAverageRating(r.answers);
    }, 0);

    return (total / responses.length).toFixed(1);
  };

  const renderStars = (rating) => {
    const rounded = Math.round(rating);
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <span
            key={i}
            className={`text-lg ${
              i <= rounded ? "text-yellow-400" : "text-gray-300"
            }`}
          >
            ★
          </span>
        ))}
      </div>
    );
  };

  return (
    <>
      {/* 🔹 HISTORY TOGGLE */}
      <div className="flex justify-end mb-6">
        <button
          onClick={() => {
            setShowHistory(!showHistory);
            if (!showHistory) fetchHistory();
          }}
          className="text-sm text-purple-600 hover:underline"
        >
          {showHistory ? "Hide Feedback History" : "View Past Feedbacks"}
        </button>
      </div>

      {/* 🔹 FEEDBACK HISTORY */}
      {showHistory && (
        <div className="mb-10 space-y-4">
          {historyLoading && (
            <p className="text-gray-500">Loading feedback history...</p>
          )}

          {!historyLoading &&
            history.map((fb, idx) => (
              <div
                key={idx}
                className="bg-white border rounded-xl p-5 shadow-sm"
              >
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-500">
                    {fb.isActive ? "Current Feedback" : "Past Feedback"} •{" "}
                    {new Date(fb.createdAt).toLocaleString()}
                  </p>

                  <span className="text-sm font-medium text-purple-700">
                    ⭐ {getRoundAverage(fb.responses)} / 5
                  </span>
                </div>

                <p className="text-xs text-gray-400 mt-1">
                  Total Responses: {fb.responses.length}
                </p>
              </div>
            ))}
        </div>
      )}

      {/* 🔹 CURRENT FEEDBACK RESULTS */}
      {responses.length === 0 ? (
        <p className="p-6 text-gray-500">No feedback submitted yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {responses.map((r, index) => {
            const avgRating = getAverageRating(r.answers);

            return (
              <div
                key={index}
                className="bg-white rounded-2xl border p-6 shadow-sm hover:shadow-md transition"
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {r.studentName}
                    </h3>
                    <p className="text-sm text-gray-500">Student Feedback</p>
                  </div>

                  <div className="flex items-center gap-2 bg-purple-50 text-purple-700 px-3 py-1 rounded-full text-sm font-medium">
                    ⭐ {avgRating ? avgRating.toFixed(1) : "N/A"} / 5
                  </div>
                </div>

                {avgRating > 0 && (
                  <div className="mb-4">{renderStars(avgRating)}</div>
                )}

                {r.comment && (
                  <div className="mt-4 border-t pt-4">
                    <p className="text-sm font-medium text-gray-700 mb-1">
                      💬 Comment
                    </p>
                    <p className="text-gray-800 leading-relaxed">
                      “{r.comment}”
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
};

export default FeedbackResults;
