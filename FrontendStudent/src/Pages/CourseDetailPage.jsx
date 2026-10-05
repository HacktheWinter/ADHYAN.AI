import React, { useMemo, useRef, useState, useEffect } from "react";
import { useParams, Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  LayoutDashboard,
  BookOpenText,
  MessageCircleQuestion,
  ClipboardCheck,
  MoreHorizontal,
  Megaphone,
  CalendarDays,
  Video,
  MessageSquareHeart,
  X,
  Users,
  Loader,
} from "lucide-react";
import { getStoredUser } from "../utils/authStorage";
import API from "../api.js";

const MAIN_TABS = [
  { id: "stream", label: "Stream", icon: LayoutDashboard, path: "stream" },
  { id: "classwork", label: "Classwork", icon: BookOpenText, path: "classwork" },
  { id: "doubt", label: "Doubts", icon: MessageCircleQuestion, path: "doubt" },
];

const MENU_OPTIONS = [
  { id: "announcement", label: "Announcements", icon: Megaphone },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "feedback", label: "Feedback", icon: MessageSquareHeart },
];

export default function CourseDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [classData, setClassData] = useState({
    name: "",
    subject: "",
    teacherName: "",
    studentCount: 0,
  });

  // Determine active tab from URL path
  const activeTab = useMemo(() => {
    const pathParts = location.pathname.split("/");
    const lastPart = pathParts[pathParts.length - 1];
    // Map old paths to new tabs
    if (["notes", "quiz", "coding-round", "assignment", "test"].includes(lastPart)) {
      return "classwork";
    }
    if (lastPart === "doubt") return "doubt";
    if (lastPart === "stream") return "stream";
    // For the index route or any sub-page of classwork
    if (lastPart === id) return "stream";
    return lastPart;
  }, [location.pathname, id]);

  const classInfo = useMemo(() => {
    const user = getStoredUser() || {};
    return {
      classId: id,
      studentId: user.id || user._id,
      studentName: user.name,
      studentRole: user.role || "student",
      profilePhoto: user.profilePhoto || "",
    };
  }, [id]);

  // Check if we're on the classes page (full-screen)
  const isClassesPage = activeTab === "classes";

  // Close menu on outside click
  useEffect(() => {
    if (isMenuOpen) {
      const handler = (e) => {
        if (!e.target.closest(".quick-menu-container")) setIsMenuOpen(false);
      };
      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    }
  }, [isMenuOpen]);

  // Fetch classroom details
  useEffect(() => {
    const fetchClassroom = async () => {
      try {
        const response = await API.get(`/classroom/${id}`);
        if (response.data?.classroom) {
          const c = response.data.classroom;
          setClassData({
            name: c.name || "",
            subject: c.subject || "",
            teacherName: c.teacherId?.name || "",
            studentCount: c.students?.length || 0,
          });
        }
      } catch (error) {
        console.error("Error fetching classroom:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchClassroom();
  }, [id]);

  const handleTabClick = (tabPath) => {
    navigate(`/course/${id}/${tabPath}`);
  };

  const handleAttendanceClick = () => {
    navigate(`/course/${id}/attendance`);
  };

  const handleMenuOption = (optionId) => {
    setIsMenuOpen(false);
    navigate(optionId);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4 w-full">
        <Loader className="w-10 h-10 text-purple-600 animate-spin" />
        <p className="text-gray-500 font-medium animate-pulse text-lg">Loading classroom...</p>
      </div>
    );
  }

  return (
    <div
      className={
        isClassesPage
          ? "h-screen w-full"
          : "max-w-[1300px] mx-auto px-4 sm:px-8 lg:px-12 py-5 sm:py-8"
      }
    >
      {!isClassesPage && (
        <>
          {/* ─── Compact Class Header ─── */}
          <div className="mb-5">
            {/* Back button */}
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-1.5 text-purple-600 hover:text-purple-700 mb-3 text-sm font-medium cursor-pointer transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Courses
            </button>

            {/* Class info row */}
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 truncate font-serif">
                  {classData.name}
                </h1>
                <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-1.5 text-sm text-gray-500 font-medium">
                  {classData.subject && (
                    <span>{classData.subject}</span>
                  )}
                  {classData.teacherName && (
                    <>
                      {classData.subject && <span className="text-gray-300">•</span>}
                      <span>{classData.teacherName}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Right-side actions */}
              <div className="flex items-center gap-3 flex-shrink-0">
                {/* Attendance */}
                <button
                  onClick={handleAttendanceClick}
                  className="h-10 w-10 sm:w-auto sm:px-5 rounded-lg border border-gray-200 bg-white text-gray-700 hover:border-purple-300 hover:text-purple-700 transition-all cursor-pointer flex items-center justify-center gap-2.5 text-sm font-semibold shadow-sm"
                >
                  <ClipboardCheck className="w-[18px] h-[18px] text-purple-600" />
                  <span className="hidden sm:inline">Attendance</span>
                </button>

                {/* Classes */}
                <button
                  onClick={() => navigate("classes")}
                  className="h-10 w-10 sm:w-auto sm:px-5 rounded-lg border border-gray-200 bg-white text-gray-700 hover:border-purple-300 hover:text-purple-700 transition-all cursor-pointer flex items-center justify-center gap-2.5 text-sm font-semibold shadow-sm"
                >
                  <Video className="w-[18px] h-[18px] text-purple-600" />
                  <span className="hidden sm:inline">Classes</span>
                </button>

                {/* More menu */}
                <div className="quick-menu-container relative">
                  <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className={`h-10 w-10 rounded-lg border transition-all cursor-pointer flex items-center justify-center shadow-sm ${
                      isMenuOpen
                        ? "bg-purple-600 border-purple-600 text-white"
                        : "border-gray-200 bg-white text-gray-500 hover:border-purple-300 hover:text-purple-600"
                    }`}
                  >
                    {isMenuOpen ? (
                      <X className="w-[18px] h-[18px]" />
                    ) : (
                      <MoreHorizontal className="w-[18px] h-[18px]" />
                    )}
                  </button>

                  {/* Dropdown */}
                  {isMenuOpen && (
                    <div className="absolute right-0 top-full mt-1.5 w-48 bg-white rounded-xl border border-gray-200 shadow-lg z-50 py-1 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                      {MENU_OPTIONS.map((option) => {
                        const Icon = option.icon;
                        return (
                          <button
                            key={option.id}
                            onClick={() => handleMenuOption(option.id)}
                            className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors cursor-pointer text-sm"
                          >
                            <Icon className="w-[18px] h-[18px] text-gray-400" />
                            <span className="font-semibold">{option.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ─── Main Navigation Tabs ─── */}
          <div className="mb-6 overflow-x-auto no-scrollbar">
            <div className="flex gap-1 border-b border-gray-100 min-w-max">
              {MAIN_TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabClick(tab.path)}
                    className={`relative pb-3 px-5 flex items-center gap-2.5 text-[15px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                      isActive
                        ? "text-purple-600"
                        : "text-gray-500 hover:text-gray-800"
                    }`}
                  >
                    <Icon className="w-[18px] h-[18px]" />
                    {tab.label}
                    {isActive && (
                      <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-purple-600 rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Nested Routes Content */}
      <div className={isClassesPage ? "h-full w-full" : ""}>
        <Outlet context={{ classInfo }} />
      </div>

      {/* ─── Styles ─── */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slide-in-from-top-1 {
          from { transform: translateY(-4px); }
          to { transform: translateY(0); }
        }
        .animate-in {
          animation: fade-in 150ms ease-out, slide-in-from-top-1 150ms ease-out;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
