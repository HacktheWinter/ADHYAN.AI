import React, { useState } from 'react';
import { Bookmark, CheckCircle2, AlertCircle, HelpCircle, EyeOff, ChevronLeft, ChevronRight } from 'lucide-react';

export default function QuestionPalette({
  questions = [],
  currentQuestion = 0,
  answers = {},
  visitedQuestions = new Set(),
  markedForReview = {},
  onSelectQuestion,
  isMobileOpen = false,
  setIsMobileOpen
}) {
  const [collapsed, setCollapsed] = useState(false);

  // Compute status counts
  let answeredCount = 0;
  let skippedCount = 0;
  let reviewCount = 0;
  let reviewAndAnsweredCount = 0;
  let notVisitedCount = 0;

  questions.forEach((q, idx) => {
    const qId = q._id || idx;
    const hasAns = !!answers[qId] && String(answers[qId]).trim() !== '';
    const isMarked = !!markedForReview[qId];
    const isVisited = visitedQuestions.has(idx) || idx === currentQuestion;

    if (isMarked && hasAns) {
      reviewAndAnsweredCount++;
    } else if (isMarked) {
      reviewCount++;
    } else if (hasAns) {
      answeredCount++;
    } else if (isVisited) {
      skippedCount++;
    } else {
      notVisitedCount++;
    }
  });

  const getQuestionStatus = (q, idx) => {
    const qId = q._id || idx;
    const hasAns = !!answers[qId] && String(answers[qId]).trim() !== '';
    const isMarked = !!markedForReview[qId];
    const isVisited = visitedQuestions.has(idx) || idx === currentQuestion;

    if (isMarked && hasAns) return 'marked-answered';
    if (isMarked) return 'marked';
    if (hasAns) return 'answered';
    if (isVisited) return 'skipped';
    return 'not-visited';
  };

  const getStatusStyles = (status, isCurrent) => {
    const base = "relative flex items-center justify-center font-bold text-sm rounded-xl transition-all cursor-pointer select-none shadow-sm min-w-[38px] h-10 border";
    const currentRing = isCurrent ? "ring-2 ring-blue-600 ring-offset-2 scale-105 z-10 font-extrabold" : "";

    switch (status) {
      case 'answered':
        return `${base} ${currentRing} bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700`;
      case 'marked-answered':
        return `${base} ${currentRing} bg-purple-600 text-white border-purple-700 hover:bg-purple-700`;
      case 'marked':
        return `${base} ${currentRing} bg-purple-600 text-white border-purple-700 hover:bg-purple-700`;
      case 'skipped':
        return `${base} ${currentRing} bg-rose-500 text-white border-rose-600 hover:bg-rose-600`;
      case 'not-visited':
      default:
        return `${base} ${currentRing} bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200`;
    }
  };

  const content = (
    <div className="flex flex-col h-full bg-white border-r border-gray-200 w-full md:w-72 flex-shrink-0 font-sans">
      {/* Header & Toggle */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
        <div>
          <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
            <span>Question Palette</span>
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-semibold">
              {questions.length} Qs
            </span>
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">Click number to jump to question</p>
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden md:flex p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          title={collapsed ? "Expand Palette" : "Collapse Palette"}
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>

      {!collapsed && (
        <>
          {/* Status Counts Legend Grid */}
          <div className="p-3 bg-gray-50/80 border-b border-gray-100 grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-gray-200 shadow-2xs">
              <div className="w-3 h-3 rounded-full bg-emerald-600 flex-shrink-0" />
              <div className="flex-1 truncate">
                <span className="text-gray-600 font-medium block text-[11px]">Submitted</span>
                <span className="font-bold text-gray-900">{answeredCount}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-gray-200 shadow-2xs">
              <div className="w-3 h-3 rounded-full bg-rose-500 flex-shrink-0" />
              <div className="flex-1 truncate">
                <span className="text-gray-600 font-medium block text-[11px]">Skipped</span>
                <span className="font-bold text-gray-900">{skippedCount}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-gray-200 shadow-2xs">
              <div className="w-3 h-3 rounded-full bg-purple-600 flex-shrink-0" />
              <div className="flex-1 truncate">
                <span className="text-gray-600 font-medium block text-[11px]">Review</span>
                <span className="font-bold text-gray-900">{reviewCount + reviewAndAnsweredCount}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-gray-200 shadow-2xs">
              <div className="w-3 h-3 rounded-full bg-gray-300 border border-gray-400 flex-shrink-0" />
              <div className="flex-1 truncate">
                <span className="text-gray-600 font-medium block text-[11px]">Not Visited</span>
                <span className="font-bold text-gray-900">{notVisitedCount}</span>
              </div>
            </div>
          </div>

          {/* Question Numbers Grid */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-5 gap-2.5">
              {questions.map((q, idx) => {
                const status = getQuestionStatus(q, idx);
                const isCurrent = idx === currentQuestion;
                const isMarked = status === 'marked' || status === 'marked-answered';
                const hasAns = status === 'answered' || status === 'marked-answered';

                return (
                  <button
                    key={q._id || idx}
                    onClick={() => {
                      onSelectQuestion(idx);
                      if (setIsMobileOpen) setIsMobileOpen(false);
                    }}
                    className={getStatusStyles(status, isCurrent)}
                    title={`Question ${idx + 1}: ${
                      status === 'answered' ? 'Answered' :
                      status === 'marked-answered' ? 'Answered & Marked for Review' :
                      status === 'marked' ? 'Marked for Review' :
                      status === 'skipped' ? 'Skipped' : 'Not Visited'
                    }`}
                  >
                    <span>{idx + 1}</span>

                    {/* Small Badge Indicators */}
                    {isMarked && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 border border-white rounded-full flex items-center justify-center shadow-xs">
                        <Bookmark className="w-2 h-2 text-purple-900 fill-yellow-400" />
                      </span>
                    )}
                    {status === 'marked-answered' && (
                      <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-emerald-400 border border-white rounded-full shadow-xs" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom Quick Legend Bar */}
          <div className="p-3 bg-gray-50 border-t border-gray-100 text-[11px] text-gray-600 space-y-1">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" /> Answered
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" /> Skipped
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-600 inline-block" /> Review
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-gray-200 border border-gray-400 inline-block" /> Pending
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop View */}
      <div className="hidden md:block h-full">
        {content}
      </div>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => setIsMobileOpen && setIsMobileOpen(false)}
          />
          <div className="relative z-50 w-72 h-full bg-white shadow-2xl">
            {content}
          </div>
        </div>
      )}
    </>
  );
}
