import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Calendar,
  Users,
  Download,
  ChevronDown,
  ChevronRight,
  Clock,
  Search,
  FileSpreadsheet,
} from "lucide-react";
import * as XLSX from "xlsx";
import api from "../api/axios";
import Header from "../components/Header";
import PageTransition from "../components/PageTransition";

const SeminarAttendancePage = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedSession, setExpandedSession] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        setLoading(true);
        const res = await api.get("/seminar/records");
        if (res.data?.success) {
          setSessions(res.data.sessions || []);
        }
      } catch (err) {
        setError("Failed to load seminar attendance records");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchRecords();
  }, []);

  // Group attendees by course → then sort alphabetically
  const getGroupedAttendees = (attendees) => {
    const groups = {};
    for (const a of attendees) {
      const groupKey = a.course || a.studentId?.course || "Other";
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push({
        name: a.studentName || a.studentId?.name || "Unknown",
        erpId: a.erpId || a.studentId?.erpId || "",
        course: a.course || a.studentId?.course || "",
        section: a.section || a.studentId?.section || "",
        semester: a.semester || a.studentId?.semester || "",
        college: a.collegeName || a.studentId?.collegeName || "",
        markedAt: a.markedAt,
      });
    }

    // Sort students alphabetically within each group
    for (const key of Object.keys(groups)) {
      groups[key].sort((a, b) => a.name.localeCompare(b.name));
    }

    // Sort group keys alphabetically
    const sortedKeys = Object.keys(groups).sort((a, b) =>
      a.localeCompare(b)
    );

    return { groups, sortedKeys };
  };

  // Filter sessions by search query
  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return sessions;
    const q = searchQuery.trim().toLowerCase();
    return sessions.filter(
      (s) =>
        s.title?.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q)
    );
  }, [sessions, searchQuery]);

  // Export session to Excel
  const handleExport = (session) => {
    try {
      const { groups, sortedKeys } = getGroupedAttendees(
        session.attendees || []
      );

      const data = [];
      // Header info
      data.push(["Seminar Title", session.title]);
      data.push([
        "Date",
        new Date(session.startedAt).toLocaleDateString("en-US", {
          dateStyle: "long",
        }),
      ]);
      data.push(["Total Attendees", session.attendees?.length || 0]);
      data.push([]); // empty row
      data.push(["Course", "Student Name", "ERP ID", "Section", "Semester", "Marked At"]);

      for (const courseKey of sortedKeys) {
        for (const student of groups[courseKey]) {
          data.push([
            courseKey,
            student.name,
            student.erpId,
            student.section,
            student.semester,
            student.markedAt
              ? new Date(student.markedAt).toLocaleString()
              : "",
          ]);
        }
      }

      const ws = XLSX.utils.aoa_to_sheet(data);
      ws["!cols"] = [
        { wch: 20 },
        { wch: 30 },
        { wch: 18 },
        { wch: 10 },
        { wch: 12 },
        { wch: 22 },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Seminar Attendance");

      const fileName = `${session.title
        .replace(/[^a-z0-9]/gi, "_")
        .substring(0, 40)}_Attendance.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (err) {
      console.error("Export error:", err);
      alert("Failed to export attendance");
    }
  };

  const formatDate = (dateStr) =>
    new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  const formatTime = (dateStr) =>
    new Date(dateStr).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onLogoClick={() => navigate("/")} />
      <PageTransition className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="p-2 rounded-lg hover:bg-gray-100 transition cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Seminar Attendance
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                View and export seminar/event attendance records
              </p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search seminars..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition"
            />
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center min-h-[300px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto mb-4" />
              <p className="text-sm text-gray-500">Loading records...</p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Empty */}
        {!loading && !error && sessions.length === 0 && (
          <div className="text-center py-16">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-700 mb-2">
              No Seminars Yet
            </h2>
            <p className="text-gray-500 text-sm">
              Start a seminar session from the dashboard to see records here.
            </p>
          </div>
        )}

        {/* No search results */}
        {!loading &&
          !error &&
          sessions.length > 0 &&
          filteredSessions.length === 0 && (
            <div className="text-center py-12">
              <Search className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">
                No seminars match "{searchQuery.trim()}"
              </p>
            </div>
          )}

        {/* Sessions List */}
        <div className="space-y-4">
          {filteredSessions.map((session) => {
            const isExpanded = expandedSession === session._id;
            const { groups, sortedKeys } = getGroupedAttendees(
              session.attendees || []
            );
            const totalAttendees = session.attendees?.length || 0;

            return (
              <motion.div
                key={session._id}
                layout
                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
              >
                {/* Session Header */}
                <div
                  onClick={() =>
                    setExpandedSession(isExpanded ? null : session._id)
                  }
                  className="flex items-center justify-between p-4 sm:p-5 cursor-pointer hover:bg-gray-50 transition"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        session.status === "active"
                          ? "bg-green-100"
                          : "bg-indigo-100"
                      }`}
                    >
                      <Calendar
                        className={`w-5 h-5 ${
                          session.status === "active"
                            ? "text-green-600"
                            : "text-indigo-600"
                        }`}
                      />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-gray-800 truncate">
                        {session.title}
                      </h3>
                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(session.startedAt)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {totalAttendees} attendees
                        </span>
                        {session.status === "active" && (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-semibold">
                            Live
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {totalAttendees > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExport(session);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-lg text-xs font-semibold hover:bg-green-100 transition cursor-pointer"
                        title="Download as Excel"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Excel</span>
                      </button>
                    )}
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Expanded: Attendee List grouped by college */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-gray-100 px-4 sm:px-5 pb-5">
                        {session.description && (
                          <p className="text-sm text-gray-500 mt-3 mb-4 italic">
                            {session.description}
                          </p>
                        )}

                        {totalAttendees === 0 ? (
                          <div className="text-center py-8 text-gray-400 text-sm">
                            No students attended this seminar.
                          </div>
                        ) : (
                          <div className="mt-3 space-y-4">
                            {sortedKeys.map((college) => (
                              <div key={college}>
                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-1">
                                  {college} ({groups[college].length})
                                </h4>
                                <div className="bg-gray-50 rounded-xl border border-gray-100 divide-y divide-gray-100">
                                {groups[college].map((student, idx) => (
                                    <div
                                      key={idx}
                                      className="flex items-center justify-between px-4 py-3"
                                    >
                                      <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs shrink-0">
                                          {student.name
                                            .charAt(0)
                                            .toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                          <p className="font-semibold text-gray-800 text-sm truncate">
                                            {student.name}
                                          </p>
                                          <div className="flex items-center gap-2 flex-wrap">
                                            {student.erpId && (
                                              <span className="text-xs text-indigo-600 font-mono bg-indigo-50 px-1.5 py-0.5 rounded">
                                                {student.erpId}
                                              </span>
                                            )}
                                            {student.section && (
                                              <span className="text-xs text-gray-500">
                                                Sec {student.section}
                                              </span>
                                            )}
                                            {student.semester && (
                                              <span className="text-xs text-gray-500">
                                                Sem {student.semester}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                      <span className="text-xs text-gray-400 shrink-0 ml-2">
                                        {student.markedAt
                                          ? formatTime(student.markedAt)
                                          : ""}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Timing details */}
                        <div className="mt-4 flex items-center gap-4 text-xs text-gray-400">
                          <span>
                            Started: {formatTime(session.startedAt)}
                          </span>
                          {session.endedAt && (
                            <span>
                              Ended: {formatTime(session.endedAt)}
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </PageTransition>
    </div>
  );
};

export default SeminarAttendancePage;
