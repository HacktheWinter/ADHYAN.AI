// FrontendTeacher/src/Pages/ClassworkPage.jsx
import React, { useState, useEffect, useRef } from "react";
import {
  useOutletContext,
  useParams,
  useNavigate,
  Outlet,
  useLocation,
} from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  FileText,
  ClipboardCheck,
  FileQuestion,
  PenLine,
  Code2,
  Sparkles,
  Pencil,
  ChevronRight,
  ChevronDown,
  ArrowRight,
  Layers,
  Loader,
  BookOpen,
} from "lucide-react";
import axios from "axios";
import { getNotesByClassroom } from "../api/notesApi";
import { getAssignmentsByClassroom } from "../api/assignmentApi";
import { getTestPapersByClassroom } from "../api/testPaperApi";
import { getCodingAssessmentsByClassroom } from "../api/codingAssessmentApi";
import API_BASE_URL from "../config";

const SECTION_MAP = {
  all: { label: "All Classwork", icon: Layers, iconColor: "text-violet-600 dark:text-violet-400" },
  notes: { label: "Notes", icon: FileText, iconColor: "text-emerald-600 dark:text-emerald-400" },
  quizzes: { label: "Assessments", icon: ClipboardCheck, iconColor: "text-purple-600 dark:text-purple-400" },
  "test-papers": { label: "Test Papers", icon: FileQuestion, iconColor: "text-blue-600 dark:text-blue-400" },
  assignments: { label: "Assignments", icon: PenLine, iconColor: "text-orange-600 dark:text-orange-400" },
  "coding-round": { label: "Coding Round", icon: Code2, iconColor: "text-cyan-600 dark:text-cyan-400" },
};

const NAV_ITEMS = [
  { id: "all", label: "All Classwork", icon: Layers, iconColor: "text-violet-600 dark:text-violet-400", bgColor: "bg-violet-50 dark:bg-violet-950/30" },
  { id: "notes", label: "Notes & Materials", icon: FileText, iconColor: "text-emerald-600 dark:text-emerald-400", bgColor: "bg-emerald-50 dark:bg-emerald-950/30" },
  { id: "quizzes", label: "Assessments", icon: ClipboardCheck, iconColor: "text-purple-600 dark:text-purple-400", bgColor: "bg-purple-50 dark:bg-purple-950/30" },
  { id: "test-papers", label: "Test Papers", icon: FileQuestion, iconColor: "text-blue-600 dark:text-blue-400", bgColor: "bg-blue-50 dark:bg-blue-950/30" },
  { id: "assignments", label: "Assignments", icon: PenLine, iconColor: "text-orange-600 dark:text-orange-400", bgColor: "bg-orange-50 dark:bg-orange-950/30" },
  { id: "coding-round", label: "Coding Round", icon: Code2, iconColor: "text-cyan-600 dark:text-cyan-400", bgColor: "bg-cyan-50 dark:bg-cyan-950/30" },
];

