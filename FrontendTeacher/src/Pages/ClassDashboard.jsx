import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Download, Search, FileText, User, Filter, BarChart3, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import API_BASE_URL from '../config';
import { getStoredUser } from '../utils/authStorage';
import AssessmentAnalyticsPanel from '../components/AssessmentAnalyticsPanel';

// Imports updated
import { MoreVertical, Check } from 'lucide-react';

const ClassDashboard = () => {
  const { classId } = useParams();
  const navigate = useNavigate();
  
  const user = getStoredUser() || {};
  const teacherId = user.id || user._id;

  const [loading, setLoading] = useState(true);
  const [classroom, setClassroom] = useState(null);
  const [students, setStudents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // New state for view mode
  const [viewMode, setViewMode] = useState('quiz'); // 'quiz', 'assignment', 'testpaper'
  const [items, setItems] = useState([]); // Stores quizzes, assignments, or test papers
  const [submissions, setSubmissions] = useState({});
  const [showMenu, setShowMenu] = useState(false);
  const [filterType, setFilterType] = useState('none');
  const [filterOperator, setFilterOperator] = useState('>=');
  const [filterValue, setFilterValue] = useState('');
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  // Export Modal states
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedExportItems, setSelectedExportItems] = useState([]);
  const [exportParticipationFilter, setExportParticipationFilter] = useState('all');
  const [showAnalytics, setShowAnalytics] = useState(false);

    const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setItems([]);
      setSubmissions({});

      // 1. Fetch Classroom Details (always needed for students list)
      const classRes = await axios.get(`${API_BASE_URL}/classroom/${classId}`);
      const classData = classRes.data.classroom;
      setClassroom(classData);
      setStudents([...(classData.students || [])].sort((a, b) => a.name.localeCompare(b.name)));

      // 2. Fetch Items based on View Mode
      if (viewMode === 'quiz') {
        const quizRes = await axios.get(`${API_BASE_URL}/quiz/classroom/${classId}`);
        const classQuizzes = (quizRes.data.quizzes || [])
          .filter(q => q.status === 'published')
          .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        setItems(classQuizzes);

        // Fetch Submissions
        const submissionsMap = {};
        await Promise.all(classQuizzes.map(async (quiz) => {
          try {
            const subRes = await axios.get(`${API_BASE_URL}/quiz-submission/quiz/${quiz._id}`);
            const quizSubs = subRes.data.submissions || [];
            quizSubs.forEach(sub => {
              const sId = sub.studentId._id || sub.studentId;
              if (!submissionsMap[sId]) submissionsMap[sId] = {};
              submissionsMap[sId][quiz._id] = {
                score: sub.score,
                total: sub.totalQuestions,
                percentage: sub.percentage
              };
            });
          } catch (err) { console.error(`Failed to fetch submissions for quiz ${quiz._id}`, err); }
        }));
        setSubmissions(submissionsMap);

      } else if (viewMode === 'assignment') {
        // Fetch Assignments
        // Note: Using direct axios here as an example, but could use API function if imported
        const assignRes = await axios.get(`${API_BASE_URL}/assignment/classroom/${classId}`);
        const classAssignments = (assignRes.data.assignments || [])
          .filter(a => a.status === 'published')
          .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        setItems(classAssignments);

        // Fetch Submissions
        const submissionsMap = {};
        await Promise.all(classAssignments.map(async (assignment) => {
            try {
                const subRes = await axios.get(`${API_BASE_URL}/assignment-submission/assignment/${assignment._id}`);
                const assignSubs = subRes.data.submissions || [];
                assignSubs.forEach(sub => {
                    const sId = sub.studentId._id || sub.studentId;
                    if (!submissionsMap[sId]) submissionsMap[sId] = {};
                    submissionsMap[sId][assignment._id] = {
                        score: sub.marksObtained,
                        total: sub.totalMarks,
                        percentage: sub.percentage,
                        status: sub.status // 'checked', 'pending'
                    };
                });
            } catch (err) { console.error(`Failed to fetch submissions for assignment ${assignment._id}`, err); }
        }));
        setSubmissions(submissionsMap);

      } else if (viewMode === 'testpaper') {
        // Fetch Test Papers
        // CORRECTED ROUTE: /api/test-paper (hyphenated)
        const testRes = await axios.get(`${API_BASE_URL}/test-paper/classroom/${classId}`);
        const classTests = (testRes.data.testPapers || [])
          .filter(t => t.status === 'published')
          .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        setItems(classTests);

         // Fetch Submissions
         const submissionsMap = {};
         await Promise.all(classTests.map(async (test) => {
             try {
                 // CORRECTED ROUTE: /api/test-submission/test/:id
                 const subRes = await axios.get(`${API_BASE_URL}/test-submission/test/${test._id}`);
                 const testSubs = subRes.data.submissions || [];
                 testSubs.forEach(sub => {
                     const sId = sub.studentId._id || sub.studentId;
                     if (!submissionsMap[sId]) submissionsMap[sId] = {};
                     submissionsMap[sId][test._id] = {
                         score: sub.marksObtained,
                         total: sub.totalMarks,
                         percentage: sub.percentage,
                         status: sub.status
                     };
                 });
             } catch (err) { console.error(`Failed to fetch submissions for test ${test._id}`, err); }
         }));
         setSubmissions(submissionsMap);
      }

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      alert("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
    }, [classId, viewMode]);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

  const baseFilteredStudents = students.filter(student => 
    student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (student.erpId && student.erpId.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (student.section && student.section.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getStudentScore = (studentId) => {
    if (!items || items.length === 0) return { avg: 0, attempts: 0 };
    
    let totalPct = 0;
    let attempts = 0;
    
    items.forEach(item => {
      const sub = submissions[studentId]?.[item._id];
      if (sub && typeof sub.percentage === 'number') {
        totalPct += sub.percentage;
        attempts += 1;
      }
    });
    
    // If no attempts (absent for all), return -1 to push to very bottom
    if (attempts === 0) return { avg: -1, attempts: 0 };
    
    // Average across ALL items (absences count as 0%)
    return { avg: totalPct / items.length, attempts };
  };

  const finalFilteredStudents = baseFilteredStudents.filter(student => {
    if (filterType === 'none' || filterValue === '') return true;
    const val = parseFloat(filterValue);
    if (isNaN(val)) return true;

    const score = getStudentScore(student._id);
    if (score.attempts === 0) return false;

    let compareVal = 0;
    if (filterType === 'percentage') {
      compareVal = score.avg;
    } else if (filterType === 'marks') {
      let totalMarks = 0;
      let attempts = 0;
      items.forEach(item => {
        const sub = submissions[student._id]?.[item._id];
        if (sub && typeof sub.score === 'number') {
          totalMarks += sub.score;
          attempts += 1;
        }
      });
      compareVal = attempts > 0 ? totalMarks / attempts : 0;
    }

    if (filterOperator === '>=') return compareVal >= val;
    if (filterOperator === '<=') return compareVal <= val;
    if (filterOperator === '==') return compareVal === val;
    return true;
  });

  const sortedStudents = [...finalFilteredStudents].sort((a, b) => {
    const scoreA = getStudentScore(a._id);
    const scoreB = getStudentScore(b._id);
    
    if (scoreB.avg !== scoreA.avg) {
      return scoreB.avg - scoreA.avg; // Descending
    }
    return a.name.localeCompare(b.name);
  });

  const getExportFileName = () => {
      const modeName = viewMode.charAt(0).toUpperCase() + viewMode.slice(1);
      return `${classroom?.name || 'Class'}_${modeName}_Dashboard.csv`;
  };

  const handleOpenExportModal = () => {
    setSelectedExportItems(items.map(item => item._id));
    setExportParticipationFilter('all');
    setShowExportModal(true);
  };

  const handleExportSubmit = () => {
    const itemLabel = viewMode === 'quiz' ? 'Quiz' : viewMode === 'assignment' ? 'Assignment' : 'Test Paper';
    
    // Filter items based on selection
    const exportItems = items.filter(item => selectedExportItems.includes(item._id));
    
    if (exportItems.length === 0) {
      alert("Please select at least one item to export.");
      return;
    }

    // Filter students based on participation
    const exportStudents = sortedStudents.filter(student => {
      if (exportParticipationFilter === 'all') return true;
      // 'participating' - student must have attempted at least one of the selected items
      return exportItems.some(item => submissions[student._id]?.[item._id]);
    });

    if (exportStudents.length === 0) {
      alert("No students found matching the export criteria.");
      return;
    }

    // Header
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += `Serial No,Student Name,Email,ERP ID,Section,` + exportItems.map(item => {
      return `"${item.title || getItemLabel(item, items.findIndex(i => i._id === item._id))}"`;
    }).join(",") + "\n";

    // Rows
    exportStudents.forEach((student, index) => {
        let row = `${index + 1},"${student.name}","${student.email}","${student.erpId || 'N/A'}","${student.section || 'N/A'}"`;
        
        exportItems.forEach(item => {
            const sub = submissions[student._id]?.[item._id];
            const displayScore = sub ? (typeof sub.score === 'number' ? (Number.isInteger(sub.score) ? sub.score : Number(sub.score).toFixed(1)) : sub.score) : 0;
            const scoreStr = sub ? `${displayScore}/${sub.total} (${sub.percentage}%)` : "Not Attempted";
            row += `,${scoreStr}`;
        });
        
        csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", getExportFileName());
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowExportModal(false);
  };

  const getItemLabel = (item, index) => {
      if (item && item.title) return item.title;
      const base = viewMode === 'quiz' ? 'Quiz' : viewMode === 'assignment' ? 'Assignment' : 'Test Paper';
      return `${base} ${index + 1}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center font-body">
        <div className="flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mb-4"></div>
            <p className="text-ink-soft font-semibold">Loading {viewMode} dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper p-4 sm:p-8 font-body text-ink" onClick={() => { setShowMenu(false); setShowFilterMenu(false); }}>
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
                <button 
                    onClick={() => navigate(`/class/${classId}/quizzes`)}
                    className="flex items-center gap-2 text-ink-soft hover:text-ink transition-colors mb-2 cursor-pointer font-semibold"
                >
                    <ChevronLeft className="w-4 h-4" />
                    Back to Class
                </button>
                <h1 className="text-2xl sm:text-3xl font-semibold font-display text-ink">
                    {classroom?.name} - Performance Dashboard
                </h1>
                <p className="text-ink-soft mt-1 capitalize text-sm">
                    Viewing {viewMode} Performance
                </p>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-soft" />
                    <input 
                        type="text" 
                        placeholder="Search student..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-surface border border-line rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-ink text-sm"
                    />
                </div>

                {/* Filter Menu */}
                <div className="relative" onClick={e => e.stopPropagation()}>
                    <button 
                        onClick={() => { setShowFilterMenu(!showFilterMenu); setShowMenu(false); }}
                        className={`p-2 border border-line rounded-lg transition-colors cursor-pointer flex items-center gap-2 ${filterType !== 'none' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' : 'bg-surface hover:bg-line text-ink'}`}
                        title="Filter Students"
                    >
                        <Filter className="w-5 h-5" />
                    </button>
                    
                    {showFilterMenu && (
                        <div className="absolute right-0 sm:right-auto sm:left-0 top-full mt-2 w-64 bg-surface rounded-xl shadow-lg border border-line p-4 z-20">
                            <div className="space-y-3">
                                <p className="font-semibold text-sm text-ink">Filter Students</p>
                                <select 
                                    value={filterType} 
                                    onChange={e => setFilterType(e.target.value)}
                                    className="w-full p-2 text-sm bg-paper border border-line rounded-lg focus:outline-none focus:border-purple-500 text-ink"
                                >
                                    <option value="none">No Filter</option>
                                    <option value="percentage">Average Percentage</option>
                                    <option value="marks">Average Marks</option>
                                </select>
                                
                                {filterType !== 'none' && (
                                    <div className="flex gap-2">
                                        <select
                                            value={filterOperator}
                                            onChange={e => setFilterOperator(e.target.value)}
                                            className="w-1/3 p-2 text-sm bg-paper border border-line rounded-lg focus:outline-none focus:border-purple-500 text-ink"
                                        >
                                            <option value=">=">&gt;=</option>
                                            <option value="<=">&lt;=</option>
                                            <option value="==">==</option>
                                        </select>
                                        <input
                                            type="number"
                                            value={filterValue}
                                            onChange={e => setFilterValue(e.target.value)}
                                            placeholder="Value"
                                            className="w-2/3 p-2 text-sm bg-paper border border-line rounded-lg focus:outline-none focus:border-purple-500 text-ink"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* View Mode Switcher */}
                <div className="relative" onClick={e => e.stopPropagation()}>
                    <button 
                        onClick={() => setShowMenu(!showMenu)}
                        className="p-2 bg-surface border border-line rounded-lg hover:bg-line transition-colors text-ink cursor-pointer"
                    >
                        <MoreVertical className="w-5 h-5" />
                    </button>

                    {showMenu && (
                        <div className="absolute right-0 top-full mt-2 w-48 bg-surface rounded-xl shadow-lg border border-line py-1 z-10 overflow-hidden">
                            <button
                                onClick={() => { setViewMode('quiz'); setShowMenu(false); }}
                                className={`w-full px-4 py-3 text-left flex items-center justify-between text-sm cursor-pointer ${
                                    viewMode === 'quiz' ? 'bg-[#F1ECFB] dark:bg-[#26163F]/50 text-purple-700 dark:text-[#A78BFA] font-semibold' : 'dropdown-item text-ink'
                                }`}
                            >
                                Quiz
                                {viewMode === 'quiz' && <Check className="w-4 h-4" />}
                            </button>
                            <button
                                onClick={() => { setViewMode('assignment'); setShowMenu(false); }}
                                className={`w-full px-4 py-3 text-left flex items-center justify-between text-sm cursor-pointer ${
                                    viewMode === 'assignment' ? 'bg-[#F1ECFB] dark:bg-[#26163F]/50 text-purple-700 dark:text-[#A78BFA] font-semibold' : 'dropdown-item text-ink'
                                }`}
                            >
                                Assignment
                                {viewMode === 'assignment' && <Check className="w-4 h-4" />}
                            </button>
                            <button
                                onClick={() => { setViewMode('testpaper'); setShowMenu(false); }}
                                className={`w-full px-4 py-3 text-left flex items-center justify-between text-sm cursor-pointer ${
                                    viewMode === 'testpaper' ? 'bg-[#F1ECFB] dark:bg-[#26163F]/50 text-purple-700 dark:text-[#A78BFA] font-semibold' : 'dropdown-item text-ink'
                                }`}
                            >
                                Test Paper
                                {viewMode === 'testpaper' && <Check className="w-4 h-4" />}
                            </button>
                        </div>
                    )}
                </div>

                <button 
                    onClick={handleOpenExportModal}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors shadow-sm cursor-pointer text-sm font-semibold"
                >
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">Export CSV</span>
                </button>
            </div>
        </div>

        {/* Collapsible Analytics Panel */}
        <div className="mb-4">
          <button
            onClick={() => setShowAnalytics(!showAnalytics)}
            className="flex items-center gap-2 px-4 py-2 bg-surface border border-line rounded-xl hover:bg-violet-50 hover:border-violet-200 transition-colors text-sm font-semibold text-ink shadow-sm cursor-pointer"
          >
            <BarChart3 className="w-4 h-4 text-violet-600" />
            {showAnalytics ? "Hide Analytics" : "View Assessment Analytics"}
            <ChevronDown className={`w-4 h-4 text-ink-soft transition-transform ${showAnalytics ? 'rotate-180' : ''}`} />
          </button>
          
          <AnimatePresence>
            {showAnalytics && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mt-6"
              >
                <AssessmentAnalyticsPanel teacherId={teacherId} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="bg-surface rounded-xl border border-line shadow-sm overflow-hidden">
            {/* Table Container */}
            <div className="overflow-x-auto">
                <table className="w-full min-w-[800px]">
                    <thead>
                        <tr className="bg-paper border-b border-line">
                            <th className="px-6 py-4 text-left text-xs font-semibold text-ink-soft uppercase tracking-wider w-16">
                                S.No
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-ink-soft uppercase tracking-wider w-64">
                                Student Details
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-ink-soft uppercase tracking-wider w-24">
                                Section
                            </th>
                                {items.map((item, index) => (
                                    <th key={item._id} className="px-6 py-4 text-left text-xs font-semibold text-ink-soft uppercase tracking-wider min-w-[140px]">
                                        <div className="flex items-center gap-2" title={item.title}>
                                            <FileText className="w-3 h-3 text-purple-500" />
                                            <span className="truncate max-w-[150px] block">{getItemLabel(item, index)}</span>
                                        </div>
                                    </th>
                                ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                        {sortedStudents.map((student, index) => (
                            <tr key={student._id} className="hover:bg-violet-50/50 transition-colors">
                                <td className="px-6 py-4 text-sm text-ink-soft">
                                    {index + 1}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                                            <User className="w-4 h-4 text-purple-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-ink">
                                                {student.name}
                                            </p>
                                            <p className="text-xs text-ink-soft">
                                                {student.email}
                                            </p>
                                            {student.erpId && (
                                                <p className="text-[10px] text-ink-soft mt-0.5">
                                                    ID: {student.erpId} {student.section ? `| Sec: ${student.section}` : ''}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-ink-soft font-semibold">
                                    {student.section || 'N/A'}
                                </td>
                                {items.map(item => {
                                    const sub = submissions[student._id]?.[item._id];
                                    return (
                                        <td key={`${student._id}-${item._id}`} className="px-6 py-4">
                                            {sub ? (
                                                <div className="flex flex-col gap-1">
                                                    <span className={`text-sm font-medium ${sub.status === 'checked' || viewMode === 'quiz' ? 'text-ink' : 'text-amber-600'}`}>
                                                        {Number.isInteger(sub.score) ? sub.score : Number(sub.score).toFixed(1)} / {sub.total}
                                                    </span>
                                                    <span className="text-[10px] text-ink-soft font-medium">
                                                        {sub.percentage}% {sub.status && viewMode !== 'quiz' && `(${sub.status})`}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-ink-soft italic bg-paper px-2 py-1 rounded-md">Not Attempted</span>
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                        {sortedStudents.length === 0 && (
                            <tr>
                                <td colSpan={items.length + 3} className="px-6 py-12 text-center text-ink-soft">
                                    No students found matching the current filters.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            
            {/* Footer Summary */}
            <div className="bg-paper border-t border-line px-6 py-4">
                <div className="text-xs text-ink-soft flex items-center gap-4 font-semibold">
                    <span>Total Students: {students.length}</span>
                    <span>•</span>
                    <span className="capitalize">Total {viewMode}s: {items.length}</span>
                </div>
            </div>
        </div>

        {/* Export Modal */}
        {showExportModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowExportModal(false)}>
                <div className="absolute inset-0 bg-black/60" style={{backdropFilter: 'blur(4px)'}}></div>
                <div className="bg-surface rounded-2xl w-full max-w-lg shadow-2xl border border-line overflow-hidden relative z-10" onClick={e => e.stopPropagation()}>
                    
                    {/* Modal Header */}
                    <div className="px-6 py-5 border-b border-line" style={{background: 'linear-gradient(135deg, rgba(139,92,246,0.08), rgba(16,185,129,0.08))'}}>
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                                    <Download className="w-5 h-5 text-emerald-600" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-ink font-display">
                                        Export {viewMode.charAt(0).toUpperCase() + viewMode.slice(1)} Data
                                    </h3>
                                    <p className="text-xs text-ink-soft mt-0.5">Choose items and student criteria for your CSV export</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setShowExportModal(false)}
                                className="p-1.5 text-ink-soft hover:text-ink hover:bg-line/60 rounded-lg transition-colors cursor-pointer"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>
                    
                    {/* Modal Body */}
                    <div className="p-6 space-y-6">
                        
                        {/* Items Selection */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <label className="text-sm font-bold text-ink flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-purple-500" />
                                    Select Items to Export
                                </label>
                                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{
                                    background: selectedExportItems.length > 0 ? 'rgba(139,92,246,0.12)' : 'rgba(100,100,100,0.1)',
                                    color: selectedExportItems.length > 0 ? '#7c3aed' : 'inherit'
                                }}>
                                    {selectedExportItems.length} of {items.length} selected
                                </span>
                            </div>
                            
                            <div className="border border-line rounded-xl overflow-hidden">
                                {/* Select All Header */}
                                <div 
                                    className="flex items-center gap-3 px-4 py-3 bg-paper border-b border-line cursor-pointer hover:bg-line/30 transition-colors"
                                    onClick={() => {
                                        if (selectedExportItems.length === items.length) setSelectedExportItems([]);
                                        else setSelectedExportItems(items.map(i => i._id));
                                    }}
                                >
                                    <div className="w-[18px] h-[18px] rounded flex-shrink-0 flex items-center justify-center transition-all" style={{
                                        background: (selectedExportItems.length === items.length && items.length > 0) ? '#7c3aed' : 'transparent',
                                        border: (selectedExportItems.length === items.length && items.length > 0) ? '2px solid #7c3aed' : '2px solid #d1d5db'
                                    }}>
                                        {(selectedExportItems.length === items.length && items.length > 0) && (
                                            <Check className="w-3 h-3 text-white" />
                                        )}
                                    </div>
                                    <span className="text-sm font-bold text-ink">Select All</span>
                                </div>
                                
                                {/* Item List */}
                                <div className="max-h-44 overflow-y-auto bg-surface">
                                    {items.map((item, index) => {
                                        const isChecked = selectedExportItems.includes(item._id);
                                        return (
                                            <div 
                                                key={item._id} 
                                                className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-line/30 transition-colors border-b border-line/50 last:border-b-0"
                                                onClick={() => {
                                                    if (isChecked) setSelectedExportItems(selectedExportItems.filter(id => id !== item._id));
                                                    else setSelectedExportItems([...selectedExportItems, item._id]);
                                                }}
                                            >
                                                <div className="w-[18px] h-[18px] rounded flex-shrink-0 flex items-center justify-center transition-all" style={{
                                                    background: isChecked ? '#7c3aed' : 'transparent',
                                                    border: isChecked ? '2px solid #7c3aed' : '2px solid #d1d5db'
                                                }}>
                                                    {isChecked && (
                                                        <Check className="w-3 h-3 text-white" />
                                                    )}
                                                </div>
                                                    <div className="min-w-0 flex-1">
                                                        <span className="text-sm font-semibold text-ink block truncate" title={item.title || 'Untitled'}>{getItemLabel(item, index)}</span>
                                                    </div>
                                            </div>
                                        );
                                    })}
                                    {items.length === 0 && (
                                        <div className="p-6 text-center text-sm text-ink-soft">
                                            <FileText className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                            <p>No items available to export.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Participation Filter */}
                        <div>
                            <label className="text-sm font-bold text-ink flex items-center gap-2 mb-3">
                                <User className="w-4 h-4 text-purple-500" />
                                Student Inclusion
                            </label>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {/* All Students Card */}
                                <div 
                                    className="p-4 rounded-xl cursor-pointer transition-all"
                                    onClick={() => setExportParticipationFilter('all')}
                                    style={{
                                        border: exportParticipationFilter === 'all' ? '2px solid #7c3aed' : '2px solid var(--color-line, #e5e7eb)',
                                        background: exportParticipationFilter === 'all' ? 'rgba(139,92,246,0.06)' : 'transparent'
                                    }}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="w-[18px] h-[18px] rounded-full flex-shrink-0 flex items-center justify-center mt-0.5 transition-all" style={{
                                            border: exportParticipationFilter === 'all' ? '2px solid #7c3aed' : '2px solid #d1d5db'
                                        }}>
                                            {exportParticipationFilter === 'all' && (
                                                <div className="w-2 h-2 rounded-full" style={{background: '#7c3aed'}}></div>
                                            )}
                                        </div>
                                        <div>
                                            <span className="block text-sm font-bold text-ink">All Students</span>
                                            <span className="block text-[11px] text-ink-soft mt-1 leading-tight">Includes absent students marked as "Not Attempted"</span>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Participating Only Card */}
                                <div 
                                    className="p-4 rounded-xl cursor-pointer transition-all"
                                    onClick={() => setExportParticipationFilter('participating')}
                                    style={{
                                        border: exportParticipationFilter === 'participating' ? '2px solid #7c3aed' : '2px solid var(--color-line, #e5e7eb)',
                                        background: exportParticipationFilter === 'participating' ? 'rgba(139,92,246,0.06)' : 'transparent'
                                    }}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="w-[18px] h-[18px] rounded-full flex-shrink-0 flex items-center justify-center mt-0.5 transition-all" style={{
                                            border: exportParticipationFilter === 'participating' ? '2px solid #7c3aed' : '2px solid #d1d5db'
                                        }}>
                                            {exportParticipationFilter === 'participating' && (
                                                <div className="w-2 h-2 rounded-full" style={{background: '#7c3aed'}}></div>
                                            )}
                                        </div>
                                        <div>
                                            <span className="block text-sm font-bold text-ink">Participating Only</span>
                                            <span className="block text-[11px] text-ink-soft mt-1 leading-tight">Only students who attempted at least one selected item</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Modal Footer */}
                    <div className="px-6 py-4 border-t border-line bg-paper/60 flex items-center justify-between">
                        <span className="text-xs text-ink-soft font-semibold">
                            {selectedExportItems.length > 0 
                                ? `${selectedExportItems.length} item${selectedExportItems.length > 1 ? 's' : ''} will be exported` 
                                : 'No items selected'}
                        </span>
                        <div className="flex gap-3">
                            <button 
                                onClick={() => setShowExportModal(false)}
                                className="px-5 py-2.5 text-sm font-bold text-ink-soft hover:text-ink hover:bg-line/50 rounded-xl transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleExportSubmit}
                                disabled={selectedExportItems.length === 0}
                                className="px-5 py-2.5 text-sm font-bold text-white rounded-xl transition-all cursor-pointer flex items-center gap-2"
                                style={{
                                    background: selectedExportItems.length > 0 ? '#059669' : '#9ca3af',
                                    opacity: selectedExportItems.length === 0 ? 0.6 : 1,
                                    boxShadow: selectedExportItems.length > 0 ? '0 2px 8px rgba(5,150,105,0.3)' : 'none'
                                }}
                            >
                                <Download className="w-4 h-4" />
                                Download CSV
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}

      </div>
    </div>
  );
};

export default ClassDashboard;
