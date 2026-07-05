import React, { useState, useEffect, useRef, useCallback } from "react";
import XLSXStyle from "xlsx-js-style";
import {
  Download, Table as TableIcon, Calendar, ChevronLeft, ChevronRight,
  Search, TrendingUp, AlertTriangle, LayoutGrid, LayoutList,
  CalendarOff, Plus, X, Trash2
} from "lucide-react";
import api from "../../api/axios";

// ─── Holiday Manager ──────────────────────────────────────────────────────────
const HOLIDAY_KEY_PREFIX = "holidays_";

const getHolidays = (classId) => {
  try {
    return JSON.parse(localStorage.getItem(`${HOLIDAY_KEY_PREFIX}${classId}`) || "[]");
  } catch { return []; }
};

const saveHolidays = (classId, holidays) => {
  localStorage.setItem(`${HOLIDAY_KEY_PREFIX}${classId}`, JSON.stringify(holidays));
};

const toLocalDateKey = (value) => {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    return value.trim();
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
// ─────────────────────────────────────────────────────────────────────────────

const AttendanceRegister = ({ classId, students }) => {
  const [registerData, setRegisterData] = useState([]);
  const [dates, setDates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState(() => window.innerWidth < 640 ? "cards" : "table"); // "table" | "cards"
  const [lowThreshold, setLowThreshold] = useState(75); // % threshold for alerts

  // Holiday management
  const [holidays, setHolidays] = useState(() => getHolidays(classId));
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [newHolidayFrom, setNewHolidayFrom] = useState("");
  const [newHolidayTo, setNewHolidayTo] = useState("");
  const [newHolidayName, setNewHolidayName] = useState("");

  const tableWrapperRef = useRef(null);
  const dateScrollbarRef = useRef(null);
  const syncingScrollSourceRef = useRef(null);
  const holidayModalRef = useRef(null);

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;
  const currentDay = today.getDate();
  const startDate = new Date(currentYear, 0, 1);

  const [selectedMonth, setSelectedMonth] = useState(
    `${currentYear}-${String(currentMonth).padStart(2, '0')}`
  );

  const getVisibleMonthDates = useCallback((monthValue) => {
    const [year, month] = monthValue.split('-').map(Number);
    const isCurrentMonth =
      year === currentYear && month === currentMonth;
    const lastVisibleDay = isCurrentMonth
      ? currentDay
      : new Date(year, month, 0).getDate();

    return Array.from({ length: lastVisibleDay }, (_, index) => {
      const day = String(index + 1).padStart(2, '0');
      return `${year}-${String(month).padStart(2, '0')}-${day}`;
    });
  }, [currentDay, currentMonth, currentYear]);

  // Check if a date is a holiday (Sunday or custom)
  const isHoliday = useCallback((dateStr) => {
    if (new Date(dateStr + 'T00:00:00').getDay() === 0) return { isHol: true, name: "Sunday" };
    const found = holidays.find(h => h.date === dateStr);
    if (found) return { isHol: true, name: found.name || "Holiday" };
    return { isHol: false, name: "" };
  }, [holidays]);

  const loadRegisterData = useCallback(async () => {
    setIsLoading(true);
    try {
      const monthDates = getVisibleMonthDates(selectedMonth);
      setDates(monthDates);

      // Fetch attendance records from backend
      const response = await api.get(`/attendance/sessions/${classId}`);
      const sessions = Array.isArray(response.data?.attendance) ? response.data.attendance : [response.data?.attendance].filter(Boolean);

      // Build a map of date -> attendance data
      const attendanceMap = {};
      sessions.forEach((session) => {
        const sessionDate = toLocalDateKey(session.date);
        if (monthDates.includes(sessionDate)) {
          if (!attendanceMap[sessionDate]) {
            attendanceMap[sessionDate] = [];
          }
          const entries = session.attendanceEntries || [];
          entries.forEach((entry) => {
            const existing = attendanceMap[sessionDate].find((e) => {
              const sId1 = (e.studentId?._id || e.studentId)?.toString();
              const sId2 = (entry.studentId?._id || entry.studentId)?.toString();
              return sId1 === sId2;
            });
            if (existing) {
              // Priority: Present/Late over Absent
              if (entry.status === "present" || entry.status === "late") {
                existing.status = entry.status;
              }
            } else {
              attendanceMap[sessionDate].push({ ...entry });
            }
          });
        }
      });

      const tableData = students.map(student => {
        const studentRow = {
          id: student._id,
          name: student.name,
          email: student.email,
          attendance: {},
          totalPresent: 0,
          totalAbsent: 0,
          markedDays: 0,
        };

        monthDates.forEach(date => {
          const { isHol } = isHoliday(date);

          if (isHol) {
            studentRow.attendance[date] = 'H';
            return;
          }

          // Look up student's attendance for this date
          const dayEntries = attendanceMap[date] || [];
          const studentEntry = dayEntries.find((e) => {
            const sId = (e.studentId?._id || e.studentId)?.toString();
            return sId === student._id?.toString();
          });
          
          if (studentEntry) {
            const status = studentEntry.status === 'present' ? 'P' : studentEntry.status === 'late' ? 'L' : 'A';
            studentRow.attendance[date] = status;
            if (status === 'P' || status === 'L') { 
              studentRow.totalPresent++; 
              studentRow.markedDays++; 
            }
            if (status === 'A') { 
              studentRow.totalAbsent++; 
              studentRow.markedDays++; 
            }
          } else {
            studentRow.attendance[date] = '-';
          }
        });

        return studentRow;
      });

      setRegisterData(tableData);
    } catch (error) {
      console.error("Error loading attendance register data:", error);
      // Fallback to empty register if backend fails
      const monthDates = getVisibleMonthDates(selectedMonth);
      setDates(monthDates);

      const tableData = students.map(student => ({
        id: student._id,
        name: student.name,
        email: student.email,
        attendance: monthDates.reduce((acc, date) => {
          const { isHol } = isHoliday(date);
          acc[date] = isHol ? 'H' : '-';
          return acc;
        }, {}),
        totalPresent: 0,
        totalAbsent: 0,
        markedDays: 0,
      }));
      setRegisterData(tableData);
    } finally {
      setIsLoading(false);
    }
  }, [classId, getVisibleMonthDates, selectedMonth, students, isHoliday]);

  useEffect(() => { loadRegisterData(); }, [loadRegisterData]);

  // Auto-switch view on resize
  useEffect(() => {
    const onResize = () => setViewMode(window.innerWidth < 640 ? "cards" : "table");
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Scroll sync
  const handleTableScroll = () => {
    if (!tableWrapperRef.current || !dateScrollbarRef.current) return;
    if (syncingScrollSourceRef.current === 'bar') return;
    const wrapper = tableWrapperRef.current;
    const custom = dateScrollbarRef.current;
    const maxScroll = wrapper.scrollWidth - wrapper.clientWidth;
    const customMax = custom.scrollWidth - custom.clientWidth;
    if (maxScroll > 0 && customMax > 0) {
      syncingScrollSourceRef.current = 'table';
      custom.scrollLeft = (wrapper.scrollLeft / maxScroll) * customMax;
      requestAnimationFrame(() => { if (syncingScrollSourceRef.current === 'table') syncingScrollSourceRef.current = null; });
    }
  };

  const handleDateScrollbarScroll = () => {
    if (!tableWrapperRef.current || !dateScrollbarRef.current) return;
    if (syncingScrollSourceRef.current === 'table') return;
    const wrapper = tableWrapperRef.current;
    const custom = dateScrollbarRef.current;
    const wrapperMax = wrapper.scrollWidth - wrapper.clientWidth;
    const customMax = custom.scrollWidth - custom.clientWidth;
    if (wrapperMax > 0 && customMax > 0) {
      syncingScrollSourceRef.current = 'bar';
      wrapper.scrollLeft = (custom.scrollLeft / customMax) * wrapperMax;
      requestAnimationFrame(() => { if (syncingScrollSourceRef.current === 'bar') syncingScrollSourceRef.current = null; });
    }
  };

  const goToPrevMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const prev = new Date(y, m - 2, 1);
    if (prev >= startDate) setSelectedMonth(`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`);
  };

  const goToNextMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const next = new Date(y, m, 1);
    if (next <= today) setSelectedMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`);
  };

  const exportToXLSX = () => {
    // ── Cell style helpers ────────────────────────────────────────
    const borderNone  = { left: {}, right: {}, top: {}, bottom: {} };
    const hdrStyle    = { font: { bold: true, color: { rgb: "FFFFFF" }, sz: 11 }, fill: { fgColor: { rgb: "7C3AED" } }, alignment: { horizontal: "center", vertical: "center" }, border: borderNone };
    const subHdrStyle = { font: { bold: true, sz: 10 }, fill: { fgColor: { rgb: "EDE9FE" } }, alignment: { horizontal: "center" }, border: borderNone };
    const presentStyle = { font: { bold: true, color: { rgb: "14532D" } }, fill: { fgColor: { rgb: "86EFAC" } }, alignment: { horizontal: "center" }, border: borderNone };
    const absentStyle  = { font: { bold: true, color: { rgb: "7F1D1D" } }, fill: { fgColor: { rgb: "FCA5A5" } }, alignment: { horizontal: "center" }, border: borderNone };
    const holidayStyle = { font: { italic: true, color: { rgb: "92400E" } }, fill: { fgColor: { rgb: "FED7AA" } }, alignment: { horizontal: "center" }, border: borderNone };
    const normalStyle  = { alignment: { horizontal: "center" }, border: borderNone };
    const nameStyle    = { font: { bold: true }, alignment: { horizontal: "left" }, border: borderNone };
    const pctGreen     = { font: { bold: true, color: { rgb: "166534" } }, fill: { fgColor: { rgb: "DCFCE7" } }, alignment: { horizontal: "center" }, border: borderNone };
    const pctYellow    = { font: { bold: true, color: { rgb: "854D0E" } }, fill: { fgColor: { rgb: "FEF9C3" } }, alignment: { horizontal: "center" }, border: borderNone };
    const pctRed       = { font: { bold: true, color: { rgb: "991B1B" } }, fill: { fgColor: { rgb: "FEE2E2" } }, alignment: { horizontal: "center" }, border: borderNone };

    const ws = {};
    const dataStart = 2;

    // ── Header row ────────────────────────────────────────────────
    const fixedHdrs  = ["S.No", "Student Name", "Email"];
    const dateLabels = dates.map(d => new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    const tailHdrs   = ["Total Present", "Total Absent", "Attendance %"];
    const allHdrs    = [...fixedHdrs, ...dateLabels, ...tailHdrs];
    allHdrs.forEach((h, c) => {
      ws[XLSXStyle.utils.encode_cell({ r: 0, c })] = { v: h, t: "s", s: hdrStyle };
    });

    // ── Day-name sub-header row ───────────────────────────────────
    dates.forEach((d, i) => {
      ws[XLSXStyle.utils.encode_cell({ r: 1, c: 3 + i })] = {
        v: new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' }),
        t: "s", s: subHdrStyle,
      };
    });
    [0, 1, 2, allHdrs.length - 3, allHdrs.length - 2, allHdrs.length - 1].forEach(c => {
      if (!ws[XLSXStyle.utils.encode_cell({ r: 1, c })]) {
        ws[XLSXStyle.utils.encode_cell({ r: 1, c })] = { v: "", t: "s", s: subHdrStyle };
      }
    });

    // ── Data rows ─────────────────────────────────────────────────
    filteredData.forEach((row, i) => {
      const r = dataStart + i;
      const pct = row.markedDays > 0 ? Math.round((row.totalPresent / row.markedDays) * 100) : 0;
      const pctStyle = pct >= 75 ? pctGreen : pct >= 60 ? pctYellow : pctRed;

      ws[XLSXStyle.utils.encode_cell({ r, c: 0 })] = { v: i + 1,     t: "n", s: normalStyle };
      ws[XLSXStyle.utils.encode_cell({ r, c: 1 })] = { v: row.name,  t: "s", s: nameStyle };
      ws[XLSXStyle.utils.encode_cell({ r, c: 2 })] = { v: row.email, t: "s", s: normalStyle };

      dates.forEach((date, di) => {
        const { isHol, name: holName } = isHoliday(date);
        const status = row.attendance[date];
        let cell;
        if (isHol)         cell = { v: holName || "H", t: "s", s: holidayStyle };
        else if (status === 'P') cell = { v: "P",   t: "s", s: presentStyle };
        else if (status === 'A') cell = { v: "A",   t: "s", s: absentStyle  };
        else                     cell = { v: "-",   t: "s", s: normalStyle  };
        ws[XLSXStyle.utils.encode_cell({ r, c: 3 + di })] = cell;
      });

      const tail = allHdrs.length;
      ws[XLSXStyle.utils.encode_cell({ r, c: tail - 3 })] = { v: row.totalPresent, t: "n", s: pctGreen  };
      ws[XLSXStyle.utils.encode_cell({ r, c: tail - 2 })] = { v: row.totalAbsent,  t: "n", s: pctRed    };
      ws[XLSXStyle.utils.encode_cell({ r, c: tail - 1 })] = { v: `${pct}%`,        t: "s", s: pctStyle  };
    });

    // ── Column widths ─────────────────────────────────────────────
    ws['!cols'] = [
      { wch: 6 }, { wch: 28 }, { wch: 30 },
      ...dates.map(() => ({ wch: 5 })),
      { wch: 13 }, { wch: 13 }, { wch: 13 },
    ];
    ws['!ref'] = XLSXStyle.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: dataStart + filteredData.length - 1, c: allHdrs.length - 1 },
    });

    const wb = XLSXStyle.utils.book_new();
    XLSXStyle.utils.book_append_sheet(wb, ws, "Attendance");
    XLSXStyle.writeFile(wb, `Attendance_Register_${selectedMonth}.xlsx`);
  };

  const getMonthLabel = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Holiday modal handlers
  const handleAddHoliday = () => {
    if (!newHolidayFrom) return;
    const from = new Date(newHolidayFrom + 'T00:00:00');
    const to = newHolidayTo ? new Date(newHolidayTo + 'T00:00:00') : from;
    if (to < from) return; // invalid range

    // Generate one entry per day in the range
    const rangeDates = [];
    const cursor = new Date(from);
    const groupId = newHolidayFrom; // use start date as group id
    while (cursor <= to) {
      const dateStr = `${cursor.getFullYear()}-${String(cursor.getMonth()+1).padStart(2,'0')}-${String(cursor.getDate()).padStart(2,'0')}`;
      rangeDates.push({ date: dateStr, name: newHolidayName || "Holiday", groupId, groupFrom: newHolidayFrom, groupTo: newHolidayTo || newHolidayFrom });
      cursor.setDate(cursor.getDate() + 1);
    }

    // Remove any existing entries for these dates, then add new ones
    const datesToAdd = new Set(rangeDates.map(r => r.date));
    const filtered = holidays.filter(h => !datesToAdd.has(h.date));
    const updated = [...filtered, ...rangeDates].sort((a, b) => a.date.localeCompare(b.date));
    setHolidays(updated);
    saveHolidays(classId, updated);
    setNewHolidayFrom("");
    setNewHolidayTo("");
    setNewHolidayName("");
  };

  // Remove all dates belonging to the same group (range)
  const handleRemoveHoliday = (groupId) => {
    const updated = holidays.filter(h => (h.groupId || h.date) !== groupId);
    setHolidays(updated);
    saveHolidays(classId, updated);
  };

  // Group holidays by groupId for display — each range shows as one row
  const groupedHolidays = (() => {
    const seen = new Set();
    const groups = [];
    holidays.forEach(h => {
      const gid = h.groupId || h.date;
      if (!seen.has(gid)) {
        seen.add(gid);
        const members = holidays.filter(x => (x.groupId || x.date) === gid);
        groups.push({
          groupId: gid,
          name: h.name,
          from: members[0].date,
          to: members[members.length - 1].date,
          count: members.length,
        });
      }
    });
    return groups;
  })();

  // Outside click for holiday modal
  useEffect(() => {
    const handler = (e) => {
      if (showHolidayModal && holidayModalRef.current && !holidayModalRef.current.contains(e.target)) {
        setShowHolidayModal(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showHolidayModal]);

  // ── Derived data ──────────────────────────────────────────────
  const filteredData = registerData.filter(row =>
    !searchQuery ||
    row.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    row.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Analytics
  const totalWorkingDays = dates.filter(d => !isHoliday(d).isHol && new Date(d + 'T00:00:00') <= today).length;
  const avgAttendance = (() => {
    const withMarked = registerData.filter(r => r.markedDays > 0);
    if (withMarked.length === 0) return 0;
    const sum = withMarked.reduce((s, r) => s + Math.round((r.totalPresent / r.markedDays) * 100), 0);
    return Math.round(sum / withMarked.length);
  })();
  const lowAttendanceStudents = registerData.filter(r => {
    if (r.markedDays === 0) return false;
    const pct = Math.round((r.totalPresent / r.markedDays) * 100);
    return pct < lowThreshold;
  });

  const getAttendancePct = (row) => {
    if (row.markedDays === 0) return null;
    return Math.round((row.totalPresent / row.markedDays) * 100);
  };

  const getPctColor = (pct) => {
    if (pct === null) return "text-ink-soft";
    if (pct >= 75) return "text-green-600 dark:text-green-400 font-bold";
    if (pct >= 60) return "text-orange-600 dark:text-orange-400 font-bold";
    return "text-rose-600 dark:text-rose-455 font-bold";
  };

  const getPctBg = (pct) => {
    if (pct === null) return "bg-paper border-line";
    if (pct >= 75) return "bg-green-100 dark:bg-green-955/40 border border-line";
    if (pct >= 60) return "bg-amber-50 text-amber-800 border border-line";
    return "bg-rose-100 dark:bg-rose-955/40 border border-line";
  };

  return (
    <div className="space-y-6 text-ink font-body">

      {/* ── Analytics Cards ─────────────────────────────────────── */}
      {!isLoading && registerData.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-surface rounded-xl border border-line shadow-sm p-4">
            <div className="text-xs text-ink-soft uppercase tracking-wide mb-1 font-bold">Total Students</div>
            <div className="text-2xl font-black font-display text-ink">{registerData.length}</div>
          </div>
          <div className="bg-surface rounded-xl border border-line shadow-sm p-4">
            <div className="text-xs text-ink-soft uppercase tracking-wide mb-1 font-bold">Working Days</div>
            <div className="text-2xl font-black font-display text-ink">{totalWorkingDays}</div>
            <div className="text-xs text-ink-soft mt-0.5">this month so far</div>
          </div>
          <div className="bg-surface rounded-xl border border-line shadow-sm p-4">
            <div className="text-xs text-ink-soft uppercase tracking-wide mb-1 font-bold flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Avg Attendance
            </div>
            <div className={`text-2xl font-black font-display ${getPctColor(avgAttendance)}`}>{avgAttendance}%</div>
          </div>
          <div
            className={`rounded-xl border shadow-sm p-4 cursor-pointer transition-all ${lowAttendanceStudents.length > 0 ? 'bg-rose-150/20 border-rose-250 dark:border-rose-800 hover:opacity-90' : 'bg-surface border-line'}`}
            title="Students below threshold"
          >
            <div className="text-xs text-ink-soft uppercase tracking-wide mb-1 font-bold flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-rose-500" /> Below {lowThreshold}%
            </div>
            <div className={`text-2xl font-black font-display ${lowAttendanceStudents.length > 0 ? 'text-rose-700 dark:text-rose-455' : 'text-ink'}`}>
              {lowAttendanceStudents.length}
            </div>
            {lowAttendanceStudents.length > 0 && (
              <div className="text-xs text-rose-500 mt-0.5 font-bold">⚠ Students at risk</div>
            )}
          </div>
        </div>
      )}

      {/* ── Low Attendance Alert Banner ─────────────────────────── */}
      {!isLoading && lowAttendanceStudents.length > 0 && (
        <div className="bg-rose-100 dark:bg-rose-955/40 border border-line rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-bold text-rose-800 dark:text-rose-350">
              {lowAttendanceStudents.length} student{lowAttendanceStudents.length > 1 ? 's' : ''} below {lowThreshold}% attendance
            </p>
            <p className="text-xs text-rose-750 dark:text-rose-400 mt-0.5 font-semibold">
              {lowAttendanceStudents.slice(0, 3).map(s => s.name).join(', ')}{lowAttendanceStudents.length > 3 ? ` +${lowAttendanceStudents.length - 3} more` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-ink-soft font-bold">Threshold:</span>
            <input
              type="number"
              min={0} max={100}
              value={lowThreshold}
              onChange={e => setLowThreshold(Number(e.target.value))}
              className="w-16 px-2 py-1 text-xs border border-line rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500 bg-paper text-ink text-center font-bold"
            />
            <span className="text-xs text-ink-soft font-bold">%</span>
          </div>
        </div>
      )}

      {/* ── Filters & Actions Header ─────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface p-6 rounded-2xl shadow-sm border border-line">
        <div>
          <h2 className="text-xl font-semibold font-display text-ink flex items-center gap-2">
            <TableIcon className="w-5 h-5 text-violet-dark" />
            Attendance Register
          </h2>
          <p className="text-sm text-ink-soft mt-1">ERP style monthly attendance view</p>
        </div>

        <div className="flex flex-col gap-3 w-full sm:w-auto sm:flex-row sm:items-center">
          {/* Search & Month row (side-by-side in mobile view) */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Search */}
            <div className="relative w-[62.5%] sm:w-52 sm:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-soft" />
              <input
                type="text"
                placeholder="Search student..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-line rounded-xl outline-none bg-paper hover:bg-surface text-ink text-sm transition-all focus:ring-2 focus:ring-violet-dark"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-soft hover:text-ink cursor-pointer bg-transparent border-none">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Month picker */}
            <div className="relative group w-[37.5%] sm:w-auto sm:flex-none">
              <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-violet-dark" />
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                min={`${currentYear}-01`}
                max={`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`}
                className="w-full pl-8 pr-2 py-2 border border-line rounded-xl outline-none bg-paper hover:bg-surface text-ink font-bold transition-all cursor-pointer shadow-sm text-xs sm:text-sm sm:pl-10 sm:pr-4"
              />
            </div>
          </div>

          {/* Holidays & Export Excel row (side-by-side in mobile view, hiding switcher) */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Holiday manager button */}
            <button
              onClick={() => setShowHolidayModal(true)}
              className="flex-1 sm:flex-none justify-center flex items-center gap-1.5 px-4 py-2 border border-line bg-orange-100 dark:bg-orange-955/40 text-orange-850 dark:text-orange-300 rounded-xl text-sm font-bold hover:opacity-85 transition cursor-pointer"
              title="Manage Holidays"
            >
              <CalendarOff className="w-4 h-4" />
              <span>Holidays</span>
            </button>

            {/* Export Excel */}
            <button
              onClick={exportToXLSX}
              disabled={registerData.length === 0}
              className="flex-1 sm:flex-none justify-center flex items-center gap-2 px-5 py-2 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-sm"
            >
              <Download className="w-4 h-4" />
              <span>Export Excel</span>
            </button>
          </div>

          {/* View toggle (desktop only) */}
          <div className="hidden sm:flex border border-line rounded-xl overflow-hidden bg-paper p-0.5">
            <button
              onClick={() => setViewMode("table")}
              className={`p-2 transition cursor-pointer ${viewMode === 'table' ? 'bg-violet-dark text-white rounded-lg' : 'text-ink-soft hover:bg-line/40 rounded-lg'}`}
              title="Table view"
            >
              <LayoutList className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("cards")}
              className={`p-2 transition cursor-pointer ${viewMode === 'cards' ? 'bg-violet-dark text-white rounded-lg' : 'text-ink-soft hover:bg-line/40 rounded-lg'}`}
              title="Card view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Main Content ─────────────────────────────────────────── */}
      <div className="bg-surface rounded-2xl shadow-sm border border-line overflow-hidden flex flex-col">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-10 h-10 border-4 border-violet-100 border-t-violet-dark rounded-full animate-spin mb-4" />
            <p className="text-ink-soft font-bold animate-pulse">Loading Register Data...</p>
          </div>
        ) : registerData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-ink-soft">
            <TableIcon className="w-16 h-16 mb-4 opacity-30" />
            <p className="font-semibold text-lg text-ink mb-1">No attendance records found</p>
            <p className="text-sm text-ink-soft">Select a different month or ensure students are enrolled.</p>
          </div>
        ) : viewMode === "cards" ? (
          /* ── Card View (mobile-friendly) ─────────────────────── */
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredData.length === 0 ? (
              <div className="col-span-full text-center py-10 text-ink-soft">
                <Search className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>No students match your search.</p>
              </div>
            ) : filteredData.map((row) => {
              const pct = getAttendancePct(row);
              const isLow = pct !== null && pct < lowThreshold;
              return (
                <div key={row.id} className={`rounded-xl border-2 p-4 transition-all ${isLow ? 'border-rose-500 dark:border-rose-450 bg-rose-500/10' : 'border-line bg-surface hover:border-violet-dark'}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-full bg-violet-50 text-violet-dark flex items-center justify-center font-bold text-sm border border-line shrink-0">
                        {row.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-ink text-sm leading-tight">{row.name}</div>
                        <div className="text-xs text-ink-soft truncate max-w-[140px]">{row.email}</div>
                      </div>
                    </div>
                    {isLow && <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5 animate-pulse" />}
                  </div>

                  {/* Stats row */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex-1 bg-green-100 dark:bg-green-955/40 rounded-xl px-3 py-2 text-center border border-line">
                      <div className="text-lg font-black font-display text-green-700 dark:text-green-300">{row.totalPresent}</div>
                      <div className="text-[10px] text-green-600 dark:text-green-400 font-bold uppercase tracking-wide">Present</div>
                    </div>
                    <div className="flex-1 bg-rose-100 dark:bg-rose-955/40 rounded-xl px-3 py-2 text-center border border-line">
                      <div className="text-lg font-black font-display text-rose-700 dark:text-rose-350">{row.totalAbsent}</div>
                      <div className="text-[10px] text-rose-600 dark:text-rose-400 font-bold uppercase tracking-wide">Absent</div>
                    </div>
                    <div className={`flex-1 rounded-xl px-3 py-2 text-center border ${getPctBg(pct)}`}>
                      <div className="text-lg font-black font-display">{pct !== null ? `${pct}%` : '-'}</div>
                      <div className="text-[10px] text-ink-soft font-bold uppercase tracking-wide">Rate</div>
                    </div>
                  </div>

                  {/* Mini attendance calendar — 7-col grid */}
                  <div className="grid grid-cols-7 gap-1">
                    {/* Weekday headers */}
                    {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
                      <div key={d} className="text-center text-[9px] font-bold text-ink-soft uppercase pb-0.5">{d}</div>
                    ))}
                    {/* Leading empty cells to align first day */}
                    {Array.from({ length: dates.length > 0 ? new Date(dates[0] + 'T00:00:00').getDay() : 0 }).map((_, i) => (
                      <div key={`empty-${i}`} />
                    ))}
                    {/* Day boxes */}
                    {dates.map(date => {
                      const { isHol, name: holidayName } = isHoliday(date);
                      const status = row.attendance[date];
                      const dayNumber = new Date(date + 'T00:00:00').getDate();

                      let boxClassName = "bg-line border border-line text-ink-soft";
                      let label = "Not marked";

                      if (isHol) {
                        boxClassName = "bg-orange-100 dark:bg-orange-955/40 border border-line text-orange-850 dark:text-orange-300";
                        label = holidayName || "Holiday";
                      } else if (status === 'P') {
                        boxClassName = "bg-green-600 border border-transparent text-white";
                        label = "Present";
                      } else if (status === 'A') {
                        boxClassName = "bg-rose-600 border border-transparent text-white";
                        label = "Absent";
                      }

                      return (
                        <span
                          key={date}
                          className={`flex items-center justify-center w-full aspect-square rounded-md text-[10px] font-bold shadow-sm ${boxClassName}`}
                          title={`${date} - ${label}`}
                        >
                          {dayNumber}
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* ── Card View Footer: Month Nav + Legend ─────────── */}
            {filteredData.length > 0 && (
              <div className="col-span-full mt-2 border-t border-line pt-4 space-y-3">
                {/* Month navigation */}
                <div className="flex items-center justify-between">
                  <button onClick={goToPrevMonth} className="flex items-center gap-1 px-3 py-1.5 text-sm font-bold text-ink bg-paper border border-line hover:bg-line/45 rounded-xl transition cursor-pointer">
                    <ChevronLeft className="w-4 h-4" /> Prev
                  </button>
                  <div className="text-sm font-bold text-ink">{getMonthLabel()}</div>
                  <button onClick={goToNextMonth} disabled={selectedMonth === `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`} className="flex items-center gap-1 px-3 py-1.5 text-sm font-bold text-ink bg-paper border border-line hover:bg-line/45 rounded-xl transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
                    Next <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                {/* Legend */}
                <div className="flex flex-wrap items-center justify-center gap-4 pt-3 border-t border-line">
                  <div className="flex items-center gap-1.5 text-xs text-ink-soft font-bold"><span className="w-3 h-3 rounded bg-green-500 border border-transparent"></span> Present</div>
                  <div className="flex items-center gap-1.5 text-xs text-ink-soft font-bold"><span className="w-3 h-3 rounded bg-rose-600 border border-transparent"></span> Absent</div>
                  <div className="flex items-center gap-1.5 text-xs text-ink-soft font-bold"><span className="w-3 h-3 rounded bg-orange-100 dark:bg-orange-955/40 border border-line"></span> Holiday</div>
                  <div className="flex items-center gap-1.5 text-xs text-ink-soft font-bold"><span className="w-3 h-3 rounded bg-line border border-line"></span> Not Marked</div>
                  <div className="flex items-center gap-1.5 text-xs text-rose-550 font-bold"><AlertTriangle className="w-3 h-3" /> Below {lowThreshold}%</div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ── Table View ─────────────────────────────────────────── */
          <>
            <div
              ref={tableWrapperRef}
              onScroll={handleTableScroll}
              className="flex-1 overflow-auto relative excel-table-wrapper select-none max-h-[500px]"
            >
              <table className="w-full text-sm text-left border-collapse border-spacing-0 whitespace-nowrap min-w-max">
                <thead className="sticky top-0 z-20 shadow-sm">
                  <tr className="bg-paper text-ink text-xs uppercase tracking-wider divide-x divide-line border-b border-line">
                    <th rowSpan={2} className="sticky left-0 bg-paper z-30 py-3 px-4 font-bold w-[56px] min-w-[56px] max-w-[56px] text-center border-r border-line">S.No</th>
                    <th rowSpan={2} className="sticky left-[56px] bg-paper z-30 py-3 px-6 font-bold w-[260px] min-w-[260px] max-w-[260px] border-r border-line">Student Name</th>
                    {dates.map(date => {
                      const { isHol, name: holName } = isHoliday(date);
                      return (
                        <th rowSpan={2} key={date} className={`py-3 px-1.5 min-w-[44px] text-center font-bold tracking-tighter border-r border-line ${isHol ? 'bg-orange-100 dark:bg-orange-955/40 text-orange-850 dark:text-orange-300' : ''}`} title={isHol ? holName : ''}>
                          <div className="flex flex-col items-center justify-center -space-y-1">
                            <span className={`text-[10px] ${isHol ? 'text-orange-500' : 'text-ink-soft'}`}>
                              {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' })}
                            </span>
                            <span className="text-[13px]">{new Date(date + 'T00:00:00').getDate()}</span>
                          </div>
                        </th>
                      );
                    })}
                    <th
                      colSpan={2}
                      className="sticky right-0 bg-paper z-30 py-2 px-2 w-[192px] min-w-[192px] text-center text-[11px] text-ink font-bold border-l border-b border-line whitespace-nowrap"
                    >
                      Total
                    </th>
                  </tr>
                  <tr className="bg-paper text-ink text-[11px] uppercase tracking-wider divide-x divide-line border-b border-line">
                    <th className="sticky right-[96px] bg-paper z-30 py-2 px-2 w-[96px] min-w-[96px] text-center text-green-700 dark:text-green-400 font-bold border-l border-r border-line whitespace-nowrap">Pre.</th>
                    <th className="sticky right-0 bg-paper z-30 py-2 px-2 w-[96px] min-w-[96px] text-center text-rose-600 dark:text-rose-455 font-bold border-l border-line whitespace-nowrap">Abs.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filteredData.length === 0 ? (
                    <tr>
                      <td colSpan={dates.length + 4} className="py-10 text-center text-ink-soft text-sm">
                        No students match "{searchQuery}"
                      </td>
                    </tr>
                  ) : filteredData.map((row, index) => {
                    const pct = getAttendancePct(row);
                    const isLow = pct !== null && pct < lowThreshold;
                    return (
                      <tr key={row.id} className={`hover:bg-line/20 transition-colors group cursor-default ${isLow ? 'bg-rose-500/10' : ''}`}>
                        <td className="sticky left-0 bg-surface group-hover:bg-line/20 z-10 py-2 px-4 w-[56px] min-w-[56px] max-w-[56px] text-center text-ink-soft font-bold border-r border-line">
                          {index + 1}
                        </td>
                        <td className="sticky left-[56px] bg-surface group-hover:bg-line/20 z-10 py-2 px-6 w-[260px] min-w-[260px] max-w-[260px] border-r border-line">
                          <div className="flex items-center gap-2">
                            {isLow && <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0 animate-pulse" title={`Attendance: ${pct}%`} />}
                            <div>
                              <div className="font-semibold text-ink truncate" title={row.name}>{row.name}</div>
                              <div className="text-[11px] text-ink-soft truncate" title={row.email}>{row.email}</div>
                            </div>
                          </div>
                        </td>
                        {dates.map(date => {
                          const status = row.attendance[date];
                          const { isHol } = isHoliday(date);
                          return (
                            <td key={date} className={`py-1 px-1 min-w-[44px] text-center border-r border-line ${isHol ? 'bg-orange-100/30 dark:bg-orange-950/20' : ''}`}>
                              {isHol ? (
                                <span className="inline-flex items-center justify-center w-6 h-6 text-orange-400 dark:text-orange-300 text-xs font-bold">–</span>
                              ) : status === 'P' ? (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-green-100 dark:bg-green-955/40 text-green-800 dark:text-green-300 font-black text-xs shadow-sm border border-line">P</span>
                              ) : status === 'A' ? (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-rose-100 dark:bg-rose-955/40 text-rose-800 dark:text-rose-350 font-black text-xs shadow-sm border border-line">A</span>
                              ) : (
                                <span className="inline-flex items-center justify-center w-6 h-6 text-ink-soft opacity-30 text-xs font-bold">-</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="sticky right-[96px] bg-green-150/15 dark:bg-green-955/10 z-10 py-2 px-2 w-[96px] min-w-[96px] text-center text-green-700 dark:text-green-400 font-black text-sm border-l border-r border-line">
                          {row.totalPresent}
                        </td>
                        <td className="sticky right-0 bg-rose-150/15 dark:bg-rose-955/10 z-10 py-2 px-2 w-[96px] min-w-[96px] text-center text-rose-600 dark:text-rose-350 font-black text-sm border-l border-line">
                          {row.totalAbsent}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Custom scrollbar */}
            <div className="px-5 pt-2 pb-1 border-t border-line bg-surface">
              <div className="mx-0 sm:ml-[316px] sm:mr-[192px]">
                <div ref={dateScrollbarRef} onScroll={handleDateScrollbarScroll} className="date-only-scrollbar overflow-x-auto overflow-y-hidden" aria-label="Scroll date columns">
                  <div style={{ width: `${Math.max(dates.length * 44, 1)}px`, height: '1px' }} />
                </div>
              </div>
            </div>

            {/* Month nav + legend */}
            <div className="px-5 py-4 border-t border-line bg-paper rounded-b-2xl">
              <div className="flex items-center justify-between mb-3">
                <button onClick={goToPrevMonth} className="flex items-center gap-1 px-3 py-1.5 text-sm font-bold text-ink bg-paper border border-line hover:bg-line/45 rounded-xl transition cursor-pointer">
                  <ChevronLeft className="w-4 h-4" /> Prev
                </button>
                <div className="text-sm font-bold text-ink">{getMonthLabel()}</div>
                <button onClick={goToNextMonth} disabled={selectedMonth === `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`} className="flex items-center gap-1 px-3 py-1.5 text-sm font-bold text-ink bg-paper border border-line hover:bg-line/45 rounded-xl transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-4 pt-3 border-t border-line">
                <div className="flex items-center gap-1.5 text-xs text-ink-soft font-bold"><span className="w-3 h-3 rounded-md bg-green-100 dark:bg-green-955/40 border border-line"></span> Present</div>
                <div className="flex items-center gap-1.5 text-xs text-ink-soft font-bold"><span className="w-3 h-3 rounded-md bg-rose-100 dark:bg-rose-955/40 border border-line"></span> Absent</div>
                <div className="flex items-center gap-1.5 text-xs text-ink-soft font-bold"><span className="w-3 h-3 rounded-md bg-orange-100 dark:bg-orange-955/40 border border-line"></span> Holiday</div>
                <div className="flex items-center gap-1.5 text-xs text-ink-soft font-bold"><span className="w-3 h-3 rounded-md bg-line border border-line"></span> Not Marked</div>
                <div className="flex items-center gap-1.5 text-xs text-rose-550 font-bold"><AlertTriangle className="w-3 h-3 text-rose-500" /> Below {lowThreshold}%</div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Holiday Manager Modal ─────────────────────────────────── */}
      {showHolidayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div ref={holidayModalRef} className="bg-surface rounded-2xl shadow-2xl border border-line w-full max-w-md overflow-hidden animate-fade-in">
            <div className="flex items-center justify-between p-5 border-b border-line bg-paper">
              <div>
                <h3 className="text-lg font-semibold font-display text-ink flex items-center gap-2">
                  <CalendarOff className="w-5 h-5 text-orange-500" />
                  Manage Holidays
                </h3>
                <p className="text-sm text-ink-soft mt-0.5">Add custom holidays for this class</p>
              </div>
              <button onClick={() => setShowHolidayModal(false)} className="p-2 rounded-xl hover:bg-line/80 transition cursor-pointer text-ink-soft hover:text-ink">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Add holiday form */}
            <div className="p-5 border-b border-line space-y-3">
              {/* Holiday name */}
              <input
                type="text"
                placeholder="Holiday name (e.g. Holi, Diwali)"
                value={newHolidayName}
                onChange={e => setNewHolidayName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddHoliday()}
                className="w-full px-3 py-2 text-sm border border-line rounded-xl bg-paper text-ink focus:ring-2 focus:ring-orange-400 focus:border-transparent outline-none"
              />

              {/* From – To date row */}
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <label className="text-[10px] font-bold text-ink-soft uppercase tracking-wide mb-1 block">From</label>
                  <input
                    type="date"
                    value={newHolidayFrom}
                    onChange={e => {
                      setNewHolidayFrom(e.target.value);
                      // auto-clear To if it's before the new From
                      if (newHolidayTo && e.target.value > newHolidayTo) setNewHolidayTo("");
                    }}
                    max={`${today.getFullYear()}-12-31`}
                    className="w-full px-3 py-2 text-sm border border-line rounded-xl bg-paper text-ink focus:ring-2 focus:ring-orange-400 focus:border-transparent outline-none"
                  />
                </div>

                <div className="text-ink-soft text-lg font-light mt-4">–</div>

                <div className="flex-1">
                  <label className="text-[10px] font-bold text-ink-soft uppercase tracking-wide mb-1 block">
                    To <span className="text-ink-soft font-normal normal-case">(optional)</span>
                  </label>
                  <input
                    type="date"
                    value={newHolidayTo}
                    onChange={e => setNewHolidayTo(e.target.value)}
                    min={newHolidayFrom || undefined}
                    max={`${today.getFullYear()}-12-31`}
                    disabled={!newHolidayFrom}
                    className="w-full px-3 py-2 text-sm border border-line rounded-xl bg-paper text-ink focus:ring-2 focus:ring-orange-400 focus:border-transparent outline-none disabled:opacity-40 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Range preview badge */}
              {newHolidayFrom && newHolidayTo && newHolidayTo >= newHolidayFrom && (() => {
                const from = new Date(newHolidayFrom + 'T00:00:00');
                const to = new Date(newHolidayTo + 'T00:00:00');
                const diff = Math.round((to - from) / 86400000) + 1;
                return (
                  <div className="flex items-center gap-2 text-xs bg-orange-100 dark:bg-orange-955/40 border border-line text-orange-850 dark:text-orange-300 px-3 py-2 rounded-xl font-bold">
                    <CalendarOff className="w-3.5 h-3.5 shrink-0" />
                    {diff} day{diff > 1 ? 's' : ''} holiday
                    {newHolidayName ? ` — ${newHolidayName}` : ''}
                    {' '}
                    ({new Date(newHolidayFrom + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    {diff > 1 && ` – ${new Date(newHolidayTo + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`})
                  </div>
                );
              })()}

              <button
                onClick={handleAddHoliday}
                disabled={!newHolidayFrom || (newHolidayTo && newHolidayTo < newHolidayFrom)}
                className="w-full flex items-center justify-center gap-2 py-2 bg-orange-600 text-white text-sm font-bold rounded-xl hover:bg-orange-700 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Add Holiday
              </button>
            </div>

            {/* Holiday list — grouped */}
            <div className="max-h-60 overflow-y-auto divide-y divide-line">
              {groupedHolidays.length === 0 ? (
                <div className="py-8 text-center text-ink-soft text-sm">
                  <CalendarOff className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  No custom holidays added yet
                </div>
              ) : groupedHolidays.map(g => {
                const isSingle = g.from === g.to;
                const fromLabel = new Date(g.from + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                const toLabel = new Date(g.to + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                return (
                  <div key={g.groupId} className="flex items-center justify-between px-5 py-3 hover:bg-orange-50/10 dark:hover:bg-orange-950/20 transition-colors">
                    <div className="flex items-center gap-3">
                      {/* Orange pill showing day count */}
                      {!isSingle && (
                        <span className="shrink-0 bg-orange-100 dark:bg-orange-955/40 text-orange-800 dark:text-orange-300 text-[11px] font-bold px-2 py-0.5 rounded-full border border-line">
                          {g.count}d
                        </span>
                      )}
                      <div>
                        <div className="font-semibold text-ink text-sm">{g.name}</div>
                        <div className="text-xs text-ink-soft">
                          {isSingle ? fromLabel : `${fromLabel} – ${toLabel}`}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveHoliday(g.groupId)}
                      className="p-1.5 text-ink-soft hover:text-rose-600 hover:bg-line/40 rounded-xl transition cursor-pointer shrink-0"
                      title={isSingle ? "Remove holiday" : `Remove all ${g.count} days`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="p-4 border-t border-line bg-paper">
              <p className="text-xs text-ink-soft text-center font-semibold">Sundays are automatically marked as holidays. Custom holidays apply to all months.</p>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .excel-table-wrapper { scroll-behavior: smooth; overflow-x: auto; overflow-y: auto; }
        .excel-table-wrapper:focus, .excel-table-wrapper:focus-visible,
        .date-only-scrollbar:focus, .date-only-scrollbar:focus-visible { outline: none; box-shadow: none; }
        .excel-table-wrapper::-webkit-scrollbar:horizontal { height: 0; }
        .excel-table-wrapper::-webkit-scrollbar-track:horizontal,
        .date-only-scrollbar::-webkit-scrollbar-track:horizontal { background: var(--paper); border-radius: 9999px; }
        .excel-table-wrapper::-webkit-scrollbar-thumb:horizontal,
        .date-only-scrollbar::-webkit-scrollbar-thumb:horizontal { background: var(--line); border-radius: 9999px; }
        .excel-table-wrapper::-webkit-scrollbar-thumb:horizontal:hover,
        .date-only-scrollbar::-webkit-scrollbar-thumb:horizontal:hover { background: var(--ink-soft); }
        .date-only-scrollbar { scrollbar-width: thin; scrollbar-color: var(--line) var(--paper); }
        .date-only-scrollbar::-webkit-scrollbar:horizontal { height: 7px; }
        table { border-collapse: separate; }
        ::-webkit-scrollbar { width: 8px; height: 10px; }
        ::-webkit-scrollbar-track { background: var(--paper); border-radius: 8px; }
        ::-webkit-scrollbar-thumb { background: var(--line); border-radius: 8px; }
        ::-webkit-scrollbar-thumb:hover { background: var(--ink-soft); }
      `}} />
    </div>
  );
};

export default AttendanceRegister;
