import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getClassDetail } from "../api/principalApi";
import ActivityTimeline from "../components/activity/ActivityTimeline";
import EmptyState from "../components/common/EmptyState";
import LoadingPanel from "../components/common/LoadingPanel";
import PageHeader from "../components/common/PageHeader";
import SectionCard from "../components/common/SectionCard";

export default function ClassDetailPage() {
  const { classId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClassDetail = async () => {
      try {
        const response = await getClassDetail(classId);
        setData(response);
      } catch (error) {
        console.error("Failed to load class detail:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchClassDetail();
  }, [classId]);

  if (loading) {
    return <LoadingPanel label="Loading class inspection detail..." />;
  }

  if (!data?.classroom) {
    return (
      <EmptyState
        title="Class not found"
        description="The requested class inspection record could not be loaded."
      />
    );
  }

  const classroom = data.classroom;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Class inspection"
        title={classroom.subject || classroom.name}
        description={`${classroom.classCode} • ${classroom.studentCount} students • ${classroom.teacher?.name || "Unassigned teacher"}`}
        action={
          <Link
            to="/classes"
            className="rounded-full border border-slate-200 bg-white px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-700"
          >
            Back to classes
          </Link>
        }
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <SectionCard title="Operations" description="Published classroom workload.">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl bg-slate-50 px-4 py-4">
              <p className="text-slate-500">Notes</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{classroom.noteCount}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-4">
              <p className="text-slate-500">Assignments</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{classroom.assignmentCount}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-4">
              <p className="text-slate-500">Quizzes</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{classroom.quizCount}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-4">
              <p className="text-slate-500">Test papers</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{classroom.testPaperCount}</p>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Performance" description="Participation and result trends.">
          <div className="space-y-3 text-sm text-slate-700">
            <div className="rounded-2xl bg-slate-50 px-4 py-4">
              Attendance rate: <span className="font-semibold">{classroom.attendancePercentage}%</span>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-4">
              Assignment submissions: <span className="font-semibold">{classroom.assignmentSubmissionRate}%</span>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-4">
              Quiz participation: <span className="font-semibold">{classroom.quizParticipationRate}%</span>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-4">
              Test participation: <span className="font-semibold">{classroom.testParticipationRate}%</span>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Teacher" description="Class ownership and live state.">
          <div className="rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">{classroom.teacher?.name || "Unassigned"}</p>
            <p className="mt-1 text-slate-500">{classroom.teacher?.email || "No email"}</p>
            <p className="mt-4">
              Live now: <span className="font-semibold">{classroom.activeLive ? "Yes" : "No"}</span>
            </p>
            <p className="mt-2">
              Total sessions: <span className="font-semibold">{classroom.sessionCount}</span>
            </p>
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <SectionCard title="Students" description="Current enrolled students in this class.">
          {classroom.students?.length ? (
            <div className="space-y-3">
              {classroom.students.map((student) => (
                <div
                  key={student._id}
                  className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3"
                >
                  <p className="font-semibold text-slate-900">{student.name}</p>
                  <p className="mt-1 text-sm text-slate-500">{student.email}</p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No students enrolled"
              description="This class currently has no active student roster."
            />
          )}
        </SectionCard>

        <SectionCard title="Recent activity" description="Inspection event timeline for this class.">
          {data.recentActivity?.length ? (
            <ActivityTimeline activities={data.recentActivity} />
          ) : (
            <EmptyState
              title="No class activity"
              description="Class-level actions will appear here once teachers operate this class."
            />
          )}
        </SectionCard>
      </div>
    </div>
  );
}
