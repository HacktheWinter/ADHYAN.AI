// FrontendStudent/src/Pages/NoteCraftsDashboard.jsx
import React, { useState, useEffect } from "react";
import {
  BookOpen,
  User,
  X,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { useNavigate, useOutletContext } from "react-router-dom";
import axios from "axios";
import { getStoredUser } from "../utils/authStorage";

export default function NoteCraftsDashboard() {
  const navigate = useNavigate();
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [classCode, setClassCode] = useState("");
  const [myCourses, setMyCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const user = getStoredUser() || {};
  const studentId = user.id || user._id;
  const { searchQuery = "" } = useOutletContext() || {};

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredCourses = normalizedQuery
    ? myCourses.filter((course) => {
        const haystack = [course.title, course.teacher, course.classCode]
          .filter(Boolean)
          .map((item) => item.toString().toLowerCase());
        return haystack.some((item) => item.includes(normalizedQuery));
      })
    : myCourses;

  // Fetch student's enrolled classes
  useEffect(() => {
    const fetchEnrolledClasses = async () => {
      if (!studentId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await axios.get(
          "http://localhost:5000/api/classroom",
          {
            params: { userId: studentId, role: "student" },
          }
        );

        const classes = response.data.classrooms || [];

        // Transform backend data to match UI format
        const formattedClasses = classes.map((cls, idx) => ({
          id: cls._id,
          title: cls.name,
          teacher: cls.teacherId?.name || "Teacher",
          // Prefer teacher-set theme; fallback to existing rotating gradient
          colorTheme: cls.colorTheme || "",
          themeImage: cls.themeImage || "",
          fallbackColor: getGradientColor(idx),
          courseId: cls._id,
          classCode: cls.classCode,
          subject: cls.subject || cls.name,
        }));

        setMyCourses(formattedClasses);
      } catch (err) {
        console.error("Error fetching classes:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchEnrolledClasses();
  }, [studentId]);

  // Function to get different gradient colors
  const getGradientColor = (index) => {
    const colors = [
      "linear-gradient(135deg, #6D28D9 0%, #9333EA 100%)",
      "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
      "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
      "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
      "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
      "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
    ];
    return colors[index % colors.length];
  };

  const handleJoinClass = async (e) => {
    e.preventDefault();

    if (!classCode.trim()) {
      setError("Please enter a class code");
      return;
    }

    if (!studentId) {
      setError("Please login to join a class");
      return;
    }

    setJoining(true);
    setError("");
    setSuccess("");

    try {
      const response = await axios.post(
        "http://localhost:5000/api/classroom/join",
        {
          studentId: studentId,
          classCode: classCode.trim().toUpperCase(),
        }
      );

      setSuccess(`Successfully joined ${response.data.classroom.name}!`);

      // Add new class to the list
      const newClass = {
        id: response.data.classroom._id,
        title: response.data.classroom.name,
        teacher: "Teacher",
        colorTheme: response.data.classroom.colorTheme || "",
        themeImage: response.data.classroom.themeImage || "",
        fallbackColor: getGradientColor(myCourses.length),
        courseId: response.data.classroom._id,
        classCode: response.data.classroom.classCode,
        subject: response.data.classroom.subject || response.data.classroom.name,
      };

      setMyCourses((prev) => [...prev, newClass]);

      setTimeout(() => {
        setClassCode("");
        setShowJoinModal(false);
        setSuccess("");
      }, 2000);
    } catch (err) {
      console.error("Join class error:", err);
      setError(
        err.response?.data?.error ||
          "Failed to join class. Please check the code and try again."
      );
    } finally {
      setJoining(false);
    }
  };

  const CourseCard = ({ course }) => {
    // Check if colorTheme or themeImage contains an image URL
    const isImageUrl = (str) => str && (str.startsWith('data:') || str.includes('.jpg') || str.includes('.jpeg') || str.includes('.png') || str.includes('.webp'));
    const hasImage = Boolean(course.themeImage) || isImageUrl(course.colorTheme);
    const imageUrl = course.themeImage || (isImageUrl(course.colorTheme) ? course.colorTheme : null);
    
    const headerClass = hasImage ? "bg-gray-900" : course.colorTheme || "";
    const headerStyle = hasImage
      ? {
          backgroundImage: `linear-gradient(135deg, rgba(0,0,0,0.15), rgba(0,0,0,0.3)), url(${imageUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }
      : course.colorTheme
      ? undefined
      : { background: course.fallbackColor };

    return (
      <div
        onClick={() => navigate(`/course/${course.courseId}`)}
        className="bg-white rounded-xl sm:rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden w-full min-h-[220px] flex flex-col"
      >
        <div
          className={`h-28 sm:h-32 flex items-center justify-center relative ${headerClass}`}
          style={headerStyle}
        >
          <div className="absolute inset-0 bg-black/10 rounded-t-xl sm:rounded-t-2xl" />
          <h3 className="text-xl sm:text-2xl font-bold text-white z-10 px-3 text-center">
            {course.title}
          </h3>
        </div>

        <div className="p-3 sm:p-4 space-y-2 sm:space-y-3 flex-1 flex flex-col">
          <div className="flex items-center text-gray-700 font-medium text-sm sm:text-base">
            <User
              size={16}
              className="mr-2 text-indigo-600 sm:w-[18px] sm:h-[18px]"
            />
            <span>{course.teacher}</span>
          </div>

          {course.subject && (
            <p className="text-xs sm:text-sm text-gray-500">{course.subject}</p>
          )}

          {course.classCode && (
            <div className="text-xs text-gray-500 bg-gray-100 px-2 sm:px-3 py-1 rounded font-mono text-center">
              Code: {course.classCode}
            </div>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/course/${course.courseId}`);
            }}
            className="w-full mt-auto py-2.5 sm:py-3 rounded-lg text-white font-semibold text-sm sm:text-base transition-all cursor-pointer"
            style={{
              background: "linear-gradient(135deg, #6D28D9 0%, #9333EA 100%)",
            }}
          >
            Continue Learning
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8 sm:mb-10">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
              My Courses
            </h1>
            <p className="text-sm sm:text-base text-gray-600">
              Keep growing your skills 🚀
            </p>
          </div>
          <button
            onClick={() => setShowJoinModal(true)}
            className="w-full sm:w-auto px-5 sm:px-6 py-2.5 sm:py-3 rounded-lg font-medium text-white text-sm sm:text-base flex items-center justify-center gap-2 transition-all cursor-pointer hover:shadow-lg"
            style={{
              background: "linear-gradient(135deg, #6D28D9 0%, #9333EA 100%)",
            }}
          >
            <BookOpen size={18} className="sm:w-5 sm:h-5" />
            Join Class
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p className="text-sm sm:text-base text-gray-500">
                Loading your courses...
              </p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && myCourses.length === 0 && (
          <div className="text-center mt-12 sm:mt-20 px-4">
            <BookOpen
              size={48}
              className="mx-auto text-gray-300 mb-4 sm:w-16 sm:h-16"
            />
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-700 mb-3 sm:mb-4">
              No classes yet
            </h2>
            <p className="text-sm sm:text-base text-gray-500 mb-5 sm:mb-6 max-w-md mx-auto">
              Join a class using a class code from your teacher
            </p>
            <button
              onClick={() => setShowJoinModal(true)}
              className="w-full sm:w-auto px-6 py-3 rounded-lg font-medium text-white text-sm sm:text-base transition-all"
              style={{
                background: "linear-gradient(135deg, #6D28D9 0%, #9333EA 100%)",
              }}
            >
              Join Your First Class
            </button>
          </div>
        )}

        {!loading && myCourses.length > 0 && filteredCourses.length === 0 && (
          <div className="text-center mt-12 sm:mt-16 px-4">
            <AlertCircle
              size={40}
              className="mx-auto text-gray-300 mb-3 sm:w-12 sm:h-12"
            />
            <h2 className="text-lg sm:text-xl font-semibold text-gray-700 mb-2">
              No courses match "{searchQuery.trim()}"
            </h2>
            <p className="text-sm sm:text-base text-gray-500">
              Try a different title, teacher name, or class code.
            </p>
          </div>
        )}

        {/* My Courses Grid */}
        {!loading && filteredCourses.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5 lg:gap-6 justify-items-stretch height-auto">
            {filteredCourses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        )}
      </div>

      {/* Join Class Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => {
                setShowJoinModal(false);
                setError("");
                setSuccess("");
                setClassCode("");
              }}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
            >
              <X size={20} className="sm:w-6 sm:h-6" />
            </button>

            <div className="text-center mb-5 sm:mb-6">
              <div
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4"
                style={{ backgroundColor: "#EDE9FE" }}
              >
                <BookOpen
                  size={28}
                  className="sm:w-8 sm:h-8"
                  style={{ color: "#6D28D9" }}
                />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                Join a Class
              </h3>
              <p className="text-sm sm:text-base text-gray-600">
                Enter the class code provided by your teacher
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-red-700 text-xs sm:text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2 text-green-700 text-xs sm:text-sm">
                <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{success}</span>
              </div>
            )}

            <form onSubmit={handleJoinClass} className="flex flex-col gap-3">
              <input
                type="text"
                value={classCode}
                onChange={(e) => {
                  setClassCode(e.target.value.toUpperCase());
                  setError("");
                }}
                placeholder="Enter Class Code"
                className="border border-gray-300 rounded-lg px-3 sm:px-4 py-2.5 sm:py-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none uppercase font-mono text-center text-base sm:text-lg tracking-wider"
                maxLength={6}
                disabled={joining}
              />
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowJoinModal(false);
                    setError("");
                    setSuccess("");
                    setClassCode("");
                  }}
                  className="w-full sm:flex-1 py-2.5 sm:py-3 border border-gray-300 rounded-lg text-gray-700 text-sm sm:text-base hover:bg-gray-50 transition-colors cursor-pointer"
                  disabled={joining}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={joining || !classCode.trim()}
                  className="w-full sm:flex-1 py-2.5 sm:py-3 rounded-lg text-white text-sm sm:text-base font-medium transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background:
                      "linear-gradient(135deg, #6D28D9 0%, #9333EA 100%)",
                  }}
                >
                  {joining ? "Joining..." : "Join Class"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
