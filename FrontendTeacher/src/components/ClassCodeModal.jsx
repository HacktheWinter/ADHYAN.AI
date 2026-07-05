
import React, { useState } from "react";
import { X, Copy, Share2, CheckCircle } from "lucide-react";

const ClassCodeModal = ({ isOpen, onClose, classData }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !classData) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(classData.classCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    const shareText = `Join my class "${classData.name}" on ADHYAYAN.AI using code: ${classData.classCode}`;
    
    if (navigator.share) {
      navigator.share({
        title: `Join ${classData.name}`,
        text: shareText,
      }).catch(() => {
        // Fallback to copy if share fails
        handleCopyCode();
      });
    } else {
      handleCopyCode();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-surface border border-line rounded-2xl shadow-2xl w-full max-w-sm sm:max-w-md overflow-hidden animate-slideDown">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-700 to-violet-800 p-5 sm:p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <h2 className="font-display text-2xl font-semibold mb-2">Class Code</h2>
          <p className="text-purple-200 text-sm">
            Share this code with your students
          </p>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6">
          <div className="text-center mb-5 sm:mb-6">
            <p className="text-ink-soft mb-2 sm:mb-3 text-sm">Class Name</p>
            <h3 className="text-lg sm:text-xl font-bold text-ink mb-5 sm:mb-6">
              {classData.name}
            </h3>

            {/* Class Code Display */}
            <div className="class-code-box rounded-xl p-4 sm:p-5 mb-3 sm:mb-4 border-2 border-dashed border-purple-300 dark:border-purple-800">
              <p className="text-xs sm:text-sm text-ink-soft mb-1 sm:mb-2">Class Code</p>
              <div className="text-3xl sm:text-4xl font-bold text-purple-700 dark:text-[#A78BFA] tracking-wider font-mono">
                {classData.classCode}
              </div>
            </div>

            <p className="text-xs sm:text-sm text-ink-soft mb-5 sm:mb-6">
              Students can use this code to join your class
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5 sm:space-y-3">
            <button
              onClick={handleCopyCode}
              className="btn-settings-blue w-full flex items-center justify-center gap-2.5 sm:gap-3 py-3 rounded-xl font-semibold cursor-pointer text-sm sm:text-base transition-all"
            >
              {copied ? (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Code Copied!
                </>
              ) : (
                <>
                  <Copy className="w-5 h-5" />
                  Copy Code
                </>
              )}
            </button>

            <button
              onClick={handleShare}
              className="w-full flex items-center justify-center gap-2.5 sm:gap-3 py-3 border border-purple-600 dark:border-[#A78BFA] text-purple-700 dark:text-[#A78BFA] rounded-xl hover:bg-[#F1ECFB] dark:hover:bg-[#26163F] transition-all font-semibold cursor-pointer text-sm sm:text-base"
            >
              <Share2 className="w-5 h-5" />
              Share Code
            </button>

            <button
              onClick={onClose}
              className="w-full py-3 border border-line text-ink-soft hover:text-ink rounded-xl hover:bg-line transition-all font-semibold cursor-pointer text-sm sm:text-base"
            >
              Close
            </button>
          </div>

          {/* Student Count */}
          <div className="mt-5 sm:mt-6 pt-5 sm:pt-6 border-t border-line text-center">
            <p className="text-xs sm:text-sm text-ink-soft">
              <span className="font-semibold text-purple-700 dark:text-[#A78BFA]">
                {classData.students?.length || 0}
              </span>{" "}
              student{classData.students?.length !== 1 ? "s" : ""} enrolled
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClassCodeModal;