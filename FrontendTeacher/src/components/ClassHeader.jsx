import React from 'react';
import { ArrowLeft } from 'lucide-react';

const ClassHeader = ({ classData, onBack }) => {
  return (
    <div>
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-purple-600 hover:text-purple-700 mb-6 font-medium cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </button>
      
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">{classData.name}</h2>
        <p className="text-gray-600">{classData.subject} • {classData.studentCount} students</p>
      </div>
    </div>
  );
};

export default ClassHeader;