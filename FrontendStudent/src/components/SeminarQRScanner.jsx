import React, { useState, useRef, useEffect } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";
import { X, CheckCircle, AlertCircle, Loader2, QrCode } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import API from "../api/axios";

const SeminarQRScanner = ({ onClose }) => {
  const [status, setStatus] = useState("idle"); // idle | processing | success | error
  const [message, setMessage] = useState("");
  const scanLockRef = useRef(false);

  const handleScan = async (result) => {
    if (!result || !result[0] || status !== "idle" || scanLockRef.current)
      return;

    scanLockRef.current = true;
    setStatus("processing");

    try {
      const rawValue = result[0].rawValue;
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
        setTimeout(() => {
          onClose();
        }, 2500);
      } else {
        setStatus("error");
        setMessage(res.data?.error || "Failed to mark attendance");
        setTimeout(() => {
          setStatus("idle");
          scanLockRef.current = false;
        }, 3000);
      }
    } catch (err) {
      const errMsg =
        err.response?.data?.error || "Failed to mark attendance.";
      const normalized = errMsg.toLowerCase();

      if (normalized.includes("already")) {
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
  };

  const handleError = (err) => {
    console.error("QR Scan Error:", err);
  };

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

        <div className="p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center mx-auto mb-3">
            <QrCode className="w-6 h-6 text-indigo-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-1">
            Scan Seminar QR
          </h2>
          <p className="text-gray-500 text-sm mb-4">
            Point your camera at the seminar QR code
          </p>

          <div className="relative rounded-xl overflow-hidden aspect-square bg-black mb-4 mx-auto max-w-[300px]">
            {status === "idle" && (
              <Scanner
                onScan={handleScan}
                onError={handleError}
                scanDelay={500}
                allowMultiple={true}
                styles={{
                  container: { width: "100%", height: "100%" },
                }}
              />
            )}

            <AnimatePresence>
              {status === "processing" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center z-20"
                >
                  <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-2" />
                  <p className="font-semibold text-gray-700">Verifying...</p>
                </motion.div>
              )}

              {status === "success" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 bg-green-50/95 flex flex-col items-center justify-center z-20"
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
                  className="absolute inset-0 bg-red-50/95 flex flex-col items-center justify-center z-20"
                >
                  <AlertCircle className="w-16 h-16 text-red-500 mb-2" />
                  <p className="font-bold text-gray-800">Error</p>
                  <p className="text-red-600 text-sm px-4">{message}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Scanner Overlay Guide */}
            {status === "idle" && (
              <div className="absolute inset-0 border-2 border-white/30 pointer-events-none">
                <div className="absolute inset-[15%] border-2 border-indigo-500/80 rounded-lg" />
              </div>
            )}
          </div>

          <p className="text-xs text-gray-400">
            Ensure good lighting and hold steady.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default SeminarQRScanner;
