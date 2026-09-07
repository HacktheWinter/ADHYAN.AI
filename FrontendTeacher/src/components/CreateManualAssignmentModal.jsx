import React, { useState } from "react";
import { X, Plus, Trash2, Save } from "lucide-react";
import axios from "axios";
import API_BASE_URL from "../config";

const CreateManualAssignmentModal = ({ classId, onClose, onCreated, showToast }) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [marksPerQuestion, setMarksPerQuestion] = useState(2);
  const [difficulty, setDifficulty] = useState("mixed");
  const [dueDate, setDueDate] = useState("");
  const [questions, setQuestions] = useState([
    { question: "", answerKey: "", answerGuidelines: "" }
  ]);
  const [isSaving, setIsSaving] = useState(false);

  const handleAddQuestion = () => {
    setQuestions([
      ...questions,
      { question: "", answerKey: "", answerGuidelines: "" }
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

  const handleSave = async () => {
    if (!title.trim()) {
      showToast("Please enter a title", 'error');
      return;
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question.trim()) {
        showToast(`Question ${i + 1} text is empty`, 'error');
        return;
      }
      if (!q.answerKey.trim()) {
        showToast(`Question ${i + 1} answer key is empty`, 'error');
        return;
      }
    }

    try {
      setIsSaving(true);
      const res = await axios.post(
        `${API_BASE_URL}/assignment/create-manual`,
        {
          classroomId: classId,
          title,
          description,
          questions,
          marksPerQuestion,
          difficulty,
          dueDate: dueDate || null
        },
        { withCredentials: true }
      );
      
      onCreated(res.data.assignment);
    } catch (error) {
      console.error("Failed to create assignment", error);
      showToast(error.response?.data?.error || "Failed to create assignment", 'error');
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
              Create Assignment Manually
            </h3>
            <p className="text-sm text-ink-soft mt-1">
              Add descriptive questions and answer keys
            </p>
          </div>
          <button onClick={onClose} disabled={isSaving} className="text-ink-soft hover:text-ink">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="sm:col-span-2 lg:col-span-4">
              <label className="block text-sm font-bold text-ink mb-1">Assignment Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Chapter 1 Review"
                className="w-full px-4 py-2 border border-line rounded-xl bg-paper focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            
            <div className="sm:col-span-2 lg:col-span-4">
              <label className="block text-sm font-bold text-ink mb-1">Description (Optional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description for students..."
                className="w-full px-4 py-2 border border-line rounded-xl bg-paper focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-16"
              />
            </div>
            
            <div className="sm:col-span-2 lg:col-span-1">
              <label className="block text-sm font-bold text-ink mb-1">Marks per Question</label>
              <input
                type="number"
                min="1"
                value={marksPerQuestion}
                onChange={(e) => setMarksPerQuestion(Number(e.target.value))}
                className="w-full px-4 py-2 border border-line rounded-xl bg-paper focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            
            <div className="sm:col-span-2 lg:col-span-1">
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

            <div className="sm:col-span-2 lg:col-span-2">
              <label className="block text-sm font-bold text-ink mb-1">Due Date (Optional)</label>
              <input
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-4 py-2 border border-line rounded-xl bg-paper focus:ring-2 focus:ring-indigo-500 outline-none"
              />
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
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-ink-soft uppercase mb-1">Question Text</label>
                    <textarea
                      value={q.question}
                      onChange={(e) => handleQuestionChange(qIndex, "question", e.target.value)}
                      placeholder="Enter question text..."
                      className="w-full px-4 py-2 border border-line rounded-xl bg-surface focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-16"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold text-ink-soft uppercase mb-1">Detailed Answer Key</label>
                    <textarea
                      value={q.answerKey}
                      onChange={(e) => handleQuestionChange(qIndex, "answerKey", e.target.value)}
                      placeholder="Enter the correct answer for evaluation..."
                      className="w-full px-4 py-2 border border-line rounded-xl bg-surface focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-24"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-ink-soft uppercase mb-1">Guidelines (Short, Optional)</label>
                    <input
                      type="text"
                      value={q.answerGuidelines}
                      onChange={(e) => handleQuestionChange(qIndex, "answerGuidelines", e.target.value)}
                      placeholder="e.g. Needs diagrams, Check formula"
                      className="w-full px-4 py-2 border border-line rounded-xl bg-surface focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
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
            {isSaving ? "Saving..." : <><Save className="w-5 h-5" /> Save Assignment</>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateManualAssignmentModal;
