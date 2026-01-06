
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm sm:max-w-md overflow-hidden animate-slideDown">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-5 sm:p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-2xl font-bold mb-2">Class Code</h2>
          <p className="text-purple-100 text-sm">
            Share this code with your students
          </p>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6">
          <div className="text-center mb-5 sm:mb-6">
            <p className="text-gray-600 mb-2 sm:mb-3">Class Name</p>
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-5 sm:mb-6">
              {classData.name}
            </h3>

            {/* Class Code Display */}
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-4 sm:p-5 mb-3 sm:mb-4 border-2 border-dashed border-purple-300">
              <p className="text-xs sm:text-sm text-gray-600 mb-1 sm:mb-2">Class Code</p>
              <div className="text-3xl sm:text-4xl font-bold text-purple-700 tracking-wider font-mono">
                {classData.classCode}
              </div>
            </div>

            <p className="text-xs sm:text-sm text-gray-500 mb-5 sm:mb-6">
              Students can use this code to join your class
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5 sm:space-y-3">
            <button
              onClick={handleCopyCode}
              className="w-full flex items-center justify-center gap-2.5 sm:gap-3 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all font-medium cursor-pointer text-sm sm:text-base"
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
              className="w-full flex items-center justify-center gap-2.5 sm:gap-3 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-medium cursor-pointer text-sm sm:text-base"
            >
              <Share2 className="w-5 h-5" />
              Share Code
            </button>

            <button
              onClick={onClose}
              className="w-full py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all font-medium cursor-pointer text-sm sm:text-base"
            >
              Close
            </button>
          </div>

          {/* Student Count */}
          <div className="mt-5 sm:mt-6 pt-5 sm:pt-6 border-t border-gray-200 text-center">
            <p className="text-xs sm:text-sm text-gray-600">
              <span className="font-semibold text-purple-600">
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