import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getTeacherDetail } from "../api/principalApi";
import ActivityTimeline from "../components/activity/ActivityTimeline";
import EmptyState from "../components/common/EmptyState";
import LoadingPanel from "../components/common/LoadingPanel";
import PageHeader from "../components/common/PageHeader";
import SectionCard from "../components/common/SectionCard";

export default function TeacherDetailPage() {
  const { teacherId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTeacherDetail = async () => {
      try {
        const response = await getTeacherDetail(teacherId);
        setData(response);
      } catch (error) {
        console.error("Failed to load teacher detail:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTeacherDetail();
  }, [teacherId]);

  if (loading) {
    return <LoadingPanel label="Loading teacher inspection detail..." />;
  }

  if (!data?.teacher) {
    return (
      <EmptyState
        title="Teacher not found"
        description="The requested teacher inspection record could not be loaded."
      />
    );
  }

  const teacher = data.teacher;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Teacher inspection"
        title={teacher.name}
        description={`${teacher.email} | ${teacher.classCount} classes | ${teacher.sessionCount} sessions`}
        action={
          <Link
            to="/teachers"
            className="rounded-full border border-gray-200 bg-white px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-gray-700 transition hover:bg-purple-50 hover:text-purple-700"
          >
            Back to teachers
          </Link>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard
          title="Classroom footprint"
          description="Classes currently handled by this teacher."
        >
          <div className="space-y-3">
            {data.classes?.map((classroom) => (
              <Link
                key={classroom._id}
                to={`/classes/${classroom._id}`}
                className="block rounded-2xl border border-purple-100 bg-purple-50/50 px-4 py-4 transition hover:border-purple-300 hover:bg-white"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {classroom.subject || classroom.name}
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      {classroom.studentCount} students | {classroom.sessionCount} sessions
                    </p>
                  </div>
                  <div className="text-right text-xs uppercase tracking-[0.18em] text-purple-500">
                    {classroom.classCode}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Recent activity"
          description="Latest teacher actions visible to principal inspection."
        >
          {data.recentActivity?.length ? (
            <ActivityTimeline activities={data.recentActivity} />
          ) : (
            <EmptyState
              title="No activity captured"
              description="This teacher has no recent inspection events yet."
            />
          )}
        </SectionCard>
      </div>
    </div>
  );
}
