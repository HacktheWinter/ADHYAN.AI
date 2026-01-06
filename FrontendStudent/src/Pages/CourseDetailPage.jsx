import React, { useMemo, useRef, useState, useEffect } from "react";
import { useParams, Outlet, useNavigate, useLocation } from "react-router-dom";
import { ChevronLeft, ChevronRight, Grid } from "lucide-react";

export default function CourseDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const scrollContainerRef = useRef(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const menuOptions = [
    { name: 'Announcement', icon: '📢' },
    { name: 'Calendar', icon: '📅' },
    { name: 'Classes', icon: '📚' },
    { name: 'Feedback', icon: '💬' }
  ];
  
  const activeTab = useMemo(() => {
    const pathParts = location.pathname.split('/');
    return pathParts[pathParts.length - 1];
  }, [location.pathname]);

  const classInfo = useMemo(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return {
      classId: id,
      studentId: user.id || user._id,
      studentName: user.name,
    };
  }, [id]);

  const tabs = [
    { id: 'notes', label: 'Notes', path: 'notes' },
    { id: 'quiz', label: 'Quiz', path: 'quiz' },
    { id: 'assignment', label: 'Assignment', path: 'assignment' },
    { id: 'test', label: 'Test Paper', path: 'test' },
    { id: "doubt", label: "Doubts", path: "doubt" },
  ];

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

  useEffect(() => {
    if (isMenuOpen) {
      const handleClickOutside = (e) => {
        if (!e.target.closest('.menu-container')) setIsMenuOpen(false);
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isMenuOpen]);

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

  const handleMenuOption = (option) => {
    // console.log(`Selected: ${option}`);
    setIsMenuOpen(false);
    if (option === 'announcement') {
        navigate(`announcement`);
    }
    if (option === 'calendar') {
        navigate(`calendar`);
    }
    // Add your navigation logic here
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      {/* Header with Floating Menu Button */}
      <div className="mb-6 sm:mb-8 relative">
        <button
          onClick={() => navigate('/')}
          className="text-purple-600 hover:text-purple-700 mb-3 sm:mb-4 flex items-center gap-2 cursor-pointer text-sm sm:text-base"
        >
          ← Back to Courses
        </button>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Course Material</h1>
            <p className="text-gray-600 mt-1 text-sm sm:text-base">Access notes, quizzes, assignments, tests and doubts</p>
          </div>

          {/* Floating Action Button */}
          <div className="menu-container relative">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer flex items-center justify-center ${
                isMenuOpen ? 'rotate-90 scale-110' : 'hover:scale-105'
              }`}
            >
              <Grid className="w-6 h-6" />
            </button>

            {/* Sidebar Style Dropdown */}
            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-gray-50 rounded-lg shadow-lg border border-gray-300 overflow-hidden z-50">
                <div className="bg-gradient-to-r from-purple-500 to-indigo-600 px-4 py-2 border-b border-purple-400">
                  <p className="text-xs font-semibold text-white uppercase tracking-wide">Quick Tools</p>
                </div>
                {menuOptions.map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleMenuOption(option.name.toLowerCase())}
                    className="w-full flex items-center justify-between px-4 py-3 text-gray-800 hover:bg-white hover:shadow-sm transition-all cursor-pointer border-b border-gray-200 last:border-b-0"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{option.icon}</span>
                      <span className="font-medium text-sm">{option.name}</span>
                    </div>
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs with Scroll Arrows */}
      <div className="relative mb-6 sm:mb-8">
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