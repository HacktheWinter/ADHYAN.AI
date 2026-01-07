import React, { useState, useEffect, useRef } from "react";
import API from "../api/axios";
import { Video } from "lucide-react";
import { motion } from "framer-motion";

export default function LiveMeeting({ classId, role }) {
  const [isLive, setIsLive] = useState(false);
  const [user, setUser] = useState(null);
  const jitsiContainerRef = useRef(null);
  const jitsiApiRef = useRef(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await API.get(`/classroom/${classId}`);
      if (res.data?.success || res.data?.classroom) {
        setIsLive(res.data.classroom?.isLive || false);
      }
    } catch (err) {
      console.error("Error fetching class status:", err);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000); // Poll every 5s
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
          script.src =
            "https://8x8.vc/vpaas-magic-cookie-fcddaa8e4b2d44a2bf26f73b628c218d/external_api.js";
          script.async = true;
          script.onload = resolve;
          document.head.appendChild(script);
        });
      };

      loadJitsiScript().then(() => {
        if (jitsiContainerRef.current && !jitsiApiRef.current) {
          jitsiApiRef.current = new window.JitsiMeetExternalAPI("8x8.vc", {
            roomName: `vpaas-magic-cookie-fcddaa8e4b2d44a2bf26f73b628c218d/class-${classId}`,
            parentNode: jitsiContainerRef.current,
            userInfo: {
              displayName: user.name || "Student",
              email: user.email || "",
            },
            configOverwrite: {
              startWithAudioMuted: true,
              startWithVideoMuted: true,
            },
            interfaceConfigOverwrite: {
              // Custom UI for students if needed
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

  return (
    <div className="bg-white/50 backdrop-blur-sm rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
      <div className="p-4 sm:p-6 border-b border-slate-100 bg-white/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 rounded-xl text-indigo-600">
            <Video size={20} />
          </div>
          <h2 className="font-bold text-slate-800 text-lg">Class Stream</h2>
        </div>
        {isLive && (
          <div className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-1.5 rounded-full animate-pulse border border-red-100">
            <span className="w-2 h-2 bg-red-600 rounded-full"></span>
            <span className="text-xs font-black uppercase tracking-wider">
              Live Now
            </span>
          </div>
        )}
      </div>

      <div className="p-2 sm:p-4">
        <div
          ref={jitsiContainerRef}
          style={{ height: "65vh" }}
          className={`w-full rounded-2xl border overflow-hidden transition-all duration-500 ${
            !isLive
              ? "bg-slate-50 flex flex-col items-center justify-center border-dashed border-slate-300"
              : "bg-black shadow-inner shadow-black/20"
          }`}
        >
          {!isLive && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center p-8 max-w-sm"
            >
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm mx-auto mb-6">
                <Video className="text-slate-300" size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900">
                Waiting for Teacher
              </h3>
              <p className="mt-2 text-sm text-slate-500 leading-relaxed font-medium">
                The session hasn't started yet.
              </p>
              <div className="mt-8 relative">
                <div className="absolute inset-0 bg-indigo-400 blur-xl opacity-20 rounded-full animate-pulse"></div>
                <div className="relative animate-spin rounded-full h-10 w-10 border-[3px] border-indigo-100 border-t-indigo-600 mx-auto"></div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
