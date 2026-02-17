// FrontendTeacher/src/Pages/ClassDetail.jsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate, Outlet, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import api from "../api/axios";
import Header from "../components/Header";
import ClassHeader from "../components/ClassHeader";
import ClassTabs from "../components/ClassTabs";
import PageTransition from "../components/PageTransition";
import { getStoredUser } from "../utils/authStorage";

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
    const pathParts = location.pathname.split("/").filter(Boolean);
    const lastPart = pathParts[pathParts.length - 1];
    const validTabs = ["notes", "quizzes", "test-papers", "assignments", "students", "doubts"];
    return validTabs.includes(lastPart) ? lastPart : "notes";
  }, [location.pathname]);

  const handleBack = useCallback(() => navigate("/"), [navigate]);
  const handleLogoClick = useCallback(() => navigate("/"), [navigate]);

  const handleDropdownOption = useCallback(
    (option) => {

      setIsDropdownOpen(false);

      switch (option) {
        case "announcement":
          navigate("announcement");
          break;
        case "attendance":
          navigate(`/class/${classId}/attendance`);
          break;
        case "calendar":
          navigate("calendar");
          break;

        case "classes":
          navigate(`/class/${classId}/live-classroom`);
          break;
        case "feedback":
          if (classData) {
            navigate(`/class/${classId}/feedback`, {
              state: { className: classData.subject },
            });
          }
          break;
        case "dashboard":
          navigate(`/class/${classId}/dashboard`);
          break;
        default:
          break;
      }
      if (option === 'announcement') {
        navigate(`/class/${classId}/announcement`);
      }
      if (option === 'calendar') {
        navigate(`/class/${classId}/calendar`);
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
  }, [classId]); // Removed navigate dependency, relying on classId change

  const outletContext = useMemo(
    () => ({ classData, currentUser }),
    [classData, currentUser]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin h-12 w-12 border-b-2 border-purple-600 rounded-full" />
      </div>
    );
  }

  if (!classData) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {!isLiveClassroom && <Header onLogoClick={handleLogoClick} />}
      
      <PageTransition
        className={
          isLiveClassroom ? "h-screen p-0" : "max-w-7xl mx-auto px-6 py-8"
        }
      >
        {!isLiveClassroom && (
          <>
            <div className="relative">
              <ClassHeader classData={classData} onBack={handleBack} />
          
              {/* Dropdown Menu */}
              <div className="absolute top-0 right-0 dropdown-container bg-transparent">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl shadow-lg hover:shadow-xl hover:from-purple-700 hover:to-purple-800 transition-all duration-200 cursor-pointer"
                >
                  <span className="font-semibold hidden sm:inline">More Options</span>
                  <motion.svg 
                    animate={{ rotate: isDropdownOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="w-5 h-5" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </motion.svg>
                  {/* Three dots for mobile */}
                  <svg className="w-5 h-5 sm:hidden" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                  </svg>
                </motion.button>

                <AnimatePresence>
                  {isDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50"
                    >
                      {[
                        { name: "Dashboard", icon: "M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z", highlight: true },
                        { name: "Attendance", icon: "M12 4v1m6 11h2m-6 0h-2v4h2v-4zM6 8v4M6 12v4M6 16v4M6 8H4m2 0h2m-2 4H4m2 0h2m-2 4H4m2 0h2m12-16v4m0 4v4m0 4v4m0-12h-2m2 0h2m-2 4h-2m2 0h2m-2 4h-2m2 0h2" }, 
                        { name: "Announcement", icon: "M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" },
                        { name: "Calendar", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
                        { name: "Classes", icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" },
                        { name: "Feedback", icon: "M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" }
                      ].map((item, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleDropdownOption(item.name.toLowerCase())}
                          className={`w-full flex items-center gap-3 px-5 py-3.5 transition-all duration-150 cursor-pointer group border-b border-gray-50 last:border-b-0 ${
                            item.highlight 
                              ? "bg-purple-50 text-purple-700 hover:bg-purple-100 font-semibold" 
                              : "text-gray-700 hover:bg-gradient-to-r hover:from-purple-50 hover:to-purple-100 hover:text-purple-700"
                          }`}
                        >
                          <svg className={`w-5 h-5 group-hover:scale-110 transition-transform duration-150 ${item.highlight ? "text-purple-600" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                          </svg>
                          <span className={item.highlight ? "font-bold" : "font-medium"}>{item.name}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

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
