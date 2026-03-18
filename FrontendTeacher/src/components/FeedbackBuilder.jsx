import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Star, Send, ClipboardList } from "lucide-react";
import API_BASE_URL from "../config";

const FeedbackBuilder = ({ classId, onClose, onSuccess }) => {
  const [questions, setQuestions] = useState([]);
  const [enableComment, setEnableComment] = useState(false);

  const addQuestion = () => {
    setQuestions([...questions, { id: Date.now(), text: "" }]);
  };

  const updateQuestionText = (index, value) => {
    const updated = [...questions];
    updated[index].text = value;
    setQuestions(updated);
  };

  const removeQuestion = (id) => {
    setQuestions(questions.filter((q) => q.id !== id));
  };

  const submitFeedbackForm = async () => {
    if (questions.length === 0) {
      alert("Please add at least one question");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      alert("Authentication required. Please login again.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/feedback/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          classId,
          questions,
          enableComment,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create feedback");
      }

      alert("✅ Feedback published successfully!");
      setQuestions([]);
      setEnableComment(false);
      onSuccess?.();
    } catch (err) {
      console.error(err);
      alert("❌ Error creating feedback");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.98 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.98 }}
        transition={{ duration: 0.15 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gray-50 border-b border-gray-200 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <ClipboardList size={22} className="text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                New Feedback Form
              </h2>
              <p className="text-gray-500 text-sm mt-0.5">
                Create evaluation questions for students
              </p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 p-2 rounded-lg cursor-pointer transition-all"
            title="Close"
          >
            <X size={20} />
          </motion.button>
        </div>

        {/* Content - Hidden Scrollbar */}
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-180px)] scrollbar-hide">
          <style jsx>{`
            .scrollbar-hide::-webkit-scrollbar {
              display: none;
            }
            .scrollbar-hide {
              -ms-overflow-style: none;
              scrollbar-width: none;
            }
          `}</style>

          {/* Questions */}
          <div className="space-y-4 mb-5">
            {questions.map((q, index) => (
              <div
                key={q.id}
                className="relative bg-white border-2 border-gray-200 rounded-xl p-5 hover:border-purple-300 transition-colors duration-200"
              >
                <button
                  onClick={() => removeQuestion(q.id)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg cursor-pointer transition"
                  title="Remove question"
                >
                  <X size={18} />
                </button>

                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-sm font-semibold">
                    {index + 1}
                  </div>
                  <label className="text-sm font-semibold text-gray-700">
                    Question {index + 1}
                  </label>
                </div>

                <input
                  type="text"
                  placeholder="Type your question here..."
                  value={q.text}
                  onChange={(e) => updateQuestionText(index, e.target.value)}
                  className="border-2 border-gray-200 px-4 py-3 w-full rounded-lg text-sm focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition"
                />

                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100">
                  <span className="text-xs font-medium text-gray-500">Rating Scale:</span>
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4, 5].map((r) => (
                      <div
                        key={r}
                        className="flex items-center gap-1 px-2 py-1 bg-gray-50 rounded-md"
                      >
                        <Star size={12} className="text-amber-400 fill-amber-400" />
                        <span className="text-xs font-medium text-gray-600">{r}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add Question Button - Improved */}
          <button
            onClick={addQuestion}
            className="w-full border-2 border-dashed border-gray-300 hover:border-purple-400 hover:bg-purple-50 rounded-xl py-4 flex items-center justify-center gap-2 text-gray-600 hover:text-purple-600 font-medium text-sm cursor-pointer transition-all duration-200 group mb-6"
          >
            <div className="w-8 h-8 rounded-lg bg-gray-100 group-hover:bg-purple-100 flex items-center justify-center transition-colors duration-200">
              <Plus size={20} className="text-gray-600 group-hover:text-purple-600 transition-colors duration-200" />
            </div>
            <span>Add New Question</span>
          </button>



          {/* Comment Toggle - Improved UI */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-3">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={enableComment}
                    onChange={() => setEnableComment(!enableComment)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600 cursor-pointer"></div>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700">
                    Allow Overall Comments
                  </span>
                  <p className="text-xs text-gray-500">
                    Students can add additional feedback
                  </p>
                </div>
              </label>
            </div>

            {enableComment && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium text-gray-600">Preview:</span>
                </div>
                <textarea
                  disabled
                  placeholder="Students will see this comment box..."
                  className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg text-gray-500 resize-none"
                  rows={3}
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg text-gray-600 hover:bg-gray-100 transition text-sm font-medium cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={submitFeedbackForm}
            className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition flex items-center gap-2 text-sm font-medium cursor-pointer"
          >
            <Send size={16} />
            Publish
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default FeedbackBuilder;