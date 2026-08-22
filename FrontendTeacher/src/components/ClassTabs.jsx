// FrontendTeacher/src/components/ClassTabs.jsx
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const ClassTabs = ({ activeTab, classId }) => {
  const navigate = useNavigate();
  const scrollContainerRef = useRef(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  const tabs = [
    { id: 'notes', label: 'Notes' },
    { id: 'quizzes', label: 'Assessments' },
    { id: 'test-papers', label: 'Test Papers' },
    { id: 'assignments', label: 'Assignments' },
    { id: 'students', label: 'Students' },
    { id: 'doubts', label: 'Doubts' },
  ];

  // Check scroll position and update arrow visibility
  const checkScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;
    setShowLeftArrow(scrollLeft > 5);
    setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 5);
  };

  useEffect(() => {
    checkScroll();
    const handleResize = () => checkScroll();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const scroll = (direction) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const scrollAmount = 200;
    const newScrollLeft = direction === 'left' 
      ? container.scrollLeft - scrollAmount 
      : container.scrollLeft + scrollAmount;

    container.scrollTo({
      left: newScrollLeft,
      behavior: 'smooth'
    });
  };

  const handleTabClick = (tabId) => {
    navigate(`/class/${classId}/${tabId}`);
  };

  return (
    <div className="relative bg-surface rounded-xl border border-line mt-6 overflow-hidden">
      {/* Left Arrow */}
      {showLeftArrow && (
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-0 bottom-0 z-10 px-2 bg-gradient-to-r from-surface via-surface to-transparent hover:from-paper transition-colors"
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-5 h-5 text-ink" />
        </button>
      )}

      {/* Tabs Container */}
      <div
        ref={scrollContainerRef}
        onScroll={checkScroll}
        className="flex overflow-x-auto scrollbar-hide scroll-smooth"
        style={{ 
          scrollbarWidth: 'none', 
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab.id)}
            className={`
              flex-shrink-0 px-6 py-4 text-sm font-medium transition-all whitespace-nowrap cursor-pointer
              ${activeTab === tab.id
                ? 'text-violet-dark border-b-2 border-purple-600 bg-violet-50 font-bold'
                : 'text-ink-soft hover:text-ink hover:bg-line/40'
              }
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Right Arrow */}
      {showRightArrow && (
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-0 bottom-0 z-10 px-2 bg-gradient-to-l from-surface via-surface to-transparent hover:from-paper transition-colors"
          aria-label="Scroll right"
        >
          <ChevronRight className="w-5 h-5 text-ink" />
        </button>
      )}

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
};

export default ClassTabs;