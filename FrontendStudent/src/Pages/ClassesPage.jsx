import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Video, BookOpen, Layout } from "lucide-react";
import LiveVideoUpload from "../components/LiveVideoUpload";
import LiveMeeting from "../components/LiveMeeting";

export default function ClassesPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const [activeTab, setActiveTab] = useState("live");

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans">
      {/* ===== PREMIUM STICKY HEADER ===== */}
      <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-slate-200/60 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            <div className="flex items-center gap-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate(-1)}
                className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors md:flex hidden cursor-pointer"
              >
                <ArrowLeft size={20} />
              </motion.button>
              <div>
                <div className="flex items-center gap-2">
                  <Layout className="text-indigo-600 w-5 h-5 sm:w-6 sm:h-6" />
                  <h1 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                    Virtual Classroom
                  </h1>
                </div>
                <p className="text-[10px] sm:text-xs font-medium text-slate-500 uppercase tracking-widest mt-0.5">
                  Adhyan AI • {id || "Active Session"}
                </p>
              </div>
            </div>

            <motion.button
              whileHover={{ x: -2 }}
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors cursor-pointer"
            >
              <span className="md:inline hidden">Exit Classroom</span>
              <ArrowLeft size={18} className="md:hidden" />
            </motion.button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        {/* ===== ANIMATED TAB SWITCHER ===== */}
        <div className="flex justify-center mb-8 sm:mb-12">
          <div className="inline-flex p-1.5 bg-slate-200/50 backdrop-blur-sm rounded-2xl border border-slate-200">
            {[
              { id: "live", label: "Live Class", icon: Video },
              { id: "recorded", label: "Recorded Lectures", icon: BookOpen },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-2 px-4 py-2.5 sm:px-8 sm:py-3.5 rounded-xl text-sm font-bold transition-all duration-300 cursor-pointer ${
                  activeTab === tab.id
                    ? "text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-xl shadow-lg shadow-indigo-200"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <tab.icon size={18} className="relative z-10" />
                <span className="relative z-10">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ===== CONTENT AREA WITH ANIMATIONS ===== */}
        <div className="relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="min-h-[60vh]"
            >
              {activeTab === "live" ? (
                <div className="glass-card overflow-hidden">
                  <LiveMeeting classId={id} role={user.role} />
                </div>
              ) : (
                <div className="glass-card overflow-hidden">
                  <LiveVideoUpload classId={id} role={user.role} />
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <style jsx>{`
        .glass-card {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(226, 232, 240, 0.8);
          border-radius: 1.5rem;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.04),
            0 8px 10px -6px rgba(0, 0, 0, 0.04);
        }
      `}</style>
    </div>
  );
}
