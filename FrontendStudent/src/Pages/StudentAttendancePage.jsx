import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Scanner } from "@yudiel/react-qr-scanner";
import io from "socket.io-client";
import { motion, AnimatePresence } from "framer-motion";
import {
    ChevronLeft,
    QrCode,
    CalendarDays,
    Camera,
    Loader2,
    CheckCircle,
    AlertCircle,
    CheckCheck,
    XCircle,
    Clock3,
    ShieldCheck,
    RefreshCw,
    TrendingUp,
    BarChart2,
    PieChart as PieChartIcon
} from "lucide-react";
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    PieChart,
    Pie,
    Cell,
} from "recharts";
import { getStoredUser } from "../utils/authStorage";
import { SOCKET_URL } from "../config";
import { getMyAttendanceSummary } from "../api/attendanceApi";

const STATUS_STYLE = {
    present: "bg-emerald-100 text-emerald-700",
    absent: "bg-rose-100 text-rose-700",
    late: "bg-amber-100 text-amber-700",
    excused: "bg-sky-100 text-sky-700",
};

const STATUS_LABEL = {
    present: "Present",
    absent: "Absent",
    late: "Late",
    excused: "Excused",
};

const METHOD_LABEL = {
    qr: "QR Scan",
    manual: "Manual",
    system: "System",
};

const formatDate = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("en-IN", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
};

const formatTime = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
    });
};

const toLocalDateKey = (value) => {
    if (!value) return "";
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
        return value.trim();
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

const getWeekStartInfo = (d) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const startOfWeek = new Date(date.setDate(diff));
    
    const dayMonth = startOfWeek.getDate();
    const month = startOfWeek.toLocaleDateString("en-US", { month: "short" });
    const year = startOfWeek.getFullYear();
    const monthNum = String(startOfWeek.getMonth() + 1).padStart(2, "0");
    const dayNum = String(startOfWeek.getDate()).padStart(2, "0");
    
    return {
        key: `W-${year}-${monthNum}-${dayNum}`,
        label: `Week of ${dayMonth} ${month}`
    };
};

