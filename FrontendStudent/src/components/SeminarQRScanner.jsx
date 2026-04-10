import React, { useState, useEffect } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";
import { X, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import api from '../api/axios';
import LivenessDetector from './LivenessDetector';

const SeminarQRScanner = ({ onClose }) => {
  const [scanResult, setScanResult] = useState(null);
  const [status, setStatus] = useState("initializing"); // initializing, idle, liveness, processing, success, error
  const [message, setMessage] = useState("Preparing secure session...");
  const [isFaceRegistered, setIsFaceRegistered] = useState(false);
  const [userLocation, setUserLocation] = useState(null);

  // Phase 1: Pre-checks (Location & Registration Status)
  useEffect(() => {
    const performChecks = async () => {
      try {
        // 1. Check Face Status
        const faceRes = await api.get('/face/status');
        setIsFaceRegistered(faceRes.data.isRegistered);

        // 2. Determine Location
        if ("geolocation" in navigator) {
          setMessage("Determining Venue Location...");
          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { 
              enableHighAccuracy: true,
              timeout: 10000 
            });
          });
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        }
        
        setStatus("idle");
        setMessage("");
      } catch (err) {
        console.warn("Check error:", err);
        // We don't block for GPS if it fails, but we inform the user
        setStatus("idle");
        setMessage("");
      }
    };

    performChecks();
  }, []);

  const handleScan = (result) => {
    if (result && result[0] && status === "idle") {
      try {
        const rawValue = result[0].rawValue;
        const parsed = JSON.parse(rawValue);
        
        if (parsed.type === "seminar" && parsed.sessionId && parsed.token) {
          setScanResult(parsed);
          setStatus("liveness");
        } else {
          setStatus("error");
          setMessage("This QR code is not valid for seminar attendance.");
          setTimeout(() => setStatus("idle"), 3000);
        }
      } catch (err) {
        setStatus("error");
        setMessage("Invalid QR code format.");
        setTimeout(() => setStatus("idle"), 3000);
      }
    }
  };

  const handleLivenessVerified = async (faceBlob) => {
    if (!scanResult) return;

    setStatus("processing");
    setMessage(isFaceRegistered ? "Verifying Identity..." : "Registering Face & Marking Attendance...");

    try {
      if (!isFaceRegistered) {
        // Step 1: On-the-spot Registration
        const registerData = new FormData();
        registerData.append('images', faceBlob, 'seminar_reg_1.jpg');
        await api.post('/face/register', registerData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        setIsFaceRegistered(true);
      }

      // Step 2: Mark Seminar Attendance
      const formData = new FormData();
      formData.append('token', scanResult.token);
      formData.append('image', faceBlob, 'seminar_verify.jpg');
      if (userLocation) {
        formData.append('latitude', userLocation.lat);
        formData.append('longitude', userLocation.lng);
      }

      const response = await api.post(`/seminar/attend/${scanResult.sessionId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.success) {
        setStatus("success");
        setMessage(response.data.message || "Attendance Marked!");
        setTimeout(() => onClose(), 2500);
      }
    } catch (err) {
      console.error("Seminar attendance failed:", err);
      const errMsg = err.response?.data?.error || "Failed to mark attendance.";
      
      if (errMsg.toLowerCase().includes("already")) {
        setStatus("success");
        setMessage("You have already marked attendance for this seminar.");
        setTimeout(() => onClose(), 2500);
      } else {
        setStatus("error");
        setMessage(errMsg);
        setTimeout(() => setStatus("idle"), 4000);
      }
    }
  };

  const cancelLiveness = () => {
    setStatus("idle");
    setScanResult(null);
  };

  const handleError = (err) => {
    console.error("QR Scan Error:", err);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <AnimatePresence>
        {status === 'liveness' && (
          <LivenessDetector onVerified={handleLivenessVerified} onCancel={cancelLiveness} />
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className={`bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative ${status === 'liveness' ? 'hidden' : 'block'}`}
      >
        <button onClick={onClose} className="absolute top-5 right-5 z-10 p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-500 transition-colors cursor-pointer">
          <X size={20} />
        </button>

        <div className="p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Seminar Attendance
          </h2>
          <p className="text-gray-500 text-sm mb-6 px-4">
            {status === "initializing" 
              ? "Preparing secure session..." 
              : "Scan the seminar QR code to begin verification."}
          </p>

          <div className="relative rounded-2xl overflow-hidden aspect-square bg-gray-900 mb-6 mx-auto max-w-[320px] shadow-inner border-4 border-white">
            {status === "initializing" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50">
                <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-3" />
                <p className="text-sm text-gray-400 font-medium">Checking System Readiness</p>
              </div>
            )}

            {status === "idle" && (
              <Scanner
                onScan={handleScan}
                onError={handleError}
                scanDelay={500}
                allowMultiple={true}
                styles={{ container: { width: "100%", height: "100%" } }}
              />
            )}

            <AnimatePresence>
              {status === "processing" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-white/95 flex flex-col items-center justify-center z-20">
                  <div className="relative">
                    <Loader2 className="w-16 h-16 text-indigo-600 animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                       {/* Subtle pulse effect */}
                    </div>
                  </div>
                  <p className="mt-4 font-bold text-gray-800">{message}</p>
                </motion.div>
              )}

              {status === "success" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-green-50/98 flex flex-col items-center justify-center z-20 p-6">
                  <div className="bg-green-100 p-4 rounded-full mb-4">
                    <CheckCircle className="w-16 h-16 text-green-500" />
                  </div>
                  <p className="font-extrabold text-green-800 text-xl mb-2">Confirmed!</p>
                  <p className="text-green-600 text-sm font-medium">{message}</p>
                </motion.div>
              )}

              {status === "error" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-red-50/98 flex flex-col items-center justify-center z-20 p-6">
                  <div className="bg-red-100 p-4 rounded-full mb-4">
                    <AlertCircle className="w-16 h-16 text-red-500" />
                  </div>
                  <p className="font-extrabold text-red-800 text-xl mb-2">Verification Error</p>
                  <p className="text-red-500 text-sm font-medium text-center">{message}</p>
                  <button 
                    onClick={() => setStatus("idle")}
                    className="mt-6 px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition cursor-pointer"
                  >
                    Retry Scan
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
            
            {status === "idle" && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-[15%] border-2 border-indigo-500/50 rounded-2xl shadow-[0_0_0_1000px_rgba(0,0,0,0.3)]"></div>
                <div className="absolute top-[15%] left-[15%] w-8 h-8 border-t-4 border-l-4 border-indigo-500 rounded-tl-lg"></div>
                <div className="absolute top-[15%] right-[15%] w-8 h-8 border-t-4 border-r-4 border-indigo-500 rounded-tr-lg"></div>
                <div className="absolute bottom-[15%] left-[15%] w-8 h-8 border-b-4 border-l-4 border-indigo-500 rounded-bl-lg"></div>
                <div className="absolute bottom-[15%] right-[15%] w-8 h-8 border-b-4 border-r-4 border-indigo-500 rounded-br-lg"></div>
              </div>
            )}
          </div>

          <p className="text-xs text-gray-400 font-medium bg-gray-50 py-2 rounded-lg inline-block px-4">
            Identity verification is active for this session.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default SeminarQRScanner;
