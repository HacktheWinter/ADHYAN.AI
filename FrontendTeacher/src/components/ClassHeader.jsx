// FrontendTeacher/src/components/ClassHeader.jsx
import React from 'react';
import { ArrowLeft, Users } from 'lucide-react';

const ClassHeader = ({ classData, onBack }) => {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <button 
          onClick={onBack}
          className="flex items-center gap-1.5 text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 mb-3 text-sm font-medium cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Dashboard
        </button>
        
        <h2 className="text-2xl font-semibold font-display text-ink mb-1 truncate">{classData.name}</h2>
        <div className="flex items-center gap-3 text-ink-soft text-sm">
          <span>{classData.subject}</span>
          <span className="text-ink-soft/30">•</span>
          <span className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            {classData.studentCount} students
          </span>
        </div>
      </div>
    </div>
  );
};

export default ClassHeader;