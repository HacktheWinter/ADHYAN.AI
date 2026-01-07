import React, { useState, useEffect, useRef } from "react";
import API from "../api/axios";

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
              displayName: user.name || "Student",
              email: user.email || ""
            },
            configOverwrite: {
              startWithAudioMuted: true,
              startWithVideoMuted: true,
            },
            interfaceConfigOverwrite: {
              // Custom UI for students if needed
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

  return (
    <div className="bg-white rounded-xl shadow border p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-gray-800">Live Class</h2>
        {isLive && (
          <span className="text-xs bg-red-100 text-red-700 px-2.5 py-1 rounded-full animate-pulse flex items-center font-medium">
            <span className="w-1.5 h-1.5 bg-red-700 rounded-full mr-1.5"></span>
            LIVE
          </span>
        )}
      </div>

      <div
        ref={jitsiContainerRef}
        style={{ height: "70vh" }}
        className={`w-full rounded-lg border overflow-hidden ${!isLive ? 'bg-gray-50 flex flex-col items-center justify-center border-dashed border-gray-300' : 'bg-black'}`}
      >
        {!isLive && (
          <div className="text-center p-6">
            <h3 className="text-lg font-medium text-gray-900">Waiting for teacher...</h3>
            <p className="mt-1 text-sm text-gray-500">The live class hasn't started yet.</p>
            <div className="mt-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
