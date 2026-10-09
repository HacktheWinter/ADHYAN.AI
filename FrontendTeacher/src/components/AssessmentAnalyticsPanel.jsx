// FrontendTeacher/src/components/AssessmentAnalyticsPanel.jsx
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  ChevronDown,
  BarChart3,
  Download,
  Users,
  UserCheck,
  UserX,
  TrendingUp,
  Award,
  AlertTriangle,
  Search,
  ArrowUpDown,
  FileText,
  BookOpen,
  ClipboardCheck,
  Code,
  X,
} from "lucide-react";
import * as XLSX from "xlsx";
import {
  getTeacherAssessments,
  getAssessmentAnalytics,
} from "../api/assessmentAnalyticsApi";

// ─── Type badge colors ───
const TYPE_CONFIG = {
  quiz: {
    label: "Quiz",
    icon: BookOpen,
    bg: "bg-violet-100 dark:bg-violet-900/40",
    text: "text-violet-700 dark:text-violet-300",
    dot: "#8B5CF6",
  },
  test: {
    label: "Test Paper",
    icon: FileText,
    bg: "bg-blue-100 dark:bg-blue-900/40",
    text: "text-blue-700 dark:text-blue-300",
    dot: "#3B82F6",
  },
  assignment: {
    label: "Assignment",
    icon: ClipboardCheck,
    bg: "bg-emerald-100 dark:bg-emerald-900/40",
    text: "text-emerald-700 dark:text-emerald-300",
    dot: "#10B981",
  },
  coding: {
    label: "Coding Round",
    icon: Code,
    bg: "bg-pink-100 dark:bg-pink-900/40",
    text: "text-pink-700 dark:text-pink-300",
    dot: "#EC4899",
  },
};

const CHART_COLORS = ["#EF4444", "#F97316", "#EAB308", "#22C55E", "#8B5CF6"];
const PIE_COLORS = ["#22C55E", "#EF4444", "#94A3B8"];

// ─── Custom Tooltip ───
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface border border-line rounded-xl px-4 py-2.5 shadow-lg text-sm">
      <p className="font-semibold text-ink mb-0.5">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-ink-soft">
          {p.name}: <span className="font-bold text-ink">{p.value}</span>{" "}
          student{p.value !== 1 ? "s" : ""}
        </p>
      ))}
    </div>
  );
};

// ─── Stat Card ───
const StatCard = ({ icon: Icon, label, value, color, sub }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-surface border border-line rounded-2xl p-4 flex items-start gap-3 shadow-sm hover:shadow-md transition-shadow"
  >
    <div
      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}
    >
      <Icon className="w-5 h-5 text-white" />
    </div>
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-wider text-ink-soft font-semibold">
        {label}
      </p>
      <p className="font-mono text-xl font-bold text-ink leading-tight">
        {value}
      </p>
      {sub && (
        <p className="text-[11px] text-ink-soft mt-0.5 truncate">{sub}</p>
      )}
    </div>
  </motion.div>
);

