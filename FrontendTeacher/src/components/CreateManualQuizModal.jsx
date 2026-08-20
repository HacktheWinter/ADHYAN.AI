import React, { useState } from "react";
import { X, Plus, Trash2, Save } from "lucide-react";
import { motion } from "framer-motion";
import axios from "axios";
import API_BASE_URL from "../config";

const CreateManualQuizModal = ({ classId, onClose, onCreated }) => {
  const [title, setTitle] = useState("");
  const [marksPerQuestion, setMarksPerQuestion] = useState(1);
  const [difficulty, setDifficulty] = useState("mixed");
  const [questions, setQuestions] = useState([
    { question: "", options: ["", "", "", ""], correctOptionIndex: null }
  ]);
  const [isSaving, setIsSaving] = useState(false);

  const handleAddQuestion = () => {
    setQuestions([
      ...questions,
      { question: "", options: ["", "", "", ""], correctOptionIndex: null }
    ]);
  };

  const handleRemoveQuestion = (index) => {
    if (questions.length > 1) {
      setQuestions(questions.filter((_, i) => i !== index));
    }
  };

  const handleQuestionChange = (index, field, value) => {
    const updated = [...questions];
    updated[index][field] = value;
    setQuestions(updated);
  };

  const handleOptionChange = (qIndex, optIndex, value) => {
    const updated = [...questions];
    updated[qIndex].options[optIndex] = value;
    setQuestions(updated);
  };

  const handleSetCorrectAnswer = (qIndex, optIndex) => {
    const updated = [...questions];
    updated[qIndex].correctOptionIndex = optIndex;
    setQuestions(updated);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      alert("Please enter a title");
      return;
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question.trim()) {
        alert(`Question ${i + 1} is empty`);
        return;
      }
      if (q.options.some(opt => !opt.trim())) {
        alert(`Question ${i + 1} has empty options`);
        return;
      }
      if (q.correctOptionIndex === null) {
        alert(`Please select a correct answer for Question ${i + 1}`);
        return;
      }
    }

    // Map correctOptionIndex back to correctAnswer string for the backend
    const mappedQuestions = questions.map(q => ({
      question: q.question,
      options: q.options,
      correctAnswer: q.options[q.correctOptionIndex]
    }));

    try {
      setIsSaving(true);
      const res = await axios.post(
        `${API_BASE_URL}/quiz/create-manual`,
        {
          classroomId: classId,
          title,
          questions: mappedQuestions,
          marksPerQuestion,
          difficulty
        },
        { withCredentials: true }
      );
      
      onCreated(res.data.quiz);
    } catch (error) {
      console.error("Failed to create quiz", error);
      alert(error.response?.data?.error || "Failed to create quiz");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-surface border border-line rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl font-body text-ink">
        <div className="p-6 border-b border-line flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-semibold font-display text-ink">
              Create Quiz Manually
            </h3>
            <p className="text-sm text-ink-soft mt-1">
              Add your own multiple choice questions
            </p>
          </div>
          <button onClick={onClose} disabled={isSaving} className="text-ink-soft hover:text-ink">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-3">
              <label className="block text-sm font-bold text-ink mb-1">Quiz Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Chapter 1 Physics Test"
                className="w-full px-4 py-2 border border-line rounded-xl bg-paper focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-ink mb-1">Marks per Question</label>
              <input
                type="number"
                min="1"
                value={marksPerQuestion}
                onChange={(e) => setMarksPerQuestion(Number(e.target.value))}
                className="w-full px-4 py-2 border border-line rounded-xl bg-paper focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-ink mb-1">Difficulty</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full px-4 py-2 border border-line rounded-xl bg-paper focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
                <option value="mixed">Mixed</option>
              </select>
            </div>
          </div>

          <div className="space-y-6">
            {questions.map((q, qIndex) => (
              <div key={qIndex} className="p-4 border border-line rounded-xl bg-paper relative">
                <div className="flex justify-between items-start mb-4">
                  <h4 className="font-bold">Question {qIndex + 1}</h4>
                  {questions.length > 1 && (
                    <button onClick={() => handleRemoveQuestion(qIndex)} className="text-rose-500 hover:text-rose-700">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
                
                <textarea
                  value={q.question}
                  onChange={(e) => handleQuestionChange(qIndex, "question", e.target.value)}
                  placeholder="Enter question text..."
                  className="w-full px-4 py-2 mb-4 border border-line rounded-xl bg-surface focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-20"
                />

                <div className="space-y-3">
                  <p className="text-xs font-bold text-violet-dark uppercase tracking-wider mb-2">
                    Options (Select the correct one via radio button)
                  </p>
                  {q.options.map((opt, optIndex) => (
                    <div key={optIndex} className={`flex items-center gap-3 p-2 rounded-xl transition-colors ${q.correctOptionIndex === optIndex ? 'bg-violet-50 border border-violet-200' : 'border border-transparent'}`}>
                      <input
                        type="radio"
                        name={`correct-${qIndex}`}
                        checked={q.correctOptionIndex === optIndex}
                        onChange={() => handleSetCorrectAnswer(qIndex, optIndex)}
                        className="w-4 h-4 text-violet-600 focus:ring-violet-500 cursor-pointer"
                        title="Mark as correct answer"
                      />
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => handleOptionChange(qIndex, optIndex, e.target.value)}
                        placeholder={`Option ${String.fromCharCode(65 + optIndex)}`}
                        className={`flex-1 px-4 py-2 border rounded-xl bg-surface focus:ring-2 outline-none transition-colors ${q.correctOptionIndex === optIndex ? 'border-violet-300 focus:ring-violet-500 bg-white' : 'border-line focus:ring-indigo-500'}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={handleAddQuestion}
            className="w-full py-3 border-2 border-dashed border-line text-ink font-bold rounded-xl hover:bg-line/20 transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Another Question
          </button>
        </div>

        <div className="p-6 border-t border-line flex gap-3">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="flex-1 py-3 bg-line text-ink font-bold rounded-xl hover:bg-line/80 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {isSaving ? "Saving..." : <><Save className="w-5 h-5" /> Save Quiz</>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateManualQuizModal;
