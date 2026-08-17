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
      .filter(q => {
        const section = q.section?.toLowerCase() || '';
        const m = Number(q.marks) || 0;
        
        // Intelligent ranges to ensure no question is lost
        if (type === 'short') {
          return (section.includes('section a') || m < 5) && !section.includes('section b') && !section.includes('section c');
        }
        if (type === 'medium') {
          return section.includes('section b') || (m >= 5 && m < 10 && !section.includes('section a') && !section.includes('section c'));
        }
        if (type === 'long') {
          return section.includes('section c') || (m >= 10 && !section.includes('section a') && !section.includes('section b'));
        }
        return false;
      });
  };

  // Helper to format question label without double prefixing
  const formatQNo = (label, defaultNo) => {
    if (!label) return `Question ${defaultNo}`;
    if (label.toLowerCase().startsWith('q')) return label;
    if (label.toLowerCase().startsWith('question')) return label;
    return `Question ${label}`;
  };

  const shortQuestions = getQuestionsByType('short');
  const mediumQuestions = getQuestionsByType('medium');
  const longQuestions = getQuestionsByType('long');

  // Calculate live total marks (only counting required questions)
  const totalMarks = questions.reduce((acc, q) => {
    if (q.isOptional) return acc;
    return acc + (Number(q.marks) || 0);
  }, 0);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-surface border border-line rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl font-body text-ink">
        {/* Header */}
        <div className="p-6 border-b border-line flex items-center justify-between bg-surface sticky top-0 z-10 rounded-t-2xl">
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold font-display text-ink">Edit Answer Keys</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-ink-soft">Review and edit answer keys before publishing</span>
              <div className="h-4 w-[1px] bg-line mx-1"></div>
              <span className="px-2 py-0.5 bg-violet-50 border border-line text-violet-dark text-xs font-bold rounded-full uppercase tracking-wider">
                {totalMarks} Marks Total
              </span>
            </div>
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
          {/* Title */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-ink-soft uppercase tracking-wider">
              Test Paper Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 border border-line bg-paper text-ink rounded-xl outline-none focus:ring-2 focus:ring-purple-500 focus:bg-surface transition-all text-sm font-semibold"
            />
          </div>

          {/* Info Box */}
          <div className="bg-violet-50 border border-line rounded-xl p-4 text-violet-dark">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-violet-dark mt-0.5" />
              <div>
                <p className="text-sm font-bold text-violet-dark mb-1">
                  Important Guidelines
                </p>
                <ul className="text-sm text-violet-dark font-medium space-y-1">
                  <li>• Answer keys will be used by AI for checking student answers</li>
                  <li>• Include alternate acceptable answers in guidelines field</li>
                  <li>• Be specific but allow semantic variations</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Section A (2 marks) */}
          {shortQuestions.length > 0 && (
            <div>
              <div className="flex items-center gap-2 bg-violet-50 p-3 rounded-xl border border-line mb-4">
                <span className="w-8 h-8 bg-violet-600 text-white rounded-full flex items-center justify-center font-bold text-sm">A</span>
                <h3 className="text-lg font-semibold font-display text-ink">
                  Section A: Short Answer Questions (2 marks each)
                </h3>
              </div>
              <div className="space-y-4">
                {shortQuestions.map((q, idx) => (
                  <div key={q.originalIndex} className="bg-paper border border-line rounded-2xl p-5 space-y-4">
                    <div>
                      <p className="text-sm font-bold text-ink-soft mb-2">
                        {formatQNo(q.choiceLabel, idx + 1)}
                        <span className="ml-2 text-[10px] uppercase text-ink-soft font-bold tracking-widest">{q.section || "Section A"}</span>
                      </p>
                      <p className="text-ink font-semibold text-base mb-2">{q.question}</p>
                    </div>
  
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-ink-soft uppercase tracking-wider">
                          Answer Key (2-3 lines expected)
                        </label>
                        <textarea
                          value={q.answerKey}
                          onChange={(e) => updateQuestion(q.originalIndex, 'answerKey', e.target.value)}
                          className="w-full px-4 py-3 border border-line bg-surface text-ink rounded-xl outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                          rows="3"
                        />
                      </div>
  
                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-ink-soft uppercase tracking-wider">
                          Answer Guidelines (Optional - alternate acceptable answers)
                        </label>
                        <textarea
                          value={q.answerGuidelines || ''}
                          onChange={(e) => updateQuestion(q.originalIndex, 'answerGuidelines', e.target.value)}
                          placeholder="e.g., Accept: 4 bytes, 32 bits, 4B"
                          className="w-full px-4 py-2 border border-line bg-surface text-ink rounded-xl outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                          rows="2"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section B (5 marks) */}
          {mediumQuestions.length > 0 && (
            <div>
              <div className="flex items-center gap-2 bg-violet-50 p-3 rounded-xl border border-line mb-4">
                <span className="w-8 h-8 bg-violet-600 text-white rounded-full flex items-center justify-center font-bold text-sm">B</span>
                <h3 className="text-lg font-semibold font-display text-ink">
                  Section B: Medium Answer Questions (5 marks each)
                </h3>
              </div>
              <div className="space-y-4">
                {mediumQuestions.map((q, idx) => (
                  <div key={q.originalIndex} className="bg-paper border border-line rounded-2xl p-5 space-y-4">
                    <div>
                      <p className="text-sm font-bold text-ink-soft mb-2">
                        {formatQNo(q.choiceLabel, idx + 1)}
                        <span className="ml-2 text-[10px] uppercase text-ink-soft font-bold tracking-widest">{q.section || "Section B"}</span>
                      </p>
                      <p className="text-ink font-semibold text-base mb-2">{q.question}</p>
                    </div>
  
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-ink-soft uppercase tracking-wider">
                          Answer Key (5-6 lines expected)
                        </label>
                        <textarea
                          value={q.answerKey}
                          onChange={(e) => updateQuestion(q.originalIndex, 'answerKey', e.target.value)}
                          className="w-full px-4 py-3 border border-line bg-surface text-ink rounded-xl outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                          rows="6"
                        />
                      </div>
  
                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-ink-soft uppercase tracking-wider">
                          Answer Guidelines (Optional)
                        </label>
                        <textarea
                          value={q.answerGuidelines || ''}
                          onChange={(e) => updateQuestion(q.originalIndex, 'answerGuidelines', e.target.value)}
                          placeholder="e.g., Must mention: light reactions, dark reactions, chlorophyll"
                          className="w-full px-4 py-2 border border-line bg-surface text-ink rounded-xl outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                          rows="2"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section C (10 marks) */}
          {longQuestions.length > 0 && (
            <div>
              <div className="flex items-center gap-2 bg-violet-50 p-3 rounded-xl border border-line mb-4">
                <span className="w-8 h-8 bg-violet-600 text-white rounded-full flex items-center justify-center font-bold text-sm">C</span>
                <h3 className="text-lg font-semibold font-display text-ink">
                  Section C: Long Answer Questions (10 marks each)
                </h3>
              </div>
              <div className="space-y-4">
                {longQuestions.map((q, idx) => (
                  <div key={q.originalIndex} className="bg-paper border border-line rounded-2xl p-5 space-y-4">
                    <div>
                      <p className="text-sm font-bold text-ink-soft mb-2">
                        {formatQNo(q.choiceLabel, idx + 1)}
                        <span className="ml-2 text-[10px] uppercase text-ink-soft font-bold tracking-widest">{q.section || "Section C"}</span>
                      </p>
                      <p className="text-ink font-semibold text-base mb-2">{q.question}</p>
                    </div>
  
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-ink-soft uppercase tracking-wider">
                          Answer Key (10-12 lines expected)
                        </label>
                        <textarea
                          value={q.answerKey}
                          onChange={(e) => updateQuestion(q.originalIndex, 'answerKey', e.target.value)}
                          className="w-full px-4 py-3 border border-line bg-surface text-ink rounded-xl outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                          rows="12"
                        />
                      </div>
  
                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-ink-soft uppercase tracking-wider">
                          Answer Guidelines (Optional)
                        </label>
                        <textarea
                          value={q.answerGuidelines || ''}
                          onChange={(e) => updateQuestion(q.originalIndex, 'answerGuidelines', e.target.value)}
                          placeholder="e.g., 10 marks = all points covered, 8 marks = minor details missing, 5-7 marks = major concepts missing"
                          className="w-full px-4 py-2 border border-line bg-surface text-ink rounded-xl outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                          rows="3"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
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
                Save Answer Keys
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}