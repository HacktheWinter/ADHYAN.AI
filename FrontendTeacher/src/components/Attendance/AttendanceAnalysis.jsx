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
        <div className="flex flex-col justify-center items-center min-h-[400px] bg-white rounded-3xl border border-gray-100 shadow-sm">
            <div className="w-12 h-12 border-4 border-purple-100 border-t-purple-600 rounded-full animate-spin mb-4 shadow-sm" />
            <p className="text-gray-500 font-medium">Analyzing attendance data...</p>
        </div>
     );
  }

  if (error) {
     return (
        <div className="bg-red-50 text-red-700 p-6 rounded-2xl shadow-sm font-medium border border-red-100">
            {error}
        </div>
     );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Top Banner / Stats */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100 gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 border border-purple-200">
            <TrendingUp className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-gray-800">Attendance Analysis</h2>
            <p className="text-sm text-gray-500">Visual breakdown of classroom attendance patterns</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 w-full md:w-auto">
            <div className="flex flex-col items-center bg-purple-50 rounded-xl px-6 py-3 border border-purple-100 min-w-[140px] w-full sm:w-auto">
                <span className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-1">Avg Attendance</span>
                <span className="text-3xl font-black text-purple-700">{avgAttendance}%</span>
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
      </div>

      {sessions.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm flex flex-col items-center justify-center">
             <Activity className="w-16 h-16 text-gray-300 mb-4" />
             <h3 className="text-xl font-bold text-gray-700">No Data Available</h3>
             <p className="text-gray-500 mt-2">There are no recorded attendance sessions to analyze yet.</p>
          </div>
      ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Main Bar Chart */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                <div className="flex items-center gap-2 mb-6">
                    <BarChart2 className="w-5 h-5 text-purple-600" />
                    <h3 className="text-lg font-bold text-gray-800">Attendance Frequency</h3>
                </div>
                <div className="flex-1 w-full min-h-[550px] relative">
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
                                        domain={[0, dataMax => Math.max(dataMax, 5)]}
                                        tickCount={6}
                                        tick={{ fill: '#6B7280', fontSize: 13, fontWeight: 600 }} 
                                        dx={-10}
                                        label={{ value: 'STUDENT COUNT', angle: -90, position: 'insideLeft', offset: -15, fill: '#9CA3AF', fontSize: 13, fontWeight: 700, letterSpacing: '0.05em' }}
                                    />
                                    <Tooltip 
                                        cursor={{ fill: '#F3F4F6', opacity: 0.4 }}
                                        contentStyle={{ borderRadius: '14px', border: '1px solid #F3F4F6', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
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
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex-1 flex flex-col">
                    <div className="flex items-center gap-2 mb-4">
                        <PieChartIcon className="w-5 h-5 text-purple-600" />
                        <h3 className="text-lg font-bold text-gray-800">Distribution</h3>
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
                    <div className="flex justify-center gap-6 mt-4 pt-4 border-t border-gray-50">
                        <div className="flex flex-col items-center">
                            <div className="flex items-center gap-1.5 mb-1">
                                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                                <span className="text-xs text-gray-500 font-medium">Present</span>
                            </div>
                            <span className="text-xl font-bold text-gray-800">{summary.present}</span>
                        </div>
                        <div className="flex flex-col items-center">
                            <div className="flex items-center gap-1.5 mb-1">
                                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                <span className="text-xs text-gray-500 font-medium">Absent</span>
                            </div>
                            <span className="text-xl font-bold text-gray-800">{summary.absent}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-purple-600 to-indigo-700 p-6 rounded-2xl shadow-md text-white">
                    <h3 className="font-bold text-lg mb-2">Insight Summary</h3>
                    <p className="text-purple-100 text-sm leading-relaxed opacity-90">
                        Based on {timeFilter} records, the attendance rate is {avgAttendance}%.
                        {parseFloat(avgAttendance) < 75 ? " This is below the recommended threshold. Consider reaching out to absentees." : " Excellent rate, keep up the engagement!"}
                    </p>
                    <div className="mt-4 flex items-center gap-2 text-xs font-medium text-purple-200 bg-black/10 w-fit px-3 py-1.5 rounded-lg border border-white/10">
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
