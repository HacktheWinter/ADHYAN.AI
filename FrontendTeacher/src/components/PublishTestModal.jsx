// FrontendTeacher/src/components/PublishTestModal.jsx
import React, { useState } from 'react';
import { X, Clock, Calendar, AlertCircle, CheckCircle } from 'lucide-react';
import { publishTestPaper } from '../api/testPaperApi';

export default function PublishTestModal({ testPaper, onClose, onPublished, showToast }) {
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
          showToast('Please enter a valid duration', 'error');
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
          showToast('Please select both start and end time', 'error');
          setIsPublishing(false);
          return;
        }

        const start = new Date(startTime);
        const end = new Date(endTime);
        const now = new Date();

        if (start < now) {
          showToast('Start time cannot be in the past', 'error');
          setIsPublishing(false);
          return;
        }

        if (end <= start) {
          showToast('End time must be after start time', 'error');
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

      showToast('Test paper published successfully!', 'success');
      onPublished();
    } catch (error) {
      console.error('Publish error:', error);
      showToast(error.response?.data?.error || 'Failed to publish test paper', 'error');
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
      <div className="bg-surface border border-line rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col shadow-2xl font-body text-ink">
        {/* Header */}
        <div className="p-6 border-b border-line sticky top-0 bg-surface z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl font-semibold font-display text-ink">Publish Test Paper</h2>
              <p className="text-ink-soft text-sm mt-1">{testPaper.title}</p>
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
        <div className="p-6 space-y-6 flex-1 overflow-y-auto bg-surface">
          {/* Test Info */}
          <div className="bg-violet-50 rounded-xl p-4 border border-line">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-5 h-5 text-violet-dark" />
              <span className="font-bold text-violet-dark">Test Paper Information</span>
            </div>
            <p className="text-sm text-violet-dark font-medium">
              {testPaper.questions?.length || 0} questions • {testPaper.totalMarks} marks total
            </p>
          </div>

          {/* Timing Options */}
          <div>
            <label className="block text-xs font-bold text-ink-soft uppercase tracking-wider mb-3">
              Set Test Timing
            </label>

            <div className="space-y-3">
              {/* No Time Limit */}
              <label
                className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer transition-all ${
                  timingOption === 'no-limit'
                    ? 'border-violet-600 bg-violet-50 text-violet-dark shadow-sm'
                    : 'border-line bg-surface text-ink hover:border-purple-300'
                }`}
              >
                <input
                  type="radio"
                  name="timing"
                  value="no-limit"
                  checked={timingOption === 'no-limit'}
                  onChange={(e) => setTimingOption(e.target.value)}
                  className="mt-1 text-purple-600 rounded border-line focus:ring-violet-600 cursor-pointer bg-paper"
                />
                <div className="flex-1">
                  <div className="font-bold text-ink mb-1">No Time Limit</div>
                  <p className="text-sm text-ink-soft">
                    Students can take this test anytime without time restrictions
                  </p>
                </div>
              </label>

              {/* Duration */}
              <label
                className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer transition-all ${
                  timingOption === 'duration'
                    ? 'border-violet-600 bg-violet-50 text-violet-dark shadow-sm'
                    : 'border-line bg-surface text-ink hover:border-purple-300'
                }`}
              >
                <input
                  type="radio"
                  name="timing"
                  value="duration"
                  checked={timingOption === 'duration'}
                  onChange={(e) => setTimingOption(e.target.value)}
                  className="mt-1 text-purple-600 rounded border-line focus:ring-violet-600 cursor-pointer bg-paper"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-5 h-5 text-purple-600 dark:text-[#A78BFA]" />
                    <span className="font-bold text-ink">Set Duration</span>
                  </div>
                  <p className="text-sm text-ink-soft mb-3">
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
                        className="w-24 px-3 py-2 border border-line bg-paper text-ink rounded-xl outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      <span className="text-sm text-ink-soft font-medium">minutes</span>
                    </div>
                  )}
                </div>
              </label>

              {/* Schedule */}
              <label
                className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer transition-all ${
                  timingOption === 'schedule'
                    ? 'border-violet-600 bg-violet-50 text-violet-dark shadow-sm'
                    : 'border-line bg-surface text-ink hover:border-purple-300'
                }`}
              >
                <input
                  type="radio"
                  name="timing"
                  value="schedule"
                  checked={timingOption === 'schedule'}
                  onChange={(e) => setTimingOption(e.target.value)}
                  className="mt-1 text-purple-600 rounded border-line focus:ring-violet-600 cursor-pointer bg-paper"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="w-5 h-5 text-purple-600 dark:text-[#A78BFA]" />
                    <span className="font-bold text-ink">Schedule Test</span>
                  </div>
                  <p className="text-sm text-ink-soft mb-3">
                    Set specific start and end time for the test
                  </p>

                  {timingOption === 'schedule' && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-ink-soft uppercase tracking-wider mb-1">
                          Start Time
                        </label>
                        <input
                          type="datetime-local"
                          min={getMinDateTime()}
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          className="w-full px-3 py-2 border border-line bg-paper text-ink rounded-xl outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-ink-soft uppercase tracking-wider mb-1">
                          End Time
                        </label>
                        <input
                          type="datetime-local"
                          min={startTime || getMinDateTime()}
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                          className="w-full px-3 py-2 border border-line bg-paper text-ink rounded-xl outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </label>
            </div>
          </div>

          {/* Warning */}
          <div className="bg-amber-50 border border-amber-250 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-amber-900 mb-1">Important Note</p>
                <p className="text-sm text-amber-800">
                  Once published, students will be able to see and attempt this test paper. 
                  You cannot edit questions or change timing after publishing.
                  Answer keys will be used for AI-powered checking.
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
                Publish Test Paper
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}