import React, { useState, useRef, useCallback } from "react";
import { X, CheckCircle, AlertCircle, Loader2, QrCode } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import API from "../api/axios";
import AttendanceScannerV2 from "./AttendanceScannerV2";

const SeminarQRScanner = ({ onClose }) => {
  // ── State ──────────────────────────────────────────────────────
  const [status, setStatus] = useState("idle"); // idle | processing | success | error
  const [message, setMessage] = useState("");
  const scanLockRef = useRef(false);

  // ── Handle Scan Result (seminar-specific validation + API) ─────
  const handleScan = useCallback(
    async (results) => {
      if (status !== "idle" || scanLockRef.current) return;
      const rawValue = results?.[0]?.rawValue?.trim();
      if (!rawValue) return;

      scanLockRef.current = true;
      setStatus("processing");

      try {
        let parsed;
        try {
          parsed = JSON.parse(rawValue);
        } catch {
          setStatus("error");
          setMessage("Invalid QR code. This is not a seminar QR code.");
          setTimeout(() => {
            setStatus("idle");
            scanLockRef.current = false;
          }, 3000);
          return;
        }

        if (parsed.type !== "seminar" || !parsed.sessionId || !parsed.token) {
          setStatus("error");
          setMessage("This QR code is not for seminar attendance.");
          setTimeout(() => {
            setStatus("idle");
            scanLockRef.current = false;
          }, 3000);
          return;
        }

        const res = await API.post(`/seminar/attend/${parsed.sessionId}`, {
          token: parsed.token,
        });

        if (res.data?.success) {
          setStatus("success");
          setMessage(res.data.message || "Attendance marked!");
          setTimeout(() => onClose(), 2500);
        } else {
          setStatus("error");
          setMessage(res.data?.error || "Failed to mark attendance");
          setTimeout(() => {
            setStatus("idle");
            scanLockRef.current = false;
          }, 3000);
        }
      } catch (err) {
        const errMsg = err.response?.data?.error || "Failed to mark attendance.";
        if (errMsg.toLowerCase().includes("already")) {
          setStatus("success");
          setMessage(errMsg);
          setTimeout(() => onClose(), 2500);
        } else {
          setStatus("error");
          setMessage(errMsg);
          setTimeout(() => {
            setStatus("idle");
            scanLockRef.current = false;
          }, 3000);
        }
      }
    },
    [status, onClose]
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-black/20 hover:bg-black/40 rounded-full text-white transition-colors cursor-pointer"
        >
          <X size={20} />
        </button>

        <div className="p-5 text-center">
          {/* Header */}
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
              <QrCode className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="text-left">
              <h2 className="text-lg font-bold text-gray-800 leading-tight">
                Scan Seminar QR
              </h2>
              <p className="text-xs text-gray-400">
                Point your camera at the seminar QR code
              </p>
            </div>
          </div>

          {/* Scanner Viewport — uses V2 engine */}
          <div className="relative">
            <AttendanceScannerV2
              onScan={handleScan}
              isActive={status === "idle"}
            />

            {/* Status Overlays */}
            <AnimatePresence>
              {status === "processing" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 bg-white/90 rounded-2xl flex flex-col items-center justify-center z-30"
                >
                  <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-2" />
                  <p className="font-semibold text-gray-700">Verifying...</p>
                </motion.div>
              )}

              {status === "success" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 bg-green-50/95 rounded-2xl flex flex-col items-center justify-center z-30"
                >
                  <CheckCircle className="w-16 h-16 text-green-500 mb-2" />
                  <p className="font-bold text-gray-800 text-lg">Present!</p>
                  <p className="text-green-600 text-sm px-4">{message}</p>
                </motion.div>
              )}

              {status === "error" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 bg-red-50/95 rounded-2xl flex flex-col items-center justify-center z-30"
                >
                  <AlertCircle className="w-16 h-16 text-red-500 mb-2" />
                  <p className="font-bold text-gray-800">Error</p>
                  <p className="text-red-600 text-sm px-4">{message}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default SeminarQRScanner;
