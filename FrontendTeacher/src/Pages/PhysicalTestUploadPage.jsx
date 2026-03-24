import React, { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, X, FileText, Loader, Sparkles, User, BookOpen, AlertCircle } from "lucide-react";
import { uploadWithQuestionCard } from "../api/physicalTestApi";

const PhysicalTestUploadPage = () => {
  const { classId } = useParams();
  const navigate = useNavigate();

  // Form fields
  const [testTitle, setTestTitle] = useState("");
  const [totalMarks, setTotalMarks] = useState("");

  // Question card
  const [questionCard, setQuestionCard] = useState(null);
  const qcInputRef = useRef(null);

  // Student papers
  const [studentFiles, setStudentFiles] = useState([]);
  const papersInputRef = useRef(null);

  // Status
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  // ── Question card handlers ───────────────────────────────────────────────
  const handleQCSelect = (e) => {
    const file = e.target.files[0];
    if (file) setQuestionCard(file);
  };

  const handleQCDrop = (e) => {
    e.preventDefault();
    const file = Array.from(e.dataTransfer.files).find(f => f.type === "application/pdf");
    if (file) setQuestionCard(file);
  };

  // ── Student paper handlers ───────────────────────────────────────────────
  const handlePapersSelect = (e) => {
    const selected = Array.from(e.target.files);
    const newFiles = selected.map(file => ({
      file,
      studentName: file.name.replace(/\.pdf$/i, ""),
      id: Math.random().toString(36).substr(2, 9),
    }));
    setStudentFiles(prev => [...prev, ...newFiles]);
  };

  const handlePapersDrop = (e) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files).filter(f => f.type === "application/pdf");
    const newFiles = dropped.map(file => ({
      file,
      studentName: file.name.replace(/\.pdf$/i, ""),
      id: Math.random().toString(36).substr(2, 9),
    }));
    setStudentFiles(prev => [...prev, ...newFiles]);
  };

  const handleNameChange = (id, value) => {
    setStudentFiles(prev => prev.map(f => f.id === id ? { ...f, studentName: value } : f));
  };

  const handleRemove = (id) => {
    setStudentFiles(prev => prev.filter(f => f.id !== id));
  };

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setError("");
    if (!testTitle.trim()) return setError("Please enter a test title.");
    if (!totalMarks || isNaN(totalMarks) || Number(totalMarks) <= 0) return setError("Please enter valid total marks.");
    if (!questionCard) return setError("Please upload the question card PDF.");
    if (studentFiles.length === 0) return setError("Please upload at least one student answer PDF.");
    const emptyNames = studentFiles.filter(f => !f.studentName.trim());
    if (emptyNames.length > 0) return setError("Please enter student names for all files.");

    setUploading(true);
    try {
      const studentMappings = studentFiles.map(f => ({
        fileName: f.file.name,
        studentName: f.studentName.trim(),
        studentId: null,
      }));
      const rawFiles = studentFiles.map(f => f.file);
      await uploadWithQuestionCard(
        classId, testTitle.trim(), totalMarks, questionCard, rawFiles, studentMappings
      );
      navigate(`/class/${classId}/test-papers/physical-results`);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">

        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate(`/class/${classId}/test-papers`)}
            className="flex items-center gap-2 text-purple-600 hover:text-purple-700 mb-4 cursor-pointer font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Test Papers
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Upload Physical Papers</h1>
          <p className="text-gray-500 text-sm mt-1">
            Upload the question card and student answer PDFs. AI will extract questions from the card and automatically mark each student's answers.
          </p>
        </div>



        {/* Error */}
        {error && (
          <div className="mb-5 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {/* Step 1 — Test Info */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm mb-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-6 h-6 bg-purple-600 text-white rounded-full text-xs flex items-center justify-center font-bold">1</span>
            Test Details
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Test Title <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={testTitle}
                onChange={e => setTestTitle(e.target.value)}
                placeholder="e.g. Mid-Term Exam — Science"
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Marks <span className="text-red-500">*</span></label>
              <input
                type="number"
                value={totalMarks}
                onChange={e => setTotalMarks(e.target.value)}
                placeholder="e.g. 100"
                min="1"
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Step 2 — Question Card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm mb-5">
          <h2 className="text-base font-semibold text-gray-900 mb-1 flex items-center gap-2">
            <span className="w-6 h-6 bg-purple-600 text-white rounded-full text-xs flex items-center justify-center font-bold">2</span>
            Upload Question Card
          </h2>
          <p className="text-xs text-gray-500 mb-4 ml-8">PDF of the printed question paper — AI will extract questions and answer guidelines from this</p>

          {questionCard ? (
            <div className="flex items-center gap-3 p-4 bg-purple-50 border border-purple-200 rounded-xl">
              <BookOpen className="w-8 h-8 text-purple-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{questionCard.name}</p>
                <p className="text-xs text-gray-500">{(questionCard.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              <button
                onClick={() => { setQuestionCard(null); if (qcInputRef.current) qcInputRef.current.value = ""; }}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div
              onDrop={handleQCDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => qcInputRef.current?.click()}
              className="border-2 border-dashed border-purple-300 rounded-xl p-8 text-center cursor-pointer hover:border-purple-500 hover:bg-purple-50 transition-all"
            >
              <BookOpen className="w-10 h-10 text-purple-400 mx-auto mb-2" />
              <p className="text-gray-700 font-medium text-sm">Drop question card PDF here or click to browse</p>
              <input ref={qcInputRef} type="file" accept="application/pdf" onChange={handleQCSelect} className="hidden" />
            </div>
          )}
        </div>

        {/* Step 3 — Student Papers */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm mb-5">
          <h2 className="text-base font-semibold text-gray-900 mb-1 flex items-center gap-2">
            <span className="w-6 h-6 bg-purple-600 text-white rounded-full text-xs flex items-center justify-center font-bold">3</span>
            Upload Student Answer Sheets
          </h2>
          <p className="text-xs text-gray-500 mb-4 ml-8">One PDF per student — max 10 MB each</p>

          <div
            onDrop={handlePapersDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => papersInputRef.current?.click()}
            className="border-2 border-dashed border-indigo-300 rounded-xl p-6 text-center cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 transition-all"
          >
            <Upload className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
            <p className="text-gray-700 font-medium text-sm">Drop student PDFs here or click to browse</p>
            <p className="text-gray-400 text-xs mt-1">Multiple files allowed</p>
            <input ref={papersInputRef} type="file" accept="application/pdf" multiple onChange={handlePapersSelect} className="hidden" />
          </div>

          {studentFiles.length > 0 && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">{studentFiles.length} file(s) selected</span>
                <button onClick={() => setStudentFiles([])} className="text-xs text-red-500 hover:text-red-700 cursor-pointer">Clear all</button>
              </div>
              {studentFiles.map(f => (
                <div key={f.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <FileText className="w-7 h-7 text-indigo-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500 truncate mb-1">{f.file.name} ({(f.file.size / 1024 / 1024).toFixed(1)} MB)</p>
                    <div className="flex items-center gap-2">
                      <User className="w-3 h-3 text-gray-400 flex-shrink-0" />
                      <input
                        type="text"
                        value={f.studentName}
                        onChange={e => handleNameChange(f.id, e.target.value)}
                        placeholder="Student name..."
                        className="flex-1 text-sm border border-gray-300 rounded-lg px-2 py-1 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                      />
                    </div>
                  </div>
                  <button onClick={() => handleRemove(f.id)} className="p-1 hover:bg-gray-200 rounded-lg cursor-pointer flex-shrink-0">
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={uploading}
          className="w-full flex items-center justify-center gap-3 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-2xl hover:from-purple-700 hover:to-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-lg cursor-pointer text-base"
        >
          {uploading ? (
            <>
              <Loader className="w-5 h-5 animate-spin" />
              Uploading & AI Checking Papers… This may take a few minutes
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Upload & Check with AI
            </>
          )}
        </button>

        {uploading && (
          <p className="text-center text-sm text-gray-500 mt-3">
            AI is reading the question card and checking student answers. Please don't close this page.
          </p>
        )}

      </div>
    </div>
  );
};

export default PhysicalTestUploadPage;
