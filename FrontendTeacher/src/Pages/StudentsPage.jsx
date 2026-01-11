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
  UserMinus
} from 'lucide-react';
import API_BASE_URL from '../config';

const StudentsPage = () => {
  const { classData } = useOutletContext();
  const students = classData?.students || [];
  const leftStudents = classData?.leftStudents || [];

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
      ['Name', 'Email', 'Joined Date', activeTab === 'left' ? 'Left Date' : ''],
      ...studentsToExport.map((student, index) => {
        const studentData = activeTab === 'left' ? student : student;
        const leftDate = activeTab === 'left' ? new Date(leftStudents[index].leftAt).toLocaleDateString() : '';
        return [
          studentData.name,
          studentData.email,
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
    student.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredLeftStudents = leftStudents
    .filter(ls => ls.studentId) // Filter out any null studentId
    .map(ls => ({ ...ls.studentId, leftAt: ls.leftAt }))
    .filter(student =>
      student?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student?.email?.toLowerCase().includes(searchTerm.toLowerCase())
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
    <div className="space-y-4 sm:space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-4 sm:p-6 border border-purple-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
              <Users className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                Class Students
              </h2>
              <p className="text-gray-600 text-xs sm:text-sm mt-1">
                {students.length} active • {leftStudents.length} left
              </p>
            </div>
          </div>

          <button
            onClick={handleExportStudents}
            disabled={(activeTab === 'present' ? students.length : leftStudents.length) === 0}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>

        {/* Class Code Display */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-white rounded-lg border border-purple-200">
          <div className="flex-1 w-full">
            <p className="text-xs sm:text-sm text-gray-600 mb-1">Class Code</p>
            <p className="text-xl sm:text-2xl font-mono font-bold text-purple-600">
              {classData?.classCode || 'N/A'}
            </p>
          </div>
          <button
            onClick={handleCopyClassCode}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors cursor-pointer"
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
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Students</p>
              <p className="text-3xl font-bold text-gray-900">{students.length}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Active This Month</p>
              <p className="text-3xl font-bold text-green-600">
                {students.filter(s => {
                  const monthAgo = new Date();
                  monthAgo.setMonth(monthAgo.getMonth() - 1);
                  return new Date(s.createdAt) > monthAgo;
                }).length}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <UserCheck className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Class Code</p>
              <p className="text-2xl font-mono font-bold text-indigo-600">
                {classData?.classCode || 'N/A'}
              </p>
            </div>
            <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
              <Copy className="w-6 h-6 text-indigo-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search students by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 sm:pl-10 pr-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('present')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors cursor-pointer ${
              activeTab === 'present'
                ? 'bg-purple-50 text-purple-700 border-b-2 border-purple-600'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Users className="w-4 h-4" />
              <span>Present Students ({students.length})</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('left')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors cursor-pointer ${
              activeTab === 'left'
                ? 'bg-red-50 text-red-700 border-b-2 border-red-600'
                : 'text-gray-600 hover:bg-gray-50'
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
          <div className="p-8 sm:p-12 text-center">
            <Users className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium text-base sm:text-lg mb-2">
              {searchTerm ? 'No students found' : 'No students yet'}
            </p>
            <p className="text-gray-400 text-xs sm:text-sm">
              {searchTerm 
                ? 'Try a different search term' 
                : 'Share the class code with students to get started'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredStudents.map((student, index) => (
              <div
                key={student._id}
                className="p-4 sm:p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                  {/* Profile Icon */}
                  {student.profilePhoto ? (
                    <img 
                      src={`${API_BASE_URL.replace('/api', '')}/${student.profilePhoto}`}
                      alt={student.name}
                      className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover flex-shrink-0 border-2 border-purple-200 shadow-md"
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
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1 truncate">
                      {student.name}
                    </h3>
                    
                    <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Mail className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                        <span className="truncate">{student.email}</span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
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
                    <span className="px-2 sm:px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
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
          <div className="p-8 sm:p-12 text-center">
            <UserMinus className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium text-base sm:text-lg mb-2">
              {searchTerm ? 'No left students found' : 'No students have left'}
            </p>
            <p className="text-gray-400 text-xs sm:text-sm">
              {searchTerm 
                ? 'Try a different search term' 
                : 'Students who leave the class will appear here'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredLeftStudents.map((student, index) => (
              <div
                key={student._id}
                className="p-4 sm:p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                  {/* Profile Icon */}
                  {student.profilePhoto ? (
                    <img 
                      src={`${API_BASE_URL.replace('/api', '')}/${student.profilePhoto}`}
                      alt={student.name}
                      className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover flex-shrink-0 border-2 border-gray-300 shadow-md opacity-60"
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
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1 truncate">
                      {student.name}
                    </h3>
                    
                    <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Mail className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                        <span className="truncate">{student.email}</span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
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
                    <span className="px-2 sm:px-3 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded-full">
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