import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Users, Calendar, Save, CheckCircle, XCircle, MoreVertical, RefreshCw, X, CircleCheckBig, CalendarOff, CheckCheck, XSquare } from "lucide-react";
import api from "../../api/axios";

// Helper to get local date in YYYY-MM-DD format (not UTC)
const getLocalDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const toLocalDateKey = (value) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const ManualAttendance = ({ classId, students }) => {
  const today = getLocalDateString();
  const todayIsSunday = new Date().getDay() === 0;
  const [selectedDate, setSelectedDate] = useState(today);

  const isSunday = (dateStr) => new Date(dateStr + 'T00:00:00').getDay() === 0;
  const [isUpdateMode, setIsUpdateMode] = useState(false);
  const [attendanceData, setAttendanceData] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [todaySaved, setTodaySaved] = useState(false);
  const [savedStats, setSavedStats] = useState({ present: 0, absent: 0 });
  const [backendRecords, setBackendRecords] = useState({});
  const menuRef = useRef(null);
  const modalRef = useRef(null);

  useEffect(() => {
    // Fetch today's attendance from backend to check if it's already saved
    const fetchTodayAttendance = async () => {
      try {
        setTodaySaved(false);
        setSavedStats({ present: 0, absent: 0 });
        const response = await api.get(`/attendance/sessions/${classId}`);
        if (response.data?.success && response.data?.attendance) {
          const sessions = Array.isArray(response.data.attendance) ? response.data.attendance : [response.data.attendance];
          const todaySession = sessions.find(s => {
            const sessionDate = toLocalDateKey(s.date);
            return sessionDate === today;
          });
          
          if (todaySession) {
            setTodaySaved(true);
            // Calculate stats from the attendance entries
            let p = 0, a = 0;
            (todaySession.attendanceEntries || []).forEach(entry => {
              if (entry.status === 'present' || entry.status === 'late') p++;
              else a++;
            });
            setSavedStats({ present: p, absent: a });
          }
        }
      } catch (error) {
        console.error("Error fetching today's attendance:", error);
      }
    };

    fetchTodayAttendance();
  }, [classId, today]);

  const getWeekDates = () => {
    const dates = [];
    for (let i = 0; i <= 6; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push({
        value: toLocalDateKey(d),
        label: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        dayName: d.toLocaleDateString('en-US', { weekday: 'long' }),
      });
    }
    return dates;
  };

  const weekDates = getWeekDates();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showDatePicker && modalRef.current && !modalRef.current.contains(e.target)) setShowDatePicker(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDatePicker]);

  useEffect(() => {
    // Load attendance data for selected date
    const loadDateAttendance = async () => {
      try {
        // Always try to load from backend for any date
        const response = await api.get(`/attendance/sessions/${classId}`);
        if (response.data?.success && response.data?.attendance) {
          const sessions = Array.isArray(response.data.attendance) ? response.data.attendance : [response.data.attendance];
          const session = sessions.find(s => {
            const sessionDate = toLocalDateKey(s.date);
            return sessionDate === selectedDate;
          });
          
          if (session) {
            // Convert attendance entries to override format
            const overrides = {};
            (session.attendanceEntries || []).forEach(entry => {
              overrides[entry.studentId] = (entry.status === 'present' || entry.status === 'late') ? 'P' : 'A';
            });
            setAttendanceData(overrides);
            return;
          }
        }
      } catch (error) {
        console.error("Error loading attendance:", error);
      }
      
      // Default: initialize all as present
      const initialData = {};
      students.forEach(student => { initialData[student._id] = 'P'; });
      setAttendanceData(initialData);
    };

    loadDateAttendance();
  }, [students, selectedDate, isUpdateMode, classId]);

  const toggleAttendance = (studentId, status) => {
    setAttendanceData(prev => ({ ...prev, [studentId]: status }));
  };

  // ─── BULK ACTIONS ──────────────────────────────────────────────
  const markAllPresent = () => {
    const newData = {};
    students.forEach(s => { newData[s._id] = 'P'; });
    setAttendanceData(newData);
  };

  const markAllAbsent = () => {
    const newData = {};
    students.forEach(s => { newData[s._id] = 'A'; });
    setAttendanceData(newData);
  };
  // ──────────────────────────────────────────────────────────────

  const handleSave = async () => {
    setIsSaving(true);
    console.log("[ManualAttendance] ========== SAVE START ==========");
    console.log("[ManualAttendance] Current state:", { todaySaved, isUpdateMode, selectedDate, today });
    
    try {
      console.log("[ManualAttendance] Saving record with:", {
        classId,
        date: selectedDate,
        attendance: Object.keys(attendanceData).length,
        isUpdateMode,
      });

      const response = await api.post(`/attendance/save-record/${classId}`, {
        date: selectedDate,
        attendance: attendanceData,
      });

      console.log("[ManualAttendance] Save response:", response.data);
      console.log("[ManualAttendance] Response success?:", response.data?.success);
      console.log("[ManualAttendance] selectedDate === today?:", selectedDate === today);

      if (response.data?.success) {
        console.log("[ManualAttendance] Save successful!");
        await new Promise(resolve => setTimeout(resolve, 800));

        if (isUpdateMode) {
          console.log("[ManualAttendance] In update mode - exiting...");
          // When updating a past date, exit update mode and return to today
          setIsUpdateMode(false);
          setSelectedDate(today);
          setTodaySaved(false); // Reset to let normal flow take over
        } else if (selectedDate === today) {
          console.log("[ManualAttendance] Setting done screen - todaySaved=true");
          // When saving today's attendance, show done screen
          setTodaySaved(true);
          setIsUpdateMode(false);
          setSavedStats({ ...getStats() });
          console.log("[ManualAttendance] Done screen state updated");
        } else {
          console.log("[ManualAttendance] Save successful but not today's date and not update mode");
        }
      } else {
        console.log("[ManualAttendance] Save failed - success is false or undefined");
        const errorMsg = response.data?.error || "Unknown error";
        console.error("[ManualAttendance] Save failed:", errorMsg);
        alert("Failed to save attendance: " + errorMsg);
      }
    } catch (error) {
      console.error("[ManualAttendance] Save error:", error.response?.data || error.message);
      const errorMsg = error.response?.data?.error || error.message || "Network error";
      alert("Failed to save attendance: " + errorMsg);
    } finally {
      setIsSaving(false);
      console.log("[ManualAttendance] ========== SAVE END ==========");
    }
  };

  const handleUpdateAttendance = async () => {
    setShowMenu(false);
    // Fetch records from backend before opening date picker
    try {
      const response = await api.get(`/attendance/sessions/${classId}`);
      if (response.data?.success && response.data?.attendance) {
        const sessions = Array.isArray(response.data.attendance) ? response.data.attendance : [response.data.attendance];
        const recordsMap = {};
        sessions.forEach(s => {
          const sessionDate = toLocalDateKey(s.date);
          recordsMap[sessionDate] = true;
        });
        setBackendRecords(recordsMap);
      }
    } catch (error) {
      console.error("Error fetching attendance records:", error);
      setBackendRecords({});
    }
    setShowDatePicker(true);
  };
  const handleDateSelect = (dateValue) => { setSelectedDate(dateValue); setIsUpdateMode(true); setShowDatePicker(false); };
  const handleCancelUpdate = () => { setIsUpdateMode(false); setSelectedDate(today); };

  const getStats = () => {
    let present = 0, absent = 0;
    Object.values(attendanceData).forEach(s => { if (s === 'P') present++; if (s === 'A') absent++; });
    return { present, absent };
  };

  const stats = getStats();

  const formatDisplayDate = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  // Show done screen only when: (1) today's attendance is saved, (2) not in update mode, (3) viewing today's date
  const showDoneScreen = todaySaved && !isUpdateMode && selectedDate === today;

  const DatePickerModal = () => (
    <div className="fixed inset-0 w-screen h-dvh min-h-screen bg-black/40 backdrop-blur-sm z-[1000] flex items-center justify-center p-4 overflow-y-auto">
      <div ref={modalRef} className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-white">
          <div>
            <h3 className="text-lg font-bold text-gray-800">Update Attendance</h3>
            <p className="text-sm text-gray-500 mt-0.5">Select a date from this week to update</p>
          </div>
          <button onClick={() => setShowDatePicker(false)} className="p-2 rounded-lg hover:bg-gray-100 transition cursor-pointer text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-2 max-h-80 overflow-y-auto">
          {weekDates.map((dateItem) => {
            const dateIsSunday = isSunday(dateItem.value);
            const isTodayDate = dateItem.value === today;
            const hasRecord = backendRecords[dateItem.value] || false;
            return (
              <button
                key={dateItem.value}
                onClick={() => !dateIsSunday && handleDateSelect(dateItem.value)}
                disabled={dateIsSunday}
                className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all group ${
                  dateIsSunday ? 'border-orange-100 bg-orange-50/30 cursor-not-allowed opacity-60' : 'border-gray-100 hover:border-purple-200 hover:bg-purple-50/50 cursor-pointer'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm border transition ${
                    dateIsSunday ? 'bg-orange-100 text-orange-500 border-orange-200' : 'bg-purple-100 text-purple-700 border-purple-200 group-hover:bg-purple-200'
                  }`}>
                    {new Date(dateItem.value + 'T00:00:00').getDate()}
                  </div>
                  <div className="text-left">
                    <div className={`font-semibold transition ${dateIsSunday ? 'text-orange-500' : 'text-gray-800 group-hover:text-purple-800'}`}>{dateItem.dayName}</div>
                    <div className="text-xs text-gray-400">{dateItem.label}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isTodayDate && !dateIsSunday && <span className="text-xs font-medium bg-purple-50 text-purple-600 px-2.5 py-1 rounded-full border border-purple-100">Today</span>}
                  {dateIsSunday ? (
                    <span className="text-xs font-medium bg-orange-100 text-orange-600 px-2.5 py-1 rounded-full border border-orange-200">Day Off</span>
                  ) : hasRecord ? (
                    <span className="text-xs font-medium bg-green-50 text-green-600 px-2.5 py-1 rounded-full border border-green-100">Recorded</span>
                  ) : (
                    <span className="text-xs font-medium bg-gray-50 text-gray-400 px-2.5 py-1 rounded-full border border-gray-100">No record</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
        <div className="p-4 border-t border-gray-100 bg-gray-50/50">
          <p className="text-xs text-gray-400 text-center">You can update attendance for today and the past 6 days (excluding Sundays)</p>
        </div>
      </div>
    </div>
  );

  if (todayIsSunday && !isUpdateMode) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Manual Attendance</h2>
            <p className="text-sm text-gray-500 mt-1">Sunday — No attendance required</p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 border border-orange-200 rounded-lg text-orange-600 text-sm font-semibold">
              <CalendarOff className="w-4 h-4" />
              Day Off
            </div>
            <div className="relative" ref={menuRef}>
              <button onClick={() => setShowMenu(prev => !prev)} className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition cursor-pointer text-gray-500 hover:text-gray-700" title="More options">
                <MoreVertical className="w-5 h-5" />
              </button>
              {showMenu && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
                  <button onClick={handleUpdateAttendance} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition cursor-pointer">
                    <RefreshCw className="w-4 h-4" />
                    Update Attendance
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        {showDatePicker && typeof document !== 'undefined' && createPortal(<DatePickerModal />, document.body)}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <div className="w-20 h-20 rounded-full bg-orange-100 flex items-center justify-center mb-5 border-4 border-orange-200 shadow-sm">
              <CalendarOff className="w-10 h-10 text-orange-500" />
            </div>
            <h3 className="text-2xl font-extrabold text-gray-800 mb-2">It's a Day Off!</h3>
            <p className="text-gray-500 text-sm mb-6 text-center max-w-sm">Sunday is a holiday. No attendance is required today. Enjoy your rest!</p>
            <div className="flex items-center gap-2 text-sm text-gray-400 bg-orange-50 px-4 py-2 rounded-lg border border-orange-100">
              <Calendar className="w-4 h-4" />
              {formatDisplayDate(today)}
            </div>
            <p className="text-xs text-gray-400 mt-6">Need to update a past date? Use the <span className="font-semibold text-gray-500">⋮</span> menu above.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-xl font-bold text-gray-800">{isUpdateMode ? 'Update Attendance' : 'Manual Attendance'}</h2>
          <p className="text-sm text-gray-500 mt-1">
            {isUpdateMode ? `Editing attendance for ${formatDisplayDate(selectedDate)}` : showDoneScreen ? `Attendance already marked for today` : `Mark attendance for today — ${formatDisplayDate(today)}`}
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2 px-4 py-2 bg-purple-50 border border-purple-100 rounded-lg text-purple-700 text-sm font-semibold">
            <Calendar className="w-4 h-4" />
            {isUpdateMode ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Today'}
          </div>
          {isUpdateMode && (
            <button onClick={handleCancelUpdate} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer border border-gray-200">
              <X className="w-4 h-4" />
              Cancel
            </button>
          )}
          {(!showDoneScreen || isUpdateMode) && (
            <button onClick={handleSave} disabled={isSaving || students.length === 0} className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white font-medium rounded-xl hover:bg-purple-700 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
              {isSaving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-5 h-5" />}
              {isUpdateMode ? 'Update Record' : 'Save Record'}
            </button>
          )}
          <div className="relative" ref={menuRef}>
            <button onClick={() => setShowMenu(prev => !prev)} className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition cursor-pointer text-gray-500 hover:text-gray-700" title="More options">
              <MoreVertical className="w-5 h-5" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
                <button onClick={handleUpdateAttendance} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition cursor-pointer">
                  <RefreshCw className="w-4 h-4" />
                  Update Attendance
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showDatePicker && typeof document !== 'undefined' && createPortal(<DatePickerModal />, document.body)}

      {showDoneScreen ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-5 border-4 border-green-200 shadow-sm">
              <CircleCheckBig className="w-10 h-10 text-green-600" />
            </div>
            <h3 className="text-2xl font-extrabold text-gray-800 mb-2">Attendance Marked!</h3>
            <p className="text-gray-500 text-sm mb-8 text-center max-w-sm">Today's attendance has been successfully recorded for this class.</p>
            <div className="flex gap-6 mb-8">
              <div className="flex flex-col items-center bg-green-50 rounded-2xl px-8 py-5 border border-green-100 shadow-sm min-w-[120px]">
                <CheckCircle className="w-6 h-6 text-green-600 mb-2" />
                <span className="text-3xl font-extrabold text-green-700">{savedStats.present}</span>
                <span className="text-xs font-semibold text-green-600 mt-1 uppercase tracking-wide">Present</span>
              </div>
              <div className="flex flex-col items-center bg-red-50 rounded-2xl px-8 py-5 border border-red-100 shadow-sm min-w-[120px]">
                <XCircle className="w-6 h-6 text-red-500 mb-2" />
                <span className="text-3xl font-extrabold text-red-700">{savedStats.absent}</span>
                <span className="text-xs font-semibold text-red-600 mt-1 uppercase tracking-wide">Absent</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-400 bg-gray-50 px-4 py-2 rounded-lg border border-gray-100">
              <Calendar className="w-4 h-4" />
              {formatDisplayDate(today)}
            </div>
            <p className="text-xs text-gray-400 mt-6">Need to make changes? Use the <span className="font-semibold text-gray-500">⋮</span> menu above to update attendance.</p>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          {/* ── Header row with stats + bulk actions ── */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
            <h2 className="text-lg font-bold text-gray-800">Student List</h2>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              {/* Bulk action buttons */}
              {students.length > 0 && (
                <>
                  <button
                    onClick={markAllPresent}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition cursor-pointer"
                    title="Mark all students present"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    All Present
                  </button>
                  <button
                    onClick={markAllAbsent}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition cursor-pointer"
                    title="Mark all students absent"
                  >
                    <XSquare className="w-3.5 h-3.5" />
                    All Absent
                  </button>
                </>
              )}

              {/* Live stats */}
              <div className="flex gap-2 text-sm font-semibold ml-1">
                <div className="bg-green-50 text-green-700 px-3 py-1 rounded-full border border-green-100 shadow-sm">P: {stats.present}</div>
                <div className="bg-red-50 text-red-700 px-3 py-1 rounded-full border border-red-100 shadow-sm">A: {stats.absent}</div>
              </div>
            </div>
          </div>

          {students.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No students enrolled in this class.</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/50 border-y border-gray-100 text-gray-500 text-sm">
                      <th className="py-3 px-4 font-semibold w-16 text-center rounded-tl-xl">S.No</th>
                      <th className="py-3 px-4 font-semibold">Student Name</th>
                      <th className="py-3 px-4 font-semibold w-64 text-center rounded-tr-xl">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {students.map((student, index) => (
                      <tr
                        key={student._id}
                        onClick={() => toggleAttendance(student._id, attendanceData[student._id] === 'P' ? 'A' : 'P')}
                        className="hover:bg-purple-50/30 transition-colors group cursor-pointer"
                      >
                        <td className="py-4 px-4 text-center text-gray-400 font-medium">{index + 1}</td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-sm shrink-0 border border-purple-200">
                              {student.profilePhoto ? (
                                <img src={student.profilePhoto} alt={student.name} className="w-full h-full rounded-full object-cover" />
                              ) : (
                                student.name.charAt(0).toUpperCase()
                              )}
                            </div>
                            <div>
                              <div className="font-semibold text-gray-800 group-hover:text-purple-900 transition-colors">{student.name}</div>
                              <div className="text-xs text-gray-400">{student.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-2 bg-gray-50 p-1.5 rounded-lg border border-gray-100 w-fit mx-auto">
                            <button
                              onClick={() => toggleAttendance(student._id, 'P')}
                              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-bold transition-all cursor-pointer ${
                                attendanceData[student._id] === 'P' ? 'bg-green-100 text-green-700 shadow-sm border border-green-200' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600 border border-transparent'
                              }`}
                            >
                              <CheckCircle className="w-4 h-4" /> Present
                            </button>
                            <button
                              onClick={() => toggleAttendance(student._id, 'A')}
                              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-bold transition-all cursor-pointer ${
                                attendanceData[student._id] === 'A' ? 'bg-red-100 text-red-700 shadow-sm border border-red-200' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600 border border-transparent'
                              }`}
                            >
                              <XCircle className="w-4 h-4" /> Absent
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List */}
              <div className="sm:hidden space-y-2">
                {students.map((student, index) => (
                  <div
                    key={student._id}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer ${
                      attendanceData[student._id] === 'P'
                        ? 'border-green-200 bg-green-50/60'
                        : attendanceData[student._id] === 'A'
                          ? 'border-red-200 bg-red-50/60'
                          : 'border-gray-100 bg-white'
                    }`}
                  >
                    <span className="text-xs text-gray-400 font-medium w-5 shrink-0">{index + 1}</span>
                    <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-sm shrink-0 border border-purple-200">
                      {student.profilePhoto ? (
                        <img src={student.profilePhoto} alt={student.name} className="w-full h-full rounded-full object-cover" />
                      ) : student.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-800 text-sm truncate">{student.name}</div>
                      <div className="text-xs text-gray-400 truncate">{student.email}</div>
                    </div>
                    {/* Toggle tap area */}
                    <div className="flex gap-1.5 shrink-0">
                      <button
                        onClick={() => toggleAttendance(student._id, 'P')}
                        className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                          attendanceData[student._id] === 'P' ? 'bg-green-500 text-white shadow-sm' : 'bg-gray-100 text-gray-400'
                        }`}
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => toggleAttendance(student._id, 'A')}
                        className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                          attendanceData[student._id] === 'A' ? 'bg-red-500 text-white shadow-sm' : 'bg-gray-100 text-gray-400'
                        }`}
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ManualAttendance;