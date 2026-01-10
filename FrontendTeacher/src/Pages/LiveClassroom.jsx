import React, { useState } from "react";
import { useNavigate, useParams, useOutletContext } from "react-router-dom";
import { Video, Upload, ArrowLeft } from "lucide-react";
import LiveVideoUpload from "../components/LiveVideoUpload";
import LiveMeeting from "../components/LiveMeeting";

const LiveClassroom = () => {
  const { classId } = useParams();
  const navigate = useNavigate();
  const { classData, currentUser } = useOutletContext();

  const [activeTab, setActiveTab] = useState("videos");

  return (
    <div className="min-h-screen bg-gray-100">
      {/* ================= NAVBAR ================= */}
      <header className="sticky top-0 z-50 bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Back */}
          <button
            onClick={() => navigate(`/class/${classId}`)}
            className="flex items-center gap-2 text-gray-600 hover:text-purple-600 transition font-medium"
          >
            <ArrowLeft size={18} />
            <span className="hidden sm:inline">
              {classData?.subject || "Back"}
            </span>
          </button>

          {/* Title */}
          <div className="text-center">
            <h1 className="text-base sm:text-lg font-semibold text-gray-900">
              Live Classroom
            </h1>
            <p className="text-xs text-gray-500">{classData?.subject}</p>
          </div>

          {/* Right Spacer */}
          <div className="w-8" />
        </div>
      </header>

      {/* ================= CONTENT ================= */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* ---------- TAB SWITCHER ---------- */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex bg-gray-200 rounded-full p-1 shadow-inner">
            <button
              onClick={() => setActiveTab("videos")}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold transition
                ${
                  activeTab === "videos"
                    ? "bg-white text-purple-600 shadow"
                    : "text-gray-600 hover:text-gray-900"
                }`}
            >
              <Upload size={16} />
              Live Videos
            </button>

            <button
              onClick={() => setActiveTab("meeting")}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold transition
                ${
                  activeTab === "meeting"
                    ? "bg-white text-purple-600 shadow"
                    : "text-gray-600 hover:text-gray-900"
                }`}
            >
              <Video size={16} />
              Live Meeting
            </button>
          </div>
        </div>

        {/* ---------- TAB CONTENT ---------- */}
        <section className="bg-white rounded-2xl shadow-sm p-6 md:p-8">
          {activeTab === "videos" && (
            <div className="animate-fadeIn">
              <LiveVideoUpload classId={classId} role={currentUser?.role} />
            </div>
          )}

          {activeTab === "meeting" && (
            <div className="animate-fadeIn">
              <LiveMeeting classId={classId} role={currentUser?.role} />
            </div>
          )}
        </section>
      </main>

      {/* Animation */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.25s ease-out;
        }
      `}</style>
    </div>
  );
};

export default LiveClassroom;