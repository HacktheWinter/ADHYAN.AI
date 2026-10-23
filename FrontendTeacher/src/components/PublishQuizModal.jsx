// FrontendTeacher/src/components/PublishQuizModal.jsx
import React, { useState, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import { X, Clock, Calendar, AlertCircle, CheckCircle, Camera, ChevronDown, Lock } from "lucide-react";
import axios from "axios";
import API_BASE_URL from "../config";

export default function PublishQuizModal({ quiz, onClose, onPublished, showToast }) {
  const totalQuestions = quiz.sections?.reduce((sum, sec) => sum + (sec.questions?.length || 0), 0) || quiz.questions?.length || 0;
  const strictSections = quiz.sections?.filter(sec => sec.type === 'mcq' && sec.isStrictTiming) || [];
  const hasStrictMcq = strictSections.length > 0;
  const totalSectionsCount = quiz.sections?.length || 0;
  const [timingOption, setTimingOption] = useState(hasStrictMcq ? "duration" : "no-limit"); // 'no-limit', 'duration', 'schedule'
  const showStrictMcqBlock = totalSectionsCount > 1 && hasStrictMcq && timingOption !== 'no-limit';
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [manualDuration, setManualDuration] = useState("");
  
  const [strictSectionDurations, setStrictSectionDurations] = useState({});
  const [selectedStrictSectionId, setSelectedStrictSectionId] = useState(hasStrictMcq ? strictSections[0]._id : null);
  
  const [webcamEnabled, setWebcamEnabled] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isTimingSet, setIsTimingSet] = useState(false);
  
  // Lock entry feature state
  const [lockEnabled, setLockEnabled] = useState(false);
  const [lockMinutes, setLockMinutes] = useState("");
  const [isLockPopoverOpen, setIsLockPopoverOpen] = useState(false);
  
  const [isStrictDropdownOpen, setIsStrictDropdownOpen] = useState(false);
  const [dropdownDirection, setDropdownDirection] = useState('down');
  const dropdownButtonRef = useRef(null);

  const toggleDropdown = (e) => {
    e.preventDefault();
    if (!isStrictDropdownOpen && dropdownButtonRef.current) {
      const rect = dropdownButtonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceBelow < 220) { // 220px threshold
        setDropdownDirection('up');
      } else {
        setDropdownDirection('down');
      }
    }
    setIsStrictDropdownOpen(!isStrictDropdownOpen);
  };

  const strictMcqRef = useRef(null);

  const isDurationValid = useMemo(() => {
    const val = parseInt(manualDuration);
    return !isNaN(val) && val > 0;
  }, [manualDuration]);

  const isScheduleValid = useMemo(() => {
    if (!startTime || !endTime) return false;
    const start = new Date(startTime);
    const end = new Date(endTime);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return false;
    return end > start;
  }, [startTime, endTime]);

  const handleSetTiming = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (timingOption === "duration" && !isDurationValid) {
      showToast("Please enter a valid duration in minutes", "error");
      return;
    }
    if (timingOption === "schedule" && !isScheduleValid) {
      if (!startTime || !endTime) {
        showToast("Please select both start and end time", "error");
      } else {
        showToast("End time must be after start time", "error");
      }
      return;
    }
    setIsTimingSet(true);
    setIsLockPopoverOpen(true);
  };

  // Compute effective duration for lock validation
  const effectiveDuration = useMemo(() => {
    if (timingOption === "duration") {
      return parseInt(manualDuration) || 0;
    }
    if (timingOption === "schedule" && startTime && endTime) {
      const start = new Date(startTime);
      const end = new Date(endTime);
      if (end > start) {
        return Math.floor((end - start) / 60000);
      }
    }
    return 0;
  }, [timingOption, manualDuration, startTime, endTime]);

  const lockMax = effectiveDuration >= 2 ? Math.floor(effectiveDuration / 2) : 0;
  const showLockControl = isTimingSet && timingOption !== "no-limit" && effectiveDuration >= 2;

  const lockError = useMemo(() => {
    if (!lockEnabled || !lockMinutes) return null;
    const val = parseInt(lockMinutes);
    if (isNaN(val) || val < 1) return "Lock time must be at least 1 minute.";
    if (!Number.isInteger(val)) return "Lock time must be a whole number.";
    if (val > lockMax) return `Lock time can be at most ${lockMax} minutes (half of the ${effectiveDuration} min duration).`;
    return null;
  }, [lockEnabled, lockMinutes, lockMax, effectiveDuration]);

  const lockPreviewTime = useMemo(() => {
    if (!lockEnabled || !lockMinutes || lockError) return null;
    const val = parseInt(lockMinutes);
    if (isNaN(val) || val < 1) return null;
    let baseTime;
    if (timingOption === "schedule" && startTime) {
      baseTime = new Date(startTime);
    } else {
      baseTime = new Date();
    }
    const lockAt = new Date(baseTime.getTime() + val * 60000);
    return lockAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, [lockEnabled, lockMinutes, lockError, timingOption, startTime]);

  // Clear lock and reset timing confirmation when switching timing options
  const handleTimingChange = (value) => {
    setTimingOption(value);
    setIsTimingSet(false);
    setIsLockPopoverOpen(false);
    setLockEnabled(false);
    setLockMinutes("");
  };

  const renderLockPopover = () => {
    if (!showLockControl || !isLockPopoverOpen) return null;

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className="absolute bottom-full mb-3 left-0 z-50 w-[300px] sm:w-[360px] bg-white dark:bg-[#1E293B] border border-violet-300 dark:border-violet-600 rounded-2xl shadow-2xl p-4 text-ink font-body cursor-default select-text"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
              lockEnabled ? "bg-violet-600 text-white" : "bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300"
            }`}>
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-sm text-ink">
                  Lock Quiz Entry
                </span>
                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-violet-100 dark:bg-violet-900/60 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-700">
                  Optional
                </span>
              </div>
              <p className="text-[11px] text-ink-soft leading-tight mt-0.5">
                Block new student entries after X minutes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Toggle Switch */}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (lockEnabled) {
                  setLockEnabled(false);
                  setLockMinutes("");
                } else {
                  setLockEnabled(true);
                }
              }}
              className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 cursor-pointer ${
                lockEnabled ? "bg-violet-600" : "bg-gray-300 dark:bg-gray-600"
              }`}
              title={lockEnabled ? "Disable entry lock" : "Enable entry lock"}
            >
              <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
                lockEnabled ? "translate-x-5" : "translate-x-0"
              }`} />
            </button>

            {/* Close button */}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsLockPopoverOpen(false);
              }}
              className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-ink-soft hover:text-ink cursor-pointer transition-colors"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* When enabled, show inputs and preview */}
        {lockEnabled ? (
          <div className="mt-3 pt-3 border-t border-violet-100 dark:border-violet-800 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <label className="text-xs font-bold text-violet-900 dark:text-violet-200 whitespace-nowrap">
                Lock after:
              </label>
              <input
                type="number"
                min="1"
                max={lockMax}
                value={lockMinutes}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => setLockMinutes(e.target.value)}
                placeholder={`1 - ${lockMax}`}
                className="w-20 px-2.5 py-1 border border-violet-300 dark:border-violet-600 bg-white dark:bg-paper text-ink rounded-lg outline-none focus:ring-2 focus:ring-violet-500 font-semibold text-xs"
              />
              <span className="text-xs text-violet-800 dark:text-violet-300 font-medium">
                minutes (Max: {lockMax} min)
              </span>
            </div>

            {lockPreviewTime && !lockError && (
              <div className="text-[11px] text-violet-700 dark:text-violet-300 font-medium bg-violet-50 dark:bg-violet-900/30 px-2 py-1 rounded-md border border-violet-200 dark:border-violet-700">
                🔒 Locks at {lockPreviewTime}{timingOption === "duration" ? " (approx)" : ""}
              </div>
            )}

            {lockError && (
              <p className="text-[11px] font-bold text-red-600 leading-tight">
                {lockError}
              </p>
            )}
          </div>
        ) : (
          <p className="text-[11px] text-violet-700 dark:text-violet-300 font-medium bg-violet-50/70 dark:bg-violet-900/20 p-2 rounded-lg mt-1 border border-violet-100 dark:border-violet-800">
            💡 Turn on to prevent students from joining late after the exam begins.
          </p>
        )}

        {/* Popover Arrow pointing down to Set Timing button */}
        <div className="absolute -bottom-2 left-6 w-3.5 h-3.5 bg-white dark:bg-[#1E293B] border-r border-b border-violet-300 dark:border-violet-600 rotate-45" />
      </motion.div>
    );
  };

  const handlePublish = async () => {
    try {
      setIsPublishing(true);

      if (timingOption !== "no-limit" && !isTimingSet) {
        showToast("Please click 'Set Timing' to confirm your timing settings", 'error');
        setIsPublishing(false);
        return;
      }

      let payload = {
        duration: null,
        strictMcqDuration: null,
        startTime: null,
        endTime: null,
        lockAfterMinutes: null,
      };

      if (timingOption === "duration") {
        if (!manualDuration || manualDuration <= 0) {
          showToast("Please enter a valid duration", 'error');
          setIsPublishing(false);
          return;
        }
        payload.duration = parseInt(manualDuration);
        
        // Start time is now, and end time is now + duration minutes
        const start = new Date();
        const end = new Date(start.getTime() + payload.duration * 60000);
        payload.startTime = start.toISOString();
        payload.endTime = end.toISOString();

        // Add lock if enabled and valid
        if (lockEnabled && lockMinutes) {
          if (lockError) {
            showToast(lockError, 'error');
            setIsPublishing(false);
            return;
          }
          payload.lockAfterMinutes = parseInt(lockMinutes);
        } else {
          payload.lockAfterMinutes = null;
        }
      } else if (timingOption === "schedule") {
        if (!startTime) {
          showToast("Please select a start time", 'error');
          setIsPublishing(false);
          return;
        }

        const start = new Date(startTime);
        const now = new Date();

        if (start < now) {
          showToast("Start time cannot be in the past", 'error');
          setIsPublishing(false);
          return;
        }

        payload.startTime = start.toISOString();

        if (!endTime) {
          showToast("Please select an end time", 'error');
          setIsPublishing(false);
          return;
        }
        const end = new Date(endTime);
        if (end <= start) {
          showToast("End time must be after start time", 'error');
          setIsPublishing(false);
          return;
        }
        payload.endTime = end.toISOString();
        payload.duration = Math.floor((end - start) / 60000);

        // Add lock if enabled and valid
        if (lockEnabled && lockMinutes) {
          if (lockError) {
            showToast(lockError, 'error');
            setIsPublishing(false);
            return;
          }
          payload.lockAfterMinutes = parseInt(lockMinutes);
        } else {
          payload.lockAfterMinutes = null;
        }
      }

      if (hasStrictMcq) {
        if (showStrictMcqBlock) {
          let totalStrictTime = 0;
          for (let sec of strictSections) {
             const secDur = parseInt(strictSectionDurations[sec._id]);
             if (!secDur || secDur <= 0) {
               showToast(`Please enter a valid duration for strict section: ${sec.title}`, 'error');
               setIsPublishing(false);
               return;
             }
             totalStrictTime += secDur;
          }
          if (payload.duration && totalStrictTime > payload.duration) {
             showToast("Total strict mode duration cannot exceed the overall exam duration", 'error');
             setIsPublishing(false);
             return;
          }
          payload.strictSectionDurations = strictSectionDurations;
          payload.strictMcqDuration = totalStrictTime; // fallback just in case
        } else {
          // Exactly 1 strict section
          payload.strictMcqDuration = payload.duration;
          payload.strictSectionDurations = { [strictSections[0]._id]: payload.duration };
        }
      }

      console.log("Publishing assessment with timing:", payload);

      const response = await axios.put(
        `${API_BASE_URL}/quiz/${quiz._id}/publish`,
        { ...payload, webcamEnabled }
      );

      console.log("Assessment published:", response.data);

      showToast("Assessment published successfully!", 'success');
      onPublished();
    } catch (error) {
      console.error("Publish error:", error);
      showToast(error.response?.data?.error || "Failed to publish assessment", 'error');
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
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 transition-opacity duration-150">
      {/* Outer container with scroll support */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className="bg-surface border border-line rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col shadow-2xl font-body text-ink"
      >
        {/* Header */}
        <div className="p-6 border-b border-line sticky top-0 bg-surface z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl font-semibold font-display text-ink">Publish Assessment</h2>
              <p className="text-ink-soft text-sm mt-1">{quiz.title}</p>
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

        {/* Scrollable Content */}
        <div className="p-6 space-y-6 flex-1 overflow-y-auto bg-surface">
          {/* Quiz Info */}
          <div className="bg-violet-50 rounded-xl p-4 border border-line">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-5 h-5 text-violet-dark" />
              <span className="font-bold text-violet-dark">
                Assessment Information
              </span>
            </div>
            <p className="text-sm text-violet-dark font-medium">
              {totalQuestions} questions • Once published, students
              can take this assessment
            </p>
          </div>

          {/* Webcam Proctoring Toggle */}
          <div>
            <label className="block text-xs font-bold text-ink-soft uppercase tracking-wider mb-3">
              Proctoring Settings
            </label>
            <div
              onClick={() => setWebcamEnabled(!webcamEnabled)}
              className={`flex items-start gap-4 p-4 border rounded-xl cursor-pointer transition-all ${
                webcamEnabled
                  ? "border-violet-600 bg-violet-50 shadow-sm"
                  : "border-line bg-surface hover:border-purple-300"
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                webcamEnabled ? "bg-violet-600 text-white" : "bg-line text-ink-soft"
              }`}>
                <Camera className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-ink">Webcam Proctoring</span>
                  <div className={`relative w-11 h-6 rounded-full transition-colors ${
                    webcamEnabled ? "bg-violet-600" : "bg-gray-300 dark:bg-gray-600"
                  }`}>
                    <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                      webcamEnabled ? "translate-x-5" : "translate-x-0"
                    }`} />
                  </div>
                </div>
                <p className="text-sm text-ink-soft">
                  Enable camera monitoring during the assessment. Students will be required to turn on their webcam, and AI will monitor for suspicious activity.
                </p>
              </div>
            </div>
          </div>

          {/* Timing Options */}
          <div>
            <label className="block text-xs font-bold text-ink-soft uppercase tracking-wider mb-3">
              Set Assessment Timing
            </label>

            <div className="space-y-3">
              {/* No Time Limit */}
              {!hasStrictMcq && (
                <label
                  className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer transition-all ${
                    timingOption === "no-limit"
                      ? "border-violet-600 bg-violet-50 text-violet-dark shadow-sm"
                      : "border-line bg-surface text-ink hover:border-purple-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="timing"
                    value="no-limit"
                    checked={timingOption === "no-limit"}
                    onChange={(e) => handleTimingChange(e.target.value)}
                    className="mt-1 text-purple-600 rounded border-line focus:ring-violet-600 cursor-pointer bg-paper"
                  />
                  <div className="flex-1">
                    <div className="font-bold text-ink mb-1">
                      No Time Limit
                    </div>
                    <p className="text-sm text-ink-soft">
                      Students can take this assessment anytime without time
                      restrictions
                    </p>
                  </div>
                </label>
              )}

              {/* Total Duration */}
              <label
                className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer transition-all ${
                  timingOption === "duration"
                    ? "border-violet-600 bg-violet-50 text-violet-dark shadow-sm"
                    : "border-line bg-surface text-ink hover:border-purple-300"
                }`}
              >
                <input
                  type="radio"
                  name="timing"
                  value="duration"
                  checked={timingOption === "duration"}
                  onChange={(e) => handleTimingChange(e.target.value)}
                  className="mt-1 text-purple-600 rounded border-line focus:ring-violet-600 cursor-pointer bg-paper"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-5 h-5 text-purple-600 dark:text-[#A78BFA]" />
                    <span className="font-bold text-ink">
                      Set Duration
                    </span>
                  </div>
                  <p className="text-sm text-ink-soft mb-3">
                    Set a specific time limit for the entire assessment. The quiz will auto-submit when time runs out.
                  </p>
                  
                  {timingOption === "duration" && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-ink-soft uppercase tracking-wider mb-1">
                          Duration (Minutes)
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={manualDuration}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => { setManualDuration(e.target.value); setIsTimingSet(false); setIsLockPopoverOpen(false); setLockMinutes(""); setLockEnabled(false); }}
                          placeholder="e.g. 60"
                          className="w-full sm:w-1/2 px-3 py-2 border border-line bg-paper text-ink rounded-xl outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                      <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
                        {showLockControl && timingOption === "duration" && renderLockPopover()}
                        <button
                          type="button"
                          disabled={!isTimingSet && !isDurationValid}
                          title={!isTimingSet && !isDurationValid ? "Please enter a valid duration first" : ""}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (!isTimingSet) {
                              if (!isDurationValid) return;
                              handleSetTiming(e);
                            } else {
                              setIsLockPopoverOpen(prev => !prev);
                            }
                          }}
                          className={`px-4 py-2 text-white rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                            isTimingSet
                              ? 'bg-green-600 hover:bg-green-700 cursor-pointer shadow-sm'
                              : !isDurationValid
                                ? 'bg-gray-400 dark:bg-gray-700 text-gray-200 dark:text-gray-400 cursor-not-allowed opacity-60'
                                : 'bg-violet-600 hover:bg-violet-700 cursor-pointer shadow-sm'
                          }`}
                        >
                          <span>{isTimingSet ? 'Timing Set ✓' : 'Set Timing'}</span>
                          {isTimingSet && lockEnabled && lockMinutes && !lockError && (
                            <span className="text-xs bg-green-800/80 px-2 py-0.5 rounded-full font-medium flex items-center gap-1 border border-green-500/30">
                              <Lock className="w-3 h-3" /> {lockMinutes}m
                            </span>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </label>

              {/* Schedule */}
              <label
                className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer transition-all ${
                  timingOption === "schedule"
                    ? "border-violet-600 bg-violet-50 text-violet-dark shadow-sm"
                    : "border-line bg-surface text-ink hover:border-purple-300"
                }`}
              >
                <input
                  type="radio"
                  name="timing"
                  value="schedule"
                  checked={timingOption === "schedule"}
                  onChange={(e) => handleTimingChange(e.target.value)}
                  className="mt-1 text-purple-600 rounded border-line focus:ring-violet-600 cursor-pointer bg-paper"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="w-5 h-5 text-purple-600 dark:text-[#A78BFA]" />
                    <span className="font-bold text-ink">
                      Schedule Assessment
                    </span>
                  </div>
                  <p className="text-sm text-ink-soft mb-3">
                    Set a start and end time window. The quiz duration is automatically calculated from the window and auto-submits when time expires.
                  </p>

                  {timingOption === "schedule" && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-ink-soft uppercase tracking-wider mb-1">
                          Start Time
                        </label>
                        <input
                          type="datetime-local"
                          min={getMinDateTime()}
                          value={startTime}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => { setStartTime(e.target.value); setIsTimingSet(false); setIsLockPopoverOpen(false); setLockMinutes(""); setLockEnabled(false); }}
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
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => { setEndTime(e.target.value); setIsTimingSet(false); setIsLockPopoverOpen(false); setLockMinutes(""); setLockEnabled(false); }}
                          className="w-full px-3 py-2 border border-line bg-paper text-ink rounded-xl outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                      <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
                        {showLockControl && timingOption === "schedule" && renderLockPopover()}
                        <button
                          type="button"
                          disabled={!isTimingSet && !isScheduleValid}
                          title={!isTimingSet && !isScheduleValid ? "Please select valid start and end time first" : ""}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (!isTimingSet) {
                              if (!isScheduleValid) return;
                              handleSetTiming(e);
                            } else {
                              setIsLockPopoverOpen(prev => !prev);
                            }
                          }}
                          className={`px-4 py-2 text-white rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                            isTimingSet
                              ? 'bg-green-600 hover:bg-green-700 cursor-pointer shadow-sm'
                              : !isScheduleValid
                                ? 'bg-gray-400 dark:bg-gray-700 text-gray-200 dark:text-gray-400 cursor-not-allowed opacity-60'
                                : 'bg-violet-600 hover:bg-violet-700 cursor-pointer shadow-sm'
                          }`}
                        >
                          <span>{isTimingSet ? 'Timing Set ✓' : 'Set Timing'}</span>
                          {isTimingSet && lockEnabled && lockMinutes && !lockError && (
                            <span className="text-xs bg-green-800/80 px-2 py-0.5 rounded-full font-medium flex items-center gap-1 border border-green-500/30">
                              <Lock className="w-3 h-3" /> {lockMinutes}m
                            </span>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </label>
            </div>
          </div>

          {/* Strict MCQ Timing */}
          {showStrictMcqBlock && (
            <div ref={strictMcqRef} className={`bg-indigo-50 border border-indigo-200 rounded-xl p-4 mt-4 scroll-mt-24 transition-all duration-300 ${!isTimingSet ? 'opacity-50 pointer-events-none grayscale-[0.2]' : ''}`}>
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-indigo-600 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1 gap-2 flex-wrap">
                    <p className="text-sm font-bold text-indigo-900">
                      Strict MCQ Mode Enabled
                    </p>
                    <div className="relative" ref={dropdownButtonRef}>
                      <button
                        onClick={toggleDropdown}
                        className="px-3 py-1.5 text-sm font-bold border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 transition-colors text-indigo-800 rounded-lg outline-none focus:outline-none w-48 sm:w-56 shadow-sm cursor-pointer flex items-center justify-between gap-2"
                      >
                        <span className="truncate">{strictSections.find(s => s._id === selectedStrictSectionId)?.title || "Select Section"}</span>
                        <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${isStrictDropdownOpen ? "rotate-180" : ""}`} />
                      </button>

                      {isStrictDropdownOpen && (
                        <>
                          <div 
                            className="fixed inset-0 z-[100]" 
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsStrictDropdownOpen(false); }} 
                          />
                          <div className={`absolute ${dropdownDirection === 'up' ? 'bottom-full mb-1' : 'top-full mt-1'} right-0 w-full bg-white border border-indigo-100 rounded-lg shadow-xl z-[101] overflow-hidden py-1 max-h-48 overflow-y-auto`}>
                            {strictSections.map(sec => (
                              <div
                                key={sec._id}
                                onClick={(e) => {
                                  e.preventDefault();
                                  setSelectedStrictSectionId(sec._id);
                                  setIsStrictDropdownOpen(false);
                                }}
                                className={`px-4 py-2 text-sm font-bold cursor-pointer transition-colors ${
                                  selectedStrictSectionId === sec._id
                                    ? "bg-indigo-600 text-white"
                                    : "text-indigo-900 hover:bg-indigo-50"
                                }`}
                              >
                                {sec.title}
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <p className={`text-sm mb-3 ${!isTimingSet ? 'text-red-600 font-bold' : 'text-indigo-800'}`}>
                    {!isTimingSet 
                      ? "⚠️ Please click 'Set Timing' for the main exam above before configuring strict mode." 
                      : "You have enabled strict mode for multiple sections. Please set the time for each strict MCQ section individually."}
                  </p>
                  
                  <div className="flex flex-col gap-3">
                    <div>
                      <label className="block text-xs font-bold text-indigo-700 uppercase tracking-wider mb-1">
                        Duration for {strictSections.find(s => s._id === selectedStrictSectionId)?.title || 'Selected Section'} (Minutes)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={strictSectionDurations[selectedStrictSectionId] || ""}
                        onChange={(e) => setStrictSectionDurations({...strictSectionDurations, [selectedStrictSectionId]: e.target.value})}
                        placeholder="e.g. 30"
                        className="w-full sm:w-1/2 px-3 py-2 border border-indigo-300 bg-white text-ink rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:text-gray-400"
                        disabled={!isTimingSet}
                      />
                    </div>
                    
                    {(() => {
                      const totalStrict = Object.values(strictSectionDurations).reduce((acc, val) => acc + (parseInt(val) || 0), 0);
                      const mainDur = timingOption === "duration" ? parseInt(manualDuration) || 0 : (timingOption === "schedule" && startTime && endTime ? Math.floor((new Date(endTime) - new Date(startTime)) / 60000) : 0);
                      if (mainDur > 0 && totalStrict > mainDur) {
                        return (
                          <p className="text-sm font-bold text-red-600 mt-2">
                            Total strict mode duration ({totalStrict} mins) exceeds overall exam duration ({mainDur} mins)!
                          </p>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>
              </div>
            </div>
          )}



          {/* Warning */}
          <div className="bg-amber-50 border border-amber-250 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-amber-900 mb-1">
                  Important Note
                </p>
                <p className="text-sm text-amber-800">
                  Once published, students will be able to see and take this
                  assessment. You cannot edit questions or change timing after
                  publishing.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer fixed at bottom */}
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
            disabled={isPublishing || (lockEnabled && (!lockMinutes || !!lockError))}
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
                Publish Assessment
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
