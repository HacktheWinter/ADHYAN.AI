import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader, Edit2, Save, X, Award, FileText, BookOpen, MessageSquare, PenLine } from "lucide-react";
import { getPhysicalSubmissionById, getPhysicalSubmissionPDFUrl, updatePhysicalMarksManually } from "../api/physicalTestApi";

const PhysicalTestStudentResult = () => {
  const { classId, submissionId } = useParams();
  const navigate = useNavigate();
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingMarks, setEditingMarks] = useState({});
  const [saving, setSaving] = useState(false);
  const [showPDF, setShowPDF] = useState(false);

  useEffect(() => { fetchSubmission(); }, [submissionId]);

  const fetchSubmission = async () => {
    try {
      const data = await getPhysicalSubmissionById(submissionId);
      setSubmission(data.submission);
    } catch (err) {
      console.error(err);
      navigate(`/class/${classId}/test-papers/physical-results`);
    } finally {
      setLoading(false);
    }
  };

  const saveMarks = async () => {
    setSaving(true);
    try {
      const updatedAnswers = submission.answers.map(ans => ({
        questionId: ans.questionId,
        marksAwarded: editingMarks[ans.questionId] !== undefined ? editingMarks[ans.questionId] : ans.marksAwarded,
        aiFeedback: ans.aiFeedback,
      }));
      await updatePhysicalMarksManually(submissionId, updatedAnswers);
      await fetchSubmission();
      setEditingMarks({});
    } catch {
      alert("Failed to save marks");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader className="w-10 h-10 text-purple-600 animate-spin" /></div>;
  if (!submission) return null;

  const totalEdited = Object.keys(editingMarks).length > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">

        {/* Back */}
        <button
          onClick={() => navigate(`/class/${classId}/test-papers/physical-results`)}
          className="flex items-center gap-2 text-purple-600 hover:text-purple-700 mb-4 cursor-pointer font-medium"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Results
        </button>

        {/* Student Header Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{submission.studentName}</h1>
              <p className="text-gray-500 text-sm mt-0.5">
                {submission.testTitle || submission.testPaperId?.title || "Physical Test"}
              </p>
              <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold ${
                submission.status === "checked" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
              }`}>
                {submission.status === "checked" ? "✅ Checked" : "⏳ Pending"}
              </span>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 text-3xl font-bold text-purple-700">
                <Award className="w-8 h-8" />
                {submission.marksObtained}/{submission.totalMarks}
              </div>
              <div className={`text-lg font-semibold mt-1 ${submission.percentage >= 40 ? "text-green-600" : "text-red-500"}`}>
                {submission.percentage}%
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 mt-4">
            <button
              onClick={() => setShowPDF(!showPDF)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition cursor-pointer text-sm font-medium"
            >
              <FileText className="w-4 h-4" />
              {showPDF ? "Hide PDF" : "View Student's PDF"}
            </button>
            <a
              href={getPhysicalSubmissionPDFUrl(submissionId)}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition cursor-pointer text-sm font-medium"
            >
              <FileText className="w-4 h-4" />
              Open in New Tab
            </a>
          </div>
        </div>

        {/* PDF Viewer */}
        {showPDF && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm mb-6 overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Student's Handwritten Paper</h3>
              <button onClick={() => setShowPDF(false)} className="p-1 hover:bg-gray-100 rounded cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <iframe
              src={`${getPhysicalSubmissionPDFUrl(submissionId)}#toolbar=0`}
              className="w-full h-[600px] border-0"
              title="Student Paper"
            />
          </div>
        )}

        {/* Save All Banner */}
        {totalEdited && (
          <div className="mb-4 flex items-center justify-between bg-yellow-50 border border-yellow-200 rounded-xl px-5 py-3">
            <p className="text-sm text-yellow-800 font-medium">You have unsaved mark changes</p>
            <button
              onClick={saveMarks}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 bg-yellow-500 text-white text-sm font-semibold rounded-lg hover:bg-yellow-600 disabled:opacity-50 cursor-pointer transition"
            >
              {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save All Changes
            </button>
          </div>
        )}

        {/* Q&A Cards */}
        <div className="space-y-5">
          {submission.answers.map((ans, idx) => {
            const maxMarks = ans.marks;
            const isEditing = editingMarks[ans.questionId] !== undefined;
            const pct = maxMarks > 0 ? (ans.marksAwarded / maxMarks) * 100 : 0;

            return (
              <div key={ans.questionId} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Question Header */}
                <div className="flex items-center gap-3 px-6 py-4 bg-gray-50 border-b border-gray-100">
                  <span className="w-8 h-8 bg-purple-600 text-white rounded-full text-sm font-bold flex items-center justify-center flex-shrink-0">
                    {idx + 1}
                  </span>
                  <p className="text-gray-800 text-sm font-medium flex-1">{ans.question || `Question ${idx + 1}`}</p>
                  <span className="text-xs text-gray-500 font-semibold flex-shrink-0">{maxMarks} mark{maxMarks !== 1 ? "s" : ""}</span>
                </div>

                <div className="px-6 py-5 space-y-4">
                  {/* Student's Answer Points */}
                  {ans.studentAnswerPoints ? (
                    <div className="flex items-start gap-3 p-4 bg-indigo-50 border border-indigo-200 rounded-xl">
                      <PenLine className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-indigo-700 uppercase tracking-wide mb-1">Student's Answer</p>
                        <p className="text-sm text-indigo-900 leading-relaxed whitespace-pre-line">{ans.studentAnswerPoints}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl">
                      <PenLine className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-gray-400 italic">Student's answer not available</p>
                    </div>
                  )}

                  {/* AI Feedback */}
                  {ans.aiFeedback ? (
                    <div className="flex items-start gap-3 p-4 bg-purple-50 border border-purple-200 rounded-xl">
                      <MessageSquare className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-purple-700 uppercase tracking-wide mb-1">AI Feedback</p>
                        <p className="text-sm text-purple-900 leading-relaxed">{ans.aiFeedback}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl">
                      <MessageSquare className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-gray-400 italic">No AI feedback available</p>
                    </div>
                  )}

                  {/* Marks + Progress Bar */}
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                        <span>Score</span>
                        <span>{ans.marksAwarded}/{maxMarks}</span>
                      </div>
                      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${pct >= 75 ? "bg-green-500" : pct >= 40 ? "bg-yellow-500" : "bg-red-400"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isEditing ? (
                        <>
                          <input
                            type="number"
                            min="0"
                            max={maxMarks}
                            value={editingMarks[ans.questionId]}
                            onChange={e => setEditingMarks(prev => ({
                              ...prev,
                              [ans.questionId]: Math.min(maxMarks, Math.max(0, parseFloat(e.target.value) || 0))
                            }))}
                            className="w-20 px-2 py-1.5 text-sm border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-500"
                          />
                          <button
                            onClick={() => { const e = { ...editingMarks }; delete e[ans.questionId]; setEditingMarks(e); }}
                            className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <span className={`text-xl font-bold ${pct >= 75 ? "text-green-600" : pct >= 40 ? "text-yellow-600" : "text-red-500"}`}>
                            {ans.marksAwarded}/{maxMarks}
                          </span>
                          <button
                            onClick={() => setEditingMarks(prev => ({ ...prev, [ans.questionId]: ans.marksAwarded }))}
                            className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg cursor-pointer"
                            title="Edit marks"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Checked by badge */}
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      ans.checkedBy === "ai" ? "bg-purple-100 text-purple-700" :
                      ans.checkedBy === "teacher" ? "bg-blue-100 text-blue-700" :
                      "bg-gray-100 text-gray-500"
                    }`}>
                      {ans.checkedBy === "ai" ? "✨ AI Checked" : ans.checkedBy === "teacher" ? "👨‍🏫 Teacher Checked" : "⏳ Pending"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
};

export default PhysicalTestStudentResult;
