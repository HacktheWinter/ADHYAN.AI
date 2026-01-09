import React, { useState, useEffect, useRef } from "react";
import api from "../api/axios";
import { Video, Play, Square, Loader2, Signal } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getStoredUser } from "../utils/authStorage";

const LiveMeeting = ({ classId }) => {
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const jitsiContainerRef = useRef(null);
  const jitsiApiRef = useRef(null);

  useEffect(() => {
    const storedUser = getStoredUser();
    if (storedUser) {
      setUser(storedUser);
    }
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await api.get(`/classroom/${classId}`);
      if (res.data.success) {
        setIsLive(res.data.classroom.isLive);
      }
    } catch (err) {
      console.error("Error fetching class status:", err);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, [classId]);

  useEffect(() => {
    if (isLive && user) {
      const loadJitsiScript = () => {
        return new Promise((resolve) => {
          if (window.JitsiMeetExternalAPI) {
            resolve();
            return;
          }
          const script = document.createElement("script");
          script.src = "https://meet.jit.si/external_api.js";
          script.async = true;
          script.onload = resolve;
          document.head.appendChild(script);
        });
      };

      loadJitsiScript().then(() => {
        if (jitsiContainerRef.current && !jitsiApiRef.current) {
          jitsiApiRef.current = new window.JitsiMeetExternalAPI("meet.jit.si", {
            roomName: `AdhyanAI-Class-${classId}`,
            parentNode: jitsiContainerRef.current,
            userInfo: {
              displayName: user.name || "Teacher",
              email: user.email || "",
            },
            configOverwrite: {
              startWithAudioMuted: false,
              startWithVideoMuted: false,
            },
            interfaceConfigOverwrite: {
              // Add any specific UI customizations here
            },
          });
        }
      });
    }

    return () => {
      if (jitsiApiRef.current) {
        jitsiApiRef.current.dispose();
        jitsiApiRef.current = null;
      }
    };
  }, [isLive, user, classId]);

  const handleStart = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await api.put(`/classroom/${classId}/meeting/start`, {
        teacherId: user._id || user.id,
      });
      setIsLive(true);
    } catch (err) {
      console.error("Failed to start meeting", err);
      alert("Failed to start meeting");
    } finally {
      setLoading(false);
    }
  };

  const handleEnd = async () => {
    if (!user) return;
    if (!window.confirm("Are you sure you want to end the class?")) return;
    setLoading(true);
    try {
      if (jitsiApiRef.current) {
        jitsiApiRef.current.dispose();
        jitsiApiRef.current = null;
      }
      await api.put(`/classroom/${classId}/meeting/end`, {
        teacherId: user._id || user.id,
      });
      setIsLive(false);
    } catch (err) {
      console.error("Failed to end meeting", err);
      alert("Failed to end meeting");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white/60 backdrop-blur-md rounded-[2.5rem] border border-white/40 shadow-2xl shadow-slate-200/40 overflow-hidden transition-all duration-700">
      <div className="p-6 sm:p-8 border-b border-white/40 bg-white/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl text-white shadow-lg shadow-indigo-200">
            <Video size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">
              Broadcast Control
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              {isLive ? (
                <div className="flex items-center gap-1.5 bg-red-50 text-red-600 px-3 py-1 rounded-full border border-red-100/50">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    On Air
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 bg-slate-100 text-slate-500 px-3 py-1 rounded-full border border-slate-200/50">
                  <span className="w-2 h-2 bg-slate-400 rounded-full"></span>
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    Offline
                  </span>
                </div>
              )}
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                • Class ID: {classId.slice(-6)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {!isLive ? (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleStart}
              disabled={loading}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-8 py-3.5 rounded-2xl font-bold shadow-xl shadow-emerald-200/50 transition-all hover:shadow-emerald-300/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <Play fill="currentColor" size={20} />
              )}
              <span>{loading ? "Initializing..." : "Start Broadcast"}</span>
            </motion.button>
          ) : (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleEnd}
              disabled={loading}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-gradient-to-r from-rose-500 to-pink-600 text-white px-8 py-3.5 rounded-2xl font-bold shadow-xl shadow-rose-200/50 transition-all hover:shadow-rose-300/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <Square fill="currentColor" size={20} />
              )}
              <span>{loading ? "Stopping..." : "End Session"}</span>
            </motion.button>
          )}
        </div>
      </div>

      <div className="p-4 sm:p-6 bg-slate-50/30">
        <div
          ref={jitsiContainerRef}
          style={{ height: isLive ? "70vh" : "45vh" }}
          className={`w-full rounded-[2rem] border-2 transition-all duration-700 relative overflow-hidden ${
            !isLive
              ? "bg-white/40 border-dashed border-slate-200 flex flex-col items-center justify-center group"
              : "bg-black border-slate-900 shadow-2xl shadow-black/40"
          }`}
        >
          <AnimatePresence mode="wait">
            {!isLive && (
              <motion.div
                key="offline"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.1 }}
                className="text-center p-8 max-w-sm"
              >
                <div className="relative mb-8">
                  <div className="absolute inset-0 bg-indigo-200 blur-3xl opacity-30 rounded-full group-hover:opacity-50 transition-opacity"></div>
                  <div className="relative w-24 h-24 bg-white rounded-3xl flex items-center justify-center shadow-2xl shadow-indigo-100 mx-auto transform rotate-3 group-hover:rotate-0 transition-transform duration-500">
                    <Signal
                      className="text-indigo-600 animate-pulse"
                      size={40}
                    />
                  </div>
                </div>
                <h3 className="text-2xl font-black text-slate-800 leading-tight">
                  Ready to lead?
                </h3>
                <p className="mt-3 text-slate-500 font-medium leading-relaxed">
                  Your classroom platform is primed and ready.
                </p>
                <div className="mt-8 flex justify-center gap-2">
                  <div
                    className="w-1.5 h-1.5 rounded-full bg-indigo-200 animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  ></div>
                  <div
                    className="w-1.5 h-1.5 rounded-full bg-indigo-300 animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  ></div>
                  <div
                    className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  ></div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="px-8 py-4 bg-white/20 border-t border-white/40 flex items-center justify-center gap-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
        <span className="flex items-center gap-2">
          <div className="w-1 h-1 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50"></div>{" "}
          Encrypted Stream
        </span>
        <span className="flex items-center gap-2">
          <div className="w-1 h-1 rounded-full bg-indigo-400 shadow-sm shadow-indigo-400/50"></div>{" "}
          Global CDN
        </span>
        <span className="flex items-center gap-2">
          <div className="w-1 h-1 rounded-full bg-purple-400 shadow-sm shadow-purple-400/50"></div>{" "}
          Auto-Recording
        </span>
      </div>
    </div>
  );
};

export default LiveMeeting;