// ─── Main Panel ───
const AssessmentAnalyticsPanel = ({ teacherId }) => {
  // Data state
  const [assessments, setAssessments] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [analytics, setAnalytics] = useState(null);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  // UI state
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all"); // all | quiz | test | assignment | coding
  const [tableSearch, setTableSearch] = useState("");
  const [sortField, setSortField] = useState("percentage");
  const [sortDir, setSortDir] = useState("desc");
  const [showNotAttempted, setShowNotAttempted] = useState(false);

  const dropdownRef = useRef(null);

  // ─── Fetch assessment list ───
  useEffect(() => {
    if (!teacherId) return;
    const load = async () => {
      setLoadingList(true);
      try {
        const data = await getTeacherAssessments(teacherId);
        setAssessments(data || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingList(false);
      }
    };
    load();
  }, [teacherId]);

  // ─── Fetch analytics when selection changes ───
  useEffect(() => {
    if (!selectedId || !selectedType) {
      setAnalytics(null);
      return;
    }
    const load = async () => {
      setLoadingAnalytics(true);
      try {
        const data = await getAssessmentAnalytics(selectedType, selectedId);
        setAnalytics(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingAnalytics(false);
      }
    };
    load();
  }, [selectedId, selectedType]);

  // ─── Close dropdown on outside click ───
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [dropdownOpen]);

  // ─── Derived data ───
  const filteredAssessments = assessments.filter((a) => {
    const matchesType = filterType === "all" || a.type === filterType;
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      !term ||
      a.title.toLowerCase().includes(term) ||
      a.className.toLowerCase().includes(term);
    return matchesType && matchesSearch;
  });

  const selectedAssessment = assessments.find(
    (a) => a._id === selectedId && a.type === selectedType
  );

  // ─── Table sorting / filtering ───
  const getSortedStudents = () => {
    if (!analytics) return [];
    let list = [...analytics.studentResults];

    if (tableSearch.trim()) {
      const t = tableSearch.toLowerCase();
      list = list.filter(
        (s) =>
          s.studentName.toLowerCase().includes(t) ||
          s.email.toLowerCase().includes(t)
      );
    }

    list.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      if (typeof aVal === "string") {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }
      if (sortDir === "asc") return aVal > bVal ? 1 : -1;
      return aVal < bVal ? 1 : -1;
    });

    return list;
  };

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  // ─── Excel Download ───
  const downloadReport = () => {
    if (!analytics) return;

    const { assessment, classroom, summary, studentResults, notAttemptedStudents } = analytics;

    const wb = XLSX.utils.book_new();

    // 1. Summary Sheet
    const summaryData = [
      ["Assessment Analytics Report"],
      [],
      ["Assessment", assessment.title],
      ["Type", TYPE_CONFIG[assessment.type]?.label || assessment.type],
      ["Class", classroom.name],
      ["Date", new Date(assessment.createdAt).toLocaleDateString("en-IN")],
      ["Total Marks", assessment.totalMarks || "N/A"],
      [],
      ["Metric", "Value"],
      ["Total Students", summary.totalStudents],
      ["Attempted", summary.attempted],
      ["Not Attempted", summary.notAttempted],
      ["Passed (>=40%)", summary.passCount],
      ["Failed (<40%)", summary.failCount],
      ["Average %", `${summary.avgPercentage}%`],
      ["Highest %", `${summary.highestPercentage}%`],
      ["Lowest %", `${summary.lowestPercentage}%`],
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

    // 2. Student Results Sheet
    const resultsData = [
      ["#", "Student Name", "Email", "ERP ID", "Section", "Marks Obtained", "Total Marks", "Percentage", "Status"],
      ...studentResults.map((s, i) => [
        i + 1,
        s.studentName,
        s.email,
        s.erpId || "N/A",
        s.section || "N/A",
        s.marksObtained,
        s.totalMarks,
        `${s.percentage}%`,
        s.status === "pass" ? "PASS" : "FAIL"
      ])
    ];
    const wsResults = XLSX.utils.aoa_to_sheet(resultsData);
    XLSX.utils.book_append_sheet(wb, wsResults, "Student Results");

    // 3. Not Attempted Sheet
    if (notAttemptedStudents?.length > 0) {
      const notAttemptedData = [
        ["#", "Student Name", "Email", "ERP ID", "Section"],
        ...notAttemptedStudents.map((s, i) => [
          i + 1,
          s.studentName,
          s.email || "N/A",
          s.erpId || "N/A",
          s.section || "N/A"
        ])
      ];
      const wsNotAttempted = XLSX.utils.aoa_to_sheet(notAttemptedData);
      XLSX.utils.book_append_sheet(wb, wsNotAttempted, "Not Attempted");
    }

    // Export file
    const safeName = assessment.title.replace(/[^a-zA-Z0-9]/g, "_");
    XLSX.writeFile(wb, `${safeName}_Report.xlsx`);
  };

  // ─── RENDER ───
  return (
    <section className="mb-10">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-5">
        <div>
          <h2 className="font-display text-2xl font-semibold mb-1 text-ink flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-violet-600" />
            Assessment Analytics
          </h2>
          <p className="text-sm text-ink-soft">
            Select an assessment to view detailed graphs and student
            performance. Download reports as PDF.
          </p>
        </div>

        {analytics && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={downloadReport}
            className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold text-sm transition-all shadow-sm cursor-pointer flex items-center gap-2 shrink-0"
          >
            <Download className="w-4 h-4" />
            Download Report
          </motion.button>
        )}
      </div>

      {/* ─── Assessment Selector ─── */}
      <div className="relative mb-6" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="w-full sm:max-w-xl bg-surface border border-line rounded-2xl px-5 py-3.5 flex items-center justify-between gap-3 shadow-sm hover:shadow-md transition-all cursor-pointer text-left"
        >
          {selectedAssessment ? (
            <div className="flex items-center gap-3 min-w-0">
              <span
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wide shrink-0 ${
                  TYPE_CONFIG[selectedAssessment.type]?.bg
                } ${TYPE_CONFIG[selectedAssessment.type]?.text}`}
              >
                {TYPE_CONFIG[selectedAssessment.type]?.label}
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-ink text-sm truncate">
                  {selectedAssessment.title}
                </p>
                <p className="text-[11px] text-ink-soft truncate">
                  {selectedAssessment.className}
                  {selectedAssessment.classSubject
                    ? ` · ${selectedAssessment.classSubject}`
                    : ""}
                </p>
              </div>
            </div>
          ) : (
            <span className="text-ink-soft text-sm font-medium">
              {loadingList
                ? "Loading assessments..."
                : "Select an assessment to view analytics"}
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 text-ink-soft shrink-0 transition-transform ${
              dropdownOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        <AnimatePresence>
          {dropdownOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ duration: 0.18 }}
              className="absolute z-50 left-0 right-0 sm:right-auto sm:w-[540px] mt-2 bg-surface border border-line rounded-2xl shadow-xl overflow-hidden"
            >
              {/* Search + Filter inside dropdown */}
              <div className="p-3 border-b border-line space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-soft" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by title or class name..."
                    className="w-full pl-9 pr-4 py-2 border border-line rounded-xl text-sm text-ink bg-paper focus:outline-none focus:ring-2 focus:ring-violet-600 font-medium"
                    autoFocus
                  />
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {["all", "quiz", "test", "assignment", "coding"].map((t) => (
                    <button
                      key={t}
                      onClick={() => setFilterType(t)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                        filterType === t
                          ? "bg-violet-600 text-white shadow-sm"
                          : "bg-paper text-ink-soft hover:bg-violet-50 hover:text-violet-600"
                      }`}
                    >
                      {t === "all"
                        ? "All"
                        : TYPE_CONFIG[t]?.label || t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Items list */}
              <div className="max-h-72 overflow-y-auto">
                {filteredAssessments.length === 0 ? (
                  <div className="px-5 py-8 text-center text-ink-soft text-sm">
                    {loadingList
                      ? "Loading..."
                      : "No assessments found."}
                  </div>
                ) : (
                  filteredAssessments.map((a) => {
                    const isSelected =
                      a._id === selectedId && a.type === selectedType;
                    const TypeIcon = TYPE_CONFIG[a.type]?.icon || FileText;
                    return (
                      <button
                        key={`${a.type}-${a._id}`}
                        onClick={() => {
                          setSelectedId(a._id);
                          setSelectedType(a.type);
                          setDropdownOpen(false);
                        }}
                        className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors cursor-pointer border-b border-line/50 last:border-b-0 ${
                          isSelected ? "bg-violet-50 dark:bg-violet-900/30" : ""
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            TYPE_CONFIG[a.type]?.bg
                          }`}
                        >
                          <TypeIcon
                            className={`w-4 h-4 ${
                              TYPE_CONFIG[a.type]?.text
                            }`}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-ink truncate">
                            {a.title}
                          </p>
                          <p className="text-[11px] text-ink-soft truncate">
                            {a.className}
                            {a.classSubject ? ` · ${a.classSubject}` : ""} ·{" "}
                            {new Date(a.createdAt).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                            })}
                          </p>
                        </div>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md shrink-0 ${
                            TYPE_CONFIG[a.type]?.bg
                          } ${TYPE_CONFIG[a.type]?.text}`}
                        >
                          {TYPE_CONFIG[a.type]?.label}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ─── Loading State ─── */}
      {loadingAnalytics && (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600 mx-auto mb-3" />
            <p className="text-sm text-ink-soft">Loading analytics...</p>
          </div>
        </div>
      )}

      {/* ─── Empty State ─── */}
      {!loadingAnalytics && !analytics && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-surface border-2 border-dashed border-line rounded-2xl p-10 sm:p-16 text-center"
        >
          <BarChart3 className="w-12 h-12 text-violet-300 mx-auto mb-4" />
          <p className="text-ink font-semibold text-base mb-1">
            No assessment selected
          </p>
          <p className="text-ink-soft text-sm max-w-md mx-auto">
            Pick a quiz, test paper, or assignment from the dropdown above to
            see detailed performance graphs, pass/fail analysis, and student
            results.
          </p>
        </motion.div>
      )}

      {/* ─── Analytics Content ─── */}
      {analytics && !loadingAnalytics && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          {/* ── Summary Stats ── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard
              icon={Users}
              label="Total Students"
              value={analytics.summary.totalStudents}
              color="bg-slate-500"
            />
            <StatCard
              icon={UserCheck}
              label="Attempted"
              value={analytics.summary.attempted}
              color="bg-blue-500"
              sub={`${
                analytics.summary.totalStudents
                  ? Math.round(
                      (analytics.summary.attempted /
                        analytics.summary.totalStudents) *
                        100
                    )
                  : 0
              }% participation`}
            />
            <StatCard
              icon={UserX}
              label="Not Attempted"
              value={analytics.summary.notAttempted}
              color="bg-slate-400"
            />
            <StatCard
              icon={TrendingUp}
              label="Passed"
              value={analytics.summary.passCount}
              color="bg-emerald-500"
              sub={`≥ ${analytics.summary.passThreshold}%`}
            />
            <StatCard
              icon={AlertTriangle}
              label="Failed"
              value={analytics.summary.failCount}
              color="bg-red-500"
              sub={`< ${analytics.summary.passThreshold}%`}
            />
            <StatCard
              icon={Award}
              label="Avg Score"
              value={`${analytics.summary.avgPercentage}%`}
              color="bg-violet-500"
              sub={`High: ${analytics.summary.highestPercentage}% · Low: ${analytics.summary.lowestPercentage}%`}
            />
          </div>

          {/* ── Charts Row ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Bar Chart — Score Distribution */}
            <div className="bg-surface border border-line rounded-2xl p-5 shadow-sm">
              <h3 className="font-display text-lg font-semibold text-ink mb-4">
                Score Distribution
              </h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={analytics.distribution} barSize={42}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E6E1EF" vertical={false} />
                  <XAxis
                    dataKey="range"
                    tick={{ fontSize: 12, fill: "#6B6478" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: "#6B6478" }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Students" radius={[8, 8, 0, 0]}>
                    {analytics.distribution.map((entry, i) => (
                      <Cell key={i} fill={CHART_COLORS[i]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Pie Chart — Pass / Fail / Not Attempted */}
            <div className="bg-surface border border-line rounded-2xl p-5 shadow-sm">
              <h3 className="font-display text-lg font-semibold text-ink mb-4">
                Pass / Fail Breakdown
              </h3>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={[
                      {
                        name: "Passed",
                        value: analytics.summary.passCount,
                      },
                      {
                        name: "Failed",
                        value: analytics.summary.failCount,
                      },
                      {
                        name: "Not Attempted",
                        value: analytics.summary.notAttempted,
                      },
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {PIE_COLORS.map((c, i) => (
                      <Cell key={i} fill={c} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    wrapperStyle={{ fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ── Individual Scores Bar ── */}
          {analytics.studentResults.length > 0 && (
            <div className="bg-surface border border-line rounded-2xl p-5 shadow-sm">
              <h3 className="font-display text-lg font-semibold text-ink mb-4">
                Individual Student Scores
              </h3>
              <ResponsiveContainer
                width="100%"
                height={Math.max(
                  200,
                  analytics.studentResults.length * 32 + 40
                )}
              >
                <BarChart
                  data={analytics.studentResults}
                  layout="vertical"
                  margin={{ left: 10, right: 20 }}
                  barSize={18}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E6E1EF" horizontal={false} />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    tick={{ fontSize: 11, fill: "#6B6478" }}
                    axisLine={false}
                    tickLine={false}
                    unit="%"
                  />
                  <YAxis
                    dataKey="studentName"
                    type="category"
                    tick={{ fontSize: 11, fill: "#6B6478" }}
                    width={130}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-surface border border-line rounded-xl px-4 py-2.5 shadow-lg text-sm">
                          <p className="font-semibold text-ink">{d.studentName}</p>
                          <p className="text-ink-soft">
                            Score: {d.marksObtained}/{d.totalMarks} ({d.percentage}%)
                          </p>
                          <p
                            className={
                              d.status === "pass"
                                ? "text-emerald-600 font-bold"
                                : "text-red-500 font-bold"
                            }
                          >
                            {d.status === "pass" ? "PASSED" : "FAILED"}
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="percentage" name="Score %" radius={[0, 6, 6, 0]}>
                    {analytics.studentResults.map((s, i) => (
                      <Cell
                        key={i}
                        fill={s.status === "pass" ? "#22C55E" : "#EF4444"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* ── Student Results Table ── */}
          <div className="bg-surface border border-line rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="font-display text-lg font-semibold text-ink">
                Student Results
              </h3>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-soft" />
                  <input
                    type="text"
                    value={tableSearch}
                    onChange={(e) => setTableSearch(e.target.value)}
                    placeholder="Search students..."
                    className="pl-8 pr-3 py-2 border border-line rounded-xl text-xs text-ink bg-paper focus:outline-none focus:ring-2 focus:ring-violet-600 font-medium w-48"
                  />
                </div>
                <button
                  onClick={() => setShowNotAttempted(!showNotAttempted)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all border ${
                    showNotAttempted
                      ? "bg-violet-600 text-white border-violet-600"
                      : "bg-paper text-ink-soft border-line hover:bg-violet-50 hover:text-violet-600"
                  }`}
                >
                  {showNotAttempted ? "Hide" : "Show"} Not Attempted
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-paper">
                    <th className="text-left px-5 py-3 text-[11px] text-ink-soft uppercase tracking-wider font-semibold">
                      #
                    </th>
                    <th
                      className="text-left px-5 py-3 text-[11px] text-ink-soft uppercase tracking-wider font-semibold cursor-pointer select-none hover:text-violet-600"
                      onClick={() => toggleSort("studentName")}
                    >
                      <span className="flex items-center gap-1">
                        Student
                        <ArrowUpDown className="w-3 h-3" />
                      </span>
                    </th>
                    <th
                      className="text-left px-5 py-3 text-[11px] text-ink-soft uppercase tracking-wider font-semibold cursor-pointer select-none hover:text-violet-600"
                      onClick={() => toggleSort("marksObtained")}
                    >
                      <span className="flex items-center gap-1">
                        Marks
                        <ArrowUpDown className="w-3 h-3" />
                      </span>
                    </th>
                    <th
                      className="text-left px-5 py-3 text-[11px] text-ink-soft uppercase tracking-wider font-semibold cursor-pointer select-none hover:text-violet-600"
                      onClick={() => toggleSort("percentage")}
                    >
                      <span className="flex items-center gap-1">
                        Percentage
                        <ArrowUpDown className="w-3 h-3" />
                      </span>
                    </th>
                    <th className="text-left px-5 py-3 text-[11px] text-ink-soft uppercase tracking-wider font-semibold">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/50">
                  {getSortedStudents().map((s, i) => (
                    <tr
                      key={s.studentId}
                      className="hover:bg-violet-50/50 dark:hover:bg-violet-900/10 transition-colors"
                    >
                      <td className="px-5 py-3 text-ink-soft font-mono text-xs">
                        {i + 1}
                      </td>
                      <td className="px-5 py-3 font-medium text-ink">
                        {s.studentName}
                      </td>
                      <td className="px-5 py-3 text-ink font-mono">
                        {s.marksObtained}/{s.totalMarks}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 max-w-[100px] h-2 bg-line rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                s.status === "pass"
                                  ? "bg-emerald-500"
                                  : "bg-red-500"
                              }`}
                              style={{ width: `${Math.min(s.percentage, 100)}%` }}
                            />
                          </div>
                          <span className="font-mono text-xs font-bold text-ink">
                            {s.percentage}%
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase ${
                            s.status === "pass"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                              : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                          }`}
                        >
                          {s.status === "pass" ? "Pass" : "Fail"}
                        </span>
                      </td>
                    </tr>
                  ))}

                  {/* Not attempted students */}
                  {showNotAttempted &&
                    analytics.notAttemptedStudents?.map((s, i) => (
                      <tr
                        key={`na-${s.studentId}`}
                        className="bg-slate-50/50 dark:bg-slate-900/10"
                      >
                        <td className="px-5 py-3 text-ink-soft font-mono text-xs">
                          —
                        </td>
                        <td className="px-5 py-3 font-medium text-ink-soft">
                          {s.studentName}
                        </td>
                        <td className="px-5 py-3 text-ink-soft font-mono">—</td>
                        <td className="px-5 py-3 text-ink-soft font-mono">—</td>
                        <td className="px-5 py-3">
                          <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                            Not Attempted
                          </span>
                        </td>
                      </tr>
                    ))}

                  {getSortedStudents().length === 0 &&
                    !(showNotAttempted && analytics.notAttemptedStudents?.length) && (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-5 py-8 text-center text-ink-soft text-sm"
                        >
                          No students found.
                        </td>
                      </tr>
                    )}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}
    </section>
  );
};

export default AssessmentAnalyticsPanel;
