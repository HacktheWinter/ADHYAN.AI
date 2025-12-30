import React, { useState } from 'react';
import { X, Save, AlertCircle, Download, ChevronDown } from 'lucide-react';
import { updateAssignment } from '../api/assignmentApi';
import { exportAssignmentToExcel, exportAssignmentToPDF } from '../utils/exportUtils';

export default function EditAssignmentModal({ assignment, onClose, onSave }) {
  const [questions, setQuestions] = useState(assignment.questions);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState(assignment.title);
  const [description, setDescription] = useState(assignment.description || '');
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

      await updateAssignment(assignment._id, {
        title,
        description,
        questions
      });

      alert('Assignment updated successfully!');
      onSave();
    } catch (error) {
      console.error('Error updating:', error);
      alert('Failed to update assignment');
    } finally {
      setSaving(false);
    }
  };

  const handleExportExcel = () => {
    const result = exportAssignmentToExcel(assignment);
    if (result.success) {
      alert(result.message);
    } else {
      alert(result.message);
    }
    setShowExportDropdown(false);
  };

  const handleExportPDF = () => {
    const result = exportAssignmentToPDF(assignment);
    if (result.success) {
      alert(result.message);
    } else {
      alert(result.message);
    }
    setShowExportDropdown(false);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Edit Assignment</h2>
            <p className="text-sm text-gray-600 mt-1">
              Review and edit assignment questions and answer keys
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
          {/* Title & Description */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Assignment Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Description (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add instructions or description for students..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                rows="3"
              />
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-blue-900 mb-1">
                  Assignment Guidelines
                </p>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Each question is worth 10 marks (Total: 50 marks)</li>
                  <li>• Answer keys will be used by AI for evaluation</li>
                  <li>• Include alternate acceptable answers in guidelines</li>
                  <li>• Be specific but allow semantic variations</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Questions */}
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-gray-900">
              Questions ({questions.length})
            </h3>

            {questions.map((q, idx) => (
              <div key={idx} className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-200 rounded-lg p-6">
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-md font-semibold text-gray-900">
                      Question {idx + 1}
                    </h4>
                    <span className="px-3 py-1 bg-indigo-100 text-indigo-800 text-sm font-semibold rounded-full">
                      {q.marks} marks
                    </span>
                  </div>
                  
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Question Text
                  </label>
                  <textarea
                    value={q.question}
                    onChange={(e) => updateQuestion(idx, 'question', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    rows="3"
                  />
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Answer Key (Comprehensive model answer)
                    </label>
                    <textarea
                      value={q.answerKey}
                      onChange={(e) => updateQuestion(idx, 'answerKey', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                      rows="8"
                      placeholder="Write a detailed model answer..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Answer Guidelines (Optional - for marking criteria)
                    </label>
                    <textarea
                      value={q.answerGuidelines || ''}
                      onChange={(e) => updateQuestion(idx, 'answerGuidelines', e.target.value)}
                      placeholder="e.g., 10 marks = complete answer, 8-9 = minor details missing, 6-7 = major concepts covered..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                      rows="3"
                    />
                  </div>
                </div>
              </div>
            ))}
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
            className="flex-1 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            {saving ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}