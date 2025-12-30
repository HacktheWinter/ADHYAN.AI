import React, { useState } from 'react';
import { X, Save, AlertCircle, Download, ChevronDown } from 'lucide-react';
import { updateTestPaper } from '../api/testPaperApi';
import { exportTestPaperToExcel, exportTestPaperToPDF } from '../utils/exportUtils';

export default function EditAnswerKeysModal({ testPaper, onClose, onSave }) {
  const [questions, setQuestions] = useState(testPaper.questions);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState(testPaper.title);
  const [showExportDropdown, setShowExportDropdown] = useState(false);

  const updateQuestion = (index, field, value) => {
    const updatedQuestions = [...questions];
    updatedQuestions[index] = {
      ...updatedQuestions[index],
      [field]: value
    };
    setQuestions(updatedQuestions);
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      await updateTestPaper(testPaper._id, {
        title,
        questions
      });

      alert('Answer keys updated successfully!');
      onSave();
    } catch (error) {
      console.error('Error updating:', error);
      alert('Failed to update answer keys');
    } finally {
      setSaving(false);
    }
  };

  const handleExportExcel = () => {
    const result = exportTestPaperToExcel(testPaper);
    if (result.success) {
      alert(result.message);
    } else {
      alert(result.message);
    }
    setShowExportDropdown(false);
  };

  const handleExportPDF = () => {
    const result = exportTestPaperToPDF(testPaper);
    if (result.success) {
      alert(result.message);
    } else {
      alert(result.message);
    }
    setShowExportDropdown(false);
  };

  const getQuestionsByType = (type) => {
    return questions
      .map((q, index) => ({ ...q, originalIndex: index }))
      .filter(q => q.type === type);
  };

  const shortQuestions = getQuestionsByType('short');
  const mediumQuestions = getQuestionsByType('medium');
  const longQuestions = getQuestionsByType('long');

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Edit Answer Keys</h2>
            <p className="text-sm text-gray-600 mt-1">
              Review and edit answer keys before publishing
            </p>
          </div>
          
          {/* Export Button Group */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setShowExportDropdown(!showExportDropdown)}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 cursor-pointer"
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
              onClick={onClose}
              disabled={saving}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6 cursor-pointer" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Test Paper Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
            />
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-blue-900 mb-1">
                  Important Guidelines
                </p>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Answer keys will be used by AI for checking student answers</li>
                  <li>• Include alternate acceptable answers in guidelines field</li>
                  <li>• Be specific but allow semantic variations</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Short Questions (2 marks) */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Short Answer Questions (2 marks each)
            </h3>
            <div className="space-y-4">
              {shortQuestions.map((q, idx) => (
                <div key={q.originalIndex} className="bg-gray-50 border border-gray-200 rounded-lg p-5">
                  <div className="mb-3">
                    <p className="text-sm font-semibold text-gray-700 mb-2">
                      Question {idx + 1}
                    </p>
                    <p className="text-gray-900">{q.question}</p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Answer Key (2-3 lines expected)
                      </label>
                      <textarea
                        value={q.answerKey}
                        onChange={(e) => updateQuestion(q.originalIndex, 'answerKey', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                        rows="3"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Answer Guidelines (Optional - alternate acceptable answers)
                      </label>
                      <textarea
                        value={q.answerGuidelines || ''}
                        onChange={(e) => updateQuestion(q.originalIndex, 'answerGuidelines', e.target.value)}
                        placeholder="e.g., Accept: 4 bytes, 32 bits, 4B"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                        rows="2"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Medium Questions (5 marks) */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Medium Answer Questions (5 marks each)
            </h3>
            <div className="space-y-4">
              {mediumQuestions.map((q, idx) => (
                <div key={q.originalIndex} className="bg-gray-50 border border-gray-200 rounded-lg p-5">
                  <div className="mb-3">
                    <p className="text-sm font-semibold text-gray-700 mb-2">
                      Question {shortQuestions.length + idx + 1}
                    </p>
                    <p className="text-gray-900">{q.question}</p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Answer Key (5-6 lines expected)
                      </label>
                      <textarea
                        value={q.answerKey}
                        onChange={(e) => updateQuestion(q.originalIndex, 'answerKey', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                        rows="6"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Answer Guidelines (Optional)
                      </label>
                      <textarea
                        value={q.answerGuidelines || ''}
                        onChange={(e) => updateQuestion(q.originalIndex, 'answerGuidelines', e.target.value)}
                        placeholder="e.g., Must mention: light reactions, dark reactions, chlorophyll"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                        rows="2"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Long Questions (10 marks) */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Long Answer Questions (10 marks each)
            </h3>
            <div className="space-y-4">
              {longQuestions.map((q, idx) => (
                <div key={q.originalIndex} className="bg-gray-50 border border-gray-200 rounded-lg p-5">
                  <div className="mb-3">
                    <p className="text-sm font-semibold text-gray-700 mb-2">
                      Question {shortQuestions.length + mediumQuestions.length + idx + 1}
                    </p>
                    <p className="text-gray-900">{q.question}</p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Answer Key (10-12 lines expected)
                      </label>
                      <textarea
                        value={q.answerKey}
                        onChange={(e) => updateQuestion(q.originalIndex, 'answerKey', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                        rows="12"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Answer Guidelines (Optional)
                      </label>
                      <textarea
                        value={q.answerGuidelines || ''}
                        onChange={(e) => updateQuestion(q.originalIndex, 'answerGuidelines', e.target.value)}
                        placeholder="e.g., 10 marks = all points covered, 8 marks = minor details missing, 5-7 marks = major concepts missing"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                        rows="3"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            {saving ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Save Answer Keys
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}