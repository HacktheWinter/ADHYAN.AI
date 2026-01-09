// FrontendTeacher/src/Pages/ClassDetail.jsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate, Outlet, useLocation } from "react-router-dom";
import axios from "axios";
import api from "../api/axios";
import Header from "../components/Header";
import ClassHeader from "../components/ClassHeader";
import ClassTabs from "../components/ClassTabs";
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
    const last = location.pathname.split("/").pop();
    const valid = [
      "notes",
      "quizzes",
      "test-papers",
      "assignments",
      "students",
      "doubts",
    ];
    return valid.includes(last) ? last : "notes";
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
        default:
          break;
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
    const fetchClassData = async () => {
      try {
        setLoading(true);
        let classroom = null;

        try {
          const res = await axios.get(
            `http://localhost:5000/api/classroom/${classId}`
          );
          classroom = res.data.classroom;
        } catch {
          const res = await api.get(`/classroom/${classId}`);
          classroom = res.data.classroom;
        }

        if (!classroom) {
          const listRes = await axios.get(
            `http://localhost:5000/api/classroom`,
            {
              params: {
                userId: currentUser.id || currentUser._id,
                role: "teacher",
              },
            }
          );
          classroom = listRes.data.classrooms?.find((c) => c._id === classId);
        }

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
      } catch {
        navigate("/");
      } finally {
        setLoading(false);
      }
    };

    if (classId) fetchClassData();
  }, [classId, navigate, currentUser]);

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

      <main
        className={
          isLiveClassroom ? "h-screen p-0" : "max-w-7xl mx-auto px-6 py-8"
        }
      >
        {!isLiveClassroom && (
          <>
            <div className="relative">
              <ClassHeader classData={classData} onBack={handleBack} />

              <div className="absolute top-0 right-0 dropdown-container z-50">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="px-5 py-2 bg-purple-600 text-white rounded-xl"
                >
                  More Options
                </button>

                {isDropdownOpen && (
                  <div className="absolute right-0 mt-3 w-56 bg-white rounded-xl shadow-lg border z-50">
                    {["announcement", "calendar", "classes", "feedback"].map(
                      (opt) => (
                        <button
                          key={opt}
                          onClick={() => handleDropdownOption(opt)}
                          className="block w-full px-5 py-3 text-left hover:bg-gray-100"
                        >
                          {opt}
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>
            </div>

            <ClassTabs activeTab={activeTab} classId={classId} />
          </>
        )}

        <div className={isLiveClassroom ? "h-full" : "mt-6"}>
          <Outlet context={outletContext} />
        </div>
      </main>
    </div>
  );
};

export default ClassDetail;
