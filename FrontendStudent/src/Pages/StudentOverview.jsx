// FrontendStudent/src/Pages/StudentOverview.jsx
import React, { useState, useEffect } from "react";
import { useParams, useOutletContext, useNavigate } from "react-router-dom";
import {
  Loader,
  FileText,
  Target,
  Code2,
  ClipboardList,
  BookOpen,
  AlertCircle,
  Clock,
  Play
} from "lucide-react";
import { getAnnouncements } from "../api/announcementApi";
import { getActiveQuizzes } from "../api/quizApi";
import { getActiveAssignments } from "../api/assignmentApi";
import { getActiveTestPapers } from "../api/testApi";
import { getActiveCodingAssessments } from "../api/codingAssessmentApi";
import API_BASE_URL from "../config";
import axios from "axios";

function formatStreamDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const getItemStatus = (item) => {
  const now = new Date();
  if (item.type === "assessment") {
    if (item.endTime && now > new Date(item.endTime)) return { text: "Expired", color: "bg-red-50 text-red-600 border-red-100", icon: AlertCircle };
    if (item.startTime && now < new Date(item.startTime)) return { text: "Upcoming", color: "bg-blue-50 text-blue-600 border-blue-100", icon: Clock };
    if (item.quizStatus === "expired" && !item.endTime) return { text: "Expired", color: "bg-red-50 text-red-600 border-red-100", icon: AlertCircle };
    if (item.quizStatus === "upcoming" && !item.startTime) return { text: "Upcoming", color: "bg-blue-50 text-blue-600 border-blue-100", icon: Clock };
    return { text: "Active", color: "bg-purple-50 text-purple-700 border-purple-100", icon: Play };
  }
  if (item.type === "assignment") {
    if (!item.isActive) return { text: "Expired", color: "bg-red-50 text-red-600 border-red-100", icon: AlertCircle };
    if (item.dueDate && now > new Date(item.dueDate)) return { text: "Expired", color: "bg-red-50 text-red-600 border-red-100", icon: AlertCircle };
    return { text: "Active", color: "bg-purple-50 text-purple-700 border-purple-100", icon: Play };
  }
  if (item.type === "test") {
    if (!item.isActive) return { text: "Expired", color: "bg-red-50 text-red-600 border-red-100", icon: AlertCircle };
    if (item.startTime && now < new Date(item.startTime)) return { text: "Upcoming", color: "bg-blue-50 text-blue-600 border-blue-100", icon: Clock };
    return { text: "Active", color: "bg-purple-50 text-purple-700 border-purple-100", icon: Play };
  }
  if (item.type === "coding") {
    if (item.endTime && now > new Date(item.endTime)) return { text: "Expired", color: "bg-red-50 text-red-600 border-red-100", icon: AlertCircle };
    if (item.startTime && now < new Date(item.startTime)) return { text: "Upcoming", color: "bg-blue-50 text-blue-600 border-blue-100", icon: Clock };
    return { text: "Active", color: "bg-purple-50 text-purple-700 border-purple-100", icon: Play };
  }
  return null;
}

const CONTENT_CONFIG = {
  announcement: {
    icon: null, // We'll use the user's initial or profile photo
    color: "bg-indigo-600",
    path: "../announcement",
  },
  assessment: {
    icon: Target,
    color: "bg-amber-100 text-amber-600",
    path: "../classwork?tab=quiz",
  },
  assignment: {
    icon: ClipboardList,
    color: "bg-emerald-100 text-emerald-600",
    path: "../classwork?tab=assignment",
  },
  test: {
    icon: BookOpen,
    color: "bg-blue-100 text-blue-600",
    path: "../classwork?tab=test",
  },
  coding: {
    icon: Code2,
    color: "bg-violet-100 text-violet-600",
    path: "../classwork?tab=coding-round",
  },
  note: {
    icon: FileText,
    color: "bg-purple-100 text-purple-600",
    path: "../classwork?tab=notes",
  },
};

