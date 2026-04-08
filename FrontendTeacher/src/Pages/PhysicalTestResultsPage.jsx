import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, FileText, Loader, Trash2, CheckCircle, Clock, User } from "lucide-react";
import { getPhysicalSubmissionsByClass, deletePhysicalSubmission, getPhysicalSubmissionPDFUrl } from "../api/physicalTestApi";

const PhysicalTestResultsPage = () => {
  const { classId } = useParams();
  const navigate = useNavigate();

  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);

  // Group filter
  const [selectedTitle, setSelectedTitle] = useState("all");

  useEffect(() => {
    fetchSubmissions();
  }, [classId]);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const data = await getPhysicalSubmissionsByClass(classId);
      setSubmissions(data.submissions || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (submissionId) => {
    if (!confirm("Delete this submission?")) return;
    setDeleting(submissionId);
    try {
      await deletePhysicalSubmission(submissionId);
      setSubmissions(prev => prev.filter(s => s._id !== submissionId));
    } catch {
      alert("Failed to delete");
    } finally {
      setDeleting(null);
    }
  };

  // Unique test titles for filtering
  const titles = ["all", ...Array.from(new Set(submissions.map(s => s.testTitle || "Untitled").filter(Boolean)))];

  const filtered = selectedTitle === "all"
    ? submissions
    : submissions.filter(s => (s.testTitle || "Untitled") === selectedTitle);

  const checkedSubs = filtered.filter(s => s.status === "checked");
  const avgScore = checkedSubs.length > 0
    ? (checkedSubs.reduce((sum, s) => sum + s.percentage, 0) / checkedSubs.length).toFixed(1)
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader className="w-10 h-10 text-purple-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">

        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate(`/class/${classId}/test-papers`)}
            className="flex items-center gap-2 text-purple-600 hover:text-purple-700 mb-4 cursor-pointer font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Test Papers
          </button>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Physical Paper Results</h1>
              <p className="text-gray-500 text-sm mt-0.5">{submissions.length} total submission(s) across all tests</p>
            </div>
            {/* Filter by test title */}
            {titles.length > 1 && (
              <select
                value={selectedTitle}
                onChange={e => setSelectedTitle(e.target.value)}
                className="border border-gray-300 rounded-xl px-4 py-2 text-sm text-gray-700 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none cursor-pointer"
              >
                {titles.map(t => (
                  <option key={t} value={t}>{t === "all" ? "All Tests" : t}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Stats */}
        {filtered.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {[
              { label: "Total", value: filtered.length, color: "purple" },
              { label: "Checked", value: checkedSubs.length, color: "green" },
              { label: "Pending", value: filtered.filter(s => s.status === "pending").length, color: "yellow" },
              { label: "Avg Score", value: `${avgScore}%`, color: "blue" },
            ].map(stat => (
              <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <div className={`text-2xl font-bold text-${stat.color}-600 mb-1`}>{stat.value}</div>
                <div className="text-xs text-gray-500">{stat.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Table or Empty */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-sm">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium text-lg">No submissions yet</p>
            <button
              onClick={() => navigate(`/class/${classId}/test-papers/upload-physical`)}
              className="mt-4 px-6 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition cursor-pointer"
            >
              Upload Papers
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Student</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Test</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Score</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">%</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map(sub => (
                    <tr key={sub._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                            <User className="w-4 h-4 text-purple-600" />
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900 text-sm">{sub.studentName}</div>
                            <div className="text-xs text-gray-400">
                              {new Date(sub.uploadedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-700 font-medium">{sub.testTitle || "—"}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                          sub.status === "checked" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                        }`}>
                          {sub.status === "checked" ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          {sub.status === "checked" ? "Checked" : "Pending"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {sub.status === "checked"
                          ? <span className="font-semibold text-gray-900 text-sm">{sub.marksObtained}/{sub.totalMarks}</span>
                          : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-6 py-4">
                        {sub.status === "checked"
                          ? <span className={`font-semibold text-sm ${sub.percentage >= 40 ? "text-green-600" : "text-red-500"}`}>{sub.percentage}%</span>
                          : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => navigate(`/class/${classId}/test-papers/physical-results/${sub._id}`)}
                            className="px-3 py-1.5 bg-purple-600 text-white text-xs font-medium rounded-lg hover:bg-purple-700 transition cursor-pointer"
                          >
                            View
                          </button>
                          <a
                            href={getPhysicalSubmissionPDFUrl(sub._id)}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition cursor-pointer"
                          >
                            PDF
                          </a>
                          <button
                            onClick={() => handleDelete(sub._id)}
                            disabled={deleting === sub._id}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition cursor-pointer disabled:opacity-50"
                          >
                            {deleting === sub._id ? <Loader className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PhysicalTestResultsPage;
