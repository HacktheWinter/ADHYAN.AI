// FrontendTeacher/src/components/AddTopicsButton.jsx
import React from 'react';
import { Edit3 } from 'lucide-react';

const AddTopicsButton = ({ onClick, isActive, disabled }) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium text-sm transition-all cursor-pointer ${
        isActive
          ? 'bg-blue-100 text-blue-700'
          : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <Edit3 className="w-4 h-4 text-blue-700" />
      <span>Add Topics</span>
    </button>
  );
};

export default AddTopicsButton;