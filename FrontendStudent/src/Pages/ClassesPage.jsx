import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import LiveVideoUpload from "../components/LiveVideoUpload";
import LiveMeeting from "../components/LiveMeeting";

export default function ClassesPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const [activeTab, setActiveTab] = useState("live");

  return (
    <div className="min-h-screen bg-gray-100">
      {/* ===== HEADER ===== */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Live Classroom</h1>
            <p className="text-sm text-gray-500">
              Attend live class & access recorded lectures
            </p>
          </div>

          <button
            onClick={() => navigate(-1)}
            className="text-sm font-medium text-purple-600 hover:underline"
          >
            ← Exit Classroom
          </button>
        </div>
      </div>

      {/* ===== TABS ===== */}
      <div className="max-w-7xl mx-auto px-4 mt-6">
        <div className="bg-white rounded-xl shadow-sm border flex overflow-hidden">
          <button
            onClick={() => setActiveTab("live")}
            className={`flex-1 py-3 text-sm font-semibold transition ${
              activeTab === "live"
                ? "bg-purple-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            🎥 Live Class
          </button>

          <button
            onClick={() => setActiveTab("recorded")}
            className={`flex-1 py-3 text-sm font-semibold transition ${
              activeTab === "recorded"
                ? "bg-purple-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            📚 Recorded Lectures
          </button>
        </div>
      </div>

      {/* ===== CONTENT ===== */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {activeTab === "live" && (
          <div className="animate-fadeIn">
            <LiveMeeting classId={id} role={user.role} />
          </div>
        )}

        {activeTab === "recorded" && (
          <div className="animate-fadeIn">
            <LiveVideoUpload classId={id} role={user.role} />
          </div>
        )}
      </div>
    </div>
  );
}
