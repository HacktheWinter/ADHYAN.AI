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
  Hash
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
    <div className="space-y-4 sm:space-y-6 font-body text-ink">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-violet-50 to-paper rounded-2xl p-4 sm:p-6 border border-line shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <Users className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-semibold font-display text-ink">
                Class Students
              </h2>
              <p className="text-ink-soft text-xs sm:text-sm mt-1">
                {students.length} active • {leftStudents.length} left
              </p>
            </div>
          </div>

          <button
            onClick={handleExportStudents}
            disabled={(activeTab === 'present' ? students.length : leftStudents.length) === 0}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-surface border border-line text-ink text-sm font-bold rounded-xl hover:bg-line disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-sm"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>

        {/* Class Code Display */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-paper rounded-xl border border-line">
          <div className="flex-1 w-full">
            <p className="text-xs sm:text-sm text-ink-soft mb-1">Class Code</p>
            <p className="text-xl sm:text-2xl font-mono font-black text-violet-600 dark:text-[#A78BFA]">
              {classData?.classCode || 'N/A'}
            </p>
          </div>
          <button
            onClick={handleCopyClassCode}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 btn-settings-blue text-sm rounded-xl font-bold transition-colors cursor-pointer"
          >
            {copiedCode ? (
              <>
                <Check className="w-4 h-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy Code
              </>
            )}
          </button>
        </div>
      </div>

      {/* Stats Cards - Hidden on mobile */}
      <div className="hidden md:grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface rounded-2xl border border-line p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-ink-soft uppercase tracking-wider mb-1">Total Students</p>
              <p className="text-3xl font-black font-display text-ink">{students.length}</p>
            </div>
            <div className="w-12 h-12 bg-violet-50 text-violet-dark rounded-xl flex items-center justify-center border border-line">
              <Users className="w-6 h-6 text-violet-dark" />
            </div>
          </div>
        </div>

        <div className="bg-surface rounded-2xl border border-line p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-ink-soft uppercase tracking-wider mb-1">Active This Month</p>
              <p className="text-3xl font-black font-display text-green-600 dark:text-green-400">
                {students.filter(s => {
                  const monthAgo = new Date();
                  monthAgo.setMonth(monthAgo.getMonth() - 1);
                  return new Date(s.createdAt) > monthAgo;
                }).length}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-950/40 rounded-xl flex items-center justify-center border border-line">
              <UserCheck className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-surface rounded-2xl border border-line p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-ink-soft uppercase tracking-wider mb-1">Class Code</p>
              <p className="text-2xl font-mono font-black text-indigo-600 dark:text-indigo-400">
                {classData?.classCode || 'N/A'}
              </p>
            </div>
            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-950/40 rounded-xl flex items-center justify-center border border-line">
              <Copy className="w-6 h-6 text-indigo-600 dark:text-indigo-450" />
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-surface rounded-2xl border border-line p-3 sm:p-4 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-ink-soft" />
          <input
            type="text"
            placeholder="Search students by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 sm:pl-10 pr-4 py-2 bg-paper text-ink text-sm sm:text-base border border-line rounded-xl outline-none focus:outline-none focus:ring-2 focus:ring-violet-600 focus:bg-surface transition-all"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-surface rounded-2xl border border-line overflow-hidden shadow-sm">
        <div className="flex border-b border-line">
          <button
            onClick={() => setActiveTab('present')}
            className={`flex-1 px-4 py-3 text-sm font-bold transition-colors cursor-pointer border-r border-line last:border-r-0 ${
              activeTab === 'present'
                ? 'bg-violet-50 text-violet-dark border-b-2 border-purple-600'
                : 'text-ink-soft hover:bg-line/45'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Users className="w-4 h-4" />
              <span>Present Students ({students.length})</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('left')}
            className={`flex-1 px-4 py-3 text-sm font-bold transition-colors cursor-pointer ${
              activeTab === 'left'
                ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-455 border-b-2 border-rose-650'
                : 'text-ink-soft hover:bg-line/45'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <UserMinus className="w-4 h-4" />
              <span>Left Students ({leftStudents.length})</span>
            </div>
          </button>
        </div>

      {/* Students List */}
      {activeTab === 'present' ? (
        <div>
        {filteredStudents.length === 0 ? (
          <div className="p-8 sm:p-12 text-center bg-surface border border-line rounded-b-2xl">
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
          <div className="divide-y divide-line bg-surface rounded-b-2xl border-x border-b border-line overflow-hidden">
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
          <div className="p-8 sm:p-12 text-center bg-surface border border-line rounded-b-2xl">
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
          <div className="divide-y divide-line bg-surface rounded-b-2xl border-x border-b border-line overflow-hidden">
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