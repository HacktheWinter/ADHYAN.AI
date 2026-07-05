import React, { useState } from 'react';
import { X, Calendar, AlertCircle, CheckCircle } from 'lucide-react';
import { publishAssignment } from '../api/assignmentApi';

export default function PublishAssignmentModal({ assignment, onClose, onPublished }) {
  const [dueDate, setDueDate] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);

  const handlePublish = async () => {
    try {
      setIsPublishing(true);

      await publishAssignment(assignment._id, dueDate || null);

      alert('Assignment published successfully!');
      onPublished();
    } catch (error) {
      console.error('Publish error:', error);
      alert(error.response?.data?.error || 'Failed to publish assignment');
    } finally {
      setIsPublishing(false);
    }
  };

  const getMinDateTime = () => {
    const now = new Date();
    now.setHours(now.getHours() + 1);
    return now.toISOString().slice(0, 16);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-surface border border-line rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col shadow-2xl font-body text-ink">
        {/* Header */}
        <div className="p-6 border-b border-line sticky top-0 bg-surface z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl font-semibold font-display text-ink">Publish Assignment</h2>
              <p className="text-ink-soft text-sm mt-1">{assignment.title}</p>
            </div>
            <button
              onClick={onClose}
              disabled={isPublishing}
              className="text-ink-soft hover:text-ink disabled:opacity-50"
            >
              <X className="w-6 h-6 cursor-pointer" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 flex-1 bg-surface">
          {/* Assignment Info */}
          <div className="bg-violet-50 rounded-xl p-4 border border-line">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-5 h-5 text-violet-dark" />
              <span className="font-bold text-violet-dark">
                Assignment Information
              </span>
            </div>
            <p className="text-sm text-violet-dark font-medium">
              {assignment.questions?.length || 0} questions • {assignment.totalMarks} marks total
            </p>
          </div>

          {/* Due Date Selection */}
          <div>
            <label className="block text-xs font-bold text-ink-soft uppercase tracking-wider mb-3">
              Set Due Date (Optional)
            </label>

            <div className="space-y-3">
              <label
                className="flex items-start gap-3 p-4 border border-line rounded-xl cursor-pointer transition-all bg-surface hover:border-purple-300"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="w-5 h-5 text-purple-600 dark:text-[#A78BFA]" />
                    <span className="font-bold text-ink">
                      Set Due Date
                    </span>
                  </div>
                  <p className="text-sm text-ink-soft mb-3">
                    Students must submit before this date
                  </p>

                  <div>
                    <input
                      type="datetime-local"
                      min={getMinDateTime()}
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full px-3 py-2 border border-line bg-paper text-ink rounded-xl outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Warning */}
          <div className="bg-amber-50 border border-amber-250 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-amber-900 mb-1">
                  Important Note
                </p>
                <p className="text-sm text-amber-800">
                  Once published, students will be able to see and attempt this assignment. 
                  Answer keys will be used for AI-powered evaluation of submissions.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-line bg-paper sticky bottom-0 flex gap-3 rounded-b-2xl">
          <button
            onClick={onClose}
            disabled={isPublishing}
            className="flex-1 px-6 py-3 bg-line text-ink font-bold rounded-xl hover:bg-line/80 transition-colors disabled:opacity-50 cursor-pointer text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handlePublish}
            disabled={isPublishing}
            className="flex-1 px-6 py-3 btn-settings-blue text-sm rounded-xl font-bold disabled:opacity-50 transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            {isPublishing ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Publishing...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                Publish Assignment
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}