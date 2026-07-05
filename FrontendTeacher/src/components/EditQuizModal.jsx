import React, { useState } from "react";
import {
  X,
  Plus,
  Minus,
  Save,
  Download,
  ChevronDown,
} from "lucide-react";
import { exportQuizToExcel, exportQuizToPDF } from '../utils/exportUtils';

const EditQuizModal = ({ quiz, onClose, onSave }) => {
  const [editingQuiz, setEditingQuiz] = useState({ ...quiz });
  const [showExportDropdown, setShowExportDropdown] = useState(false);

  const updateQuizTitle = (value) =>
    setEditingQuiz({ ...editingQuiz, title: value });

  const updateQuestion = (qIndex, field, value) => {
    const updatedQuestions = [...editingQuiz.questions];
    updatedQuestions[qIndex] = { ...updatedQuestions[qIndex], [field]: value };
    setEditingQuiz({ ...editingQuiz, questions: updatedQuestions });
  };

  const updateOption = (qIndex, optIndex, value) => {
    const updatedQuestions = [...editingQuiz.questions];
    const updatedOptions = [...updatedQuestions[qIndex].options];
    updatedOptions[optIndex] = value;
    updatedQuestions[qIndex] = {
      ...updatedQuestions[qIndex],
      options: updatedOptions,
    };
    setEditingQuiz({ ...editingQuiz, questions: updatedQuestions });
  };

  const addQuestion = () => {
    const newQuestion = {
      question: "",
      options: ["", "", "", ""],
      correctAnswer: "",
    };
    setEditingQuiz({
      ...editingQuiz,
      questions: [...editingQuiz.questions, newQuestion],
    });
  };

  const removeQuestion = (qIndex) => {
    if (editingQuiz.questions.length <= 1) {
      alert("Quiz must have at least one question");
      return;
    }
    const updatedQuestions = editingQuiz.questions.filter(
      (_, i) => i !== qIndex
    );
    setEditingQuiz({ ...editingQuiz, questions: updatedQuestions });
  };

  const handleExportExcel = () => {
    const result = exportQuizToExcel(editingQuiz);
    if (result.success) {
      alert(result.message);
    } else {
      alert(result.message);
    }
    setShowExportDropdown(false);
  };

  const handleExportPDF = () => {
    const result = exportQuizToPDF(editingQuiz);
    if (result.success) {
      alert(result.message);
    } else {
      alert(result.message);
    }
    setShowExportDropdown(false);
  };

  const handleSave = () => {
    onSave(editingQuiz);
  };

  const handleClose = () => {
    setShowExportDropdown(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-surface border border-line rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl font-body text-ink">
        <div className="p-6 border-b border-line flex items-center justify-between bg-surface sticky top-0 z-10 rounded-t-2xl">
          <h3 className="text-xl sm:text-2xl font-semibold font-display text-ink">Edit Quiz</h3>
          
          {/* Export Button Group */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setShowExportDropdown(!showExportDropdown)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-colors cursor-pointer shadow-sm"
              >
                <Download className="w-4 h-4" />
                <span>Export</span>
                <ChevronDown className="w-4 h-4" />
              </button>
              
              {/* Dropdown Menu */}
              {showExportDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-surface rounded-xl shadow-xl border border-line py-2 z-50 overflow-hidden">
                  <button
                    onClick={handleExportExcel}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-ink hover:bg-emerald-50 dark:hover:bg-emerald-950/20 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-emerald-600" />
                    Export as Excel
                  </button>
                  <button
                    onClick={handleExportPDF}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-ink hover:bg-emerald-50 dark:hover:bg-emerald-950/20 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-red-650" />
                    Export as PDF
                  </button>
                </div>
              )}
            </div>
            
            <button
              onClick={handleClose}
              className="text-ink-soft hover:text-ink transition-colors"
            >
              <X className="w-6 h-6 cursor-pointer" />
            </button>
          </div>
        </div>

        <div className="p-6 flex-1 overflow-y-auto space-y-6 bg-surface">
          {/* Quiz Title */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-ink-soft uppercase tracking-wider">
              Quiz Title
            </label>
            <input
              type="text"
              value={editingQuiz.title}
              onChange={(e) => updateQuizTitle(e.target.value)}
              className="w-full px-4 py-3 border border-line bg-paper text-ink rounded-xl outline-none focus:ring-2 focus:ring-purple-500 focus:bg-surface transition-all text-sm font-semibold"
              placeholder="Enter quiz title"
            />
          </div>

          {/* Questions */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold font-display text-ink">
                Questions ({editingQuiz.questions.length})
              </h4>
              <button
                onClick={addQuestion}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-colors cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Add Question
              </button>
            </div>

            {editingQuiz.questions.map((q, qIndex) => (
              <div
                key={qIndex}
                className="p-6 border border-line rounded-2xl space-y-4 bg-paper"
              >
                <div className="flex items-start justify-between">
                  <h5 className="text-md font-bold font-display text-ink">
                    Question {qIndex + 1}
                  </h5>
                  <button
                    onClick={() => removeQuestion(qIndex)}
                    className="text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-955/20 p-2 rounded-xl transition-colors cursor-pointer"
                  >
                    <Minus className="w-5 h-5" />
                  </button>
                </div>

                {/* Question Text */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-ink-soft uppercase tracking-wider">
                    Question
                  </label>
                  <textarea
                    value={q.question}
                    onChange={(e) =>
                      updateQuestion(qIndex, "question", e.target.value)
                    }
                    className="w-full px-4 py-3 border border-line bg-surface text-ink rounded-xl outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                    rows="3"
                    placeholder="Enter question"
                  />
                </div>

                {/* Options */}
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-ink-soft uppercase tracking-wider">
                    Options
                  </label>
                  {q.options.map((option, optIndex) => (
                    <div key={optIndex} className="flex items-center gap-3">
                      <span className="text-sm font-bold text-ink-soft w-8 text-right">
                        {String.fromCharCode(65 + optIndex)}.
                      </span>
                      <input
                        type="text"
                        value={option}
                        onChange={(e) =>
                          updateOption(qIndex, optIndex, e.target.value)
                        }
                        className="flex-1 px-4 py-2 border border-line bg-surface text-ink rounded-xl outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                        placeholder={`Option ${String.fromCharCode(
                          65 + optIndex
                        )}`}
                      />
                    </div>
                  ))}
                </div>

                {/* Correct Answer */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-ink-soft uppercase tracking-wider">
                    Correct Answer
                  </label>
                  <select
                    value={q.correctAnswer}
                    onChange={(e) =>
                      updateQuestion(
                        qIndex,
                        "correctAnswer",
                        e.target.value
                      )
                    }
                    className="w-full px-4 py-2 border border-line bg-surface text-ink rounded-xl outline-none focus:ring-2 focus:ring-purple-500 text-sm cursor-pointer"
                  >
                    <option value="">Select correct answer</option>
                    {q.options.map((option, optIndex) => (
                      <option key={optIndex} value={option}>
                        {String.fromCharCode(65 + optIndex)}. {option}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 border-t border-line bg-paper flex gap-3 sticky bottom-0 z-10 rounded-b-2xl shadow-inner">
          <button
            onClick={handleClose}
            className="flex-1 px-6 py-3 bg-line text-ink font-bold rounded-xl hover:bg-line/80 transition-colors cursor-pointer text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-6 py-3 btn-settings-blue text-sm rounded-xl font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Save className="w-5 h-5" />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditQuizModal;