import React, { useState, useEffect, useRef } from "react";
import API from "../api/axios";
import { Video, Clock, Wifi } from "lucide-react";

import { getStoredUser } from "../utils/authStorage";

export default function LiveMeeting({ classId, role }) {
  const [isLive, setIsLive] = useState(false);
  const [user, setUser] = useState(null);
  const jitsiContainerRef = useRef(null);
  const jitsiApiRef = useRef(null);

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  const fetchStatus = async () => {
    try {
      console.log('[Student LiveMeeting] Fetching status for class:', classId);
      const res = await API.get(`/classroom/${classId}`);
      console.log('[Student LiveMeeting] Full response:', res.data);

      if (res.data?.success || res.data?.classroom) {
        const backendIsLive = res.data.classroom?.isLive || false;
        console.log('[Student LiveMeeting] Backend isLive status:', backendIsLive);
        console.log('[Student LiveMeeting] Current local isLive:', isLive);

        if (backendIsLive !== isLive) {
          console.log('[Student LiveMeeting] Status changed! Updating to:', backendIsLive);
        }

        setIsLive(backendIsLive);
      } else {
        console.warn('[Student LiveMeeting] Unexpected response format:', res.data);
      }
    } catch (err) {
      console.error('[Student LiveMeeting] Error fetching class status:', err);
      console.error('[Student LiveMeeting] Error details:', err.response?.data);
    }
  };

  useEffect(() => {
    console.log('[Student LiveMeeting] Component mounted, starting polling...');
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => {
      console.log('[Student LiveMeeting] Component unmounting, stopping polling');
      clearInterval(interval);
    };
  }, [classId]);

  useEffect(() => {
    if (isLive && user && !jitsiApiRef.current) {
      console.log('[Student LiveMeeting] Initializing Jitsi...');
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
          console.log('[Student LiveMeeting] Creating Jitsi instance');
          jitsiApiRef.current = new window.JitsiMeetExternalAPI("8x8.vc", {
            roomName: `vpaas-magic-cookie-fcddaa8e4b2d44a2bf26f73b628c218d/adhyan-class-${classId}`,
            parentNode: jitsiContainerRef.current,
            userInfo: {
              displayName: user.name || "Student",
              email: user.email || "",
            },
            configOverwrite: {
              startWithAudioMuted: true,
              startWithVideoMuted: true,
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
            console.log('[Student LiveMeeting] Student joined conference');
          });

          jitsiApiRef.current.addEventListener('videoConferenceLeft', () => {
            console.log('[Student LiveMeeting] Student left conference');
          });
        }
      });
    } else if (!isLive && jitsiApiRef.current) {
      console.log('[Student LiveMeeting] Disposing Jitsi instance');
      jitsiApiRef.current.dispose();
      jitsiApiRef.current = null;
    }
  }, [isLive, user, classId]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-indigo-50 to-purple-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white rounded-lg text-indigo-600 shadow-sm">
            <Video size={20} />
          </div>
          <h2 className="font-semibold text-slate-800">Live Class</h2>
        </div>
        {isLive && (
          <div className="flex items-center gap-2 bg-red-500 text-white px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
            <span className="text-xs font-semibold">LIVE</span>
          </div>
        )}
      </div>

      <div className="p-4">
        <div
          ref={jitsiContainerRef}
          style={{ height: "65vh" }}
          className={`w-full rounded-xl border overflow-hidden ${
            !isLive
              ? "bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center border-slate-200"
              : "bg-black"
          }`}
        >
          {!isLive && (
            <div className="text-center p-8 max-w-md">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-md mx-auto mb-5 border border-slate-200">
                <Clock className="text-slate-400" size={28} />
              </div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">
                Class Not Started Yet
              </h3>
              <p className="text-sm text-slate-500 mb-6">
                Your teacher will start the session shortly. Please wait here.
              </p>
              
              <div className="inline-flex items-center gap-2 bg-white px-4 py-2.5 rounded-lg shadow-sm border border-slate-200">
                <Wifi className="text-indigo-600" size={16} />
                <span className="text-xs font-medium text-slate-600">
                  Checking for updates...
                </span>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-200">
                <p className="text-xs text-slate-400 mb-3">While you wait</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <p className="text-xs font-medium text-slate-700">Make sure</p>
                    <p className="text-xs text-slate-500 mt-1">Camera & mic ready</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <p className="text-xs font-medium text-slate-700">Stable</p>
                    <p className="text-xs text-slate-500 mt-1">Internet connection</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}