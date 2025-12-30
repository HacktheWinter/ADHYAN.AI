// FrontendStudent/src/components/ViolationAlertModal.jsx
import React from 'react';
import { Shield, Loader } from 'lucide-react';

export default function ViolationAlertModal({ 
  show, 
  message, 
  violationCount, 
  maxViolations, 
  onOk 
}) {
  if (!show) return null;

  const isFinalViolation = violationCount >= maxViolations;

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100]">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
        <div className="text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-12 h-12 text-red-600" />
          </div>
          
          <div className="whitespace-pre-line text-lg text-gray-800 mb-6 font-medium">
            {message}
          </div>

          {!isFinalViolation ? (
            <button
              onClick={onOk}
              className="w-full py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors text-lg cursor-pointer"
            >
              OK - Return to Full Screen
            </button>
          ) : (
            <div className="flex items-center justify-center gap-2 text-red-600">
              <Loader className="w-6 h-6 animate-spin" />
              <span className="font-semibold">Auto-submitting...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}