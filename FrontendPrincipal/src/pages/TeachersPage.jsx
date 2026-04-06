import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { getTeachers } from "../api/principalApi";
import LoadingPanel from "../components/common/LoadingPanel";
import EmptyState from "../components/common/EmptyState";
import PageHeader from "../components/common/PageHeader";
import SectionCard from "../components/common/SectionCard";

export default function TeachersPage() {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        const response = await getTeachers();
        setTeachers(response.teachers || []);
      } catch (error) {
        console.error("Failed to load teachers:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTeachers();
  }, []);

  const filteredTeachers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return teachers;
    return teachers.filter((teacher) =>
      [teacher.name, teacher.email]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query))
    );
  }, [search, teachers]);

  if (loading) {
    return <LoadingPanel label="Loading teachers inspection table..." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Faculty inspection"
        title="Teachers"
        description="Review classroom load, session counts, published material, and last visible activity for each teacher."
        action={
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name or email"
            className="rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-transparent focus:ring-2 focus:ring-purple-500"
          />
        }
      />

      <SectionCard
        title="Teacher performance table"
        description="Read-only operational summary for principal-level oversight."
      >
        {filteredTeachers.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead>
                <tr className="border-b border-gray-200 text-xs uppercase tracking-[0.24em] text-gray-400">
                  <th className="px-4 py-3">Teacher</th>
                  <th className="px-4 py-3">Classes</th>
                  <th className="px-4 py-3">Students</th>
                  <th className="px-4 py-3">Sessions</th>
                  <th className="px-4 py-3">Content</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredTeachers.map((teacher) => (
                  <tr
                    key={teacher._id}
                    className="border-b border-gray-100 text-sm text-gray-700 transition hover:bg-purple-50/40"
                  >
                    <td className="px-4 py-4">
                      <p className="font-semibold text-gray-900">{teacher.name}</p>
                      <p className="mt-1 text-xs text-gray-500">{teacher.email}</p>
                    </td>
                    <td className="px-4 py-4">{teacher.classCount}</td>
                    <td className="px-4 py-4">{teacher.studentCount}</td>
                    <td className="px-4 py-4">{teacher.sessionCount}</td>
                    <td className="px-4 py-4">
                      {teacher.noteCount} notes / {teacher.assignmentCount} assignments
                    </td>
                    <td className="px-4 py-4">
                      <Link
                        to={`/teachers/${teacher._id}`}
                        className="rounded-full bg-gradient-to-r from-purple-600 to-purple-700 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white shadow-md transition hover:from-purple-700 hover:to-purple-800"
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
            title="No teachers found"
            description="Adjust the search query or wait for teacher accounts to appear."
          />
        )}
      </SectionCard>
    </div>
  );
}
