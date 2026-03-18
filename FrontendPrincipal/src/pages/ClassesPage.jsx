import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { getClasses } from "../api/principalApi";
import EmptyState from "../components/common/EmptyState";
import LoadingPanel from "../components/common/LoadingPanel";
import PageHeader from "../components/common/PageHeader";
import SectionCard from "../components/common/SectionCard";

export default function ClassesPage() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const response = await getClasses();
        setClasses(response.classes || []);
      } catch (error) {
        console.error("Failed to load classes:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchClasses();
  }, []);

  const filteredClasses = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return classes;
    return classes.filter((classroom) =>
      [classroom.name, classroom.subject, classroom.classCode, classroom.teacher?.name]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query))
    );
  }, [classes, search]);

  if (loading) {
    return <LoadingPanel label="Loading classes inspection table..." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Class oversight"
        title="Classes"
        description="Inspect class-level student counts, attendance, submissions, and teacher ownership."
        action={
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search class, code, or teacher"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-400"
          />
        }
      />

      <SectionCard title="Class inspection table" description="Academic operations by class.">
        {filteredClasses.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-[0.24em] text-slate-400">
                  <th className="px-4 py-3">Class</th>
                  <th className="px-4 py-3">Teacher</th>
                  <th className="px-4 py-3">Students</th>
                  <th className="px-4 py-3">Attendance</th>
                  <th className="px-4 py-3">Assignments</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredClasses.map((classroom) => (
                  <tr key={classroom._id} className="border-b border-slate-100 text-sm text-slate-700">
                    <td className="px-4 py-4">
                      <p className="font-semibold text-slate-900">
                        {classroom.subject || classroom.name}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">{classroom.classCode}</p>
                    </td>
                    <td className="px-4 py-4">{classroom.teacher?.name || "Unassigned"}</td>
                    <td className="px-4 py-4">{classroom.studentCount}</td>
                    <td className="px-4 py-4">{classroom.attendancePercentage}%</td>
                    <td className="px-4 py-4">{classroom.assignmentSubmissionRate}%</td>
                    <td className="px-4 py-4">
                      <Link
                        to={`/classes/${classroom._id}`}
                        className="rounded-full bg-slate-950 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white"
                      >
                        Inspect
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No classes found"
            description="No classes matched the current inspection filter."
          />
        )}
      </SectionCard>
    </div>
  );
}
