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

  const [classData, setClassData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Memoize currentUser to prevent re-parsing on every render
  const currentUser = useMemo(() => {
    return JSON.parse(localStorage.getItem("user") || "{}");
  }, []);

  // Memoize active tab calculation
  const activeTab = useMemo(() => {
    const pathParts = location.pathname.split("/");
    const lastPart = pathParts[pathParts.length - 1];
    // Only return valid tab names
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

  // Memoize callback functions to prevent re-creation
  const handleBack = useCallback(() => {
    navigate("/");
  }, [navigate]);

  const handleLogoClick = useCallback(() => {
    navigate("/");
  }, [navigate]);

  // Fetch classroom data only when classId changes
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
            students: classroom.students || [], // IMPORTANT: Include students array
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

    if (classId) {
      fetchClassData();
    }
  }, [classId]); // Only depend on classId

  // Memoize outlet context to prevent unnecessary child re-renders
  const outletContext = useMemo(
    () => ({
      classData,
      currentUser,
    }),
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
      <Header onLogoClick={handleLogoClick} />

      <main className="max-w-7xl mx-auto px-6 py-8">
        <ClassHeader classData={classData} onBack={handleBack} />
        <ClassTabs activeTab={activeTab} classId={classId} />

        {/* Only this section re-renders on route change */}
        <div className="mt-6">
          <Outlet context={outletContext} />
        </div>
      </main>
    </div>
  );
};

export default ClassDetail;
