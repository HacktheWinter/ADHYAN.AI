// FrontendTeacher/src/components/ClassCard.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Share2, MoreVertical, Trash2, Edit3, Users, Archive } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ClassCodeModal from './ClassCodeModal';
import { getAllThemes } from '../data/themeData';

const ClassCard = ({ classData, onClick, onDelete, onEdit, onArchive }) => {
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [copied, setCopied] = useState(false);
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
    onDelete(classData._id || classData.id, classData.name);
  };

  const handleArchiveClick = (e) => {
    e.stopPropagation();
    setShowDropdown(false);
    onArchive?.(classData._id || classData.id, true, classData.name);
  };

  const handleRestoreClick = (e) => {
    e.stopPropagation();
    setShowDropdown(false);
    onArchive?.(classData._id || classData.id, false, classData.name);
  };

  const handleDropdownToggle = (e) => {
    e.stopPropagation();
    setShowDropdown(!showDropdown);
  };

  const handleEditClick = (e) => {
    e.stopPropagation();
    setShowDropdown(false);
    onEdit?.();
  };

  const headerColor = classData.colorTheme || classData.color || "bg-gradient-to-br from-purple-500 to-purple-700";
  
  // Check if we have an image (either from themeImage or colorTheme containing an image URL)
  const isImageUrl = (str) => str && (str.startsWith('data:') || str.includes('.jpg') || str.includes('.jpeg') || str.includes('.png') || str.includes('.webp'));
  // Resolve effective theme image
  let resolvedImage = classData.themeImage; // Start with custom upload if any

  // If no custom upload, try to resolve from themeId
  if (!resolvedImage && classData.themeId) {
    const allThemes = getAllThemes();
    const foundTheme = allThemes.find(t => t.id === classData.themeId);
    if (foundTheme) {
      resolvedImage = foundTheme.value;
    }
  }

  // Fallback: Check if colorTheme itself is an image URL (legacy support)
  if (!resolvedImage && classData.colorTheme && isImageUrl(classData.colorTheme)) {
    resolvedImage = classData.colorTheme;
  }

  const hasImage = Boolean(resolvedImage);
  const imageUrl = resolvedImage;
  
  const headerStyle = hasImage
    ? {
        backgroundImage: `linear-gradient(135deg, rgba(0,0,0,0.15), rgba(0,0,0,0.3)), url(${imageUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : undefined;

  return (
    <>
      <div
        onClick={onClick}
        className="cursor-pointer transform transition-all duration-300 hover:-translate-y-1 h-full relative min-h-[240px] sm:min-h-[260px]"
      >
        <div className="bg-surface rounded-2xl shadow-sm border border-line h-full flex flex-col relative overflow-hidden hover:shadow-md transition-all duration-200">
          <div
            className={`${hasImage ? "bg-gray-900" : headerColor} h-28 sm:h-32 flex items-center justify-center relative overflow-visible`}
            style={headerStyle}
          >
            <h3 className="text-lg sm:text-2xl font-display font-semibold text-white px-3 sm:px-4 text-center tracking-tight leading-tight">
              {classData.name}
            </h3>
            
            {/* Three Dots Menu */}
            <div className="absolute top-3 right-3 z-20" ref={dropdownRef}>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleDropdownToggle}
                className="p-1.5 sm:p-2 bg-white/20 hover:bg-white/30 rounded-full backdrop-blur-sm transition-all cursor-pointer relative z-20"
                title="More options"
              >
                <MoreVertical className="w-4 h-4 text-white" />
              </motion.button>

              {/* Dropdown Menu */}
              <AnimatePresence>
                {showDropdown && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98, y: -2 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98, y: -2 }}
                    transition={{ duration: 0.1 }}
                    className="absolute right-0 mt-2 w-48 bg-surface rounded-lg shadow-xl border border-line py-2 z-50 origin-top-right"
                  >
                    {classData.isArchived ? (
                      <button
                        onClick={handleRestoreClick}
                        className="dropdown-item-restore w-full flex items-center gap-3 px-4 py-2 text-left text-sm text-ink transition-colors cursor-pointer"
                      >
                        <Archive className="w-4 h-4 text-emerald-600" />
                        Restore Class
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={handleShareClick}
                          className="dropdown-item w-full flex items-center gap-3 px-4 py-2 text-left text-sm text-ink transition-colors cursor-pointer"
                        >
                          <Share2 className="w-4 h-4" />
                          Share Class Code
                        </button>

                        <button
                          onClick={handleEditClick}
                          className="dropdown-item w-full flex items-center gap-3 px-4 py-2 text-left text-sm text-ink transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-4 h-4" />
                          Edit Class
                        </button>

                        <button
                          onClick={handleArchiveClick}
                          className="dropdown-item w-full flex items-center gap-3 px-4 py-2 text-left text-sm text-ink transition-colors cursor-pointer"
                        >
                          <Archive className="w-4 h-4" />
                          Archive Class
                        </button>
                      </>
                    )}
                    
                    <button
                      onClick={handleDeleteClick}
                      className="dropdown-item-danger w-full flex items-center gap-3 px-4 py-2 text-left text-sm text-rose-600 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Class
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          
          <div className="p-4 sm:p-5 flex-1 flex flex-col font-body justify-between gap-3 sm:gap-4">
            <div>
              <p className="text-ink font-display text-base sm:text-lg font-semibold mb-1">{classData.subject}</p>
            </div>
            
            <div className="flex items-center justify-between mt-auto">
              {/* Left side: Student count */}
              <span className="text-ink-soft text-xs sm:text-sm font-semibold flex items-center gap-1 sm:gap-1.5">
                <Users className="w-4 h-4 text-ink-soft stroke-[2px]" />
                {classData.studentCount} student{classData.studentCount !== 1 ? 's' : ''}
              </span>

              {/* Right side: Unified class code and copy button box */}
              <div className="flex items-center gap-2 bg-paper border border-line rounded-lg px-2 py-1.5 sm:px-2.5 sm:py-1.5">
                <span className="text-xs font-mono font-bold text-violet-600 tracking-wider">
                  {classData.classCode || 'N/A'}
                </span>
                {classData.classCode && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(classData.classCode);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1400);
                    }}
                    className={`p-0.5 rounded flex items-center justify-center transition-all cursor-pointer ${
                      copied ? 'text-emerald-600 font-bold' : 'text-[#6B6478] hover:text-[#6D28D9]'
                    }`}
                    title="Copy access code"
                  >
                    {copied ? (
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                    ) : (
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/></svg>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Class Code Sharing Overlay Modal */}
      <ClassCodeModal
        isOpen={showCodeModal}
        onClose={() => setShowCodeModal(false)}
        classData={classData}
      />
    </>
  );
};

export default ClassCard;