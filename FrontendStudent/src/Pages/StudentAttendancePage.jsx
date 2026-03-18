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
} from "lucide-react";
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

const StudentAttendancePage = () => {
    const navigate = useNavigate();
    const { id: classId } = useParams();

    const socketRef = useRef(null);
    const [activeTab, setActiveTab] = useState("scan");
    const [user, setUser] = useState(null);

    const [scanStatus, setScanStatus] = useState("idle");
    const [scanMessage, setScanMessage] = useState("");

    const [summaryLoading, setSummaryLoading] = useState(false);
    const [summaryError, setSummaryError] = useState("");
    const [summaryData, setSummaryData] = useState(null);

    useEffect(() => {
        const storedUser = getStoredUser();
        if (!storedUser) {
            navigate("/login", { replace: true });
            return;
        }
        setUser(storedUser);
    }, [navigate]);

    useEffect(() => {
        if (!user || activeTab !== "scan") return undefined;

        const socket = io(SOCKET_URL);
        socketRef.current = socket;

        const onSuccess = (payload) => {
            const nextMessage = payload?.message || "Attendance marked successfully";
            setScanStatus("success");
            setScanMessage(nextMessage);
        };

        const onError = (payload) => {
            const nextMessage =
                typeof payload === "string"
                    ? payload
                    : payload?.message ||
                        "Unable to mark attendance. Please try again.";
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

    useEffect(() => {
        if (activeTab === "history" && user) {
            loadMyAttendance();
        }
    }, [activeTab, user]);

    const handleScan = (results) => {
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
                        onClick={() => setActiveTab("scan")}
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
                        onClick={() => setActiveTab("history")}
                        className={`flex-1 flex justify-center items-center gap-2 py-3 px-4 text-sm font-bold rounded-xl whitespace-nowrap transition-all duration-200 cursor-pointer ${
                            activeTab === "history"
                                ? "bg-purple-600 text-white shadow-md"
                                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                        }`}
                    >
                        <CalendarDays className="w-4 h-4" />
                        My Attendance
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
                                {scanStatus === "idle" && (
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

                                    {scanStatus === "success" && (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="absolute inset-0 bg-emerald-50/95 flex flex-col items-center justify-center z-20 px-4"
                                        >
                                            <CheckCircle className="w-16 h-16 text-emerald-500 mb-3" />
                                            <p className="font-bold text-gray-900 text-xl">Attendance Marked</p>
                                            <p className="text-emerald-700 text-center mt-1">{scanMessage}</p>
                                            <button
                                                onClick={() => {
                                                    setScanStatus("idle");
                                                    setScanMessage("");
                                                }}
                                                className="mt-5 px-5 py-2 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition cursor-pointer"
                                            >
                                                Scan Again
                                            </button>
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

                                {scanStatus === "idle" && (
                                    <div className="absolute inset-0 border-[24px] border-black/25 pointer-events-none">
                                        <div className="absolute inset-0 border-2 border-white/50 rounded-lg">
                                            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-purple-500 rounded-tl-lg" />
                                            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-purple-500 rounded-tr-lg" />
                                            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-purple-500 rounded-bl-lg" />
                                            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-purple-500 rounded-br-lg" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
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
                                                            <p className="text-sm text-gray-700 capitalize">{record.method || "-"}</p>
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
                    )}
                </div>
            </div>
        </div>
    );
};

export default StudentAttendancePage;
