import {
  Activity,
  BookOpen,
  FileStack,
  GraduationCap,
  LayoutPanelTop,
  NotepadText,
} from "lucide-react";
import { useEffect, useState } from "react";
import { getDashboard } from "../api/principalApi";
import ActivityTimeline from "../components/activity/ActivityTimeline";
import EmptyState from "../components/common/EmptyState";
import LoadingPanel from "../components/common/LoadingPanel";
import PageHeader from "../components/common/PageHeader";
import SectionCard from "../components/common/SectionCard";
import StatCard from "../components/dashboard/StatCard";

const statCardConfig = [
  { key: "totalTeachers", label: "Teachers", icon: GraduationCap, tone: "bg-sky-100 text-sky-700" },
  { key: "totalStudents", label: "Students", icon: BookOpen, tone: "bg-emerald-100 text-emerald-700" },
  { key: "totalClasses", label: "Classes", icon: LayoutPanelTop, tone: "bg-amber-100 text-amber-700" },
  { key: "activeLiveClasses", label: "Live Now", icon: Activity, tone: "bg-rose-100 text-rose-700" },
  { key: "notesUploaded", label: "Notes", icon: NotepadText, tone: "bg-cyan-100 text-cyan-700" },
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
          description="Teacher-side actions captured for inspection."
        >
          {data.recentActivity?.length ? (
            <ActivityTimeline activities={data.recentActivity} />
          ) : (
            <EmptyState
              title="No activity recorded"
              description="New teaching activity will appear here after teachers start using classes."
            />
          )}
        </SectionCard>

        <SectionCard
          title="Top teachers"
          description="Ordered by recent academic output and session activity."
        >
          <div className="space-y-3">
            {data.topTeachers?.map((teacher) => (
              <div
                key={teacher._id}
                className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-slate-900">{teacher.name}</p>
                    <p className="mt-1 text-sm text-slate-500">{teacher.email}</p>
                  </div>
                  <div className="text-right text-sm text-slate-500">
                    <p>{teacher.classCount} classes</p>
                    <p>{teacher.sessionCount} sessions</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium text-slate-600">
                  <span className="rounded-full bg-sky-100 px-3 py-1">{teacher.noteCount} notes</span>
                  <span className="rounded-full bg-violet-100 px-3 py-1">
                    {teacher.assignmentCount} assignments
                  </span>
                  <span className="rounded-full bg-emerald-100 px-3 py-1">{teacher.quizCount} quizzes</span>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