const StudentAttendancePage = () => {
    const navigate = useNavigate();
    const { id: classId, panel } = useParams();

    const socketRef = useRef(null);
    const [user, setUser] = useState(null);

    const validPanels = new Set(["scan", "history", "analysis"]);
    const activeTab = validPanels.has(panel) ? panel : "history";

    const [scanStatus, setScanStatus] = useState("idle");
    const [scanMessage, setScanMessage] = useState("");

    const [timeFilter, setTimeFilter] = useState("daily"); // daily, weekly, monthly, yearly

    const [summaryLoading, setSummaryLoading] = useState(false);
    const [summaryError, setSummaryError] = useState("");
    const [summaryData, setSummaryData] = useState(null);
    const [isTodayAttendanceLocked, setIsTodayAttendanceLocked] = useState(false);
    const [todayAttendanceMessage, setTodayAttendanceMessage] = useState("");

    useEffect(() => {
        const storedUser = getStoredUser();
        if (!storedUser) {
            navigate("/login", { replace: true });
            return;
        }
        setUser(storedUser);
    }, [navigate]);

    useEffect(() => {
        if (!classId) return;
        if (validPanels.has(panel)) return;
        navigate(`/course/${classId}/attendance/history`, { replace: true });
    }, [classId, panel, navigate]);

    useEffect(() => {
        if (!user || activeTab !== "scan") return undefined;

        const socket = io(SOCKET_URL);
        socketRef.current = socket;

        const onSuccess = (payload) => {
            const nextMessage = payload?.message || "Attendance marked successfully";
            setScanStatus("success");
            setScanMessage(nextMessage);
            setIsTodayAttendanceLocked(true);
            setTodayAttendanceMessage("Today's attendance is already marked.");
        };

        const onError = (payload) => {
            const nextMessage =
                typeof payload === "string"
                    ? payload
                    : payload?.message ||
                        "Unable to mark attendance. Please try again.";

            const normalizedMessage = String(nextMessage).toLowerCase();
            const isAlreadyMarked = normalizedMessage.includes("already marked");

            if (isAlreadyMarked) {
                setScanStatus("success");
                setScanMessage(nextMessage);
                setIsTodayAttendanceLocked(true);
                setTodayAttendanceMessage("Today's attendance is already marked.");
                return;
            }

            setScanStatus("error");
            setScanMessage(nextMessage);
        };

        socket.on("attendance_success", onSuccess);
        socket.on("attendance_error", onError);

        return () => {
            socket.off("attendance_success", onSuccess);
            socket.off("attendance_error", onError);
            socket.disconnect();
            socketRef.current = null;
        };
    }, [activeTab, user]);

    const loadMyAttendance = async () => {
        if (!classId) return;

        setSummaryLoading(true);
        setSummaryError("");
        try {
            const response = await getMyAttendanceSummary(classId);
            setSummaryData(response);
        } catch (error) {
            const fallback = "Unable to load attendance records right now.";
            setSummaryError(error.response?.data?.error || fallback);
        } finally {
            setSummaryLoading(false);
        }
    };

    const syncTodayAttendanceLock = async () => {
        if (!classId) return;

        try {
            const response = await getMyAttendanceSummary(classId);
            const records = Array.isArray(response?.records) ? response.records : [];
            const todayKey = toLocalDateKey(new Date());

            const todayRecord = records.find((record) => {
                const recordKey = toLocalDateKey(record.attendanceDate);
                const status = String(record.status || "").toLowerCase();
                const isFinalStatus = ["present", "absent", "late", "excused"].includes(status);
                return recordKey === todayKey && isFinalStatus;
            });

            if (todayRecord) {
                const statusLabel = STATUS_LABEL[todayRecord.status] || todayRecord.status;
                setIsTodayAttendanceLocked(true);
                setTodayAttendanceMessage(`Today's attendance is already marked as ${statusLabel}.`);
                setScanStatus("success");
                setScanMessage(`Already marked: ${statusLabel}`);
                return;
            }

            setIsTodayAttendanceLocked(false);
            setTodayAttendanceMessage("");
        } catch {
            // Keep scanner usable on transient failures.
            setIsTodayAttendanceLocked(false);
            setTodayAttendanceMessage("");
        }
    };

    useEffect(() => {
        if (activeTab === "scan" && user) {
            syncTodayAttendanceLock();
        }
    }, [activeTab, user, classId]);

    useEffect(() => {
        if (activeTab === "history" && user) {
            loadMyAttendance();
        }
    }, [activeTab, user, classId]);

    useEffect(() => {
        if (activeTab !== "history" || !user || !classId) return undefined;

        const intervalId = window.setInterval(() => {
            if (document.visibilityState === "visible") {
                loadMyAttendance();
            }
        }, 15001);

        return () => window.clearInterval(intervalId);
    }, [activeTab, user, classId]);

    const handleScan = (results) => {
        if (isTodayAttendanceLocked) return;
        if (scanStatus !== "idle" || !user || !socketRef.current) return;
        const token = results?.[0]?.rawValue?.trim();
        if (!token) return;

        setScanStatus("processing");
        setScanMessage("");

        socketRef.current.emit("mark_attendance", {
            classId,
            studentId: user.id || user._id,
            studentName: user.name,
            token,
        });
    };

    const summary = summaryData?.summary || {
        attendancePercentage: 0,
        totalSessions: 0,
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
    };

    const records = useMemo(() => {
        const items = summaryData?.records || [];
        return [...items].sort(
            (a, b) => new Date(b.attendanceDate).getTime() - new Date(a.attendanceDate).getTime()
        );
    }, [summaryData]);

    const aggregatedChartData = useMemo(() => {
        if (!records.length) return [];
        const groupedData = {};

        records.forEach(r => {
            const dateObj = new Date(r.attendanceDate);
            if (Number.isNaN(dateObj.getTime())) return;
            
            let key = "";
            let label = "";

            if (timeFilter === "daily") {
                key = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                label = key;
            } else if (timeFilter === "weekly") {
                const weekInfo = getWeekStartInfo(dateObj);
                key = weekInfo.key;
                label = weekInfo.label;
            } else if (timeFilter === "monthly") {
                key = dateObj.toLocaleDateString("en-US", { month: "short", year: "numeric" });
                label = key;
            } else if (timeFilter === "yearly") {
                key = dateObj.getFullYear().toString();
                label = key;
            }

            if (!groupedData[key]) {
                groupedData[key] = {
                    name: label,
                    presentCount: 0,
                    absentCount: 0,
                    totalCount: 0,
                    dateVal: dateObj.getTime(),
                };
            }

            const isPres = ["present", "late", "excused"].includes(r.status);
            if (isPres) groupedData[key].presentCount += 1;
            else if (r.status === "absent") groupedData[key].absentCount += 1;

            groupedData[key].totalCount += 1;
        });

        return Object.values(groupedData)
            .map((item) => {
                const total = item.totalCount || 0;
                const attendancePct = total ? Math.round((item.presentCount / total) * 100) : 0;
                const absentPct = total ? Math.round((item.absentCount / total) * 100) : 0;

                return {
                    name: item.name,
                    Attendance: attendancePct,
                    Absent: absentPct,
                    Sessions: total,
                    dateVal: item.dateVal,
                };
            })
            .sort((a, b) => a.dateVal - b.dateVal);
    }, [records, timeFilter]);

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col pt-6 pb-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto w-full space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex flex-col gap-1">
                        <button
                            onClick={() => navigate(`/course/${classId}/notes`)}
                            className="flex items-center gap-1 text-sm font-medium text-purple-600 hover:text-purple-700 transition w-fit cursor-pointer bg-purple-50 px-3 py-1.5 rounded-lg"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            Back to Course
                        </button>
                        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mt-2">
                            Attendance Hub
                        </h1>
                        <p className="text-gray-500">
                            Scan live QR and track your personal attendance timeline
                        </p>
                    </div>
                </div>

                <div className="flex p-1 space-x-2 bg-white rounded-2xl shadow-sm border border-gray-100 max-w-2xl overflow-x-auto">
                    <button
                        onClick={() => navigate(`/course/${classId}/attendance/scan`)}
                        className={`flex-1 flex justify-center items-center gap-2 py-3 px-4 text-sm font-bold rounded-xl whitespace-nowrap transition-all duration-200 cursor-pointer ${
                            activeTab === "scan"
                                ? "bg-purple-600 text-white shadow-md"
                                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                        }`}
                    >
                        <QrCode className="w-4 h-4" />
                        QR Scan
                    </button>
                    <button
                        onClick={() => navigate(`/course/${classId}/attendance/history`)}
                        className={`flex-1 flex justify-center items-center gap-2 py-3 px-4 text-sm font-bold rounded-xl whitespace-nowrap transition-all duration-200 cursor-pointer ${
                            activeTab === "history"
                                ? "bg-purple-600 text-white shadow-md"
                                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                        }`}
                    >
                        <CalendarDays className="w-4 h-4" />
                        My Attendance
                    </button>
                    <button
                        onClick={() => navigate(`/course/${classId}/attendance/analysis`)}
                        className={`flex-1 flex justify-center items-center gap-2 py-3 px-4 text-sm font-bold rounded-xl whitespace-nowrap transition-all duration-200 cursor-pointer ${
                            activeTab === "analysis"
                                ? "bg-purple-600 text-white shadow-md"
                                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                        }`}
                    >
                        <TrendingUp className="w-4 h-4" />
                        Analytics
                    </button>
                </div>

                <div className="w-full relative">
                    {activeTab === "scan" ? (
                        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 sm:p-7">
                            <div className="mb-6 text-center">
                                <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Camera className="w-8 h-8" />
                                </div>
                                <h2 className="text-2xl font-bold text-gray-900">Scan Attendance QR</h2>
                                <p className="text-gray-500 mt-2">
                                    Point your camera at the teacher QR code to mark your attendance.
                                </p>
                            </div>

                            <div className="relative rounded-2xl overflow-hidden aspect-square bg-black shadow-inner mx-auto max-w-[340px]">
                                {scanStatus === "idle" && !isTodayAttendanceLocked && (
                                    <Scanner
                                        onScan={handleScan}
                                        onError={() => {}}
                                        scanDelay={500}
                                        allowMultiple={true}
                                        styles={{
                                            container: { width: "100%", height: "100%" },
                                            video: { objectFit: "cover" },
                                        }}
                                        components={{
                                            audio: false,
                                            onOff: false,
                                            torch: false,
                                            zoom: false,
                                            finder: false,
                                        }}
                                    />
                                )}

                                <AnimatePresence>
                                    {scanStatus === "processing" && (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center z-20"
                                        >
                                            <Loader2 className="w-14 h-14 text-purple-600 animate-spin mb-3" />
                                            <p className="font-semibold text-gray-800">Verifying attendance...</p>
                                        </motion.div>
                                    )}

                                    {scanStatus === "success" && !isTodayAttendanceLocked && (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="absolute inset-0 bg-emerald-50/95 flex flex-col items-center justify-center z-20 px-4"
                                        >
                                            <CheckCircle className="w-16 h-16 text-emerald-500 mb-3" />
                                            <p className="font-bold text-gray-900 text-xl">Attendance Marked</p>
                                            <p className="text-emerald-700 text-center mt-1">{scanMessage}</p>
                                            {!isTodayAttendanceLocked && (
                                                <button
                                                    onClick={() => {
                                                        setScanStatus("idle");
                                                        setScanMessage("");
                                                    }}
                                                    className="mt-5 px-5 py-2 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition cursor-pointer"
                                                >
                                                    Scan Again
                                                </button>
                                            )}
                                        </motion.div>
                                    )}

                                    {scanStatus === "error" && (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="absolute inset-0 bg-rose-50/95 flex flex-col items-center justify-center z-20 px-4"
                                        >
                                            <AlertCircle className="w-16 h-16 text-rose-500 mb-3" />
                                            <p className="font-bold text-gray-900 text-xl">Could Not Mark</p>
                                            <p className="text-rose-700 text-center mt-1">{scanMessage}</p>
                                            <button
                                                onClick={() => {
                                                    setScanStatus("idle");
                                                    setScanMessage("");
                                                }}
                                                className="mt-5 px-5 py-2 rounded-xl border border-rose-200 bg-white text-rose-700 font-semibold hover:bg-rose-50 transition cursor-pointer"
                                            >
                                                Try Again
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {scanStatus === "idle" && !isTodayAttendanceLocked && (
                                    <div className="absolute inset-0 border-[24px] border-black/25 pointer-events-none">
                                        <div className="absolute inset-0 border-2 border-white/50 rounded-lg">
                                            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-purple-500 rounded-tl-lg" />
                                            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-purple-500 rounded-tr-lg" />
                                            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-purple-500 rounded-bl-lg" />
                                            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-purple-500 rounded-br-lg" />
                                        </div>
                                    </div>
                                )}

                                {isTodayAttendanceLocked && (
                                    <div className="absolute inset-0 bg-emerald-50 flex flex-col items-center justify-center z-30 px-6 text-center">
                                        <ShieldCheck className="w-16 h-16 text-emerald-500 mb-3" />
                                        <p className="font-bold text-gray-900 text-xl">Attendance Finalized</p>
                                        <p className="text-emerald-700 mt-1">
                                            {todayAttendanceMessage || "Today's attendance is already marked."}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : activeTab === "history" ? (
                        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 sm:p-7 space-y-6">
                            <div className="flex items-center justify-between gap-3 flex-wrap">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900">My Attendance</h2>
                                    <p className="text-gray-500 mt-1">
                                        Session-wise details fetched directly from backend records.
                                    </p>
                                </div>
                                <button
                                    onClick={loadMyAttendance}
                                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition text-sm font-semibold cursor-pointer"
                                >
                                    <RefreshCw className={`w-4 h-4 ${summaryLoading ? "animate-spin" : ""}`} />
                                    Refresh
                                </button>
                            </div>

                            {summaryLoading ? (
                                <div className="flex flex-col justify-center items-center min-h-[280px]">
                                    <div className="w-12 h-12 border-4 border-purple-100 border-t-purple-600 rounded-full animate-spin mb-4" />
                                    <p className="text-gray-500 font-medium">Loading attendance records...</p>
                                </div>
                            ) : summaryError ? (
                                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-700 font-medium">
                                    {summaryError}
                                </div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                                            <p className="text-xs uppercase tracking-wide text-gray-500">Overall</p>
                                            <p className="text-2xl font-bold text-gray-900 mt-1">
                                                {summary.attendancePercentage}%
                                            </p>
                                        </div>
                                        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                                            <p className="text-xs uppercase tracking-wide text-emerald-700">Present</p>
                                            <p className="text-2xl font-bold text-emerald-700 mt-1">{summary.present}</p>
                                        </div>
                                        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4">
                                            <p className="text-xs uppercase tracking-wide text-rose-700">Absent</p>
                                            <p className="text-2xl font-bold text-rose-700 mt-1">{summary.absent}</p>
                                        </div>
                                        <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4">
                                            <p className="text-xs uppercase tracking-wide text-sky-700">Sessions</p>
                                            <p className="text-2xl font-bold text-sky-700 mt-1">{summary.totalSessions}</p>
                                        </div>
                                    </div>

                                    {records.length === 0 ? (
                                        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-8 text-center">
                                            <ShieldCheck className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                                            <p className="font-semibold text-gray-700">No attendance sessions found yet.</p>
                                        </div>
                                    ) : (
                                        <div className="rounded-2xl border border-gray-100 overflow-hidden">
                                            <div className="hidden md:grid md:grid-cols-[1.2fr_0.8fr_0.8fr_1fr] gap-3 bg-gray-50 px-4 py-3 text-xs uppercase tracking-wide text-gray-500 font-semibold">
                                                <p>Date</p>
                                                <p>Status</p>
                                                <p>Method</p>
                                                <p>Marked At</p>
                                            </div>

                                            <div className="divide-y divide-gray-100">
                                                {records.map((record) => {
                                                    const statusClass = STATUS_STYLE[record.status] || "bg-gray-100 text-gray-700";
                                                    const statusText = STATUS_LABEL[record.status] || record.status;
                                                    const methodText = METHOD_LABEL[record.method] || (record.method ? String(record.method) : "-");

                                                    return (
                                                        <div
                                                            key={record.attendanceId}
                                                            className="grid md:grid-cols-[1.2fr_0.8fr_0.8fr_1fr] gap-2 md:gap-3 px-4 py-4"
                                                        >
                                                            <div className="flex items-center gap-2 text-sm text-gray-800 font-medium">
                                                                <CalendarDays className="w-4 h-4 text-gray-400" />
                                                                {formatDate(record.attendanceDate)}
                                                            </div>
                                                            <div>
                                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${statusClass}`}>
                                                                    {record.status === "present" ? (
                                                                        <CheckCheck className="w-3 h-3" />
                                                                    ) : record.status === "late" ? (
                                                                        <Clock3 className="w-3 h-3" />
                                                                    ) : (
                                                                        <XCircle className="w-3 h-3" />
                                                                    )}
                                                                    {statusText}
                                                                </span>
                                                            </div>
                                                            <p className="text-sm text-gray-700">{methodText}</p>
                                                            <p className="text-sm text-gray-700">{formatTime(record.markedAt)}</p>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    ) : activeTab === "analysis" ? (
                        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 sm:p-7 space-y-8">
                            <div className="flex items-center justify-between gap-3 flex-wrap">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900">Attendance Analytics</h2>
                                    <p className="text-gray-500 mt-1">
                                        Actionable insights into your engagement.
                                    </p>
                                </div>
                                <button
                                    onClick={loadMyAttendance}
                                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition text-sm font-semibold cursor-pointer"
                                >
                                    <RefreshCw className={`w-4 h-4 ${summaryLoading ? "animate-spin" : ""}`} />
                                    Refresh
                                </button>
                            </div>

                            {summaryLoading ? (
                                <div className="flex flex-col justify-center items-center min-h-[280px]">
                                    <div className="w-12 h-12 border-4 border-purple-100 border-t-purple-600 rounded-full animate-spin mb-4" />
                                    <p className="text-gray-500 font-medium">Analyzing records...</p>
                                </div>
                            ) : records.length === 0 ? (
                                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-8 text-center">
                                    <BarChart2 className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                                    <p className="font-semibold text-gray-700">Not enough data to run analytics.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    {/* Line/Area Chart for cumulative attendance rate */}
                                    <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex flex-col">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                                            <div className="flex items-center gap-2">
                                                <BarChart2 className="w-5 h-5 text-purple-600" />
                                                <h3 className="text-lg font-bold text-gray-800">Attendance Percentage Trend</h3>
                                            </div>
                                            <div className="flex bg-gray-100 p-1 rounded-xl overflow-x-auto hide-scrollbar max-w-full">
                                                {["daily", "weekly", "monthly", "yearly"].map(filter => (
                                                    <button
                                                        key={filter}
                                                        onClick={() => setTimeFilter(filter)}
                                                        className={`px-4 py-2 text-sm font-bold rounded-lg capitalize whitespace-nowrap transition-all duration-200 cursor-pointer ${
                                                            timeFilter === filter
                                                            ? "bg-white text-purple-700 shadow-sm"
                                                            : "text-gray-500 hover:text-gray-700"
                                                        }`}
                                                    >
                                                        {filter}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="flex-1 w-full min-h-[400px] relative">
                                            <style>{`
                                                .custom-chart-scrollbar::-webkit-scrollbar {
                                                    height: 10px;
                                                }
                                                .custom-chart-scrollbar::-webkit-scrollbar-button:single-button {
                                                    background-color: #f3f4f6;
                                                    display: block;
                                                    border-style: solid;
                                                    height: 10px;
                                                    width: 14px;
                                                }
                                                .custom-chart-scrollbar::-webkit-scrollbar-button:single-button:horizontal:decrement {
                                                    border-width: 5px 8px 5px 0;
                                                    border-color: transparent #9ca3af transparent transparent;
                                                }
                                                .custom-chart-scrollbar::-webkit-scrollbar-button:single-button:horizontal:decrement:hover {
                                                    border-color: transparent #4b5563 transparent transparent;
                                                }
                                                .custom-chart-scrollbar::-webkit-scrollbar-button:single-button:horizontal:increment {
                                                    border-width: 5px 0 5px 8px;
                                                    border-color: transparent transparent transparent #9ca3af;
                                                }
                                                .custom-chart-scrollbar::-webkit-scrollbar-button:single-button:horizontal:increment:hover {
                                                    border-color: transparent transparent transparent #4b5563;
                                                }
                                                .custom-chart-scrollbar::-webkit-scrollbar-track {
                                                    background: #f3f4f6;
                                                    border-radius: 4px;
                                                }
                                                .custom-chart-scrollbar::-webkit-scrollbar-thumb {
                                                    background: #9ca3af;
                                                    border-radius: 4px;
                                                }
                                                .custom-chart-scrollbar::-webkit-scrollbar-thumb:hover {
                                                    background: #6b7280;
                                                }
                                                .custom-chart-scrollbar {
                                                    scrollbar-width: thin;
                                                    scrollbar-color: #9ca3af #f3f4f6;
                                                }
                                            `}</style>
                                            <div className="custom-chart-scrollbar w-full overflow-x-auto overflow-y-hidden pb-4" style={{ minHeight: 400 }}>
                                                <div style={{ minWidth: Math.max(aggregatedChartData.length * 120, 600), height: 400 }}>
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <BarChart 
                                                            data={aggregatedChartData}
                                                            margin={{ top: 20, right: 30, left: 30, bottom: 50 }} 
                                                            barGap={0}
                                                            barCategoryGap="15%"
                                                        >
                                                            <defs>
                                                                <linearGradient id="colorAttendance" x1="0" y1="0" x2="0" y2="1">
                                                                    <stop offset="0%" stopColor="#10B981" stopOpacity={1} />
                                                                    <stop offset="100%" stopColor="#059669" stopOpacity={0.6} />
                                                                </linearGradient>
                                                                <linearGradient id="colorAbsent" x1="0" y1="0" x2="0" y2="1">
                                                                    <stop offset="0%" stopColor="#EF4444" stopOpacity={1} />
                                                                    <stop offset="100%" stopColor="#DC2626" stopOpacity={0.6} />
                                                                </linearGradient>
                                                            </defs>
                                                            <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#E5E7EB" />
                                                            <XAxis 
                                                                dataKey="name" 
                                                                axisLine={{ stroke: '#E5E7EB' }} 
                                                                tickLine={false} 
                                                                tick={{ fill: '#6B7280', fontSize: 13, fontWeight: 600 }} 
                                                                dy={15}
                                                                interval={0}
                                                                label={{ value: 'TIMELINE PERIOD', position: 'bottom', offset: 25, fill: '#9CA3AF', fontSize: 13, fontWeight: 700, letterSpacing: '0.05em' }}
                                                            />
                                                            <YAxis 
                                                                axisLine={{ stroke: '#E5E7EB' }} 
                                                                tickLine={false} 
                                                                allowDecimals={false}
                                                                domain={[0, 100]}
                                                                tickCount={6}
                                                                tick={{ fill: '#6B7280', fontSize: 13, fontWeight: 600 }} 
                                                                dx={-10}
                                                                label={{ value: 'ATTENDANCE (%)', angle: -90, position: 'insideLeft', offset: -15, fill: '#9CA3AF', fontSize: 13, fontWeight: 700, letterSpacing: '0.05em' }}
                                                            />
                                                            <Tooltip 
                                                                cursor={{ fill: '#F3F4F6', opacity: 0.4 }}
                                                                formatter={(value, name, payload) => {
                                                                    if (name === "Attendance") {
                                                                        return [`${value}%`, "Attendance"]; 
                                                                    }
                                                                    if (name === "Absent") {
                                                                        return [`${value}%`, "Absent"]; 
                                                                    }
                                                                    return [value, name];
                                                                }}
                                                                labelFormatter={(label, payload) => {
                                                                    const sessions = payload?.[0]?.payload?.Sessions;
                                                                    return sessions ? `${label} (${sessions} sessions)` : label;
                                                                }}
                                                                contentStyle={{ borderRadius: '14px', border: '1px solid #F3F4F6', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                                                            />
                                                            <Legend iconType="circle" wrapperStyle={{ paddingBottom: '30px' }} verticalAlign="top" />
                                                            <Bar dataKey="Attendance" stackId="a" fill="url(#colorAttendance)" radius={[6, 6, 0, 0]} maxBarSize={45} />
                                                            <Bar dataKey="Absent" stackId="a" fill="url(#colorAbsent)" radius={[6, 6, 0, 0]} maxBarSize={45} />
                                                        </BarChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Pie Chart */}
                                    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex flex-col">
                                        <div className="flex items-center gap-2 mb-4">
                                            <PieChartIcon className="w-5 h-5 text-purple-600" />
                                            <h3 className="text-lg font-bold text-gray-800">Status Distribution</h3>
                                        </div>
                                        <div className="flex-1 w-full min-h-[250px] flex justify-center items-center">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={[
                                                            { name: "Present", value: summary.present, color: "#10B981" },
                                                            { name: "Absent", value: summary.absent, color: "#F43F5E" },
                                                            { name: "Late/Eq.", value: summary.late + summary.excused, color: "#F59E0B" }
                                                        ].filter(d => d.value > 0)}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={60}
                                                        outerRadius={85}
                                                        paddingAngle={6}
                                                        dataKey="value"
                                                        stroke="none"
                                                    >
                                                        {([
                                                            { name: "Present", value: summary.present, color: "#10B981" },
                                                            { name: "Absent", value: summary.absent, color: "#F43F5E" },
                                                            { name: "Late/Eq.", value: summary.late + summary.excused, color: "#F59E0B" }
                                                        ].filter(d => d.value > 0)).map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip 
                                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                    />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <div className="flex justify-center gap-4 mt-2">
                                            <div className="flex flex-col items-center">
                                                <div className="flex items-center gap-1 mb-1">
                                                    <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                                                    <span className="text-xs text-gray-500 font-medium">Present</span>
                                                </div>
                                                <span className="text-xl font-bold text-gray-800">{summary.present}</span>
                                            </div>
                                            <div className="flex flex-col items-center">
                                                <div className="flex items-center gap-1 mb-1">
                                                    <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                                                    <span className="text-xs text-gray-500 font-medium">Absent</span>
                                                </div>
                                                <span className="text-xl font-bold text-gray-800">{summary.absent}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
};

export default StudentAttendancePage;
