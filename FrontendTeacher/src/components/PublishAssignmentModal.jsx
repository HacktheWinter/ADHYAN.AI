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

      alert('✅ Assignment published successfully!');
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
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Publish Assignment</h2>
              <p className="text-gray-600 mt-1">{assignment.title}</p>
            </div>
            <button
              onClick={onClose}
              disabled={isPublishing}
              className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
            >
              <X className="w-6 h-6 cursor-pointer" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 flex-1">
          {/* Assignment Info */}
          <div className="bg-indigo-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-5 h-5 text-indigo-600" />
              <span className="font-semibold text-indigo-900">
                Assignment Information
              </span>
            </div>
            <p className="text-sm text-indigo-800">
              {assignment.questions?.length || 0} questions • {assignment.totalMarks} marks total
            </p>
          </div>

          {/* Due Date Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Set Due Date (Optional)
            </label>

            <div className="space-y-3">
              <label
                className="flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all border-gray-200 hover:border-gray-300"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="w-5 h-5 text-indigo-600" />
                    <span className="font-semibold text-gray-900">
                      Set Due Date
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    Students must submit before this date
                  </p>

                  <div>
                    <input
                      type="datetime-local"
                      min={getMinDateTime()}
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    />
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Warning */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-yellow-900 mb-1">
                  Important Note
                </p>
                <p className="text-sm text-yellow-800">
                  Once published, students will be able to see and attempt this assignment. 
                  Answer keys will be used for AI-powered evaluation of submissions.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-white sticky bottom-0 flex gap-3">
          <button
            onClick={onClose}
            disabled={isPublishing}
            className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 disabled:opacity-50 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handlePublish}
            disabled={isPublishing}
            className="flex-1 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 cursor-pointer"
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