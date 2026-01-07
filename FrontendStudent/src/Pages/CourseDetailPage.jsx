import React, { useMemo, useRef, useState, useEffect } from "react";
import { useParams, Outlet, useNavigate, useLocation } from "react-router-dom";
import { ChevronLeft, ChevronRight, Grid } from "lucide-react";
import { getStoredUser } from "../utils/authStorage";
import API from "../api.js";

export default function CourseDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const scrollContainerRef = useRef(null);

  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  // FEEDBACK VISIBILITY STATE
  // const [showFeedbackBtn, setShowFeedbackBtn] = useState(false);

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const menuOptions = [
    { name: "Announcement", icon: "📢" },
    { name: "Calendar", icon: "📅" },
    { name: "Classes", icon: "📚" },
    { name: "Feedback", icon: "💬" },
  ];

  const [className, setClassName] = useState("");

  const activeTab = useMemo(() => {
    const pathParts = location.pathname.split("/");
    return pathParts[pathParts.length - 1];
  }, [location.pathname]);

  // Memoize classInfo

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

  const tabs = [
    { id: "notes", label: "Notes", path: "notes" },
    { id: "quiz", label: "Quiz", path: "quiz" },
    { id: "assignment", label: "Assignment", path: "assignment" },
    { id: "test", label: "Test Paper", path: "test" },
    { id: "doubt", label: "Doubts", path: "doubt" },
  ];


  // useEffect(() => {
  //   const token = localStorage.getItem("token");
  //   if (!token) return;

  //   const checkFeedback = async () => {
  //     try {
  //       const res = await fetch(
  //         `http://localhost:5000/api/feedback/active/${id}`,
  //         {
  //           headers: {
  //             Authorization: `Bearer ${token}`,
  //           },
  //         }
  //       );

  //       const data = await res.json();

  //       // show button only when allowed
  //       setShowFeedbackBtn(data.isActive && !data.alreadySubmitted);
  //     } catch (err) {
  //       console.error("Error checking feedback", err);
  //     }
  //   };

  //   checkFeedback();
  // }, [id]);

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
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, []);

  useEffect(() => {
    if (isMenuOpen) {
      const handleClickOutside = (e) => {
        if (!e.target.closest(".menu-container")) setIsMenuOpen(false);
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isMenuOpen]);
  // Fetch classroom details to get the name
  useEffect(() => {
    const fetchClassroom = async () => {
      try {
        const response = await API.get(`/classroom/${id}`);
        if (
          response.data &&
          response.data.classroom &&
          response.data.classroom.name
        ) {
          setClassName(response.data.classroom.name);
        }
      } catch (error) {
        console.error("Error fetching classroom:", error);
      }
    };
    fetchClassroom();
  }, [id]);

  const scroll = (direction) => {
    const container = scrollContainerRef.current;
    if (container) {
      const scrollAmount = 200;
      container.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
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
    if (option === "announcement") {
      navigate(`announcement`);
    }
    if (option === "calendar") {
      navigate(`calendar`);
    }
    if (option === "feedback"){ navigate("feedback");}
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      {/* Header with Floating Menu Button */}
      <div className="mb-6 sm:mb-8 relative">
        <button
          onClick={() => navigate("/")}
          className="text-purple-600 hover:text-purple-700 mb-3 sm:mb-4 flex items-center gap-2 cursor-pointer text-sm sm:text-base"
        >
          ← Back to Courses
        </button>

        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              {className || "Course Material"}
            </h1>
            <p className="text-gray-600 mt-1 text-sm sm:text-base">
              Access notes, quizzes, assignments, tests and doubts
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/*  GIVE FEEDBACK BUTTON */}
            {/* {showFeedbackBtn && (
              <button
                onClick={() => navigate("feedback")}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
              >
                📝 Give Feedback
              </button>
            )} */}

            {/* Floating Menu */}
            <div className="menu-container relative">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-lg flex items-center justify-center"
              >
                <Grid className="w-6 h-6" />
              </button>

              {isMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-gray-50 rounded-lg shadow-lg border z-50">
                  {menuOptions.map((option, idx) => (
                    <button
                      key={idx}
                      onClick={() =>
                        handleMenuOption(option.name.toLowerCase())
                      }
                      className="w-full px-4 py-3 text-left hover:bg-white"
                    >
                      {option.icon} {option.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="relative mb-6 sm:mb-8">
        {showLeftArrow && (
          <button
            onClick={() => scroll("left")}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 md:hidden"
          >
            <div className="bg-white rounded-full shadow-lg p-2 border">
              <ChevronLeft className="w-5 h-5 text-gray-700" />
            </div>
          </button>
        )}

        <div
          ref={scrollContainerRef}
          onScroll={checkScroll}
          className="flex gap-2 sm:gap-4 overflow-x-auto border-b border-gray-200 scrollbar-hide px-8 md:px-0"
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.path)}
              className={`pb-3 px-3 sm:px-4 font-semibold whitespace-nowrap ${
                activeTab === tab.path
                  ? "text-purple-600 border-b-2 border-purple-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {showRightArrow && (
          <button
            onClick={() => scroll("right")}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 md:hidden"
          >
            <div className="bg-white rounded-full shadow-lg p-2 border">
              <ChevronRight className="w-5 h-5 text-gray-700" />
            </div>
          </button>
        )}
      </div>

      {/* Nested Routes */}
      <Outlet context={{ classInfo }} />
    </div>
  );
}
