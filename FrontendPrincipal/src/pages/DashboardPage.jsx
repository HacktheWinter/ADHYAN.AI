import {
  Activity,
  BookOpen,
  FileStack,
  GraduationCap,
  LayoutPanelTop,
  NotepadText,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getDashboard } from "../api/principalApi";
import ActivityTimeline from "../components/activity/ActivityTimeline";
import EmptyState from "../components/common/EmptyState";
import LoadingPanel from "../components/common/LoadingPanel";
import PageHeader from "../components/common/PageHeader";
import SectionCard from "../components/common/SectionCard";
import StatCard from "../components/dashboard/StatCard";

const statCardConfig = [
  { key: "totalTeachers", label: "Teachers", icon: GraduationCap, tone: "bg-purple-100 text-purple-700" },
  { key: "totalStudents", label: "Students", icon: BookOpen, tone: "bg-violet-100 text-violet-700" },
  { key: "totalClasses", label: "Classes", icon: LayoutPanelTop, tone: "bg-fuchsia-100 text-fuchsia-700" },
  { key: "activeLiveClasses", label: "Live Now", icon: Activity, tone: "bg-rose-100 text-rose-700" },
  { key: "notesUploaded", label: "Notes", icon: NotepadText, tone: "bg-indigo-100 text-indigo-700" },
  { key: "assignmentsPublished", label: "Assignments", icon: FileStack, tone: "bg-violet-100 text-violet-700" },
];

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await getDashboard();
        setData(response);
      } catch (error) {
        console.error("Failed to load dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  if (loading) {
    return <LoadingPanel label="Loading principal dashboard..." />;
  }

  if (!data) {
    return (
      <EmptyState
        title="Dashboard unavailable"
        description="The principal analytics summary could not be loaded."
      />
    );
  }

  const recentActivity = data.recentActivity?.slice(0, 5) ?? [];
  const topTeachers = data.topTeachers?.slice(0, 5) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Institution snapshot"
        title="Inspection overview"
        description="A read-only summary of teacher activity, class operations, and academic publishing across the platform."
      />

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {statCardConfig.map((card, index) => (
          <StatCard
            key={card.key}
            label={card.label}
            value={data.summary?.[card.key] ?? 0}
            icon={card.icon}
            tone={card.tone}
            delay={index * 0.05}
          />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <SectionCard
          title="Recent activity"
          description="The latest 5 teacher-side actions captured for inspection."
          action={
            <Link
              to="/activity"
              className="rounded-full border border-purple-200 bg-purple-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-purple-700 transition hover:bg-purple-100"
            >
              View all
            </Link>
          }
        >
          {recentActivity.length ? (
            <ActivityTimeline activities={recentActivity} />
          ) : (
            <EmptyState
              title="No activity recorded"
              description="New teaching activity will appear here after teachers start using classes."
            />
          )}
        </SectionCard>

        <SectionCard
          title="Top teachers"
          description="Top 5 teachers ordered by recent academic output and session activity."
          action={
            <Link
              to="/teachers"
              className="rounded-full border border-purple-200 bg-purple-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-purple-700 transition hover:bg-purple-100"
            >
              View all
            </Link>
          }
        >
          <div className="space-y-3">
            {topTeachers.map((teacher) => (
              <div
                key={teacher._id}
                className="rounded-2xl border border-purple-100 bg-purple-50/50 px-4 py-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-gray-900">{teacher.name}</p>
                    <p className="mt-1 text-sm text-gray-500">{teacher.email}</p>
                  </div>
                  <div className="text-right text-sm text-gray-500">
                    <p>{teacher.classCount} classes</p>
                    <p>{teacher.sessionCount} sessions</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium text-gray-700">
                  <span className="rounded-full bg-purple-100 px-3 py-1 text-purple-700">
                    {teacher.noteCount} notes
                  </span>
                  <span className="rounded-full bg-violet-100 px-3 py-1 text-violet-700">
                    {teacher.assignmentCount} assignments
                  </span>
                  <span className="rounded-full bg-fuchsia-100 px-3 py-1 text-fuchsia-700">
                    {teacher.quizCount} quizzes
                  </span>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
