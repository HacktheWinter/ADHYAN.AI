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
  const isTeacherHostingRef = useRef(false);

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  const fetchStatus = async () => {
    if (isTeacherHostingRef.current) {
      console.log('[LiveMeeting] Skipping polling - teacher is hosting');
      return;
    }

    try {
      const res = await api.get(`/classroom/${classId}`);
      if (res.data.success) {
        const backendIsLive = res.data.classroom.isLive;
        console.log('[LiveMeeting] Fetched status:', backendIsLive);
        setIsLive(backendIsLive);
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
    if (isLive && user && !jitsiApiRef.current) {
      console.log('[LiveMeeting] Initializing Jitsi...');
      const loadJitsiScript = () => {
        return new Promise((resolve) => {
          if (window.JitsiMeetExternalAPI) {
            resolve();
            return;
          }
          const script = document.createElement("script");
          script.src = "https://8x8.vc/vpaas-magic-cookie-fcddaa8e4b2d44a2bf26f73b628c218d/external_api.js";
          script.async = true;
          script.onload = resolve;
          document.head.appendChild(script);
        });
      };

      loadJitsiScript().then(() => {
        if (jitsiContainerRef.current && !jitsiApiRef.current) {
          console.log('[LiveMeeting] Creating Jitsi instance');
          jitsiApiRef.current = new window.JitsiMeetExternalAPI("8x8.vc", {
            roomName: `vpaas-magic-cookie-fcddaa8e4b2d44a2bf26f73b628c218d/adhyan-class-${classId}`,
            parentNode: jitsiContainerRef.current,
            userInfo: {
              displayName: user.name || "Teacher",
              email: user.email || "",
            },
            configOverwrite: {
              startWithAudioMuted: false,
              startWithVideoMuted: false,
              prejoinPageEnabled: false,
              enableWelcomePage: false,
            },
            interfaceConfigOverwrite: {
              SHOW_JITSI_WATERMARK: false,
              SHOW_WATERMARK_FOR_GUESTS: false,
              DEFAULT_BACKGROUND: '#474747',
              DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
              SHOW_BRAND_WATERMARK: false,
            },
          });

          jitsiApiRef.current.addEventListener('videoConferenceJoined', () => {
            console.log('[LiveMeeting] Teacher joined conference');
            isTeacherHostingRef.current = true;
          });

          jitsiApiRef.current.addEventListener('videoConferenceLeft', () => {
            console.log('[LiveMeeting] Teacher left conference');
          });

          jitsiApiRef.current.addEventListener('readyToClose', () => {
            console.log('[LiveMeeting] Jitsi ready to close');
          });
        }
      });
    } else if (!isLive && jitsiApiRef.current) {
      console.log('[LiveMeeting] Disposing Jitsi instance');
      jitsiApiRef.current.dispose();
      jitsiApiRef.current = null;
      isTeacherHostingRef.current = false;
    }
  }, [isLive, user, classId]);

  const handleStart = async () => {
    const teacherId = user?._id || user?.id;
    if (!teacherId) {
      console.error("No teacher ID found in user session");
      alert("Unable to start meeting - please log in again");
      return;
    }
    setLoading(true);
    console.log('[LiveMeeting] Starting meeting...');
    try {
      const response = await api.put(`/classroom/${classId}/meeting/start`, {
        teacherId,
      });
      console.log('[LiveMeeting] Meeting started on backend:', response.data);
      isTeacherHostingRef.current = true;
      setIsLive(true);
    } catch (err) {
      console.error("Failed to start meeting", err);
      alert("Failed to start meeting");
    } finally {
      setLoading(false);
    }
  };

  const handleEnd = async () => {
    const teacherId = user?._id || user?.id;
    if (!teacherId) {
      console.error("No teacher ID found in user session");
      return;
    }
    setLoading(true);
    console.log('[LiveMeeting] Ending meeting...');
    try {
      const response = await api.put(`/classroom/${classId}/meeting/end`, {
        teacherId,
      });
      console.log('[LiveMeeting] Meeting ended on backend:', response.data);
      isTeacherHostingRef.current = false;
      setIsLive(false);
    } catch (err) {
      console.error("Failed to end meeting", err);
      alert("Failed to end meeting");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-surface rounded-2xl border border-line shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 sm:p-6 border-b border-line bg-surface flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
        <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
          <div className="p-2 sm:p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl text-white shadow-md">
            <Video size={20} className="sm:w-6 sm:h-6" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-ink">
              Broadcast Control
            </h2>
            <div className="flex flex-wrap justify-center sm:justify-start items-center gap-2 mt-1">
              {isLive ? (
                <div className="flex items-center gap-1.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 px-3 py-1 rounded-full border border-rose-500/20">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-650"></span>
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider">
                    On Air
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 bg-paper text-ink-soft px-3 py-1 rounded-full border border-line">
                  <span className="w-2 h-2 bg-ink-soft/60 rounded-full"></span>
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Offline
                  </span>
                </div>
              )}
              <span className="text-xs font-semibold text-ink-soft/40 uppercase tracking-wider">
                • Class ID: {classId.slice(-6)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto mt-2 sm:mt-0">
          {!isLive ? (
            <button
              onClick={handleStart}
              disabled={loading}
              className="w-full sm:w-auto flex flex-1 items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-emerald-500/10 hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <Play fill="currentColor" size={20} />
              )}
              <span>{loading ? "Initializing..." : "Start Broadcast"}</span>
            </button>
          ) : (
            <button
              onClick={handleEnd}
              disabled={loading}
              className="w-full sm:w-auto flex flex-1 items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-rose-500/10 hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <Square fill="currentColor" size={20} />
              )}
              <span>{loading ? "Stopping..." : "End Session"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Video Container */}
      <div className="p-4 sm:p-6 bg-paper/40">
        <div
          ref={jitsiContainerRef}
          style={{ height: isLive ? "60vh" : "40vh" }} // Slightly reduced for mobile
          className={`w-full rounded-xl transition-all ${
            !isLive
              ? "bg-surface border-2 border-dashed border-line flex flex-col items-center justify-center min-h-[300px]"
              : "bg-black border border-neutral-900 min-h-[400px]"
          }`}
        >
          <AnimatePresence mode="wait">
            {!isLive && (
              <motion.div
                key="offline"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="text-center p-6 sm:p-8"
              >
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-violet-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Signal className="text-violet-600 dark:text-violet-400" size={32} />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-ink mb-2 font-display">
                  Ready to lead?
                </h3>
                <p className="text-sm sm:text-base text-ink-soft max-w-sm mx-auto">
                  Your classroom platform is primed and ready.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 sm:px-6 py-3 sm:py-4 bg-surface border-t border-line">
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-[10px] sm:text-xs text-ink-soft font-semibold uppercase tracking-wider">
          <span className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-green-500"></div>
            Encrypted Stream
          </span>
          <span className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-indigo-500"></div>
            Global CDN
          </span>
          <span className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-purple-500"></div>
            Auto-Recording
          </span>
        </div>
      </div>
    </div>
  );
};

export default LiveMeeting;