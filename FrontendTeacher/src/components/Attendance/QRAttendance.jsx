import React, { useState, useEffect, useCallback } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Users, UserCheck, QrCode, Save, CheckCircle, XCircle, Check } from "lucide-react";
import api from "../../api/axios";

// Helper to get local date in YYYY-MM-DD format (not UTC)
const getLocalDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const QRAttendance = ({ classId, students, socket }) => {
  const MotionDiv = motion.div;
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isQrActive, setIsQrActive] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [presentStudentIds, setPresentStudentIds] = useState(new Set());
  const [activeUsersCount, setActiveUsersCount] = useState(0);

  // ── Save-to-register state ──────────────────────────────────────
  const [showSaveModal, setShowSaveModal] = useState(false);
  // manualOverrides: studentId → 'P' | 'A' — teacher can tweak before saving
  const [manualOverrides, setManualOverrides] = useState({});
  const [isSavingRecord, setIsSavingRecord] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  // ───────────────────────────────────────────────────────────────

  const today = getLocalDateString();

  // Socket event listeners - use socket passed from parent
  useEffect(() => {

    if (!socket) {
      console.log("[QRAttendance] Socket not available yet");
      return;
    }

    console.log("[QRAttendance] Setting up socket listeners");

    const handleAttendanceUpdate = ({ studentId }) => {
      console.log("[QRAttendance] attendance_update received for:", studentId);
      setPresentStudentIds((prev) => {
        const newSet = new Set(prev);
        newSet.add(studentId);
        return newSet;
      });
    };

    const handleActiveUsersUpdate = ({ count }) => {
      console.log("[QRAttendance] active_users_update:", count);
      setActiveUsersCount(count);
    };

    const handleDisconnect = () => {
      console.log("[QRAttendance] Socket disconnected");
    };

    socket.on("attendance_update", handleAttendanceUpdate);
    socket.on("active_users_update", handleActiveUsersUpdate);
    socket.on("disconnect", handleDisconnect);

    // Cleanup old listeners when component remounts or socket changes
    return () => {
      console.log("[QRAttendance] Cleaning up socket listeners (not disconnecting socket)");
      socket.off("attendance_update", handleAttendanceUpdate);
      socket.off("active_users_update", handleActiveUsersUpdate);
      socket.off("disconnect", handleDisconnect);
    };
  }, [socket]);
  const fetchToken = useCallback(async () => {
    try {
      const response = await api.get(`/attendance/generate-token/${classId}`);
      if (response.data && response.data.token) {
        setToken(response.data.token);
        setError(null);
        if (socket) socket.emit("start_attendance", { classId, token: response.data.token });
      }
    } catch (err) {
      console.error("Error fetching attendance token:", err);
      setError("Failed to load attendance token.");
    } finally {
      setLoading(false);
    }
  }, [classId, socket]);

  useEffect(() => {
    let intervalId;
    if (isQrActive) {
      setLoading(true);
      fetchToken();
      intervalId = setInterval(fetchToken, 20000);
    } else {
      setToken("");
      if (socket) socket.emit("stop_attendance", classId);
    }
    return () => { if (intervalId) clearInterval(intervalId); };
  }, [isQrActive, classId, socket, fetchToken]);

  const handleToggleQr = () => { setIsQrActive(!isQrActive); };

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
        await new Promise(r => setTimeout(r, 700));
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Live QR Session</h2>
          <p className="text-sm text-gray-500 mt-1">Start a real-time QR attendance session</p>
        </div>

        <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
          <div className="hidden sm:flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-lg text-sm font-medium border border-blue-100">
            <Users className="w-4 h-4" />
            Active Users: {activeUsersCount}
          </div>

          {/* Save to Register button — shown when ≥1 student scanned */}
          {presentStudentIds.size > 0 && (
            <button
              onClick={handleOpenSaveModal}
              className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              Save to Register
            </button>
          )}

          <button
            onClick={() => setShowQrModal(true)}
            className="flex-1 sm:flex-none bg-purple-600 hover:bg-purple-700 text-white px-6 py-2.5 rounded-xl font-medium shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4h2v-4zM6 8v4M6 12v4M6 16v4M6 8H4m2 0h2m-2 4H4m2 0h2m-2 4H4m2 0h2m12-16v4m0 4v4m0 4v4m0-12h-2m2 0h2m-2 4h-2m2 0h2m-2 4h-2m2 0h2m-2 4h-2m2 0h2" />
            </svg>
            Open QR Scanner
          </button>
        </div>
      </div>

      {/* Present Students Panel */}
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
                      Auto-updates every 20s
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