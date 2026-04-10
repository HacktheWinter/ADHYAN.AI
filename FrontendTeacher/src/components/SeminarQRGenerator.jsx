import React, { useState, useEffect, useCallback } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Users,
  QrCode,
  StopCircle,
  Play,
  Clock,
  CheckCircle,
  MapPin,
  RefreshCcw,
  Loader2,
} from "lucide-react";
import api from "../api/axios";

const SeminarQRGenerator = ({ onClose }) => {
  const [step, setStep] = useState("form"); // form | active | ended
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sessionId, setSessionId] = useState(null);
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [attendeeCount, setAttendeeCount] = useState(0);
  const [refreshCountdown, setRefreshCountdown] = useState(10);
  const [starting, setStarting] = useState(false);
  const [teacherLocation, setTeacherLocation] = useState({
    lat: null,
    lng: null,
  });
  const [locationStatus, setLocationStatus] = useState("detecting"); // detecting | success | failed

  // Detect teacher location on mount
  const detectLocation = async () => {
    setLocationStatus("detecting");
    try {
      if (!("geolocation" in navigator)) {
        setLocationStatus("failed");
        return;
      }
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        });
      });
      setTeacherLocation({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });
      setLocationStatus("success");
    } catch (err) {
      console.warn("Teacher geolocation failed:", err);
      setTeacherLocation({ lat: null, lng: null });
      setLocationStatus("failed");
    }
  };

  // Check if teacher already has an active session on mount
  useEffect(() => {
    detectLocation();

    const checkActive = async () => {
      try {
        const res = await api.get("/seminar/active");
        if (res.data?.success && res.data?.session) {
          const s = res.data.session;
          setSessionId(s._id);
          setTitle(s.title);
          setDescription(s.description || "");
          setAttendeeCount(s.attendeeCount || s.attendees?.length || 0);
          setStep("active");
        }
      } catch {
        // No active session — stay on form
      }
    };
    checkActive();
  }, []);

  // Fetch fresh token every 5s while active
  const fetchToken = useCallback(async () => {
    if (!sessionId) return;
    try {
      const res = await api.get(`/seminar/token/${sessionId}`);
      if (res.data?.token) {
        setToken(res.data.token);
        setAttendeeCount(res.data.attendeeCount || 0);
        setError("");
      }
    } catch (err) {
      setError("Failed to refresh QR token");
    }
  }, [sessionId]);

  useEffect(() => {
    if (step !== "active" || !sessionId) return;

    // Initial fetch
    fetchToken();
    setRefreshCountdown(10);

    const tokenInterval = setInterval(() => {
      fetchToken();
      setRefreshCountdown(10);
    }, 10000);

    const countdownInterval = setInterval(() => {
      setRefreshCountdown((p) => (p <= 1 ? 10 : p - 1));
    }, 1000);

    return () => {
      clearInterval(tokenInterval);
      clearInterval(countdownInterval);
    };
  }, [step, sessionId, fetchToken]);

  const handleStart = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Please enter a seminar title");
      return;
    }

    setStarting(true);
    setError("");

    try {
      const res = await api.post("/seminar/start", {
        title: title.trim(),
        description: description.trim(),
        latitude: teacherLocation.lat,
        longitude: teacherLocation.lng,
      });

      if (res.data?.success && res.data?.session) {
        setSessionId(res.data.session._id);
        setStep("active");
      } else {
        setError(res.data?.error || "Failed to start session");
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to start seminar session");
    } finally {
      setStarting(false);
    }
  };

  const handleStop = async () => {
    if (!sessionId) return;

    setLoading(true);
    try {
      await api.post(`/seminar/stop/${sessionId}`);
      setStep("ended");
      setToken("");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to stop session");
    } finally {
      setLoading(false);
    }
  };

  // Build QR value: minimal JSON payload for faster scanning
  const qrValue = token
    ? JSON.stringify({ type: "seminar", sessionId, token })
    : "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md relative overflow-hidden"
      >
        <div className="p-6 sm:p-8">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 sm:top-5 sm:right-5 text-gray-400 hover:text-gray-800 p-2 bg-gray-50 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>

          {/* ──────── FORM STEP ──────── */}
          {step === "form" && (
            <div>
              <div className="text-center mb-6">
                <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center mx-auto mb-3">
                  <QrCode className="w-7 h-7 text-indigo-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800">
                  Generate Seminar QR
                </h2>
                <p className="text-gray-500 text-sm mt-1">
                  Create a QR code for event/seminar attendance
                </p>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleStart} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Seminar Title *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. AI & ML Workshop 2026"
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition"
                    maxLength={200}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Description (optional)
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of the event..."
                    rows={3}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition resize-none"
                    maxLength={500}
                  />
                </div>

                {/* Location Status */}
                <div
                  className={`flex items-center justify-between p-3 rounded-xl border ${
                    locationStatus === "success"
                      ? "bg-green-50 border-green-200"
                      : locationStatus === "failed"
                        ? "bg-amber-50 border-amber-200"
                        : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <MapPin
                      className={`w-4 h-4 ${
                        locationStatus === "success"
                          ? "text-green-600"
                          : locationStatus === "failed"
                            ? "text-amber-600"
                            : "text-gray-400"
                      }`}
                    />
                    <span
                      className={`text-sm font-medium ${
                        locationStatus === "success"
                          ? "text-green-700"
                          : locationStatus === "failed"
                            ? "text-amber-700"
                            : "text-gray-500"
                      }`}
                    >
                      {locationStatus === "detecting" &&
                        "Detecting your location..."}
                      {locationStatus === "success" &&
                        `Location captured (${teacherLocation.lat?.toFixed(4)}, ${teacherLocation.lng?.toFixed(4)})`}
                      {locationStatus === "failed" &&
                        "Location not available — geofencing will be disabled"}
                    </span>
                  </div>
                  {locationStatus === "detecting" && (
                    <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                  )}
                  {locationStatus === "failed" && (
                    <button
                      type="button"
                      onClick={detectLocation}
                      className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
                    >
                      <RefreshCcw className="w-3.5 h-3.5" />
                      Retry
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={starting || !title.trim()}
                  className="w-full py-3.5 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {starting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Play className="w-5 h-5" />
                  )}
                  {starting ? "Starting..." : "Start Seminar Session"}
                </button>
              </form>
            </div>
          )}

          {/* ──────── ACTIVE QR STEP ──────── */}
          {step === "active" && (
            <div className="text-center">
              <h2 className="text-xl font-bold text-gray-800 mb-1">{title}</h2>
              <p className="text-gray-500 text-sm mb-6">
                Ask students to scan this QR code
              </p>

              {error && (
                <div className="mb-4 p-2 bg-red-50 border border-red-200 rounded-lg text-red-600 text-xs">
                  {error}
                </div>
              )}

              {/* QR Display — large, high‑contrast, high error correction */}
              <div className="flex justify-center items-center mb-5 min-h-[340px] bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden relative p-4 shadow-inner">
                {!token ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin h-10 w-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full" />
                    <span className="text-sm font-medium text-indigo-600">
                      Generating QR...
                    </span>
                  </div>
                ) : (
                  <div className="bg-white p-5 rounded-xl shadow-md border border-gray-100 transition-transform hover:scale-105 duration-300">
                    <QRCodeCanvas
                      value={qrValue}
                      size={280}
                      level="H"
                      includeMargin={true}
                      marginSize={5}
                      fgColor="#000000"
                      bgColor="#ffffff"
                    />
                  </div>
                )}
              </div>

              {/* Countdown & attendees */}
              <div className="flex items-center justify-center gap-4 mb-6">
                <div className="flex items-center gap-1.5 text-sm text-indigo-700 font-bold bg-indigo-50 border border-indigo-100 py-2 px-4 rounded-full shadow-sm">
                  <Clock className="w-4 h-4" />
                  Refreshes in {refreshCountdown}s
                </div>
                <div className="flex items-center gap-1.5 text-sm text-green-700 font-bold bg-green-50 border border-green-100 py-2 px-4 rounded-full shadow-sm">
                  <Users className="w-4 h-4" />
                  {attendeeCount} scanned
                </div>
              </div>

              {/* Stop button */}
              <button
                onClick={handleStop}
                disabled={loading}
                className="w-full py-3.5 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 transition-all shadow-lg shadow-red-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <StopCircle className="w-5 h-5" />
                )}
                {loading ? "Stopping..." : "End Seminar Session"}
              </button>
            </div>
          )}

          {/* ──────── ENDED STEP ──────── */}
          {step === "ended" && (
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4 border-4 border-green-200">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-extrabold text-gray-800 mb-2">
                Session Ended!
              </h3>
              <p className="text-gray-500 text-sm mb-2">
                "{title}" — Seminar attendance recorded
              </p>
              <div className="bg-green-50 text-green-700 border border-green-100 px-6 py-3 rounded-xl inline-flex items-center gap-2 text-lg font-bold mb-6">
                <Users className="w-5 h-5" />
                {attendeeCount} students attended
              </div>
              <br />
              <button
                onClick={onClose}
                className="px-8 py-3 bg-gray-800 text-white rounded-xl font-medium hover:bg-gray-700 transition cursor-pointer"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default SeminarQRGenerator;
