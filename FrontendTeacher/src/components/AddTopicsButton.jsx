// FrontendTeacher/src/components/AddTopicsButton.jsx
import React from 'react';
import { Edit3 } from 'lucide-react';

const AddTopicsButton = ({ onClick, isActive, disabled }) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all cursor-pointer ${
        isActive
          ? 'bg-violet-700 text-white shadow-sm shadow-violet-500/15'
          : 'bg-violet-500/10 text-violet-700 dark:text-violet-300 hover:bg-violet-500/20'
      } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
    >
      <Edit3 className="w-4 h-4" />
      <span>Add Topics</span>
    </button>
  );
};

export default AddTopicsButton;