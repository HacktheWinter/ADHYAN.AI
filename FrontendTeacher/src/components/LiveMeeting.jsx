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
    <div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
      {/* Header - Keep existing design */}
      <div className="p-6 border-b border-gray-200 bg-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl text-white shadow-md">
            <Video size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Broadcast Control
            </h2>
            <div className="flex items-center gap-2 mt-1">
              {isLive ? (
                <div className="flex items-center gap-1.5 bg-red-50 text-red-600 px-3 py-1 rounded-full border border-red-100">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider">
                    On Air
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 bg-gray-100 text-gray-500 px-3 py-1 rounded-full border border-gray-200">
                  <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Offline
                  </span>
                </div>
              )}
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                • Class ID: {classId.slice(-6)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {!isLive ? (
            <button
              onClick={handleStart}
              disabled={loading}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-gradient-to-r from-red-500 to-rose-600 text-white px-6 py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
      <div className="p-6 bg-gray-50">
        <div
          ref={jitsiContainerRef}
          style={{ height: isLive ? "70vh" : "50vh" }}
          className={`w-full rounded-xl transition-all ${
            !isLive
              ? "bg-white border-2 border-dashed border-gray-300 flex flex-col items-center justify-center"
              : "bg-black border border-gray-900"
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
                className="text-center p-8"
              >
                <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Signal className="text-indigo-600" size={40} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Ready to lead?
                </h3>
                <p className="text-gray-600 max-w-md">
                  Your classroom platform is primed and ready.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 bg-white border-t border-gray-200">
        <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-gray-500 font-semibold uppercase tracking-wider">
          <span className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            Encrypted Stream
          </span>
          <span className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
            Global CDN
          </span>
          <span className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-purple-500"></div>
            Auto-Recording
          </span>
        </div>
      </div>
    </div>
  );
};

export default LiveMeeting;