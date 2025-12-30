// FrontendTeacher/src/components/PublishTestModal.jsx
import React, { useState } from 'react';
import { X, Clock, Calendar, AlertCircle, CheckCircle } from 'lucide-react';
import { publishTestPaper } from '../api/testPaperApi';

export default function PublishTestModal({ testPaper, onClose, onPublished }) {
  const [timingOption, setTimingOption] = useState('no-limit');
  const [duration, setDuration] = useState(60); // minutes
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);

  const handlePublish = async () => {
    try {
      setIsPublishing(true);

      let payload = {
        duration: null,
        startTime: null,
        endTime: null,
      };

      if (timingOption === 'duration') {
        if (!duration || duration < 1) {
          alert('Please enter a valid duration');
          setIsPublishing(false);
          return;
        }
        payload.duration = parseInt(duration);
        payload.startTime = new Date().toISOString();

        const end = new Date();
        end.setMinutes(end.getMinutes() + parseInt(duration));
        payload.endTime = end.toISOString();
      } else if (timingOption === 'schedule') {
        if (!startTime || !endTime) {
          alert('Please select both start and end time');
          setIsPublishing(false);
          return;
        }

        const start = new Date(startTime);
        const end = new Date(endTime);
        const now = new Date();

        if (start < now) {
          alert('Start time cannot be in the past');
          setIsPublishing(false);
          return;
        }

        if (end <= start) {
          alert('End time must be after start time');
          setIsPublishing(false);
          return;
        }

        payload.startTime = start.toISOString();
        payload.endTime = end.toISOString();
        const durationMinutes = Math.floor((end - start) / 60000);
        payload.duration = durationMinutes;
      }

      console.log('Publishing test paper:', payload);

      await publishTestPaper(testPaper._id, payload);

      alert('Test paper published successfully!');
      onPublished();
    } catch (error) {
      console.error('Publish error:', error);
      alert(error.response?.data?.error || 'Failed to publish test paper');
    } finally {
      setIsPublishing(false);
    }
  };

  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 5);
    return now.toISOString().slice(0, 16);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Publish Test Paper</h2>
              <p className="text-gray-600 mt-1">{testPaper.title}</p>
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
        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
          {/* Test Info */}
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-5 h-5 text-purple-600" />
              <span className="font-semibold text-purple-900">Test Paper Information</span>
            </div>
            <p className="text-sm text-purple-800">
              {testPaper.questions?.length || 0} questions • {testPaper.totalMarks} marks total
            </p>
          </div>

          {/* Timing Options */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Set Test Timing
            </label>

            <div className="space-y-3">
              {/* No Time Limit */}
              <label
                className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  timingOption === 'no-limit'
                    ? 'border-purple-600 bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="timing"
                  value="no-limit"
                  checked={timingOption === 'no-limit'}
                  onChange={(e) => setTimingOption(e.target.value)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 mb-1">No Time Limit</div>
                  <p className="text-sm text-gray-600">
                    Students can take this test anytime without time restrictions
                  </p>
                </div>
              </label>

              {/* Duration */}
              <label
                className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  timingOption === 'duration'
                    ? 'border-purple-600 bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="timing"
                  value="duration"
                  checked={timingOption === 'duration'}
                  onChange={(e) => setTimingOption(e.target.value)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-5 h-5 text-purple-600" />
                    <span className="font-semibold text-gray-900">Set Duration</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    Students must complete within specified time from start
                  </p>

                  {timingOption === 'duration' && (
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min="1"
                        max="180"
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                        className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                      />
                      <span className="text-sm text-gray-700">minutes</span>
                    </div>
                  )}
                </div>
              </label>

              {/* Schedule */}
              <label
                className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  timingOption === 'schedule'
                    ? 'border-purple-600 bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="timing"
                  value="schedule"
                  checked={timingOption === 'schedule'}
                  onChange={(e) => setTimingOption(e.target.value)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="w-5 h-5 text-purple-600" />
                    <span className="font-semibold text-gray-900">Schedule Test</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    Set specific start and end time for the test
                  </p>

                  {timingOption === 'schedule' && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Start Time
                        </label>
                        <input
                          type="datetime-local"
                          min={getMinDateTime()}
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          End Time
                        </label>
                        <input
                          type="datetime-local"
                          min={startTime || getMinDateTime()}
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </label>
            </div>
          </div>

          {/* Warning */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-yellow-900 mb-1">Important Note</p>
                <p className="text-sm text-yellow-800">
                  Once published, students will be able to see and attempt this test paper. 
                  Answer keys will be used for AI-powered checking.
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
            className="flex-1 px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            {isPublishing ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Publishing...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                Publish Test Paper
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}