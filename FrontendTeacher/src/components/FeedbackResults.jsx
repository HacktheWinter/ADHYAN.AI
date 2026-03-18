import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, MessageSquare, History, ChevronDown, Trash2 } from "lucide-react";
import API_BASE_URL from "../config";

const FeedbackResults = ({ classId }) => {
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);

  // History state
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // =======================
  // Fetch CURRENT feedback
  // =======================
  const fetchResults = async () => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/feedback/results/${classId}`,
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

  useEffect(() => {
    fetchResults();
  }, [classId]);

  // =======================
  // Fetch ALL feedbacks
  // =======================
  const fetchHistory = async () => {
    try {
      setHistoryLoading(true);

      const res = await fetch(
        `${API_BASE_URL}/feedback/results/all/${classId}`,
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

  // =======================
  // Delete Handlers
  // =======================
  const handleDeleteFeedback = async (feedbackId, e) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this entire feedback session? This cannot be undone.")) return;

    try {
      const res = await fetch(`${API_BASE_URL}/feedback/delete/${feedbackId}`, {
         method: 'DELETE',
         headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
         }
      });

      if (res.ok) {
        setHistory(prev => prev.filter(f => f._id !== feedbackId));
        // If we deleted the currently active feedback, refresh current view
        const deletedFeedback = history.find(f => f._id === feedbackId);
        if (deletedFeedback && deletedFeedback.isActive) {
           fetchResults();
        }
      } else {
        alert("Failed to delete feedback");
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting feedback");
    }
  };

  const handleDeleteResponse = async (studentId, feedbackId, e) => {
     e.stopPropagation();
     if (!window.confirm("Delete this student's response?")) return;

     // NOTE: We need the feedbackId to delete a response. 
     // Ideally, the 'responses' array we get from 'fetchResults' should include the parent feedbackId or we know it from context.
     // In 'fetchResults' endpoint (getFeedbackResults), it returns `feedback.responses`. 
     // We need to fetch the feedback OBJECT to get its ID, or the backend should return it.
     // However, for the CURRENT active feedback, we don't easily have the ID in the `responses` array unless we modify backend or store it.
     
     // WORKAROUND: For the main view (Active Feedback), we first need the Active Feedback ID.
     // Let's assume we can get it. 
     // Actually, let's fetch the Active Feedback ID first if we don't have it.
     
     // BETTER APPROACH: The `responses` array doesn't have the Feedback ID.
     // We should fetch the full feedback object in `fetchResults` not just `feedback.responses`.
     // To avoid complex refactors right now, let's just use the history endpoint logic or assume we can get it.
     
     // Wait, `fetchResults` calls `/results/:classId`. 
     // Backend: `res.json(feedback.responses);` -> It ONLY returns the array. It does NOT return the feedback ID.
     // This is a limitation. I should update the backend to return { responses, _id } or passing ID is impossible.
     
     // OR, I can use the HISTORY list to find the active one.
  };

  // REFACTORED fetchResults to get ID
  // Wait, I can't easily change the backend response structure without breaking other things potentially?
  // Let's check backend `getFeedbackResults` again. it returns `res.json(feedback.responses)`.
  // I will update the backend controller slightly to return the whole object or I will assume I can find it.
  
  // Actually, I'll update the `fetchResults` here to use the `active` endpoint which returns the ID!
  // `http://localhost:5000/api/feedback/active/:classId` returns { isActive: true, feedbackId: ... }
  
  const [activeFeedbackId, setActiveFeedbackId] = useState(null);

  useEffect(() => {
     const getActiveId = async () => {
        try {
           const res = await fetch(`${API_BASE_URL}/feedback/active/${classId}`, {
              headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
           });
           const data = await res.json();
           if (data.isActive) setActiveFeedbackId(data.feedbackId);
        } catch(e) { console.error(e); }
     };
     getActiveId();
  }, [classId]);


  const deleteActiveResponse = async (studentId) => {
      if (!activeFeedbackId) return;
      if (!window.confirm("Delete this response?")) return;

      try {
        const res = await fetch(`${API_BASE_URL}/feedback/response/${activeFeedbackId}/${studentId}`, {
           method: 'DELETE',
           headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        });

        if (res.ok) {
           setResponses(prev => prev.filter(r => r.studentId !== studentId));
        } else {
           alert("Failed to delete response");
        }
      } catch (e) {
         console.error(e);
      }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="text-gray-500 mt-4">Loading results...</p>
        </div>
      </div>
    );
  }

  // Helpers
  const getAverageRating = (answers = []) => {
    if (!Array.isArray(answers) || answers.length === 0) return 0;
    const sum = answers.reduce((acc, curr) => acc + (curr.rating || 0), 0);
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
          <Star
            key={i}
            size={16}
            className={`${
              i <= rounded
                ? "text-yellow-400 fill-yellow-400"
                : "text-gray-300"
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div>
      {/* History Toggle */}
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          Student Feedback
        </h3>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            setShowHistory(!showHistory);
            if (!showHistory) fetchHistory();
          }}
          className="flex items-center gap-2 text-sm text-purple-600 hover:text-purple-700 font-medium cursor-pointer transition"
        >
          <History size={16} />
          {showHistory ? "Hide History" : "View History"}
          <motion.div
            animate={{ rotate: showHistory ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown size={16} />
          </motion.div>
        </motion.button>
      </div>

      {/* History Section */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mb-6 space-y-3 overflow-hidden"
          >
            {historyLoading && (
              <p className="text-gray-500 text-sm">
                Loading feedback history...
              </p>
            )}

            {!historyLoading &&
              history.map((fb, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05, duration: 0.2 }}
                  whileHover={{ scale: 1.01 }}
                  className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm cursor-pointer hover:border-purple-200 transition group"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        {fb.isActive
                          ? "🟢 Current Feedback"
                          : "📋 Past Feedback"}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(fb.createdAt).toLocaleDateString()} •{" "}
                        {fb.responses.length} responses
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 bg-purple-50 text-purple-700 px-3 py-1 rounded-full text-sm font-semibold">
                        <Star size={14} className="fill-purple-700" />
                        {getRoundAverage(fb.responses)} / 5
                        </div>
                        <button 
                            onClick={(e) => handleDeleteFeedback(fb._id, e)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition opacity-0 group-hover:opacity-100"
                            title="Delete this feedback history"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                  </div>
                </motion.div>
              ))}

            {!historyLoading && history.length === 0 && (
              <p className="text-gray-500 text-sm text-center py-4">
                No feedback history available
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Current Feedback Results */}
      {responses.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="bg-white rounded-2xl border border-gray-200 p-12 text-center"
        >
          <div className="text-gray-400 mb-4">
            <Star size={48} className="mx-auto" />
          </div>
          <p className="text-gray-500 text-lg font-medium">
            No feedback submitted yet
          </p>
          <p className="text-gray-400 text-sm mt-2">
            Students will see the feedback form once you publish it
          </p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {responses.map((r, index) => {
            const avgRating = getAverageRating(r.answers);

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08, duration: 0.3 }}
                whileHover={{ scale: 1.02, y: -4 }}
                className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md hover:border-purple-200 transition cursor-pointer group relative"
              >
                {/* Delete Button for individual response */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        deleteActiveResponse(r.studentId);
                    }}
                    className="absolute top-2 right-2 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full opacity-0 group-hover:opacity-100 transition"
                    title="Delete this response"
                >
                    <Trash2 size={14} />
                </button>

                <div className="flex items-start justify-between mb-3 pr-6">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">
                      {r.studentName}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Student Feedback
                    </p>
                  </div>
                  <div className="flex items-center gap-1 bg-purple-50 text-purple-700 px-3 py-1 rounded-full text-sm font-semibold">
                    <Star size={14} className="fill-purple-700" />
                    {avgRating ? avgRating.toFixed(1) : "N/A"}
                  </div>
                </div>

                {avgRating > 0 && (
                  <div className="mb-3">{renderStars(avgRating)}</div>
                )}

                {r.comment && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare size={14} className="text-gray-400" />
                      <p className="text-xs font-medium text-gray-600">
                        Comment
                      </p>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed italic">
                      "{r.comment}"
                    </p>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FeedbackResults;