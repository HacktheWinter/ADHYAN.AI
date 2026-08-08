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
    <div className="min-h-screen bg-paper text-ink">
      {/* ================= NAVBAR ================= */}
      <header className="sticky top-0 z-50 bg-surface/85 backdrop-blur-md border-b border-line">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          {/* Back */}
          <button
            onClick={() => navigate(`/class/${classId}`)}
            className="flex items-center gap-2 text-ink-soft hover:text-violet-700 transition font-medium cursor-pointer"
          >
            <ArrowLeft size={18} />
            <span className="hidden sm:inline">
              {classData?.subject || "Back"}
            </span>
          </button>

          {/* Title */}
          <div className="text-center">
            <h1 className="text-base sm:text-lg font-semibold text-ink truncate max-w-[200px] sm:max-w-xs mx-auto font-display">
              Live Classroom
            </h1>
            <p className="text-xs text-ink-soft truncate max-w-[200px] mx-auto">{classData?.subject}</p>
          </div>

          {/* Right Spacer (for balance) or small placeholder */}
          <div className="w-8" />
        </div>
      </header>

      {/* ================= CONTENT ================= */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* ---------- TAB SWITCHER ---------- */}
        <div className="flex justify-center mb-6 sm:mb-8">
          <div className="inline-flex bg-paper border border-line rounded-2xl p-1 w-full max-w-md sm:w-auto">
            <button
              onClick={() => setActiveTab("videos")}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer
                ${
                  activeTab === "videos"
                    ? "bg-surface text-violet-700 shadow-sm"
                    : "text-ink-soft hover:text-ink"
                }`}
            >
              <Upload size={16} />
              <span className="whitespace-nowrap">Live Videos</span>
            </button>

            <button
              onClick={() => setActiveTab("meeting")}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer
                ${
                  activeTab === "meeting"
                    ? "bg-surface text-violet-700 shadow-sm"
                    : "text-ink-soft hover:text-ink"
                }`}
            >
              <Video size={16} />
              <span className="whitespace-nowrap">Live Meeting</span>
            </button>
          </div>
        </div>

        {/* ---------- TAB CONTENT ---------- */}
        <section className="bg-surface border border-line rounded-2xl p-4 sm:p-6 md:p-8">
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