const ClassworkPage = () => {
  const { classId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { classData, currentUser } = useOutletContext();

  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [showNavMenu, setShowNavMenu] = useState(false);
  const [hoveredSubmenu, setHoveredSubmenu] = useState(null);
  const createMenuRef = useRef(null);
  const navMenuRef = useRef(null);

  // Determine active filter from the current child route
  const getActiveFilter = () => {
    const pathParts = location.pathname.split("/").filter(Boolean);
    const lastPart = pathParts[pathParts.length - 1];
    const validFilters = ["notes", "quizzes", "test-papers", "assignments", "coding-round"];
    if (validFilters.includes(lastPart)) return lastPart;
    return "all";
  };

  const activeFilter = getActiveFilter();
  const activeSection = SECTION_MAP[activeFilter] || SECTION_MAP.all;
  const ActiveIcon = activeSection.icon;

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (createMenuRef.current && !createMenuRef.current.contains(e.target)) {
        setShowCreateMenu(false);
        setHoveredSubmenu(null);
      }
      if (navMenuRef.current && !navMenuRef.current.contains(e.target)) {
        setShowNavMenu(false);
      }
    };
    if (showCreateMenu || showNavMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showCreateMenu, showNavMenu]);

  const handleNavClick = (filterId) => {
    setShowNavMenu(false);
    if (filterId === "all") {
      navigate(`/class/${classId}/classwork`);
    } else {
      navigate(`/class/${classId}/classwork/${filterId}`);
    }
  };

  // Navigate to the specific content page (which opens the relevant modal)
  const handleCreateAction = (contentType) => {
    setShowCreateMenu(false);
    setHoveredSubmenu(null);

    switch (contentType) {
      case "note":
        navigate(`/class/${classId}/classwork/notes`, { state: { openUpload: true } });
        break;
      case "assessment-ai":
        navigate(`/class/${classId}/classwork/quizzes`, { state: { openModal: "ai" } });
        break;
      case "assessment-manual":
        navigate(`/class/${classId}/classwork/quizzes`, { state: { openModal: "manual" } });
        break;
      case "test-ai":
        navigate(`/class/${classId}/classwork/test-papers`, { state: { openModal: "ai" } });
        break;
      case "test-manual":
        navigate(`/class/${classId}/classwork/test-papers`, { state: { openModal: "manual" } });
        break;
      case "assignment-ai":
        navigate(`/class/${classId}/classwork/assignments`, { state: { openModal: "ai" } });
        break;
      case "assignment-manual":
        navigate(`/class/${classId}/classwork/assignments`, { state: { openModal: "manual" } });
        break;
      case "coding-round":
        navigate(`/class/${classId}/classwork/coding-round`, { state: { openCreate: true } });
        break;
      default:
        break;
    }
  };

  const CREATE_MENU_ITEMS = [
    { id: "note", label: "Note / Material", icon: FileText, iconColor: "text-emerald-600 dark:text-emerald-400", hasSubmenu: false },
    {
      id: "assessment", label: "Assessment", icon: ClipboardCheck, iconColor: "text-purple-600 dark:text-purple-400", hasSubmenu: true,
      submenu: [
        { id: "assessment-ai", label: "AI Quick Generate", icon: Sparkles, iconColor: "text-purple-600 dark:text-[#A78BFA]" },
        { id: "assessment-manual", label: "AI Custom Create", icon: Pencil, iconColor: "text-indigo-600 dark:text-blue-400" },
      ],
    },
    {
      id: "test-paper", label: "Test Paper", icon: FileQuestion, iconColor: "text-blue-600 dark:text-blue-400", hasSubmenu: true,
      submenu: [
        { id: "test-ai", label: "Generate with AI", icon: Sparkles, iconColor: "text-purple-600 dark:text-[#A78BFA]" },
        { id: "test-manual", label: "Create Manually", icon: Pencil, iconColor: "text-indigo-600 dark:text-blue-400" },
      ],
    },
    {
      id: "assignment", label: "Assignment", icon: PenLine, iconColor: "text-orange-600 dark:text-orange-400", hasSubmenu: true,
      submenu: [
        { id: "assignment-ai", label: "Generate with AI", icon: Sparkles, iconColor: "text-purple-600 dark:text-[#A78BFA]" },
        { id: "assignment-manual", label: "Create Manually", icon: Pencil, iconColor: "text-indigo-600 dark:text-blue-400" },
      ],
    },
    { id: "coding-round", label: "Machine Coding Round", icon: Code2, iconColor: "text-cyan-600 dark:text-cyan-400", hasSubmenu: false },
  ];

  // Check if we're on a nested route (specific content type) or the root classwork
  const isRootClasswork =
    activeFilter === "all" &&
    location.pathname.replace(/\/$/, "") === `/class/${classId}/classwork`;

  return (
    <div className="space-y-5">
      {/* ─── Classwork Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative" ref={navMenuRef}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowNavMenu(!showNavMenu);
              setShowCreateMenu(false);
            }}
            className="flex items-center gap-2.5 cursor-pointer group hover:opacity-80 transition-opacity duration-150"
          >
            <ActiveIcon className={`w-5 h-5 ${activeSection.iconColor}`} />
            <h2 className="text-2xl font-semibold font-display text-ink">
              {activeSection.label}
            </h2>
            <ChevronDown className={`w-5 h-5 text-ink-soft group-hover:text-ink transition-all duration-200 ${showNavMenu ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {showNavMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -8 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="absolute left-0 top-full mt-2 w-64 bg-surface rounded-xl shadow-2xl border border-line py-1.5 z-50"
              >
                {NAV_ITEMS.map((item) => {
                  const isActive = activeFilter === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleNavClick(item.id)}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-left transition-colors cursor-pointer group ${
                        isActive
                          ? "bg-violet-50 dark:bg-violet-900/20"
                          : "hover:bg-violet-50/60 dark:hover:bg-violet-900/10"
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg ${item.bgColor} flex items-center justify-center flex-shrink-0`}>
                        <item.icon className={`w-4 h-4 ${item.iconColor}`} />
                      </div>
                      <span className={`text-[14px] font-medium ${
                        isActive ? "text-violet-700 dark:text-violet-300" : "text-ink"
                      }`}>
                        {item.label}
                      </span>
                      {isActive && (
                        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-600 dark:bg-violet-400" />
                      )}
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Create Button + Dropdown */}
        <div className="relative" ref={createMenuRef}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowCreateMenu(!showCreateMenu);
              setShowNavMenu(false);
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-violet-700 hover:bg-violet-800 dark:bg-violet-600 dark:hover:bg-violet-500 text-white font-semibold rounded-xl transition-all shadow-sm cursor-pointer text-[15px]"
          >
            <Plus className="w-5 h-5" />
            <span>Create</span>
          </button>

          <AnimatePresence>
            {showCreateMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -8 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="absolute right-0 top-full mt-2 w-60 bg-surface rounded-xl shadow-2xl border border-line py-1.5 z-50"
              >
                {CREATE_MENU_ITEMS.map((item) => (
                  <div
                    key={item.id}
                    className="relative"
                    onMouseEnter={() => item.hasSubmenu && setHoveredSubmenu(item.id)}
                    onMouseLeave={() => item.hasSubmenu && setHoveredSubmenu(null)}
                  >
                    <button
                      type="button"
                      onClick={() => { if (!item.hasSubmenu) handleCreateAction(item.id); }}
                      className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-[15px] font-medium text-ink hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className={`w-[18px] h-[18px] ${item.iconColor}`} />
                        <span>{item.label}</span>
                      </div>
                      {item.hasSubmenu && <ChevronRight className="w-4 h-4 text-ink-soft" />}
                    </button>

                    {/* Submenu */}
                    {item.hasSubmenu && hoveredSubmenu === item.id && (
                      <motion.div
                        initial={{ opacity: 0, x: 4 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="absolute right-full top-0 mr-1 w-52 bg-surface rounded-xl shadow-2xl border border-line py-1.5 z-50"
                      >
                        {item.submenu.map((sub) => (
                          <button
                            key={sub.id}
                            type="button"
                            onClick={() => handleCreateAction(sub.id)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-[15px] font-medium text-ink hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors cursor-pointer"
                          >
                            <sub.icon className={`w-[18px] h-[18px] ${sub.iconColor}`} />
                            <span>{sub.label}</span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ─── Content Area (centered, same width as Stream) ─── */}
      <div className="max-w-3xl mx-auto">
        {isRootClasswork ? (
          <ClassworkFeed classId={classId} navigate={navigate} currentUser={currentUser} />
        ) : (
          <Outlet context={{ classData, currentUser }} />
        )}
      </div>
    </div>
  );
};

// ─── Classwork Feed (when "All" is active — shows all published content like Stream) ─── 
const ClassworkFeed = ({ classId, navigate, currentUser }) => {
  const [feedItems, setFeedItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllContent();
  }, [classId]);

  const fetchAllContent = async () => {
    try {
      setLoading(true);
      const [notesRes, quizzesRes, testPapersRes, assignmentsRes, codingRoundsRes] = await Promise.all([
        getNotesByClassroom(classId).catch(() => ({ notes: [] })),
        axios.get(`${API_BASE_URL}/quiz/classroom/${classId}`).then(r => r.data).catch(() => ({ quizzes: [] })),
        getTestPapersByClassroom(classId).catch(() => ({ testPapers: [] })),
        getAssignmentsByClassroom(classId).catch(() => ({ assignments: [] })),
        getCodingAssessmentsByClassroom(classId).catch(() => ({ assessments: [] })),
      ]);

      const feed = [];

      (notesRes.notes || []).forEach(item => {
        feed.push({ ...item, feedType: "note", createdAt: item.createdAt });
      });

      (quizzesRes.quizzes || []).forEach(item => {
        if (item.status === "published") {
          feed.push({ ...item, feedType: "quiz", createdAt: item.createdAt });
        }
      });

      (testPapersRes.testPapers || []).forEach(item => {
        if (item.status === "published") {
          feed.push({ ...item, feedType: "testPaper", createdAt: item.createdAt });
        }
      });

      (assignmentsRes.assignments || []).forEach(item => {
        if (item.status === "published") {
          feed.push({ ...item, feedType: "assignment", createdAt: item.createdAt });
        }
      });

      (codingRoundsRes.assessments || []).forEach(item => {
        if (item.status === "published") {
          feed.push({ ...item, feedType: "codingRound", createdAt: item.createdAt });
        }
      });

      feed.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setFeedItems(feed);
    } catch (error) {
      console.error("Error fetching classwork feed:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getFeedItemConfig = (feedType) => {
    switch (feedType) {
      case "note":
        return {
          icon: FileText,
          iconColor: "text-emerald-600 dark:text-emerald-400",
          bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
          borderColor: "hover:border-emerald-200 dark:hover:border-emerald-800/40",
          label: "Note",
          badgeColor: "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300",
          route: "notes",
        };
      case "quiz":
        return {
          icon: ClipboardCheck,
          iconColor: "text-purple-600 dark:text-purple-400",
          bgColor: "bg-purple-50 dark:bg-purple-950/30",
          borderColor: "hover:border-purple-200 dark:hover:border-purple-800/40",
          label: "Assessment",
          badgeColor: "bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300",
          route: "quizzes",
        };
      case "testPaper":
        return {
          icon: FileQuestion,
          iconColor: "text-blue-600 dark:text-blue-400",
          bgColor: "bg-blue-50 dark:bg-blue-950/30",
          borderColor: "hover:border-blue-200 dark:hover:border-blue-800/40",
          label: "Test Paper",
          badgeColor: "bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300",
          route: "test-papers",
        };
      case "assignment":
        return {
          icon: PenLine,
          iconColor: "text-orange-600 dark:text-orange-400",
          bgColor: "bg-orange-50 dark:bg-orange-950/30",
          borderColor: "hover:border-orange-200 dark:hover:border-orange-800/40",
          label: "Assignment",
          badgeColor: "bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300",
          route: "assignments",
        };
      case "codingRound":
        return {
          icon: Code2,
          iconColor: "text-cyan-600 dark:text-cyan-400",
          bgColor: "bg-cyan-50 dark:bg-cyan-950/30",
          borderColor: "hover:border-cyan-200 dark:hover:border-cyan-800/40",
          label: "Coding Round",
          badgeColor: "bg-cyan-100 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300",
          route: "coding-round",
        };
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <Loader className="w-7 h-7 text-violet-600 animate-spin mx-auto mb-3" />
          <p className="text-ink-soft text-sm font-medium">Loading classwork...</p>
        </div>
      </div>
    );
  }

  if (feedItems.length === 0) {
    return (
      <div className="text-center py-16 bg-surface rounded-xl border border-line">
        <div className="w-14 h-14 bg-violet-50 dark:bg-violet-950/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <BookOpen className="w-7 h-7 text-violet-500" />
        </div>
        <h3 className="text-base font-semibold text-ink mb-1">No classwork yet</h3>
        <p className="text-sm text-ink-soft max-w-sm mx-auto">
          Use the Create button above to add notes, assessments, test papers, assignments, or coding rounds.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {feedItems.map((item) => {
        const config = getFeedItemConfig(item.feedType);
        if (!config) return null;

        const Icon = config.icon;
        const displayTitle = item.title || item.topic || item.name || "Untitled";

        return (
          <motion.div
            key={`${item.feedType}-${item._id}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => navigate(`/class/${classId}/classwork/${config.route}`)}
            className={`group flex items-center gap-4 bg-surface rounded-xl border border-line p-4 sm:p-5 ${config.borderColor} shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer`}
          >
            <div className={`w-11 h-11 rounded-xl ${config.bgColor} flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform`}>
              <Icon className={`w-[22px] h-[22px] ${config.iconColor}`} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5 mb-0.5">
                <p className="text-ink font-semibold text-[15px] truncate">
                  {displayTitle}
                </p>
                <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[11px] font-bold ${config.badgeColor}`}>
                  {config.label}
                </span>
              </div>
              <p className="text-ink-soft text-[13px]">
                {formatDate(item.createdAt)}
              </p>
            </div>

            <ArrowRight className="w-4 h-4 text-ink-soft/0 group-hover:text-violet-500 dark:group-hover:text-violet-400 transition-all flex-shrink-0" />
          </motion.div>
        );
      })}
    </div>
  );
};

export default ClassworkPage;
