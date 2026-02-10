import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Download, Search, FileText, User } from 'lucide-react';
import axios from 'axios';
import API_BASE_URL from '../config';
import { motion } from 'framer-motion';

// Imports updated
import { MoreVertical, Check } from 'lucide-react';

const ClassDashboard = () => {
  const { classId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [classroom, setClassroom] = useState(null);
  const [students, setStudents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // New state for view mode
  const [viewMode, setViewMode] = useState('quiz'); // 'quiz', 'assignment', 'testpaper'
  const [items, setItems] = useState([]); // Stores quizzes, assignments, or test papers
  const [submissions, setSubmissions] = useState({});
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, [classId, viewMode]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setItems([]);
      setSubmissions({});

      // 1. Fetch Classroom Details (always needed for students list)
      const classRes = await axios.get(`${API_BASE_URL}/classroom/${classId}`);
      const classData = classRes.data.classroom;
      setClassroom(classData);
      setStudents(classData.students || []);

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
  };

  const filteredStudents = students.filter(student => 
    student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getExportFileName = () => {
      const modeName = viewMode.charAt(0).toUpperCase() + viewMode.slice(1);
      return `${classroom?.name || 'Class'}_${modeName}_Dashboard.csv`;
  };

  const exportToCSV = () => {
    const itemLabel = viewMode === 'quiz' ? 'Quiz' : viewMode === 'assignment' ? 'Assignment' : 'Test Paper';
    
    // Header
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += `Serial No,Student Name,Email,` + items.map((_, i) => `${itemLabel} ${i + 1}`).join(",") + "\n";

    // Rows
    filteredStudents.forEach((student, index) => {
        let row = `${index + 1},"${student.name}","${student.email}"`;
        
        items.forEach(item => {
            const sub = submissions[student._id]?.[item._id];
            const scoreStr = sub ? `${sub.score}/${sub.total} (${sub.percentage}%)` : "Not Attempted";
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
  };

  const getItemLabel = (index) => {
      const base = viewMode === 'quiz' ? 'Quiz' : viewMode === 'assignment' ? 'Assignment' : 'Test Paper';
      return `${base} ${index + 1}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mb-4"></div>
            <p className="text-gray-500 font-medium">Loading {viewMode} dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8" onClick={() => setShowMenu(false)}>
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
                <button 
                    onClick={() => navigate(`/class/${classId}/quizzes`)}
                    className="flex items-center gap-2 text-gray-500 hover:text-gray-800 transition-colors mb-2 cursor-pointer"
                >
                    <ChevronLeft className="w-4 h-4" />
                    Back to Class
                </button>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                    {classroom?.name} - Performance Dashboard
                </h1>
                <p className="text-gray-500 mt-1 capitalize">
                    Viewing {viewMode} Performance
                </p>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="Search student..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                    />
                </div>

                {/* View Mode Switcher */}
                <div className="relative" onClick={e => e.stopPropagation()}>
                    <button 
                        onClick={() => setShowMenu(!showMenu)}
                        className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-gray-600 cursor-pointer"
                    >
                        <MoreVertical className="w-5 h-5" />
                    </button>

                    {showMenu && (
                        <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-10 overflow-hidden">
                            <button
                                onClick={() => { setViewMode('quiz'); setShowMenu(false); }}
                                className={`w-full px-4 py-3 text-left flex items-center justify-between text-sm cursor-pointer ${
                                    viewMode === 'quiz' ? 'bg-purple-50 text-purple-700 font-medium' : 'text-gray-700 hover:bg-gray-50'
                                }`}
                            >
                                Quiz
                                {viewMode === 'quiz' && <Check className="w-4 h-4" />}
                            </button>
                            <button
                                onClick={() => { setViewMode('assignment'); setShowMenu(false); }}
                                className={`w-full px-4 py-3 text-left flex items-center justify-between text-sm cursor-pointer ${
                                    viewMode === 'assignment' ? 'bg-purple-50 text-purple-700 font-medium' : 'text-gray-700 hover:bg-gray-50'
                                }`}
                            >
                                Assignment
                                {viewMode === 'assignment' && <Check className="w-4 h-4" />}
                            </button>
                            <button
                                onClick={() => { setViewMode('testpaper'); setShowMenu(false); }}
                                className={`w-full px-4 py-3 text-left flex items-center justify-between text-sm cursor-pointer ${
                                    viewMode === 'testpaper' ? 'bg-purple-50 text-purple-700 font-medium' : 'text-gray-700 hover:bg-gray-50'
                                }`}
                            >
                                Test Paper
                                {viewMode === 'testpaper' && <Check className="w-4 h-4" />}
                            </button>
                        </div>
                    )}
                </div>

                <button 
                    onClick={exportToCSV}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm cursor-pointer"
                >
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">Export CSV</span>
                </button>
            </div>
        </div>

        {/* Table Container */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full min-w-[800px]">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-16">
                                S.No
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-64">
                                Student Details
                            </th>
                            {items.map((item, index) => (
                                <th key={item._id} className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[140px]">
                                    <div className="flex items-center gap-2" title={item.title}>
                                        <FileText className="w-3 h-3 text-purple-500" />
                                        <span className="truncate max-w-[120px] block">{getItemLabel(index)}</span>
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {filteredStudents.length > 0 ? (
                            filteredStudents.map((student, index) => (
                                <tr key={student._id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {index + 1}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-3">
                                            {student.profilePhoto ? (
                                                <img 
                                                    src={`${API_BASE_URL.replace('/api', '')}/${student.profilePhoto}`} 
                                                    alt={student.name}
                                                    className="w-8 h-8 rounded-full object-cover border border-gray-200"
                                                    onError={(e) => {
                                                        e.target.style.display = 'none';
                                                        e.target.nextElementSibling.style.display = 'flex';
                                                    }}
                                                />
                                            ) : (
                                                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                                                    <User className="w-4 h-4" />
                                                </div>
                                            )}
                                            <div>
                                                <div className="font-medium text-gray-900">{student.name}</div>
                                                <div className="text-xs text-gray-500">{student.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    {items.map(item => {
                                        const sub = submissions[student._id]?.[item._id];
                                        return (
                                            <td key={item._id} className="px-6 py-4 whitespace-nowrap">
                                                {sub ? (
                                                    <div className="flex flex-col">
                                                        <span className={`text-sm font-semibold ${
                                                            sub.percentage >= 40 ? 'text-green-600' : 'text-red-500'
                                                        }`}>
                                                            {sub.percentage}%
                                                        </span>
                                                        <span className="text-xs text-gray-500">
                                                            {sub.score}/{sub.total}
                                                            {sub.status && sub.status !== 'checked' && (
                                                                <span className="text-yellow-500 ml-1">({sub.status})</span>
                                                            )}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-1 rounded bg-gray-100 text-gray-500 text-xs font-medium">
                                                        Absent
                                                    </span>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={items.length + 2} className="px-6 py-12 text-center text-gray-500">
                                    No students found matching your search.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            
            {/* Footer Summary */}
            <div className="bg-gray-50 border-t border-gray-200 px-6 py-4">
                <div className="text-xs text-gray-500 flex items-center gap-4">
                    <span>Total Students: {students.length}</span>
                    <span>•</span>
                    <span className="capitalize">Total {viewMode}es: {items.length}</span>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};

export default ClassDashboard;
