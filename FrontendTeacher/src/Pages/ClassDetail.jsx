// FrontendTeacher/src/Pages/ClassDetail.jsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate, Outlet, useLocation } from "react-router-dom";
import axios from "axios";
import Header from "../components/Header";
import ClassHeader from "../components/ClassHeader";
import ClassTabs from "../components/ClassTabs";

const ClassDetail = () => {
  const { classId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isLiveClassroom = location.pathname.includes("/live-classroom");

  const [classData, setClassData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const menuItems = [
    {
      name: "Announcement",
      icon: "M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z",
    },
    {
      name: "Calendar",
      icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
    },
    {
      name: "Classes",
      icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
    },
    {
      name: "Feedback",
      icon: "M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z",
    },
  ];

  const currentUser = useMemo(() => {
    return JSON.parse(localStorage.getItem("user") || "{}");
  }, []);

  const activeTab = useMemo(() => {
    const pathParts = location.pathname.split("/");
    const lastPart = pathParts[pathParts.length - 1];
    const validTabs = [
      "notes",
      "quizzes",
      "test-papers",
      "assignments",
      "students",
      "doubts",
    ];
    return validTabs.includes(lastPart) ? lastPart : "notes";
  }, [location.pathname]);

  const handleBack = useCallback(() => navigate("/"), [navigate]);
  const handleLogoClick = useCallback(() => navigate("/"), [navigate]);

  const handleDropdownOption = useCallback(
    (option) => {
      console.log(`Selected: ${option}`);
      setIsDropdownOpen(false);
      if (option === "classes") {
        navigate(`/class/${classId}/live-classroom`);
      }
    },
    [navigate, classId]
  );

  useEffect(() => {
    if (isDropdownOpen) {
      const handleClickOutside = (e) => {
        if (!e.target.closest(".dropdown-container")) setIsDropdownOpen(false);
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isDropdownOpen]);

  useEffect(() => {
    const fetchClassData = async () => {
      try {
        setLoading(true);
        const response = await axios.get(
          `http://localhost:5000/api/classroom`,
          {
            params: {
              userId: currentUser.id || currentUser._id,
              role: "teacher",
            },
          }
        );

        const classroom = response.data.classrooms.find(
          (c) => c._id === classId
        );

        if (classroom) {
          setClassData({
            ...classroom,
            students: classroom.students || [],
            id: classroom._id,
            subject: classroom.name,
            studentCount: classroom.students?.length || 0,
            color: "bg-gradient-to-br from-purple-500 to-purple-700",
          });
        } else {
          console.error("Classroom not found");
          navigate("/");
        }
      } catch (error) {
        console.error("Error fetching classroom:", error);
        navigate("/");
      } finally {
        setLoading(false);
      }
    };

    if (classId) fetchClassData();
  }, [classId]);

  const outletContext = useMemo(
    () => ({ classData, currentUser }),
    [classData, currentUser]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header onLogoClick={handleLogoClick} />
        <main className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p className="text-gray-500">Loading classroom...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!classData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header onLogoClick={handleLogoClick} />
        <main className="max-w-7xl mx-auto px-6 py-8">
          <div className="text-center mt-20">
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">
              Classroom not found
            </h2>
            <button
              onClick={handleBack}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
            >
              Back to Dashboard
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hide global header in live classroom */}
      {!isLiveClassroom && <Header onLogoClick={handleLogoClick} />}

      <main
        className={`${
          isLiveClassroom
            ? "w-full h-screen p-0"
            : "max-w-7xl mx-auto px-6 py-8"
        }`}
      >
        {!isLiveClassroom && (
          <div className="relative">
            <ClassHeader classData={classData} onBack={handleBack} />

            {/* Dropdown Menu */}
            <div className="absolute top-0 right-0 dropdown-container">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition"
              >
                More Options
              </button>

              {isDropdownOpen && (
                <div className="absolute right-0 mt-3 w-56 bg-white rounded-xl shadow-lg border z-50">
                  {menuItems.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() =>
                        handleDropdownOption(item.name.toLowerCase())
                      }
                      className="w-full px-5 py-3 text-left hover:bg-gray-100"
                    >
                      {item.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {!isLiveClassroom && (
          <ClassTabs activeTab={activeTab} classId={classId} />
        )}

        <div className={isLiveClassroom ? "h-full" : "mt-6"}>
          <Outlet context={outletContext} />
        </div>
      </main>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};

export default ClassDetail;
