// FrontendStudent/src/components/ViolationAlertModal.jsx
import React from 'react';
import { ShieldAlert, AlertTriangle, Loader2, ArrowRight } from 'lucide-react';

export default function ViolationAlertModal({ 
  show, 
  message, 
  violationCount, 
  maxViolations = 4, 
  onOk 
}) {
  if (!show) return null;

  const isFinalViolation = violationCount >= maxViolations;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[9999] p-4 animate-in fade-in duration-200 select-none">
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center space-y-6 transform transition-all animate-in zoom-in-95 duration-200">
        
        {/* Icon Circle */}
        <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mx-auto border shadow-sm ${
          isFinalViolation 
            ? 'bg-red-50 text-red-600 border-red-200 animate-pulse' 
            : 'bg-amber-50 text-amber-600 border-amber-200'
        }`}>
          {isFinalViolation ? (
            <AlertTriangle className="w-10 h-10 animate-bounce text-red-600" />
          ) : (
            <ShieldAlert className="w-10 h-10 text-amber-600" />
          )}
        </div>

        {/* Warning Title & Badge */}
        <div>
          <span className={`inline-block px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-3 border shadow-xs ${
            isFinalViolation
              ? 'bg-red-50 text-red-700 border-red-200'
              : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}>
            {isFinalViolation ? '⚠️ FINAL WARNING — AUTO-SUBMITTING' : `PROCTORING WARNING (${violationCount}/${maxViolations})`}
          </span>

          {/* Message Content Container */}
          <div className="whitespace-pre-line text-sm text-slate-700 font-medium leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-left shadow-inner">
            {message}
          </div>
        </div>

        {/* Action Button / Progress indicator */}
        {!isFinalViolation ? (
          <button
            onClick={onOk}
            className="w-full py-3.5 px-6 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold rounded-xl shadow-md shadow-indigo-200 active:scale-[0.98] transition-all text-sm cursor-pointer flex items-center justify-center gap-2"
          >
            <span>I Understand, Return to Exam</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <div className="flex items-center justify-center gap-2.5 py-3 px-4 bg-red-50 text-red-700 font-semibold text-sm rounded-xl border border-red-200">
            <Loader2 className="w-5 h-5 animate-spin text-red-600" />
            <span>Auto-submitting your test solutions now...</span>
          </div>
        )}
      </div>
    </div>
  );
}