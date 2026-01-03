import React, { useMemo, useRef, useState, useEffect } from "react";
import { useParams, Outlet, useNavigate, useLocation } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getStoredUser } from "../utils/authStorage";

export default function CourseDetailPage() {
  const { id } = useParams(); // classId
  const navigate = useNavigate();
  const location = useLocation();
  const scrollContainerRef = useRef(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  
  //  Memoize active tab to prevent recalculation on every render
  const activeTab = useMemo(() => {
    const pathParts = location.pathname.split('/');
    return pathParts[pathParts.length - 1];
  }, [location.pathname]);

  //  Memoize classInfo to prevent re-parsing localStorage
  const classInfo = useMemo(() => {
    const user = getStoredUser() || {};
    return {
      classId: id,
      studentId: user.id || user._id,
      studentName: user.name,
    };
  }, [id]); // Only recompute when id changes

  const tabs = [
    { id: 'notes', label: 'Notes', path: 'notes' },
    { id: 'quiz', label: 'Quiz', path: 'quiz' },
    { id: 'assignment', label: 'Assignment', path: 'assignment' },
    { id: 'test', label: 'Test Paper', path: 'test' },
    { id: "doubt", label: "Doubts", path: "doubt" },
  ];

  // Check scroll position and update arrow visibility
  const checkScroll = () => {
    const container = scrollContainerRef.current;
    if (container) {
      setShowLeftArrow(container.scrollLeft > 0);
      setShowRightArrow(
        container.scrollLeft < container.scrollWidth - container.clientWidth - 5
      );
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, []);

  const scroll = (direction) => {
    const container = scrollContainerRef.current;
    if (container) {
      const scrollAmount = 200;
      container.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
      setTimeout(checkScroll, 300);
    }
  };

  const handleTabClick = (tabPath) => {
    navigate(`/course/${id}/${tabPath}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <button
          onClick={() => navigate('/')}
          className="text-purple-600 hover:text-purple-700 mb-3 sm:mb-4 flex items-center gap-2 cursor-pointer text-sm sm:text-base"
        >
          ← Back to Courses
        </button>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Course Material</h1>
        <p className="text-gray-600 mt-1 text-sm sm:text-base">Access notes, quizzes, assignments, tests and doubts</p>
      </div>

      {/* Tabs with Scroll Arrows */}
      <div className="relative mb-6 sm:mb-8">
        {/* Left Arrow */}
        {showLeftArrow && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 md:hidden"
            aria-label="Scroll left"
          >
            <div className="bg-white rounded-full shadow-lg p-2 border border-gray-200 hover:bg-gray-50 transition-colors">
              <ChevronLeft className="w-5 h-5 text-gray-700" />
            </div>
          </button>
        )}

        {/* Tabs Container */}
        <div
          ref={scrollContainerRef}
          onScroll={checkScroll}
          className="flex gap-2 sm:gap-4 overflow-x-auto border-b border-gray-200 scrollbar-hide scroll-smooth px-8 md:px-0"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.path)}
              className={`pb-3 px-3 sm:px-4 font-semibold transition-colors cursor-pointer whitespace-nowrap text-sm sm:text-base flex-shrink-0 ${
                activeTab === tab.path
                  ? 'text-purple-600 border-b-2 border-purple-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Right Arrow */}
        {showRightArrow && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 md:hidden"
            aria-label="Scroll right"
          >
            <div className="bg-white rounded-full shadow-lg p-2 border border-gray-200 hover:bg-gray-50 transition-colors">
              <ChevronRight className="w-5 h-5 text-gray-700" />
            </div>
          </button>
        )}
      </div>

      {/* Nested Routes Content */}
      <div>
        <Outlet context={{ classInfo }} />
      </div>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}