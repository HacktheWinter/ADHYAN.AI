import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Users, 
  Search, 
  Mail, 
  Calendar, 
  Download,
  UserCheck,
  Copy,
  Check,
  UserMinus,
  Hash,
  ChevronDown
} from 'lucide-react';
import API_BASE_URL from '../config';

const StudentsPage = () => {
  const { classData } = useOutletContext();
  const students = [...(classData?.students || [])].sort((a, b) => 
    a.name.localeCompare(b.name)
  );
  const leftStudents = [...(classData?.leftStudents || [])].sort((a, b) => {
    const nameA = a.studentId?.name || '';
    const nameB = b.studentId?.name || '';
    return nameA.localeCompare(nameB);
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [activeTab, setActiveTab] = useState('present'); // 'present' or 'left'
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleCopyClassCode = () => {
    if (classData?.classCode) {
      navigator.clipboard.writeText(classData.classCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleExportStudents = () => {
    const studentsToExport = activeTab === 'present' ? students : leftStudents.map(ls => ls.studentId);
    
    if (studentsToExport.length === 0) {
      alert('No students to export');
      return;
    }

    const csvContent = [
      ['Name', 'Email', 'ERP ID', 'Section', 'Joined Date', activeTab === 'left' ? 'Left Date' : ''],
      ...studentsToExport.map((student, index) => {
        const studentData = activeTab === 'left' ? student : student;
        const leftDate = activeTab === 'left' ? new Date(leftStudents[index].leftAt).toLocaleDateString() : '';
        return [
          studentData.name,
          studentData.email,
          studentData.erpId || 'N/A',
          studentData.section || 'N/A',
          new Date(studentData.createdAt).toLocaleDateString(),
          leftDate
        ];
      })
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${classData?.name || 'class'}_${activeTab}_students.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (student.erpId && student.erpId.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (student.section && student.section.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredLeftStudents = leftStudents
    .filter(ls => ls.studentId) // Filter out any null studentId
    .map(ls => ({ ...ls.studentId, leftAt: ls.leftAt }))
    .filter(student =>
      student?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (student?.erpId && student.erpId.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (student?.section && student.section.toLowerCase().includes(searchTerm.toLowerCase()))
    );

  const getInitials = (name) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRandomColor = (index) => {
    const colors = [
      'from-purple-400 to-purple-600',
      'from-blue-400 to-blue-600',
      'from-green-400 to-green-600',
      'from-pink-400 to-pink-600',
      'from-indigo-400 to-indigo-600',
      'from-red-400 to-red-600',
      'from-yellow-400 to-yellow-600',
      'from-teal-400 to-teal-600',
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 font-body text-ink">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-violet-50 to-paper rounded-2xl p-4 sm:p-5 border border-line shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-semibold font-display text-ink">
                Class Students
              </h2>
              <p className="text-ink-soft text-xs sm:text-sm mt-0.5">
                {students.length} active • {leftStudents.length} left
              </p>
            </div>
          </div>

          <button
            onClick={handleExportStudents}
            disabled={(activeTab === 'present' ? students.length : leftStudents.length) === 0}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-3 py-1.5 bg-surface border border-line text-ink text-[13px] font-bold rounded-xl hover:bg-line disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>

        {/* Class Code Display */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 bg-paper rounded-xl border border-line">
          <div className="flex-1 w-full">
            <p className="text-xs text-ink-soft mb-0.5">Class Code</p>
            <p className="text-lg sm:text-xl font-mono font-black text-violet-600 dark:text-[#A78BFA]">
              {classData?.classCode || 'N/A'}
            </p>
          </div>
          <button
            onClick={handleCopyClassCode}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-3 py-1.5 btn-settings-blue text-[13px] rounded-xl font-bold transition-colors cursor-pointer"
          >
            {copiedCode ? (
              <>
                <Check className="w-3.5 h-3.5" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copy Code
              </>
            )}
          </button>
        </div>
      </div>

      {/* Stats Cards - Hidden on mobile */}
      <div className="hidden md:grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-surface rounded-2xl border border-line p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-ink-soft uppercase tracking-wider mb-1">Total Students</p>
              <p className="text-2xl sm:text-3xl font-black font-display text-ink">{students.length}</p>
            </div>
            <div className="w-10 h-10 bg-violet-50 text-violet-dark rounded-xl flex items-center justify-center border border-line">
              <Users className="w-5 h-5 text-violet-dark" />
            </div>
          </div>
        </div>

        <div className="bg-surface rounded-2xl border border-line p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-ink-soft uppercase tracking-wider mb-1">Active This Month</p>
              <p className="text-2xl sm:text-3xl font-black font-display text-green-600 dark:text-green-400">
                {students.filter(s => {
                  const monthAgo = new Date();
                  monthAgo.setMonth(monthAgo.getMonth() - 1);
                  return new Date(s.createdAt) > monthAgo;
                }).length}
              </p>
            </div>
            <div className="w-10 h-10 bg-green-100 dark:bg-green-950/40 rounded-xl flex items-center justify-center border border-line">
              <UserCheck className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-surface rounded-2xl border border-line p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-ink-soft uppercase tracking-wider mb-1">Class Code</p>
              <p className="text-xl sm:text-2xl font-mono font-black text-indigo-600 dark:text-indigo-400">
                {classData?.classCode || 'N/A'}
              </p>
            </div>
            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-950/40 rounded-xl flex items-center justify-center border border-line">
              <Copy className="w-5 h-5 text-indigo-600 dark:text-indigo-450" />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-ink-soft" />
          <input
            type="text"
            placeholder="Search students by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-paper text-ink text-sm border border-line rounded-xl outline-none focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all shadow-sm"
          />
        </div>
        
        <div 
          className="relative w-full sm:w-auto min-w-[220px] flex-shrink-0 outline-none group"
          tabIndex={0}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget)) {
              setIsDropdownOpen(false);
            }
          }}
        >
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className={`w-full flex items-center justify-between pl-3.5 pr-4 py-2.5 bg-paper text-ink text-sm border rounded-xl outline-none transition-all shadow-sm cursor-pointer ${
              isDropdownOpen 
                ? 'border-violet-500 ring-2 ring-violet-500/20' 
                : 'border-line hover:border-violet-400 dark:hover:border-violet-500'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className="text-violet-600 dark:text-violet-400">
                {activeTab === 'present' ? <Users className="w-4 h-4" /> : <UserMinus className="w-4 h-4" />}
              </div>
              <span className="font-bold">
                {activeTab === 'present' 
                  ? `Present Students (${students.length})` 
                  : `Left Students (${leftStudents.length})`}
              </span>
            </div>
            <ChevronDown className={`w-4 h-4 text-ink-soft transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Custom Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute z-10 w-full mt-2 py-1.5 bg-paper border border-line rounded-xl shadow-xl overflow-hidden origin-top-right">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('present');
                  setIsDropdownOpen(false);
                }}
                className={`w-[calc(100%-12px)] mx-1.5 flex items-center gap-3 px-3 py-2.5 text-sm font-semibold rounded-lg transition-colors cursor-pointer ${
                  activeTab === 'present' 
                    ? 'bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300' 
                    : 'text-ink hover:bg-surface'
                }`}
              >
                <Users className="w-4 h-4 opacity-80" />
                Present
                <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${
                  activeTab === 'present' 
                    ? 'bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300' 
                    : 'bg-surface text-ink-soft border border-line'
                }`}>
                  {students.length}
                </span>
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setActiveTab('left');
                  setIsDropdownOpen(false);
                }}
                className={`w-[calc(100%-12px)] mx-1.5 mt-1 flex items-center gap-3 px-3 py-2.5 text-sm font-semibold rounded-lg transition-colors cursor-pointer ${
                  activeTab === 'left' 
                    ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300' 
                    : 'text-ink hover:bg-surface'
                }`}
              >
                <UserMinus className="w-4 h-4 opacity-80" />
                Left
                <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${
                  activeTab === 'left' 
                    ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300' 
                    : 'bg-surface text-ink-soft border border-line'
                }`}>
                  {leftStudents.length}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Students List */}
      <div className="bg-surface rounded-2xl border border-line overflow-hidden shadow-sm mt-2">
      {activeTab === 'present' ? (
        <div>
        {filteredStudents.length === 0 ? (
          <div className="p-8 sm:p-12 text-center bg-surface">
            <Users className="w-12 h-12 sm:w-16 sm:h-16 text-line mx-auto mb-4" />
            <p className="text-ink font-semibold text-base sm:text-lg mb-2">
              {searchTerm ? 'No students found' : 'No students yet'}
            </p>
            <p className="text-ink-soft text-xs sm:text-sm">
              {searchTerm 
                ? 'Try a different search term' 
                : 'Share the class code with students to get started'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-line bg-surface">
            {filteredStudents.map((student, index) => (
              <div
                key={student._id}
                className="p-4 sm:p-6 hover:bg-line/20 transition-colors"
              >
                <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                  {/* Profile Icon */}
                  {student.profilePhoto ? (
                    <img 
                      src={`${API_BASE_URL.replace('/api', '')}/${student.profilePhoto}`}
                      alt={student.name}
                      className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover flex-shrink-0 border-2 border-line shadow-md"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextElementSibling.style.display = 'flex';
                      }}
                    />
                  ) : (
                    <div className={`w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br ${getRandomColor(index)} rounded-full flex items-center justify-center text-white font-bold text-base sm:text-lg flex-shrink-0 shadow-md`}>
                      {getInitials(student.name)}
                    </div>
                  )}

                  {/* Student Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base sm:text-lg font-semibold font-display text-ink mb-1 truncate">
                      {student.name}
                    </h3>
                    
                    <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-ink-soft">
                      <div className="flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 flex-shrink-0 text-violet-dark" />
                        <span className="truncate">{student.email}</span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Hash className="w-3.5 h-3.5 flex-shrink-0 text-violet-dark" />
                        <span className="truncate font-semibold uppercase">{student.erpId || 'No ERP ID'}</span>
                      </div>
                      
                      {student.section && (
                        <div className="flex items-center gap-1">
                          <span className="truncate font-semibold uppercase text-violet-600 dark:text-violet-300 bg-violet-100 dark:bg-violet-900/40 px-2 py-0.5 rounded-full text-[10px]">Sec: {student.section}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 flex-shrink-0 text-purple-600 dark:text-[#A78BFA]" />
                        <span>
                          Joined {new Date(student.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="px-2.5 sm:px-3 py-1 bg-green-100 dark:bg-green-950/40 text-green-800 dark:text-green-300 text-xs font-bold rounded-full">
                      Active
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        </div>
      ) : (
        <div>
        {filteredLeftStudents.length === 0 ? (
          <div className="p-8 sm:p-12 text-center bg-surface">
            <UserMinus className="w-12 h-12 sm:w-16 sm:h-16 text-line mx-auto mb-4" />
            <p className="text-ink font-semibold text-base sm:text-lg mb-2">
              {searchTerm ? 'No left students found' : 'No students have left'}
            </p>
            <p className="text-ink-soft text-xs sm:text-sm">
              {searchTerm 
                ? 'Try a different search term' 
                : 'Students who leave the class will appear here'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-line bg-surface">
            {filteredLeftStudents.map((student, index) => (
              <div
                key={student._id}
                className="p-4 sm:p-6 hover:bg-line/20 transition-colors"
              >
                <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                  {/* Profile Icon */}
                  {student.profilePhoto ? (
                    <img 
                      src={`${API_BASE_URL.replace('/api', '')}/${student.profilePhoto}`}
                      alt={student.name}
                      className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover flex-shrink-0 border-2 border-line shadow-md opacity-60"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextElementSibling.style.display = 'flex';
                      }}
                    />
                  ) : (
                    <div className={`w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br ${getRandomColor(index)} rounded-full flex items-center justify-center text-white font-bold text-base sm:text-lg flex-shrink-0 shadow-md opacity-60`}>
                      {getInitials(student.name)}
                    </div>
                  )}

                  {/* Student Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base sm:text-lg font-semibold font-display text-ink mb-1 truncate">
                      {student.name}
                    </h3>
                    
                    <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-ink-soft">
                      <div className="flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 flex-shrink-0 text-violet-dark" />
                        <span className="truncate">{student.email}</span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Hash className="w-3.5 h-3.5 flex-shrink-0 text-violet-dark" />
                        <span className="truncate font-semibold uppercase">{student.erpId || 'No ERP ID'}</span>
                      </div>
                      
                      {student.section && (
                        <div className="flex items-center gap-1">
                          <span className="truncate font-semibold uppercase text-violet-600 dark:text-violet-300 bg-violet-100 dark:bg-violet-900/40 px-2 py-0.5 rounded-full text-[10px]">Sec: {student.section}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 flex-shrink-0 text-purple-600 dark:text-[#A78BFA]" />
                        <span>
                          Left {new Date(student.leftAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="px-2.5 sm:px-3 py-1 bg-rose-100 dark:bg-rose-950/40 text-rose-800 dark:text-rose-350 text-xs font-bold rounded-full">
                      Left
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        </div>
      )}
      </div>
    </div>
  );
};

export default StudentsPage;