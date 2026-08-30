import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Star, Send, ClipboardList } from "lucide-react";
import API_BASE_URL from "../config";
import { getStoredToken } from "../utils/authStorage";

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

    const token = getStoredToken();
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
        className="bg-surface rounded-2xl border border-line shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-paper border-b border-line px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <ClipboardList size={22} className="text-violet-700" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-ink font-display">
                New Feedback Form
              </h2>
              <p className="text-ink-soft text-sm mt-0.5">
                Create evaluation questions for students
              </p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClose}
            className="text-ink-soft hover:text-ink p-2 rounded-lg cursor-pointer transition-all"
            title="Close"
          >
            <X size={20} />
          </motion.button>
        </div>

        {/* Content - Hidden Scrollbar */}
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-180px)] scrollbar-hide">
          <style>{`
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
                className="relative bg-surface border border-line rounded-2xl p-5 hover:border-violet-300 transition-colors duration-200"
              >
                <button
                  onClick={() => removeQuestion(q.id)}
                  className="absolute top-4 right-4 text-ink-soft hover:text-error hover:bg-error/10 p-1.5 rounded-lg cursor-pointer transition"
                  title="Remove question"
                >
                  <X size={18} />
                </button>

                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-full bg-violet-500/10 text-violet-700 dark:text-violet-400 flex items-center justify-center text-sm font-bold">
                    {index + 1}
                  </div>
                  <label className="text-sm font-semibold text-ink">
                    Question {index + 1}
                  </label>
                </div>

                <input
                  type="text"
                  placeholder="Type your question here..."
                  value={q.text}
                  onChange={(e) => updateQuestionText(index, e.target.value)}
                  className="border border-line bg-paper text-ink px-4 py-3 w-full rounded-xl text-sm focus:outline-none focus:bg-surface focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                />

                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-line">
                  <span className="text-xs font-semibold text-ink-soft">Rating Scale:</span>
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4, 5].map((r) => (
                      <div
                        key={r}
                        className="flex items-center gap-1 px-2 py-1 bg-paper border border-line/45 rounded-md"
                      >
                        <Star size={12} className="text-yellow-500 fill-yellow-500" />
                        <span className="text-xs font-semibold text-ink-soft">{r}</span>
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
            className="w-full border-2 border-dashed border-line hover:border-violet-400 hover:bg-violet-500/10 rounded-2xl py-4 flex items-center justify-center gap-2 text-ink-soft hover:text-violet-700 font-semibold text-sm cursor-pointer transition-all duration-200 group mb-6"
          >
            <div className="w-8 h-8 rounded-lg bg-paper group-hover:bg-violet-500/20 flex items-center justify-center transition-colors duration-200">
              <Plus size={20} className="text-ink-soft group-hover:text-violet-700 transition-colors duration-200" />
            </div>
            <span>Add New Question</span>
          </button>



          {/* Comment Toggle - Improved UI */}
          <div className="border-t border-line pt-4">
            <div className="flex items-center justify-between mb-3">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={enableComment}
                    onChange={() => setEnableComment(!enableComment)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-line peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-violet-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-700 cursor-pointer"></div>
                </div>
                <div>
                  <span className="text-sm font-semibold text-ink">
                    Allow Overall Comments
                  </span>
                  <p className="text-xs text-ink-soft">
                    Students can add additional feedback
                  </p>
                </div>
              </label>
            </div>

            {enableComment && (
              <div className="bg-paper border border-line rounded-xl p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold text-ink-soft">Preview:</span>
                </div>
                <textarea
                  disabled
                  placeholder="Students will see this comment box..."
                  className="w-full px-3 py-2 text-sm bg-surface border border-line rounded-xl text-ink-soft/40 resize-none"
                  rows={3}
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-line px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-ink hover:bg-paper-hover transition text-sm font-semibold cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={submitFeedbackForm}
            className="bg-violet-700 hover:bg-violet-800 text-white dark:bg-violet-950/40 dark:text-violet-300 border border-transparent dark:border-violet-700/60 dark:hover:border-violet-500 dark:hover:bg-violet-950/80 px-6 py-2 rounded-xl transition flex items-center gap-2 text-sm font-bold cursor-pointer shadow-sm"
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
