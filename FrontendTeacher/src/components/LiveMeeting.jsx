import React, { useState, useEffect, useRef } from "react";
import api from "../api/axios";

const LiveMeeting = ({ classId }) => {
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(false);
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
          script.src = "https://8x8.vc/vpaas-magic-cookie-fcddaa8e4b2d44a2bf26f73b628c218d/external_api.js";
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
              displayName: user.name || "Teacher",
              email: user.email || ""
            },
            configOverwrite: {
              startWithAudioMuted: false,
              startWithVideoMuted: false,
            },
            interfaceConfigOverwrite: {
              // Add any specific UI customizations here
            }
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
      await api.put(`/classroom/${classId}/meeting/start`, { teacherId: user._id || user.id });
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
      await api.put(`/classroom/${classId}/meeting/end`, { teacherId: user._id || user.id });
      setIsLive(false);
    } catch (err) {
      console.error("Failed to end meeting", err);
      alert("Failed to end meeting");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded shadow p-4">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-2">
          <h2 className="text-xl font-bold">Live Classroom</h2>
          {isLive && (
            <span className="flex items-center text-xs font-semibold bg-red-100 text-red-600 px-2.5 py-0.5 rounded-full animate-pulse">
              <span className="w-2 h-2 bg-red-600 rounded-full mr-1"></span>
              LIVE
            </span>
          )}
        </div>
        <div className="space-x-2">
          {!isLive ? (
            <button
              onClick={handleStart}
              disabled={loading}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "Starting..." : "Start Live Class"}
            </button>
          ) : (
            <button
              onClick={handleEnd}
              disabled={loading}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "Ending..." : "End Live Class"}
            </button>
          )}
        </div>
      </div>

      <div
        ref={jitsiContainerRef}
        style={{ height: isLive ? "70vh" : "40vh" }}
        className={`w-full rounded border overflow-hidden ${!isLive ? 'bg-gray-50 flex flex-col items-center justify-center border-dashed border-gray-300' : 'bg-black'}`}
      >
        {!isLive && (
          <>
            <p className="text-gray-500 text-lg">Class is currently offline.</p>
            <p className="text-gray-400 text-sm mt-2">Click "Start Live Class" to begin session with Jitsi.</p>
          </>
        )}
      </div>
    </div>
  );
};

export default LiveMeeting;
