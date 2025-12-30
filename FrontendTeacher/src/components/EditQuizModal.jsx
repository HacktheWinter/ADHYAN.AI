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
      <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-2xl font-bold text-gray-900">Edit Quiz</h3>
          
          {/* Export Button Group */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setShowExportDropdown(!showExportDropdown)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Export</span>
                <ChevronDown className="w-4 h-4" />
              </button>
              
              {/* Dropdown Menu */}
              {showExportDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
                  <button
                    onClick={handleExportExcel}
                    className="w-full flex items-center gap-3 px-4 py-2 text-left text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    Export as Excel
                  </button>
                  <button
                    onClick={handleExportPDF}
                    className="w-full flex items-center gap-3 px-4 py-2 text-left text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    Export as PDF
                  </button>
                </div>
              )}
            </div>
            
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6 cursor-pointer" />
            </button>
          </div>
        </div>

        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          {/* Quiz Title */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Quiz Title
            </label>
            <input
              type="text"
              value={editingQuiz.title}
              onChange={(e) => updateQuizTitle(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
              placeholder="Enter quiz title"
            />
          </div>

          {/* Questions */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold text-gray-900">
                Questions ({editingQuiz.questions.length})
              </h4>
              <button
                onClick={addQuestion}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Add Question
              </button>
            </div>

            {editingQuiz.questions.map((q, qIndex) => (
              <div
                key={qIndex}
                className="p-6 border border-gray-200 rounded-lg space-y-4 bg-gray-50"
              >
                <div className="flex items-start justify-between">
                  <h5 className="text-md font-semibold text-gray-900">
                    Question {qIndex + 1}
                  </h5>
                  <button
                    onClick={() => removeQuestion(qIndex)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Minus className="w-5 h-5" />
                  </button>
                </div>

                {/* Question Text */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Question
                  </label>
                  <textarea
                    value={q.question}
                    onChange={(e) =>
                      updateQuestion(qIndex, "question", e.target.value)
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                    rows="3"
                    placeholder="Enter question"
                  />
                </div>

                {/* Options */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Options
                  </label>
                  {q.options.map((option, optIndex) => (
                    <div key={optIndex} className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-gray-600 w-8">
                        {String.fromCharCode(65 + optIndex)}.
                      </span>
                      <input
                        type="text"
                        value={option}
                        onChange={(e) =>
                          updateOption(qIndex, optIndex, e.target.value)
                        }
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                        placeholder={`Option ${String.fromCharCode(
                          65 + optIndex
                        )}`}
                      />
                    </div>
                  ))}
                </div>

                {/* Correct Answer */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
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

        <div className="p-6 border-t border-gray-200 flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 cursor-pointer"
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