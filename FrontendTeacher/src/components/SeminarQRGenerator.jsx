import React, { useState, useEffect, useCallback } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Users, QrCode, StopCircle, Play, Clock, CheckCircle } from "lucide-react";
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

  // Check if teacher already has an active session on mount
  useEffect(() => {
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

  // Build QR value: compressed payload with short keys for minimal QR density
  // t=type, s=sessionId, k=token (key)
  const qrValue = token
    ? JSON.stringify({ t: "s", s: sessionId, k: token })
    : "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-surface border border-line rounded-3xl shadow-2xl w-full max-w-md relative overflow-hidden"
      >
        <div className="p-6 sm:p-8">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 sm:top-5 sm:right-5 text-ink-soft hover:text-ink p-2 bg-paper hover:bg-line rounded-full transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>

          {/* ──────── FORM STEP ──────── */}
          {step === "form" && (
            <div>
              <div className="text-center mb-6">
                <div className="w-14 h-14 rounded-full bg-[#F1ECFB] dark:bg-[#26163F] flex items-center justify-center mx-auto mb-3">
                  <QrCode className="w-7 h-7 text-purple-700 dark:text-[#A78BFA]" />
                </div>
                <h2 className="text-2xl font-bold text-ink">
                  Generate Seminar QR
                </h2>
                <p className="text-ink-soft text-sm mt-1">
                  Create a QR code for event/seminar attendance
                </p>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 text-rose-650 dark:text-rose-400 text-sm rounded-xl">
                  {error}
                </div>
              )}

              <form onSubmit={handleStart} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-ink-soft uppercase tracking-wider mb-1.5">
                    Seminar Title *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. AI & ML Workshop 2026"
                    className="w-full border border-line bg-paper rounded-xl px-4 py-3 text-sm text-ink focus:ring-2 focus:ring-purple-600 focus:border-transparent focus:outline-none transition"
                    maxLength={200}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink-soft uppercase tracking-wider mb-1.5">
                    Description (optional)
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of the event..."
                    rows={3}
                    className="w-full border border-line bg-paper rounded-xl px-4 py-3 text-sm text-ink focus:ring-2 focus:ring-purple-600 focus:border-transparent focus:outline-none transition resize-none"
                    maxLength={500}
                  />
                </div>

                <button
                  type="submit"
                  disabled={starting || !title.trim()}
                  className="w-full py-3.5 rounded-xl font-bold text-white bg-purple-700 hover:bg-purple-800 transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
              <h2 className="text-xl font-bold text-ink mb-1">
                {title}
              </h2>
              <p className="text-ink-soft text-sm mb-6">
                Ask students to scan this QR code
              </p>

              {error && (
                <div className="mb-4 p-2 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 text-xs rounded-xl">
                  {error}
                </div>
              )}

              {/* QR Display — large, high‑contrast, high error correction */}
              <div className="flex justify-center items-center mb-5 min-h-[340px] bg-paper rounded-2xl border border-line overflow-hidden relative p-4">
                {!token ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin h-10 w-10 border-4 border-purple-200 border-t-purple-700 rounded-full" />
                    <span className="text-sm font-semibold text-purple-700 dark:text-[#A78BFA]">
                      Generating QR...
                    </span>
                  </div>
                ) : (
                  <div className="qr-white-bg p-5 rounded-xl shadow-md border transition-transform hover:scale-105 duration-300">
                    <QRCodeCanvas
                      value={qrValue}
                      size={280}
                      level="L"
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
                <div className="flex items-center gap-1.5 text-xs sm:text-sm text-purple-700 dark:text-[#A78BFA] font-bold bg-[#F1ECFB] dark:bg-[#26163F] border border-line py-2 px-4 rounded-full shadow-sm">
                  <Clock className="w-4 h-4" />
                  Refreshes in {refreshCountdown}s
                </div>
                <div className="flex items-center gap-1.5 text-xs sm:text-sm text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 py-2 px-4 rounded-full shadow-sm">
                  <Users className="w-4 h-4" />
                  {attendeeCount} scanned
                </div>
              </div>

              {/* Stop button */}
              <button
                onClick={handleStop}
                disabled={loading}
                className="w-full py-3.5 rounded-xl font-bold text-white bg-rose-600 hover:bg-rose-700 transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
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
              <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/20 flex items-center justify-center mx-auto mb-4 border border-emerald-150 dark:border-emerald-900/50">
                <CheckCircle className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold text-ink mb-2">
                Session Ended!
              </h3>
              <p className="text-ink-soft text-sm mb-2">
                "{title}" — Seminar attendance recorded
              </p>
              <div className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30 px-6 py-3 rounded-xl inline-flex items-center gap-2 text-lg font-bold mb-6">
                <Users className="w-5 h-5" />
                {attendeeCount} students attended
              </div>
              <br />
              <button
                onClick={onClose}
                className="px-8 py-3 bg-purple-700 hover:bg-purple-800 text-white rounded-xl font-semibold transition cursor-pointer shadow-sm"
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
