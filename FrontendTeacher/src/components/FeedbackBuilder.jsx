import { useParams } from "react-router-dom";
import { useState } from "react";

const FeedbackBuilder = ({ classId }) => {

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
      const token = localStorage.getItem("token");

      const res = await fetch("http://localhost:5000/api/feedback/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`, // 🔥 REQUIRED
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
    } catch (err) {
      console.error(err);
      alert("❌ Error creating feedback");
    }
  };

  return (
    <div className="max-w-6xl mx-auto ">
      {/* Card */}
      <div className="bg-white rounded-2xl shadow-sm border p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">
            Teacher Evaluation Form
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Create a feedback form for students
          </p>
        </div>

        {/* Student Info (Preview) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <input
            type="text"
            placeholder="Student Name (auto-filled)"
            disabled
            className="border p-3 rounded-lg bg-gray-50"
          />
          <input
            type="email"
            placeholder="Student Email (auto-filled)"
            disabled
            className="border p-3 rounded-lg bg-gray-50"
          />
        </div>

        {/* Questions Section */}
        <div className="space-y-6 mb-10">
          {questions.map((q, index) => (
            <div
              key={q.id}
              className="relative border rounded-xl p-5 bg-gray-50"
            >
              {/* Remove */}
              <button
                onClick={() => removeQuestion(q.id)}
                className="absolute top-3 right-3 text-gray-400 hover:text-red-500"
                title="Remove question"
              >
                ✕
              </button>

              <label className="block text-sm font-medium text-gray-700 mb-2">
                Question {index + 1}
              </label>

              <input
                type="text"
                placeholder="Enter your question here"
                value={q.text}
                onChange={(e) => updateQuestionText(index, e.target.value)}
                className="border p-3 w-full rounded-lg"
              />

              {/* Rating Preview */}
              <div className="flex gap-4 mt-4 text-gray-600">
                {[1, 2, 3, 4, 5].map((r) => (
                  <span key={r} className="flex items-center gap-1 text-sm">
                    ⭐<span>{r}</span>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Add Question */}
        <button
          onClick={addQuestion}
          className="flex items-center gap-2 text-purple-600 font-medium mb-10 hover:text-purple-700"
        >
          ➕ Add Question
        </button>

        {/* Comment Toggle */}
        <div className="mb-10">
          <label className="flex items-center gap-3 text-sm font-medium text-gray-700">
            <input
              type="checkbox"
              checked={enableComment}
              onChange={() => setEnableComment(!enableComment)}
            />
            Allow students to add overall comments
          </label>

          {enableComment && (
            <textarea
              disabled
              placeholder="Students can write overall feedback here..."
              className="border mt-4 p-3 w-full rounded-lg bg-gray-50"
              rows={4}
            />
          )}
        </div>

        {/* Publish */}
        <div className="flex justify-end">
          <button
            onClick={submitFeedbackForm}
            className="bg-purple-600 text-white px-8 py-3 rounded-lg hover:bg-purple-700 transition"
          >
            🚀 Publish Feedback
          </button>
        </div>
      </div>
    </div>
  );
};

export default FeedbackBuilder;
