import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  ShieldAlert,
  Eye,
  Search,
  Filter,
  Download,
  ChevronLeft,
  ChevronRight,
  X,
  Activity,
  Users,
  AlertTriangle,
  TrendingUp,
  Calendar,
  RefreshCcw,
  Loader2,
  Camera,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { fetchAuditLogs, fetchAuditStats } from "../api/auditApi";

// ── Color Palette ────────────────────────────────────────────────────────────
const STATUS_COLORS = {
  match: { bg: "bg-emerald-500/10", text: "text-emerald-400", dot: "bg-emerald-400", border: "border-emerald-500/30" },
  no_match: { bg: "bg-rose-500/10", text: "text-rose-400", dot: "bg-rose-400", border: "border-rose-500/30" },
  liveness_fail: { bg: "bg-amber-500/10", text: "text-amber-400", dot: "bg-amber-400", border: "border-amber-500/30" },
};

const CHART_COLORS = ["#10b981", "#f43f5e", "#f59e0b"];
const PIE_COLORS = ["#10b981", "#f43f5e", "#f59e0b"];

// ── Utility ──────────────────────────────────────────────────────────────────
const formatDate = (d) => {
  if (!d) return "—";
  const date = new Date(d);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatTime = (d) => {
  if (!d) return "";
  return new Date(d).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatScore = (score) => {
  if (score == null) return "—";
  return `${(score * 100).toFixed(1)}%`;
};

// ── Stats Card ───────────────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, subtext, color, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.4 }}
    className={`relative overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-br from-gray-900/80 to-gray-800/60 backdrop-blur-xl p-5 shadow-lg`}
  >
    <div className="absolute -top-6 -right-6 opacity-5">
      <Icon size={80} />
    </div>
    <div className={`inline-flex p-2.5 rounded-xl ${color} mb-3`}>
      <Icon size={20} className="text-white" />
    </div>
    <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
    <p className="text-sm text-gray-400 mt-1">{label}</p>
    {subtext && <p className="text-xs text-gray-500 mt-0.5">{subtext}</p>}
  </motion.div>
);

// ── Status Badge ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const config = STATUS_COLORS[status] || STATUS_COLORS.no_match;
  const labels = {
    match: "Verified",
    no_match: "Rejected",
    liveness_fail: "Liveness Fail",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text} border ${config.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {labels[status] || status}
    </span>
  );
};

