import React, { useState, useEffect, useCallback, useMemo } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Users, UserCheck, QrCode, Save, CheckCircle, XCircle, Check, CalendarOff } from "lucide-react";
import api from "../../api/axios";

const HOLIDAY_KEY_PREFIX = "holidays_";

const getHolidays = (classId) => {
  try {
    return JSON.parse(localStorage.getItem(`${HOLIDAY_KEY_PREFIX}${classId}`) || "[]");
  } catch {
    return [];
  }
};

// Helper to get local date in YYYY-MM-DD format (not UTC)
const getLocalDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const QRAttendance = ({ classId, students, socket, onNavigateToManual }) => {
  const MotionDiv = motion.div;
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isQrActive, setIsQrActive] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [presentStudentIds, setPresentStudentIds] = useState(new Set());
  const [refreshCountdown, setRefreshCountdown] = useState(20);

  // ── Save-to-register state ──────────────────────────────────────
  const [showSaveModal, setShowSaveModal] = useState(false);
  // manualOverrides: studentId → 'P' | 'A' — teacher can tweak before saving
  const [manualOverrides, setManualOverrides] = useState({});
  const [isSavingRecord, setIsSavingRecord] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  // ───────────────────────────────────────────────────────────────

  // ── Today's attendance lock state ───────────────────────────────
  const [isTodayAttendanceLocked, setIsTodayAttendanceLocked] = useState(false);
  const [todayAttendanceMessage, setTodayAttendanceMessage] = useState("");
  const [lockedSessionStats, setLockedSessionStats] = useState({ presentCount: 0, absentCount: 0 });
  // ───────────────────────────────────────────────────────────────

  const today = getLocalDateString();
  const todayDayOff = useMemo(() => {
    const todayDate = new Date(`${today}T00:00:00`);
    if (todayDate.getDay() === 0) {
      return { isDayOff: true, name: "Sunday" };
    }

    const holidays = getHolidays(classId);
    const customHoliday = holidays.find((holiday) => holiday?.date === today);
    if (customHoliday) {
      return { isDayOff: true, name: customHoliday.name || "Holiday" };
    }

    return { isDayOff: false, name: "" };
  }, [classId, today]);

  // ── Helper function to convert dates to YYYY-MM-DD format ──────
  const toLocalDateKey = (value) => {
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
      return value.trim();
    }
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };
  // ───────────────────────────────────────────────────────────────

  // ── Reusable function to check today's attendance lock ─────────
  const checkTodayAttendanceLock = useCallback(async () => {
    try {
      const response = await api.get(`/attendance/sessions/${classId}`);
      const sessions = response.data?.attendance || response.data?.sessions || [];

      const todaySession = sessions.find((session) => {
        const sessionDate = toLocalDateKey(session.date || session.attendanceDate);
        return sessionDate === today && session.status === "completed";
      });

      if (todaySession) {
        setIsTodayAttendanceLocked(true);
        setTodayAttendanceMessage("Attendance for today has already been marked. To update, please use Manual Attendance.");
        const summary = todaySession.summary || {};
        setLockedSessionStats({
          presentCount: summary.presentCount || 0,
          absentCount: summary.absentCount || 0,
        });
      } else {
        setIsTodayAttendanceLocked(false);
        setTodayAttendanceMessage("");
        setLockedSessionStats({ presentCount: 0, absentCount: 0 });
      }
    } catch (error) {
      console.error("[QRAttendance] Error checking today's lock:", error);
      setIsTodayAttendanceLocked(false);
      setTodayAttendanceMessage("");
      setLockedSessionStats({ presentCount: 0, absentCount: 0 });
    }
  }, [classId, today]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handleAttendanceUpdate = ({ studentId }) => {
      setPresentStudentIds((prev) => {
        const next = new Set(prev);
        next.add(studentId);
        return next;
      });
      checkTodayAttendanceLock();
    };

    socket.on("attendance_update", handleAttendanceUpdate);

    return () => {
      socket.off("attendance_update", handleAttendanceUpdate);
    };
  }, [socket, checkTodayAttendanceLock]);

  const fetchToken = useCallback(async () => {
    try {
      const response = await api.get(`/attendance/generate-token/${classId}`);
      if (response.data?.token) {
        setToken(response.data.token);
        setError(null);
        if (socket) socket.emit("refresh_token", { classId, token: response.data.token });
      }
    } catch {
      setError("Failed to load attendance token.");
    } finally {
      setLoading(false);
    }
  }, [classId, socket]);

  useEffect(() => {
    let intervalId;
    let countdownIntervalId;

    if (isQrActive) {
      setLoading(true);
      setRefreshCountdown(20);

      api.get(`/attendance/generate-token/${classId}`)
        .then((res) => {
          if (res.data?.token) {
            setToken(res.data.token);
            setError(null);
            if (socket) socket.emit("start_attendance", { classId, token: res.data.token });
          }
        })
        .catch(() => setError("Failed to load attendance token."))
        .finally(() => setLoading(false));

      intervalId = setInterval(() => {
        setRefreshCountdown(20);
        fetchToken();
      }, 20000);

      countdownIntervalId = setInterval(() => {
        setRefreshCountdown((prev) => (prev <= 1 ? 20 : prev - 1));
      }, 1000);
    } else {
      setToken("");
      setRefreshCountdown(20);
      if (socket) socket.emit("stop_attendance", classId);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (countdownIntervalId) clearInterval(countdownIntervalId);
    };
  }, [isQrActive, classId, socket, fetchToken]);

  useEffect(() => {
    if (classId) checkTodayAttendanceLock();
  }, [classId, checkTodayAttendanceLock]);

  useEffect(() => {
    if (!classId) return;
    const pollInterval = setInterval(() => {
      checkTodayAttendanceLock();
    }, 5001);
    return () => clearInterval(pollInterval);
  }, [classId, checkTodayAttendanceLock]);

  const handleToggleQr = () => { 
    if (!isTodayAttendanceLocked) {
      setIsQrActive(!isQrActive);
    }
  };

  // Refresh lock status when opening the QR modal
  const handleOpenQrModal = () => {
    checkTodayAttendanceLock();
    setShowQrModal(true);
  };

  // ── Open the save-to-register modal ──────────────────────────
  const handleOpenSaveModal = () => {
    // pre-fill overrides: scanned = P, rest = A
    const overrides = {};
    students.forEach(s => {
      overrides[s._id] = presentStudentIds.has(s._id) ? 'P' : 'A';
    });
    setManualOverrides(overrides);
    setSavedSuccess(false);
    setShowSaveModal(true);
  };

  const toggleOverride = (studentId) => {
    setManualOverrides(prev => ({ ...prev, [studentId]: prev[studentId] === 'P' ? 'A' : 'P' }));
  };

  const markAllInModal = (status) => {
    const overrides = {};
    students.forEach(s => { overrides[s._id] = status; });
    setManualOverrides(overrides);
  };

  const getModalStats = () => {
    let p = 0, a = 0;
    Object.values(manualOverrides).forEach(v => { if (v === 'P') p++; if (v === 'A') a++; });
    return { present: p, absent: a };
  };

  const handleSaveToRegister = async () => {
    setIsSavingRecord(true);
    try {
      console.log("[QRAttendance] Saving record with:", {
        classId,
        date: today,
        attendance: Object.keys(manualOverrides).length,
      });

      const response = await api.post(`/attendance/save-record/${classId}`, {
        date: today,
        attendance: manualOverrides,
      });

      console.log("[QRAttendance] Save response:", response.data);

      if (response.data?.success) {
        setSavedSuccess(true);
      } else {
        const errorMsg = response.data?.error || "Unknown error";
        console.error("[QRAttendance] Save failed:", errorMsg);
        alert("Failed to save attendance: " + errorMsg);
      }
    } catch (error) {
      console.error("[QRAttendance] Save error:", error.response?.data || error.message);
      const errorMsg = error.response?.data?.error || error.message || "Network error";
      alert("Failed to save attendance: " + errorMsg);
    } finally {
      setIsSavingRecord(false);
    }
  };
  // ─────────────────────────────────────────────────────────────

  const modalStats = getModalStats();

  if (todayDayOff.isDayOff) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Live QR Session</h2>
            <p className="text-sm text-gray-500 mt-1">{todayDayOff.name} - Day off. QR attendance is disabled.</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 border border-orange-200 rounded-lg text-orange-600 text-sm font-semibold">
            <CalendarOff className="w-4 h-4" />
            Day Off
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <div className="w-20 h-20 rounded-full bg-orange-100 flex items-center justify-center mb-5 border-4 border-orange-200 shadow-sm">
              <CalendarOff className="w-10 h-10 text-orange-500" />
            </div>
            <h3 className="text-2xl font-extrabold text-gray-800 mb-2">It's a Day Off!</h3>
            <p className="text-gray-500 text-sm mb-6 text-center max-w-sm">
              {todayDayOff.name === "Sunday"
                ? "Sunday is a holiday. No attendance is required today."
                : `${todayDayOff.name} is marked as a holiday. No QR attendance is required today.`}
            </p>
            <button
              onClick={onNavigateToManual}
              className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-all shadow-md hover:shadow-lg cursor-pointer"
            >
              Go to Manual Attendance
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Live QR Session</h2>
          <p className="text-sm text-gray-500 mt-1">Start a real-time QR attendance session</p>
        </div>

        <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
          {isTodayAttendanceLocked ? (
            <div className="flex items-center gap-3 bg-emerald-50 text-emerald-700 px-4 py-2.5 rounded-lg text-sm font-medium border border-emerald-200 flex-1 sm:flex-none">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m7 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="truncate">{todayAttendanceMessage}</span>
            </div>
          ) : null}

          {/* Save to Register button — shown when ≥1 student scanned */}
          {!isTodayAttendanceLocked && presentStudentIds.size > 0 && (
            <button
              onClick={handleOpenSaveModal}
              className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              Save to Register
            </button>
          )}

          <button
            onClick={handleOpenQrModal}
            disabled={isTodayAttendanceLocked}
            className={`flex-1 sm:flex-none text-white px-6 py-2.5 rounded-xl font-medium shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
              isTodayAttendanceLocked 
                ? "bg-gray-400 cursor-not-allowed opacity-60" 
                : "bg-purple-600 hover:bg-purple-700 hover:shadow-lg"
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4h2v-4zM6 8v4M6 12v4M6 16v4M6 8H4m2 0h2m-2 4H4m2 0h2m-2 4H4m2 0h2m12-16v4m0 4v4m0 4v4m0-12h-2m2 0h2m-2 4h-2m2 0h2m-2 4h-2m2 0h2m-2 4h-2m2 0h2" />
            </svg>
            {isTodayAttendanceLocked ? "QR Unavailable" : "Open QR Scanner"}
          </button>
        </div>
      </div>

      {/* Present Students Panel — Hidden when locked */}
      {!isTodayAttendanceLocked && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 p-2 rounded-lg">
                <UserCheck className="w-5 h-5 text-green-700" />
              </div>
              <h2 className="text-lg font-bold text-gray-800">Present Students</h2>
            </div>
            <div className="bg-green-50 text-green-700 border border-green-200 px-4 py-1.5 rounded-full text-sm font-bold shadow-sm">
              {presentStudentIds.size} / {students.length}
            </div>
          </div>

          {students.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No students enrolled in this class.</p>
            </div>
          ) : presentStudentIds.size === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200 shadow-sm border-dashed">
              <QrCode className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Waiting for students to scan...</p>
              {!isQrActive && <p className="text-sm text-gray-400 mt-2">Open QR Scanner to begin</p>}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {students.filter(s => presentStudentIds.has(s._id)).map((student) => (
                <MotionDiv
                  key={student._id}
                  layout
                  className="p-4 rounded-xl border bg-green-50 border-green-200 shadow-sm hover:shadow-md flex items-center justify-between transition-all duration-200"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm bg-green-500">
                      {student.profilePhoto ? (
                        <img src={student.profilePhoto} alt={student.name} className="w-full h-full rounded-full object-cover" />
                      ) : student.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="truncate">
                      <div className="font-semibold truncate text-gray-900">{student.name}</div>
                      <div className="text-xs text-gray-500 truncate">{student.email}</div>
                    </div>
                  </div>
                  <div className="shrink-0 ml-2">
                    <div className="bg-green-100 text-green-700 p-1 rounded-full">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                </MotionDiv>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Attendance Marked / Locked Completion Box */}
      {isTodayAttendanceLocked && (
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
        >
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-5 border-4 border-green-200 shadow-sm">
              <svg className="w-10 h-10 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-2xl font-extrabold text-gray-800 mb-2">Attendance Marked!</h3>
            <p className="text-gray-500 text-sm mb-8 text-center max-w-sm">Today's attendance has been successfully recorded for this class.</p>
            <div className="flex gap-6 mb-8">
              <div className="flex flex-col items-center bg-green-50 rounded-2xl px-8 py-5 border border-green-100 shadow-sm min-w-[120px]">
                <svg className="w-6 h-6 text-green-600 mb-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-3xl font-extrabold text-green-700">{lockedSessionStats.presentCount}</span>
                <span className="text-xs font-semibold text-green-600 mt-1 uppercase tracking-wide">Present</span>
              </div>
              <div className="flex flex-col items-center bg-red-50 rounded-2xl px-8 py-5 border border-red-100 shadow-sm min-w-[120px]">
                <svg className="w-6 h-6 text-red-500 mb-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span className="text-3xl font-extrabold text-red-700">{lockedSessionStats.absentCount}</span>
                <span className="text-xs font-semibold text-red-600 mt-1 uppercase tracking-wide">Absent</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-400 bg-gray-50 px-4 py-2 rounded-lg border border-gray-100 mb-6">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </div>
            <p className="text-xs text-gray-400">Need to make changes? Use the <span className="font-semibold text-gray-500">Go to Manual Attendance</span> button below to update.</p>
            <button
              onClick={onNavigateToManual}
              className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-all shadow-md hover:shadow-lg cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Go to Manual Attendance
            </button>
          </div>
        </MotionDiv>
      )}

      {/* QR Modal */}
      <AnimatePresence>
        {showQrModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <MotionDiv
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md relative overflow-hidden"
            >
              <div className="p-8">
                <button onClick={() => setShowQrModal(false)} className="absolute top-5 right-5 text-gray-400 hover:text-gray-800 p-2 bg-gray-50 hover:bg-gray-100 rounded-full transition-colors cursor-pointer">
                  <X size={20} />
                </button>
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">QR Session</h2>
                  <p className="text-gray-500 mb-8 text-sm px-4">
                    {isQrActive ? "Ask students to scan this QR code with their app to mark attendance." : "Click 'Open QR Session' below to generate a new attendance code."}
                  </p>
                  <div className="flex justify-center items-center mb-8 h-72 bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden relative mx-auto p-4 shadow-inner">
                    {!isQrActive ? (
                      <div className="text-gray-400 flex flex-col items-center">
                        <div className="bg-white p-4 rounded-full shadow-sm mb-3">
                          <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4h2v-4zM6 8v4M6 12v4M6 16v4M6 8H4m2 0h2m-2 4H4m2 0h2m-2 4H4m2 0h2m12-16v4m0 4v4m0 4v4m0-12h-2m2 0h2m-2 4h-2m2 0h2m-2 4h-2m2 0h2m-2 4h-2m2 0h2" />
                          </svg>
                        </div>
                        <span className="font-medium text-gray-500">QR is currently closed</span>
                      </div>
                    ) : loading && !token ? (
                      <div className="flex flex-col items-center gap-3">
                        <div className="animate-spin h-10 w-10 border-4 border-purple-200 border-t-purple-600 rounded-full"></div>
                        <span className="text-sm font-medium text-purple-600">Generating code...</span>
                      </div>
                    ) : error ? (
                      <div className="text-red-500 font-medium px-4">{error}</div>
                    ) : (
                      <div className="bg-white p-3 rounded-xl shadow-md border border-gray-100 transition-transform hover:scale-105 duration-300">
                        <QRCodeCanvas value={token} size={220} level={"H"} includeMargin={true} />
                      </div>
                    )}
                  </div>
                  {isQrActive && (
                    <div className="flex items-center justify-center gap-2 text-sm text-purple-700 font-bold bg-purple-50 border border-purple-100 py-2.5 px-5 rounded-full mx-auto w-fit mb-8 shadow-sm">
                      <svg className="w-4 h-4 animate-spin-slow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Auto-updates in {refreshCountdown}s
                    </div>
                  )}
                  <button
                    onClick={handleToggleQr}
                    className={`w-full py-3.5 px-4 rounded-xl font-bold text-white transition-all duration-200 transform active:scale-[0.98] cursor-pointer shadow-lg ${
                      isQrActive ? "bg-red-500 hover:bg-red-600 shadow-red-200" : "bg-purple-600 hover:bg-purple-700 shadow-purple-200"
                    }`}
                  >
                    {isQrActive ? "End Session & Close QR" : "Open QR Session"}
                  </button>
                </div>
              </div>
            </MotionDiv>
          </div>
        )}
      </AnimatePresence>

      {/* ── Save-to-Register Modal ─────────────────────────────────── */}
      <AnimatePresence>
        {showSaveModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <MotionDiv
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
            >
              {savedSuccess ? (
                /* Success screen */
                <div className="flex flex-col items-center justify-center py-14 px-8">
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4 border-4 border-green-200">
                    <Check className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-xl font-extrabold text-gray-800 mb-1">Saved to Register!</h3>
                  <p className="text-sm text-gray-500 mb-6 text-center">Today's QR attendance has been recorded in the Attendance Register.</p>
                  <div className="flex gap-4 mb-6">
                    <div className="flex flex-col items-center bg-green-50 rounded-xl px-6 py-4 border border-green-100 min-w-[100px]">
                      <span className="text-2xl font-extrabold text-green-700">{modalStats.present}</span>
                      <span className="text-xs font-semibold text-green-600 mt-1 uppercase">Present</span>
                    </div>
                    <div className="flex flex-col items-center bg-red-50 rounded-xl px-6 py-4 border border-red-100 min-w-[100px]">
                      <span className="text-2xl font-extrabold text-red-700">{modalStats.absent}</span>
                      <span className="text-xs font-semibold text-red-600 mt-1 uppercase">Absent</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowSaveModal(false)}
                    className="px-6 py-2.5 bg-gray-800 text-white rounded-xl font-medium hover:bg-gray-700 transition cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <>
                  {/* Modal Header */}
                  <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gradient-to-r from-green-50 to-white">
                    <div>
                      <h3 className="text-lg font-bold text-gray-800">Save QR Session to Register</h3>
                      <p className="text-sm text-gray-500 mt-0.5">
                        Review & adjust before saving — <span className="text-green-600 font-semibold">{presentStudentIds.size} scanned</span>, {students.length - presentStudentIds.size} unmarked
                      </p>
                    </div>
                    <button onClick={() => setShowSaveModal(false)} className="p-2 rounded-lg hover:bg-gray-100 transition cursor-pointer text-gray-400 hover:text-gray-600">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Bulk actions inside modal */}
                  <div className="px-5 pt-4 pb-2 flex items-center gap-2 border-b border-gray-50">
                    <span className="text-xs text-gray-500 font-medium mr-1">Bulk:</span>
                    <button
                      onClick={() => markAllInModal('P')}
                      className="flex items-center gap-1 px-3 py-1 text-xs font-semibold bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition cursor-pointer"
                    >
                      <CheckCircle className="w-3 h-3" /> All Present
                    </button>
                    <button
                      onClick={() => markAllInModal('A')}
                      className="flex items-center gap-1 px-3 py-1 text-xs font-semibold bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 transition cursor-pointer"
                    >
                      <XCircle className="w-3 h-3" /> All Absent
                    </button>
                    <div className="ml-auto flex gap-2 text-xs font-semibold">
                      <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded-full border border-green-100">P: {modalStats.present}</span>
                      <span className="bg-red-50 text-red-700 px-2 py-0.5 rounded-full border border-red-100">A: {modalStats.absent}</span>
                    </div>
                  </div>

                  {/* Student list */}
                  <div className="overflow-y-auto max-h-80 divide-y divide-gray-50">
                    {students.map((student) => {
                      const scanned = presentStudentIds.has(student._id);
                      const status = manualOverrides[student._id];
                      return (
                        <div key={student._id} className={`flex items-center gap-3 px-5 py-3 transition-colors ${status === 'P' ? 'bg-green-50/40' : 'bg-red-50/20'}`}>
                          <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-xs shrink-0 border border-purple-200">
                            {student.profilePhoto ? (
                              <img src={student.profilePhoto} alt={student.name} className="w-full h-full rounded-full object-cover" />
                            ) : student.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-gray-800 text-sm truncate">{student.name}</div>
                            {scanned && (
                              <span className="text-[10px] text-green-600 font-medium bg-green-100 px-1.5 py-0.5 rounded">Scanned QR</span>
                            )}
                          </div>
                          {/* Toggle button */}
                          <button
                            onClick={() => toggleOverride(student._id)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                              status === 'P'
                                ? 'bg-green-100 text-green-700 border-green-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200'
                                : 'bg-red-100 text-red-700 border-red-200 hover:bg-green-50 hover:text-green-600 hover:border-green-200'
                            }`}
                          >
                            {status === 'P' ? <><CheckCircle className="w-3.5 h-3.5" /> Present</> : <><XCircle className="w-3.5 h-3.5" /> Absent</>}
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Footer */}
                  <div className="p-5 border-t border-gray-100 flex items-center gap-3">
                    <button onClick={() => setShowSaveModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition cursor-pointer">
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveToRegister}
                      disabled={isSavingRecord}
                      className="flex-1 py-2.5 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
                    >
                      {isSavingRecord ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      Save to Register
                    </button>
                  </div>
                </>
              )}
            </MotionDiv>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default QRAttendance;