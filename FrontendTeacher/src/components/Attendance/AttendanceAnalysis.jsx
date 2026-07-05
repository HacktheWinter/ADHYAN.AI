import React, { useState, useEffect, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Brush
} from "recharts";
import { Calendar, Activity, PieChart as PieChartIcon, BarChart2, TrendingUp } from "lucide-react";
import api from "../../api/axios";

// Helper for formatting date strings
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

const AttendanceAnalysis = ({ classId, students }) => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeFilter, setTimeFilter] = useState("daily"); // daily, weekly, monthly, yearly

  useEffect(() => {
    const fetchAttendanceData = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/attendance/sessions/${classId}`);
        if (response.data?.success && response.data?.attendance) {
          const fetchedSessions = Array.isArray(response.data.attendance)
            ? response.data.attendance
            : [response.data.attendance];
          
          // Only use completed sessions that have entries
          const validSessions = fetchedSessions.filter(
              s => s.status === 'completed' && Array.isArray(s.attendanceEntries) && s.attendanceEntries.length > 0
          );
          setSessions(validSessions);
        }
      } catch (err) {
        console.error("Error fetching attendance data:", err);
        setError("Failed to load attendance records.");
      } finally {
        setLoading(false);
      }
    };

    if (classId) fetchAttendanceData();
  }, [classId]);

  // Aggregate Data based on timeFilter
  const chartData = useMemo(() => {
    if (!sessions.length) return { list: [], summary: { present: 0, absent: 0 } };

    const groupedData = {};
    let presentTotal = 0;
    let absentTotal = 0;

    sessions.forEach(session => {
        const dateObj = new Date(session.date || session.attendanceDate || session.createdAt);
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
            groupedData[key] = { name: label, Present: 0, Absent: 0, dateVal: dateObj.getTime() };
        }

        session.attendanceEntries.forEach(entry => {
            if (entry.status === 'present' || entry.status === 'late') {
                groupedData[key].Present += 1;
                presentTotal += 1;
            } else {
                groupedData[key].Absent += 1;
                absentTotal += 1;
            }
        });
    });

    const sortedData = Object.values(groupedData).sort((a, b) => a.dateVal - b.dateVal);
    return { list: sortedData, summary: { present: presentTotal, absent: absentTotal } };
  }, [sessions, timeFilter]);

  const { list, summary } = chartData || { list: [], summary: { present: 0, absent: 0 } };

  const totalEntries = summary.present + summary.absent;
  const avgAttendance = totalEntries > 0 ? ((summary.present / totalEntries) * 100).toFixed(1) : 0;

  const pieData = [
    { name: "Present", value: summary.present },
    { name: "Absent", value: summary.absent }
  ];
  const COLORS = ["#10B981", "#EF4444"]; // Green, Red

  if (loading) {
     return (
        <div className="flex flex-col justify-center items-center min-h-[400px] bg-surface rounded-3xl border border-line shadow-sm">
            <div className="w-12 h-12 border-4 border-violet-100 border-t-violet-dark rounded-full animate-spin mb-4 shadow-sm" />
            <p className="text-ink-soft font-medium">Analyzing attendance data...</p>
        </div>
     );
  }

  if (error) {
     return (
        <div className="bg-rose-100 dark:bg-rose-955/40 text-rose-800 dark:text-rose-350 p-6 rounded-2xl shadow-sm font-bold border border-line">
            {error}
        </div>
     );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Top Banner / Stats */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-surface p-6 rounded-2xl shadow-sm border border-line gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-violet-50 text-violet-dark border border-line flex items-center justify-center">
            <TrendingUp className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold font-display text-ink">Attendance Analysis</h2>
            <p className="text-sm text-ink-soft">Visual breakdown of classroom attendance patterns</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 w-full md:w-auto">
            <div className="flex flex-col items-center bg-violet-50 rounded-xl px-6 py-3 border border-line min-w-[140px] w-full sm:w-auto">
                <span className="text-xs font-bold text-ink-soft uppercase tracking-wider mb-1">Avg Attendance</span>
                <span className="text-3xl font-black text-violet-dark font-display">{avgAttendance}%</span>
            </div>
            
            <div className="flex bg-paper border border-line p-1 rounded-xl overflow-x-auto hide-scrollbar max-w-full">
                {["daily", "weekly", "monthly", "yearly"].map(filter => (
                    <button
                        key={filter}
                        onClick={() => setTimeFilter(filter)}
                        className={`px-4 py-2 text-sm font-bold rounded-lg capitalize whitespace-nowrap transition-all duration-200 cursor-pointer ${
                            timeFilter === filter
                            ? "bg-surface text-violet-dark border border-line shadow-sm"
                            : "text-ink-soft hover:text-ink"
                        }`}
                    >
                        {filter}
                    </button>
                ))}
            </div>
        </div>
      </div>

      {sessions.length === 0 ? (
          <div className="bg-surface rounded-2xl p-12 text-center border border-line shadow-sm flex flex-col items-center justify-center">
             <Activity className="w-16 h-16 text-ink-soft opacity-30 mb-4" />
             <h3 className="text-xl font-semibold font-display text-ink">No Data Available</h3>
             <p className="text-ink-soft mt-2">There are no recorded attendance sessions to analyze yet.</p>
          </div>
      ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Main Bar Chart */}
            <div className="lg:col-span-2 bg-surface p-6 rounded-2xl shadow-sm border border-line flex flex-col">
                <div className="flex items-center gap-2 mb-6">
                    <BarChart2 className="w-5 h-5 text-violet-dark" />
                    <h3 className="text-lg font-semibold font-display text-ink">Attendance Frequency</h3>
                </div>
                <div className="flex-1 w-full min-h-[550px] relative">
                    <style>{`
                        .custom-chart-scrollbar::-webkit-scrollbar {
                            height: 10px;
                        }
                        .custom-chart-scrollbar::-webkit-scrollbar-button:single-button {
                            background-color: var(--paper);
                            display: block;
                            border-style: solid;
                            height: 10px;
                            width: 14px;
                        }
                        .custom-chart-scrollbar::-webkit-scrollbar-button:single-button:horizontal:decrement {
                            border-width: 5px 8px 5px 0;
                            border-color: transparent var(--ink-soft) transparent transparent;
                        }
                        .custom-chart-scrollbar::-webkit-scrollbar-button:single-button:horizontal:decrement:hover {
                            border-color: transparent var(--ink) transparent transparent;
                        }
                        .custom-chart-scrollbar::-webkit-scrollbar-button:single-button:horizontal:increment {
                            border-width: 5px 0 5px 8px;
                            border-color: transparent transparent transparent var(--ink-soft);
                        }
                        .custom-chart-scrollbar::-webkit-scrollbar-button:single-button:horizontal:increment:hover {
                            border-color: transparent transparent transparent var(--ink);
                        }
                        .custom-chart-scrollbar::-webkit-scrollbar-track {
                            background: var(--paper);
                            border-radius: 4px;
                        }
                        .custom-chart-scrollbar::-webkit-scrollbar-thumb {
                            background: var(--line);
                            border-radius: 4px;
                        }
                        .custom-chart-scrollbar::-webkit-scrollbar-thumb:hover {
                            background: var(--ink-soft);
                        }
                        .custom-chart-scrollbar {
                            scrollbar-width: thin;
                            scrollbar-color: var(--line) var(--paper);
                        }
                        /* Recharts SVG theme overrides */
                        .recharts-cartesian-axis-tick text {
                            fill: var(--ink-soft) !important;
                        }
                        .recharts-label {
                            fill: var(--ink-soft) !important;
                        }
                        .recharts-legend-item-text {
                            color: var(--ink) !important;
                        }
                        .recharts-default-tooltip {
                            background-color: var(--surface) !important;
                            border-color: var(--line) !important;
                        }
                        .recharts-tooltip-label {
                            color: var(--ink) !important;
                        }
                    `}</style>
                    <div className="custom-chart-scrollbar w-full overflow-x-auto overflow-y-hidden pb-4" style={{ minHeight: 550 }}>
                        <div style={{ minWidth: Math.max(list.length * 120, 800), height: 550 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart 
                                    data={list} 
                                    margin={{ top: 20, right: 30, left: 30, bottom: 50 }} 
                                    barGap={0}
                                    barCategoryGap="15%"
                                >
                                    <defs>
                                        <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#10B981" stopOpacity={1} />
                                            <stop offset="100%" stopColor="#059669" stopOpacity={0.6} />
                                        </linearGradient>
                                        <linearGradient id="colorAbsent" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#EF4444" stopOpacity={1} />
                                            <stop offset="100%" stopColor="#DC2626" stopOpacity={0.6} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="var(--line)" />
                                     <XAxis 
                                        dataKey="name" 
                                        axisLine={{ stroke: 'var(--line)' }} 
                                        tickLine={false} 
                                        tick={{ fill: 'currentColor', fontSize: 13, fontWeight: 600 }} 
                                        dy={15} 
                                        interval={0}
                                        className="text-ink-soft font-medium"
                                        label={{ value: 'TIMELINE PERIOD', position: 'bottom', offset: 25, fill: 'currentColor', fontSize: 13, fontWeight: 700, letterSpacing: '0.05em', className: 'text-ink-soft font-bold' }}
                                    />
                                    <YAxis 
                                        axisLine={{ stroke: 'var(--line)' }} 
                                        tickLine={false} 
                                        allowDecimals={false}
                                        domain={[0, dataMax => Math.max(dataMax, 5)]}
                                        tickCount={6}
                                        tick={{ fill: 'currentColor', fontSize: 13, fontWeight: 600 }} 
                                        dx={-10}
                                        className="text-ink-soft font-medium"
                                        label={{ value: 'STUDENT COUNT', angle: -90, position: 'insideLeft', offset: -15, fill: 'currentColor', fontSize: 13, fontWeight: 700, letterSpacing: '0.05em', className: 'text-ink-soft font-bold' }}
                                    />
                                    <Tooltip 
                                        cursor={{ fill: 'var(--line)', opacity: 0.4 }}
                                        contentStyle={{ borderRadius: '14px', border: '1px solid var(--line)', backgroundColor: 'var(--surface)', color: 'var(--ink)', padding: '12px' }}
                                    />
                                    <Legend iconType="circle" wrapperStyle={{ paddingBottom: '30px' }} verticalAlign="top" />
                                    <Bar dataKey="Present" fill="url(#colorPresent)" radius={[6, 6, 0, 0]} maxBarSize={45} />
                                    <Bar dataKey="Absent" fill="url(#colorAbsent)" radius={[6, 6, 0, 0]} maxBarSize={45} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>

            {/* Side Panel: Pie Chart & Details */}
            <div className="flex flex-col gap-6">
                <div className="bg-surface p-6 rounded-2xl shadow-sm border border-line flex-1 flex flex-col">
                    <div className="flex items-center gap-2 mb-4">
                        <PieChartIcon className="w-5 h-5 text-violet-dark" />
                        <h3 className="text-lg font-semibold font-display text-ink">Distribution</h3>
                    </div>
                    <div className="flex-1 w-full min-h-[200px] flex justify-center items-center">
                        <ResponsiveContainer width="100%" height={220}>
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={85}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex justify-center gap-6 mt-4 pt-4 border-t border-line">
                        <div className="flex flex-col items-center">
                            <div className="flex items-center gap-1.5 mb-1">
                                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                                <span className="text-xs text-ink-soft font-bold">Present</span>
                            </div>
                            <span className="text-xl font-bold font-display text-ink">{summary.present}</span>
                        </div>
                        <div className="flex flex-col items-center">
                            <div className="flex items-center gap-1.5 mb-1">
                                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                <span className="text-xs text-ink-soft font-bold">Absent</span>
                            </div>
                            <span className="text-xl font-bold font-display text-ink">{summary.absent}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-violet-600 to-indigo-700 p-6 rounded-2xl shadow-md text-white">
                    <h3 className="font-bold text-lg mb-2 font-display">Insight Summary</h3>
                    <p className="text-white/90 text-sm leading-relaxed opacity-95">
                        Based on {timeFilter} records, the attendance rate is {avgAttendance}%.
                        {parseFloat(avgAttendance) < 75 ? " This is below the recommended threshold. Consider reaching out to absentees." : " Excellent rate, keep up the engagement!"}
                    </p>
                    <div className="mt-4 flex items-center gap-2 text-xs font-bold text-white/95 bg-white/10 w-fit px-3 py-1.5 rounded-xl border border-white/20">
                        <Calendar className="w-3 h-3" />
                         Total classes: {sessions.length}
                    </div>
                </div>
            </div>

          </div>
      )}
    </div>
  );
};

export default AttendanceAnalysis;