// ── Audit Image Modal ────────────────────────────────────────────────────────
const AuditImageModal = ({ log, onClose }) => {
  if (!log) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-gray-900 border border-white/10 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <Camera className="w-5 h-5 text-purple-400" />
            <h3 className="text-lg font-bold text-white">Audit Image</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Image */}
        <div className="p-6">
          {log.auditImageUrl ? (
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-square">
              <img
                src={log.auditImageUrl}
                alt="Audit capture"
                className="w-full h-full object-cover"
              />
              {/* Score Overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4">
                <div className="flex items-center justify-between">
                  <StatusBadge status={log.status} />
                  <span className="text-white font-mono font-bold text-lg">
                    {formatScore(log.similarityScore)}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-gray-800 aspect-square flex items-center justify-center">
              <div className="text-center text-gray-500">
                <Camera className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No audit image captured</p>
              </div>
            </div>
          )}

          {/* Details */}
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Student</span>
              <span className="text-white font-medium">
                {log.studentId?.name || "Unknown"}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Date</span>
              <span className="text-white">
                {formatDate(log.timestamp)} {formatTime(log.timestamp)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Trigger</span>
              <span className="text-white capitalize">
                {log.triggerReason?.replace(/_/g, " ") || "—"}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Similarity</span>
              <span className="text-white font-mono">{formatScore(log.similarityScore)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Threshold</span>
              <span className="text-white font-mono">{formatScore(log.metadata?.threshold)}</span>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ── Main Dashboard Component ─────────────────────────────────────────────────
const AttendanceAuditDashboard = () => {
  // ── State ───────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [dailyBreakdown, setDailyBreakdown] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [selectedLog, setSelectedLog] = useState(null);

  // Filters
  const [filters, setFilters] = useState({
    status: "",
    dateFrom: "",
    dateTo: "",
    search: "",
    page: 1,
  });
  const [showFilters, setShowFilters] = useState(false);

  // ── Data Fetching ───────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { ...filters, limit: 15 };
      Object.keys(params).forEach(
        (k) => (params[k] === "" || params[k] === null) && delete params[k]
      );

      const [logsRes, statsRes] = await Promise.all([
        fetchAuditLogs(params),
        fetchAuditStats(30),
      ]);

      if (logsRes.success) {
        setLogs(logsRes.logs || []);
        setPagination(logsRes.pagination || { page: 1, pages: 1, total: 0 });
      }

      if (statsRes.success) {
        setStats(statsRes.stats || null);
        setDailyBreakdown(statsRes.dailyBreakdown || []);
      }
    } catch (err) {
      console.error("Failed to load audit data:", err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Filter Handlers ─────────────────────────────────────────────────────
  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const clearFilters = () => {
    setFilters({ status: "", dateFrom: "", dateTo: "", search: "", page: 1 });
  };

  const goToPage = (p) => {
    setFilters((prev) => ({ ...prev, page: p }));
  };

  // ── Chart Data ──────────────────────────────────────────────────────────
  const chartData = (() => {
    const dateMap = {};
    for (const item of dailyBreakdown) {
      const date = item._id.date;
      if (!dateMap[date]) dateMap[date] = { date, match: 0, no_match: 0, liveness_fail: 0 };
      dateMap[date][item._id.status] = item.count;
    }
    return Object.values(dateMap).slice(-14); // last 14 days
  })();

  const pieData = stats
    ? [
        { name: "Verified", value: stats.matches || 0 },
        { name: "Rejected", value: stats.noMatches || 0 },
        { name: "Liveness Fail", value: stats.livenessFails || 0 },
      ].filter((d) => d.value > 0)
    : [];

  const matchRate = stats && stats.totalVerifications > 0
    ? ((stats.matches / stats.totalVerifications) * 100).toFixed(1)
    : "0.0";

  // ── CSV Export ──────────────────────────────────────────────────────────
  const exportCSV = () => {
    if (!logs.length) return;
    const headers = ["Date", "Time", "Student", "Status", "Similarity", "Trigger", "Image URL"];
    const rows = logs.map((l) => [
      formatDate(l.timestamp),
      formatTime(l.timestamp),
      l.studentId?.name || "Unknown",
      l.status,
      formatScore(l.similarityScore),
      l.triggerReason,
      l.auditImageUrl || "",
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-purple-950 text-white">
      {/* Background Pattern */}
      <div className="fixed inset-0 opacity-[0.015] pointer-events-none"
        style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 1px)", backgroundSize: "32px 32px" }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ── Header ─────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8"
        >
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-purple-200 to-purple-400 bg-clip-text text-transparent">
              Face Recognition Audit
            </h1>
            <p className="text-gray-400 mt-1 text-sm">
              Monitor verification attempts, view flagged captures, and analyze security patterns
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-sm font-medium cursor-pointer disabled:opacity-50"
            >
              <RefreshCcw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              onClick={exportCSV}
              disabled={!logs.length}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600/20 border border-purple-500/30 hover:bg-purple-600/30 transition-all text-sm font-medium text-purple-300 cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </motion.div>

        {/* ── Stats Cards ────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={Activity}
            label="Total Verifications"
            value={stats?.totalVerifications?.toLocaleString() || "0"}
            subtext="Last 30 days"
            color="bg-purple-600"
            delay={0}
          />
          <StatCard
            icon={CheckCircle2}
            label="Match Rate"
            value={`${matchRate}%`}
            subtext={`${stats?.matches || 0} successful`}
            color="bg-emerald-600"
            delay={0.1}
          />
          <StatCard
            icon={AlertTriangle}
            label="Audit Triggers"
            value={(stats?.noMatches || 0) + (stats?.livenessFails || 0)}
            subtext="Flagged attempts"
            color="bg-rose-600"
            delay={0.2}
          />
          <StatCard
            icon={Users}
            label="Unique Students"
            value={stats?.uniqueStudents?.toLocaleString() || "0"}
            subtext="Active this month"
            color="bg-blue-600"
            delay={0.3}
          />
        </div>

        {/* ── Charts Row ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
          {/* Bar Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2 rounded-2xl border border-white/5 bg-gray-900/60 backdrop-blur-xl p-5"
          >
            <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-400" />
              Daily Verification Activity
            </h3>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#6b7280" }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} />
                  <Tooltip
                    contentStyle={{ background: "#111827", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "#fff" }}
                    labelFormatter={(v) => `Date: ${v}`}
                  />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                  <Bar dataKey="match" name="Verified" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="no_match" name="Rejected" fill={CHART_COLORS[1]} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="liveness_fail" name="Liveness Fail" fill={CHART_COLORS[2]} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[240px] flex items-center justify-center text-gray-600 text-sm">
                No data available yet
              </div>
            )}
          </motion.div>

          {/* Pie Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-2xl border border-white/5 bg-gray-900/60 backdrop-blur-xl p-5"
          >
            <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Verification Breakdown
            </h3>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "#111827", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "#fff" }}
                  />
                  <Legend wrapperStyle={{ fontSize: "12px", color: "#9ca3af" }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[240px] flex items-center justify-center text-gray-600 text-sm">
                No data yet
              </div>
            )}
          </motion.div>
        </div>

        {/* ── Filters ────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mb-6"
        >
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search by student name..."
                value={filters.search}
                onChange={(e) => updateFilter("search", e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-900/60 border border-white/10 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
              />
            </div>

            {/* Status Filter */}
            <select
              value={filters.status}
              onChange={(e) => updateFilter("status", e.target.value)}
              className="px-4 py-2.5 rounded-xl bg-gray-900/60 border border-white/10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 cursor-pointer appearance-none min-w-[140px]"
            >
              <option value="">All Status</option>
              <option value="match">Verified</option>
              <option value="no_match">Rejected</option>
              <option value="liveness_fail">Liveness Fail</option>
            </select>

            {/* Toggle Date Filters */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all cursor-pointer ${
                showFilters
                  ? "bg-purple-600/20 border-purple-500/30 text-purple-300"
                  : "bg-gray-900/60 border-white/10 text-gray-400 hover:text-white"
              }`}
            >
              <Filter className="w-4 h-4" />
              Dates
            </button>

            {(filters.status || filters.search || filters.dateFrom || filters.dateTo) && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                Clear
              </button>
            )}
          </div>

          {/* Date Range (collapsible) */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="flex gap-3 mt-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <input
                      type="date"
                      value={filters.dateFrom}
                      onChange={(e) => updateFilter("dateFrom", e.target.value)}
                      className="px-3 py-2 rounded-lg bg-gray-800 border border-white/10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    />
                  </div>
                  <span className="text-gray-500 self-center">to</span>
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => updateFilter("dateTo", e.target.value)}
                    className="px-3 py-2 rounded-lg bg-gray-800 border border-white/10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ── Logs Table ──────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-2xl border border-white/5 bg-gray-900/60 backdrop-blur-xl overflow-hidden"
        >
          {/* Table Header */}
          <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-purple-400" />
              Audit Log ({pagination.total} records)
            </h3>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500">
              <ShieldCheck className="w-12 h-12 mb-3 opacity-30" />
              <p className="font-medium">No audit logs found</p>
              <p className="text-sm mt-1">Verification attempts will appear here</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Student</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Date / Time</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Similarity</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Trigger</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider text-center">Image</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {logs.map((log, idx) => (
                    <motion.tr
                      key={log._id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className="hover:bg-white/[0.02] transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-purple-600/20 flex items-center justify-center text-xs font-bold text-purple-300">
                            {(log.studentId?.name || "?")[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">
                              {log.studentId?.name || "Unknown Student"}
                            </p>
                            <p className="text-xs text-gray-500">
                              {log.studentId?.erpId || log.studentId?.email || "—"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-white">{formatDate(log.timestamp)}</p>
                        <p className="text-xs text-gray-500">{formatTime(log.timestamp)}</p>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={log.status} />
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-sm font-mono font-semibold ${
                          log.similarityScore >= 0.75
                            ? "text-emerald-400"
                            : log.similarityScore >= 0.5
                            ? "text-amber-400"
                            : "text-rose-400"
                        }`}>
                          {formatScore(log.similarityScore)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-400 capitalize">
                          {log.triggerReason?.replace(/_/g, " ") || "—"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {log.auditImageUrl ? (
                          <button
                            onClick={() => setSelectedLog(log)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600/10 border border-purple-500/20 text-purple-300 text-xs font-medium hover:bg-purple-600/20 transition-all cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View
                          </button>
                        ) : (
                          <span className="text-xs text-gray-600">—</span>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between">
              <p className="text-xs text-gray-500">
                Page {pagination.page} of {pagination.pages} ({pagination.total} total)
              </p>
              <div className="flex gap-1.5">
                <button
                  onClick={() => goToPage(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="p-2 rounded-lg hover:bg-white/10 text-gray-400 disabled:opacity-30 transition-all cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                  const start = Math.max(1, pagination.page - 2);
                  const page = start + i;
                  if (page > pagination.pages) return null;
                  return (
                    <button
                      key={page}
                      onClick={() => goToPage(page)}
                      className={`w-8 h-8 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                        page === pagination.page
                          ? "bg-purple-600 text-white"
                          : "hover:bg-white/10 text-gray-400"
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
                <button
                  onClick={() => goToPage(pagination.page + 1)}
                  disabled={pagination.page >= pagination.pages}
                  className="p-2 rounded-lg hover:bg-white/10 text-gray-400 disabled:opacity-30 transition-all cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* ── Audit Image Modal ──────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedLog && (
          <AuditImageModal log={selectedLog} onClose={() => setSelectedLog(null)} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default AttendanceAuditDashboard;
