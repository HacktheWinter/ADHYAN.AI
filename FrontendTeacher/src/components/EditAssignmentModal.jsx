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

  const totalMarks = questions.reduce(
    (sum, q) => sum + (Number(q?.marks) || 0),
    0
  );
  const uniqueMarks = [...new Set(questions.map((q) => Number(q?.marks) || 0))];
  const marksGuideLine =
    uniqueMarks.length === 1
      ? `• Each question is worth ${uniqueMarks[0]} marks (Total: ${totalMarks} marks)`
      : `• Marks vary by question (Total: ${totalMarks} marks)`;

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
  };  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-surface border border-line rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl font-body text-ink">
        {/* Header */}
        <div className="p-6 border-b border-line flex items-center justify-between bg-surface sticky top-0 z-10 rounded-t-2xl">
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold font-display text-ink">Edit Assignment</h2>
            <p className="text-sm text-ink-soft mt-1">
              Review and edit assignment questions and answer keys
            </p>
          </div>
          
          {/* Export Button Group */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setShowExportDropdown(!showExportDropdown)}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
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
                    <Download className="w-4 h-4 text-emerald-650" />
                    Export as Excel
                  </button>
                  <button
                    onClick={handleExportPDF}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-ink hover:bg-emerald-50 dark:hover:bg-emerald-950/20 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-rose-650" />
                    Export as PDF
                  </button>
                </div>
              )}
            </div>
            
            <button
              onClick={onClose}
              disabled={saving}
              className="text-ink-soft hover:text-ink transition-colors"
            >
              <X className="w-6 h-6 cursor-pointer" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-surface">
          {/* Title & Description */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-ink-soft uppercase tracking-wider">
                Assignment Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 border border-line bg-paper text-ink rounded-xl outline-none focus:ring-2 focus:ring-purple-500 focus:bg-surface transition-all text-sm font-semibold"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-ink-soft uppercase tracking-wider">
                Description (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add instructions or description for students..."
                className="w-full px-4 py-3 border border-line bg-paper text-ink rounded-xl outline-none focus:ring-2 focus:ring-purple-500 focus:bg-surface transition-all text-sm"
                rows="3"
              />
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-violet-50 border border-line rounded-xl p-4 text-violet-dark">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-violet-dark mt-0.5" />
              <div>
                <p className="text-sm font-bold text-violet-dark mb-1">
                  Assignment Guidelines
                </p>
                <ul className="text-sm text-violet-dark font-medium space-y-1">
                  <li>{marksGuideLine}</li>
                  <li>• Answer keys will be used by AI for evaluation</li>
                  <li>• Include alternate acceptable answers in guidelines</li>
                  <li>• Be specific but allow semantic variations</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Questions */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold font-display text-ink">
              Questions ({questions.length})
            </h3>

            {questions.map((q, idx) => (
              <div key={idx} className="bg-paper border border-line rounded-2xl p-6 space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-md font-bold font-display text-ink">
                      Question {idx + 1}
                    </h4>
                    <span className="px-3 py-1 bg-violet-50 border border-line text-violet-dark text-xs font-bold rounded-full">
                      {q.marks} marks
                    </span>
                  </div>
                  
                  <label className="block text-xs font-bold text-ink-soft uppercase tracking-wider mb-2">
                    Question Text
                  </label>
                  <textarea
                    value={q.question}
                    onChange={(e) => updateQuestion(idx, 'question', e.target.value)}
                    className="w-full px-4 py-3 border border-line bg-surface text-ink rounded-xl outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                    rows="3"
                  />
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-ink-soft uppercase tracking-wider">
                      Answer Key (Comprehensive model answer)
                    </label>
                    <textarea
                      value={q.answerKey}
                      onChange={(e) => updateQuestion(idx, 'answerKey', e.target.value)}
                      className="w-full px-4 py-3 border border-line bg-surface text-ink rounded-xl outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                      rows="8"
                      placeholder="Write a detailed model answer..."
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-ink-soft uppercase tracking-wider">
                      Answer Guidelines (Optional - for marking criteria)
                    </label>
                    <textarea
                      value={q.answerGuidelines || ''}
                      onChange={(e) => updateQuestion(idx, 'answerGuidelines', e.target.value)}
                      placeholder="e.g., 10 marks = complete answer, 8-9 = minor details missing, 6-7 = major concepts covered..."
                      className="w-full px-4 py-3 border border-line bg-surface text-ink rounded-xl outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                      rows="3"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-line bg-paper flex gap-3 sticky bottom-0 z-10 rounded-b-2xl shadow-inner">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 px-6 py-3 bg-line text-ink font-bold rounded-xl hover:bg-line/80 transition-colors disabled:opacity-50 cursor-pointer text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-6 py-3 btn-settings-blue text-sm rounded-xl font-bold disabled:opacity-50 transition-colors flex items-center justify-center gap-2 cursor-pointer"
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