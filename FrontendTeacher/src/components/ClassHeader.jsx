import React from 'react';
import { ArrowLeft } from 'lucide-react';

const ClassHeader = ({ classData, onBack }) => {
  return (
    <div>
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-purple-600 dark:text-[#A78BFA] hover:text-purple-700 dark:hover:text-purple-400 mb-6 font-semibold cursor-pointer transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </button>
      
      <div className="mb-8">
        <h2 className="text-3xl font-semibold font-display text-ink mb-2">{classData.name}</h2>
        <p className="text-ink-soft text-sm sm:text-base">{classData.subject} • {classData.studentCount} students</p>
      </div>
    </div>
  );
};

export default ClassHeader;