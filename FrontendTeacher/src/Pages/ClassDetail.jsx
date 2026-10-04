// FrontendTeacher/src/Pages/ClassDetail.jsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate, Outlet, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import api from "../api/axios";
import Header from "../components/Header";
import ClassHeader from "../components/ClassHeader";
import ClassTabs from "../components/ClassTabs";
import PageTransition from "../components/PageTransition";
import { getStoredUser } from "../utils/authStorage";
import {
  CalendarDays,
  Video,
  MessageCircleQuestion,
  BarChart3,
  MessageSquare,
  MoreVertical,
  ClipboardList,
} from "lucide-react";

const ClassDetail = () => {
  const { classId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isLiveClassroom = location.pathname.includes("/live-classroom");

  const [classData, setClassData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const currentUser = useMemo(() => getStoredUser() || {}, []);

  const activeTab = useMemo(() => {
    const path = location.pathname;
    if (path.includes("/classwork")) return "classwork";
    if (path.includes("/students")) return "students";
    if (path.includes("/stream")) return "stream";
    // Default
    return "stream";
  }, [location.pathname]);

  const MotionButton = motion.button;
  const MotionDiv = motion.div;

  const handleBack = useCallback(() => navigate("/"), [navigate]);
  const handleLogoClick = useCallback(() => navigate("/"), [navigate]);
  const handleAttendanceClick = useCallback(
    () => navigate(`/class/${classId}/attendance`),
    [navigate, classId]
  );

  const handleDropdownOption = useCallback(
    (option) => {
      setIsDropdownOpen(false);

      switch (option) {
        case "dashboard":
          navigate(`/class/${classId}/dashboard`);
          return;
        case "doubts":
          navigate(`/class/${classId}/doubts`);
          return;
        case "live-class":
          navigate(`/class/${classId}/live-classroom`);
          return;
        case "announcement":
          navigate(`/class/${classId}/announcement`);
          return;
        case "calendar":
          navigate(`/class/${classId}/calendar`);
          return;
        case "feedback":
          if (classData) {
            navigate(`/class/${classId}/feedback`, {
              state: { className: classData.subject },
            });
          }
          return;
        default:
          return;
      }
    },
    [navigate, classId, classData]
  );

  useEffect(() => {
    if (!isDropdownOpen) return;

    const close = (e) => {
      if (!e.target.closest(".dropdown-container")) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [isDropdownOpen]);

  useEffect(() => {
    // If we already have data for this class, don't re-fetch
    if (classData && classData.id === classId) {
      return;
    }

    const fetchClassData = async () => {
      try {
        // Only set loading if we don't have data (or if we want to show a small loader, but here we cover full page)
        if (!classData) setLoading(true);
        
        const response = await api.get(`/classroom/${classId}`);
        const classroom = response.data.classroom;

        if (!classroom) return navigate("/");

        setClassData({
          ...classroom,
          id: classroom._id,
          subject: classroom.name,
          students: classroom.students || [],
          leftStudents: classroom.leftStudents || [],
          studentCount: classroom.students?.length || 0,
          color: "bg-gradient-to-br from-purple-500 to-purple-700",
        });
      } catch (error) {
        console.error("Error fetching class data:", error);
        navigate("/");
      } finally {
        setLoading(false);
      }
    };

    if (classId) fetchClassData();
  }, [classData, classId, navigate]);

  const outletContext = useMemo(
    () => ({ classData, currentUser }),
    [classData, currentUser]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <div className="animate-spin h-12 w-12 border-b-2 border-purple-600 rounded-full" />
      </div>
    );
  }

  if (!classData) return null;

  const dropdownItems = [
    {
      name: "Doubts",
      key: "doubts",
      icon: MessageCircleQuestion,
      iconColor: "text-amber-600 dark:text-amber-400",
    },
    {
      name: "Live Class",
      key: "live-class",
      icon: Video,
      iconColor: "text-red-500 dark:text-red-400",
    },
    {
      name: "Announcements",
      key: "announcement",
      icon: MessageSquare,
      iconColor: "text-blue-600 dark:text-blue-400",
    },
    {
      name: "Calendar",
      key: "calendar",
      icon: CalendarDays,
      iconColor: "text-teal-600 dark:text-teal-400",
    },
    {
      name: "Feedback",
      key: "feedback",
      icon: MessageSquare,
      iconColor: "text-pink-600 dark:text-pink-400",
    },
  ];

  return (
    <div className="min-h-screen bg-paper font-body text-ink">
      {isLiveClassroom ? (
        <div className="sm:hidden sticky top-0 z-[100]">
          <Header onLogoClick={handleLogoClick} />
        </div>
      ) : (
        <Header onLogoClick={handleLogoClick} />
      )}
      
      <PageTransition
        className={
          isLiveClassroom ? "h-screen p-0" : "max-w-7xl mx-auto px-6 py-6"
        }
      >
        {!isLiveClassroom && (
          <>
            {/* ─── Class Header + Actions ─── */}
            <div className="flex items-start justify-between gap-4">
              <ClassHeader classData={classData} onBack={handleBack} />

              {/* Right-side Actions */}
              <div className="flex items-center gap-2 mt-8 flex-shrink-0">
                {/* Dashboard Button */}
                <MotionButton
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleDropdownOption("dashboard")}
                  className="group flex items-center gap-2 px-3.5 py-2 bg-surface text-ink rounded-lg border border-line shadow-sm hover:shadow-md hover:border-purple-200 dark:hover:border-violet-700/40 transition-all duration-200 cursor-pointer"
                >
                  <BarChart3 className="w-[18px] h-[18px] text-violet-600 dark:text-violet-400 group-hover:scale-110 transition-transform" />
                  <span className="hidden sm:inline text-[15px] font-medium">Dashboard</span>
                </MotionButton>

                {/* Attendance Button */}
                <MotionButton
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleAttendanceClick}
                  className="group flex items-center gap-2 px-3.5 py-2 bg-surface text-ink rounded-lg border border-line shadow-sm hover:shadow-md hover:border-purple-200 dark:hover:border-violet-700/40 transition-all duration-200 cursor-pointer"
                >
                  <ClipboardList className="w-[18px] h-[18px] text-violet-600 dark:text-violet-400 group-hover:scale-110 transition-transform" />
                  <span className="hidden sm:inline text-[15px] font-medium">Attendance</span>
                </MotionButton>

                {/* More Options Dropdown */}
                <div className="relative dropdown-container">
                  <MotionButton
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center justify-center w-10 h-10 bg-surface text-ink rounded-lg border border-line shadow-sm hover:shadow-md hover:border-purple-200 dark:hover:border-violet-700/40 transition-all cursor-pointer"
                  >
                    <MoreVertical className="w-5 h-5 text-ink-soft" />
                  </MotionButton>
 
                  <AnimatePresence>
                    {isDropdownOpen && (
                      <MotionDiv
                        initial={{ opacity: 0, y: -8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-full mt-2 w-52 bg-surface rounded-xl shadow-2xl border border-line py-1.5 z-50"
                      >
                        {dropdownItems.map((item) => {
                          const Icon = item.icon;
                          return (
                            <button
                              key={item.key}
                              onClick={() => handleDropdownOption(item.key)}
                              className="w-full flex items-center gap-3 px-4 py-2.5 text-[15px] font-medium text-ink hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors cursor-pointer"
                            >
                              <Icon className={`w-[18px] h-[18px] ${item.iconColor}`} />
                              <span>{item.name}</span>
                            </button>
                          );
                        })}
                      </MotionDiv>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* ─── Navigation Tabs ─── */}
            <ClassTabs activeTab={activeTab} classId={classId} />
          </>
        )}

        <div className={!isLiveClassroom ? "mt-6" : ""}>
          <Outlet context={outletContext} />
        </div>
      </PageTransition>
    </div>
  );
};

export default ClassDetail;