export default function StudentOverview() {
  const { id: classId } = useParams();
  const { classInfo } = useOutletContext();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [streamItems, setStreamItems] = useState([]);

  useEffect(() => {
    fetchStreamData();
  }, [classId]);

  const fetchStreamData = async () => {
    try {
      setLoading(true);

      const results = await Promise.allSettled([
        getAnnouncements(classId),
        getActiveQuizzes(classId),
        getActiveAssignments(classId),
        getActiveTestPapers(classId),
        getActiveCodingAssessments(classId),
      ]);

      const items = [];

      // Announcements
      const announcementsData =
        results[0].status === "fulfilled"
          ? results[0].value?.announcements || []
          : [];
      announcementsData.forEach((a) => {
        items.push({
          id: a._id,
          type: "announcement",
          title: a.message,
          authorName: a.teacherId?.name || "Teacher",
          date: a.createdAt,
        });
      });

      // Quizzes
      const quizzes =
        results[1].status === "fulfilled"
          ? results[1].value?.quizzes || []
          : [];
      quizzes.forEach((q) => {
        items.push({
          id: q._id,
          type: "assessment",
          title: q.title,
          authorName: q.teacherId?.name || "Teacher",
          date: q.createdAt || q.startTime,
          startTime: q.startTime,
          endTime: q.endTime,
          quizStatus: q.quizStatus,
        });
      });

      // Assignments
      const assignments =
        results[2].status === "fulfilled"
          ? results[2].value?.assignments || []
          : [];
      assignments.forEach((a) => {
        items.push({
          id: a._id,
          type: "assignment",
          title: a.title,
          authorName: a.teacherId?.name || "Teacher",
          date: a.createdAt,
          dueDate: a.dueDate,
          isActive: a.isActive,
        });
      });

      // Test Papers
      const tests =
        results[3].status === "fulfilled"
          ? results[3].value?.testPapers || []
          : [];
      tests.forEach((t) => {
        items.push({
          id: t._id,
          type: "test",
          title: t.title,
          authorName: t.teacherId?.name || "Teacher",
          date: t.createdAt || t.startTime,
          startTime: t.startTime,
          endTime: t.endTime,
          isActive: t.isActive,
        });
      });

      // Coding Rounds
      const coding =
        results[4].status === "fulfilled"
          ? results[4].value?.assessments || []
          : [];
      coding.forEach((c) => {
        items.push({
          id: c._id,
          type: "coding",
          title: c.title,
          authorName: c.teacherId?.name || "Teacher",
          date: c.createdAt || c.startTime,
          startTime: c.startTime,
          endTime: c.endTime,
        });
      });

      // Fetch notes via direct API call as they weren't in the Promise.all
      try {
        const notesRes = await axios.get(`${API_BASE_URL}/notes/classroom/${classId}`, {
           headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        if(notesRes.data?.notes) {
           notesRes.data.notes.forEach((n) => {
             items.push({
               id: n._id,
               type: "note",
               title: n.title,
               authorName: n.uploadedBy || "Teacher",
               date: n.createdAt,
             });
           });
        }
      } catch(e) {
         console.error("Failed to fetch notes for stream", e);
      }

      // Sort by date descending
      items.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
      setStreamItems(items);
    } catch (err) {
      console.error("Error fetching stream data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleItemClick = (item) => {
    if (item.type === "announcement") {
      navigate(`/course/${classId}/announcement`);
    } else {
      const config = CONTENT_CONFIG[item.type];
      if (config) {
        navigate(config.path);
      }
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto pb-10">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-xl p-5 flex items-start gap-4 animate-pulse">
            <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0" />
            <div className="flex-1 mt-0.5">
              <div className="flex items-center justify-between mb-2">
                <div className="h-4 bg-gray-200 rounded w-1/3" />
                <div className="h-3 bg-gray-200 rounded w-16" />
              </div>
              <div className="h-3 bg-gray-200 rounded w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (streamItems.length === 0) {
    return (
      <div className="text-center py-16 bg-white border border-gray-200 rounded-xl">
        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100">
          <FileText className="w-8 h-8 text-gray-300" />
        </div>
        <p className="text-gray-500 font-medium text-lg">
          This is where you'll see updates for this class.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-10">
      {streamItems.map((item) => {
        const config = CONTENT_CONFIG[item.type];
        
        // Render announcement specifically
        if (item.type === "announcement") {
          return (
            <div
              key={`${item.type}-${item.id}`}
              onClick={() => handleItemClick(item)}
              className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow cursor-pointer flex items-start gap-4"
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-lg flex-shrink-0 ${config.color}`}>
                {item.authorName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-gray-900 font-medium">
                    {item.authorName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatStreamDate(item.date)}
                  </p>
                </div>
                <p className="text-gray-700 text-sm line-clamp-3">
                  {item.title}
                </p>
              </div>
            </div>
          );
        }

        // Render academic content (notes, assessments, assignments, etc.)
        const Icon = config.icon;
        
        let displayType = item.type;
        if (item.type === "coding") displayType = "coding round";
        
        const statusBadge = getItemStatus(item);
        const StatusIcon = statusBadge?.icon;

        return (
          <div
            key={`${item.type}-${item.id}`}
            onClick={() => handleItemClick(item)}
            className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow cursor-pointer flex items-center gap-4"
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${config.color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className="text-gray-900 font-medium text-base leading-snug pr-4">
                  {item.authorName} posted a new {displayType}: {item.title}
                </p>
                {statusBadge && (
                  <span className={`flex-shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusBadge.color}`}>
                    <StatusIcon className="w-3.5 h-3.5" /> {statusBadge.text}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {formatStreamDate(item.date)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
