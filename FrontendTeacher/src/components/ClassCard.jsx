// FrontendTeacher/src/components/ClassCard.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Share2, MoreVertical, Trash2 } from 'lucide-react';
import ClassCodeModal from './ClassCodeModal';

const ClassCard = ({ classData, onClick, onDelete }) => {
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  const handleShareClick = (e) => {
    e.stopPropagation();
    setShowCodeModal(true);
    setShowDropdown(false);
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    setShowDropdown(false);
    
    if (window.confirm(`Are you sure you want to delete "${classData.name}"? This action cannot be undone.`)) {
      onDelete(classData._id || classData.id);
    }
  };

  const handleDropdownToggle = (e) => {
    e.stopPropagation();
    setShowDropdown(!showDropdown);
  };

  return (
    <>
      <div
        onClick={onClick}
        className="cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-xl"
      >
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className={`${classData.color} h-32 flex items-center justify-center relative`}>
            <h3 className="text-2xl font-bold text-white px-4 text-center">
              {classData.name}
            </h3>
            
            {/* Three Dots Menu */}
            <div className="absolute top-3 right-3" ref={dropdownRef}>
              <button
                onClick={handleDropdownToggle}
                className="p-2 bg-white/20 hover:bg-white/30 rounded-full backdrop-blur-sm transition-all cursor-pointer"
                title="More options"
              >
                <MoreVertical className="w-4 h-4 text-white" />
              </button>

              {/* Dropdown Menu */}
              {showDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
                  <button
                    onClick={handleShareClick}
                    className="w-full flex items-center gap-3 px-4 py-2 text-left text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors cursor-pointer"
                  >
                    <Share2 className="w-4 h-4" />
                    Share Class Code
                  </button>
                  
                  <button
                    onClick={handleDeleteClick}
                    className="w-full flex items-center gap-3 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Class
                  </button>
                </div>
              )}
            </div>
          </div>
          
          <div className="p-6">
            <p className="text-gray-700 font-semibold mb-2">{classData.subject}</p>
            <div className="flex items-center justify-between">
              <p className="text-gray-500 text-sm">
                {classData.studentCount} student{classData.studentCount !== 1 ? 's' : ''}
              </p>
              <p className="text-xs text-gray-400 font-mono bg-gray-100 px-2 py-1 rounded">
                {classData.classCode || 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Class Code Modal */}
      <ClassCodeModal
        isOpen={showCodeModal}
        onClose={() => setShowCodeModal(false)}
        classData={classData}
      />
    </>
  );
};

export default ClassCard;