import React, { useState, useRef, useEffect } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";
import { X, CheckCircle, AlertCircle, Loader2, QrCode } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import API from "../api/axios";
import LivenessDetector from './LivenessDetector';

const SeminarQRScanner = ({ onClose }) => {
  const [scanResult, setScanResult] = useState(null);
  const [status, setStatus] = useState("initializing"); // initializing | idle | liveness | processing | success | error
  const [message, setMessage] = useState("Preparing secure session...");
  const [isFaceRegistered, setIsFaceRegistered] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [locationWarning, setLocationWarning] = useState("");
  const scanLockRef = useRef(false);

  // Phase 1: Pre-checks (Location & Registration Status)
  const performChecks = async () => {
    setStatus("initializing");
    setMessage("Preparing secure session...");
    setLocationWarning("");

    try {
      // 1. Check Face Status
      setMessage("Checking face registration...");
      const faceRes = await API.get('/face/status');
      setIsFaceRegistered(faceRes.data.isRegistered);
    } catch (err) {
      console.error("Face status check failed:", err);
      // If it's a network/auth issue, show specific message
      if (err.response?.status === 401) {
        setStatus("error");
        setMessage("Session expired. Please log in again.");
        return;
      }
      // Non-critical: face status check failed, continue anyway
      console.warn("Could not check face status, assuming not registered.");
    }

    // 2. Try to get location (soft requirement — don't block on failure)
    try {
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
      } else {
        setLocationWarning("Geolocation not available on this device.");
      }
    } catch (geoErr) {
      console.warn("Geolocation failed:", geoErr);
      const isDenial = geoErr.code === 1;
      const isTimeout = geoErr.code === 3;
      if (isDenial) {
        setLocationWarning("Location permission denied. Attendance may be rejected by the server if geofencing is enabled.");
      } else if (isTimeout) {
        setLocationWarning("Location timed out. Continuing without GPS — attendance may be rejected if geofencing is required.");
      } else {
        setLocationWarning("Could not determine location. Continuing without GPS.");
      }
    }

    setStatus("idle");
    setMessage("");
  };

  useEffect(() => {
    performChecks();
  }, []);

  const handleScan = (result) => {
    if (result && result[0] && status === "idle") {
      const parsedData = result[0].rawValue;
      try {
        const parsed = JSON.parse(parsedData);
        if (parsed.type === "seminar" && parsed.sessionId && parsed.token) {
          setScanResult(parsed);
          setStatus("liveness");
        } else {
          setStatus("error");
          setMessage("Invalid seminar QR code.");
          setTimeout(() => setStatus("idle"), 3000);
        }
      } catch {
        setStatus("error");
        setMessage("Invalid QR code format.");
        setTimeout(() => setStatus("idle"), 3000);
      }
    }
  };

  const handleLivenessVerified = async (faceBlob) => {
     setStatus("processing");
     setMessage(isFaceRegistered ? "Verifying Identity..." : "Registering Face & Marking Attendance...");

     const formData = new FormData();
     formData.append('token', scanResult.token);
     formData.append('latitude', userLocation?.lat);
     formData.append('longitude', userLocation?.lng);

     if (isFaceRegistered) {
       // Regular Verification
       formData.append('image', faceBlob, 'verify_face.jpg');
       try {
         const response = await API.post(`/seminar/attend/${scanResult.sessionId}`, formData, {
           headers: { 'Content-Type': 'multipart/form-data' }
         });

         if (response.data.success) {
           setStatus("success");
           setMessage(response.data.message || "Seminar Attendance Marked!");
           setTimeout(() => onClose(), 2000);
         }
       } catch (err) {
         setStatus("error");
         setMessage(err.response?.data?.error || "Verification failed during seminar check-in.");
         setTimeout(() => setStatus("idle"), 3000);
       }
     } else {
       // On-the-spot Registration then Mark Attendance
       const registerData = new FormData();
       registerData.append('images', faceBlob, 'face_1.jpg');
       
       try {
         // Step 1: Register Face
         await API.post('/face/register', registerData, {
           headers: { 'Content-Type': 'multipart/form-data' }
         });

         // Step 2: Mark Seminar Attendance
         formData.append('image', faceBlob, 'verify_face.jpg');
         const response = await API.post(`/seminar/attend/${scanResult.sessionId}`, formData, {
           headers: { 'Content-Type': 'multipart/form-data' }
         });

         if (response.data.success) {
           setStatus("success");
           setMessage("Face Registered & Seminar Attendance Marked!");
           setTimeout(() => onClose(), 2000);
         }
       } catch (err) {
         setStatus("error");
         setMessage(err.response?.data?.error || "Seminar registration flow failed.");
         setTimeout(() => setStatus("idle"), 3000);
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
      {status === 'liveness' && (
          <LivenessDetector onVerified={handleLivenessVerified} onCancel={cancelLiveness} />
      )}
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
        className={`bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative ${status === 'liveness' ? 'hidden' : 'block'}`}
      >
        <button onClick={onClose} className="absolute top-4 right-4 z-10 p-2 bg-black/20 hover:bg-black/40 rounded-full text-white transition-colors cursor-pointer">
          <X size={20} />
        </button>

        <div className="p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center mx-auto mb-3">
            <QrCode className="w-6 h-6 text-indigo-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-1">
            {status === "initializing" ? "Securing Session..." : "Scan Seminar QR"}
          </h2>
          <p className="text-gray-500 text-sm mb-4">
            {status === "initializing" 
              ? "Verifying location and system readiness..." 
              : "Point your camera at the seminar QR code"}
          </p>

          <div className="relative rounded-xl overflow-hidden aspect-square bg-black mb-4 mx-auto max-w-[300px]">
            {status === "initializing" && (
                <div className="absolute inset-0 bg-gray-50 flex flex-col items-center justify-center">
                  <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-3" />
                  <p className="text-sm text-gray-500 font-medium px-6">{message}</p>
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
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center z-20">
                  <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-2" />
                  <p className="font-semibold text-gray-700">{message}</p>
                </motion.div>
              )}

              {status === "success" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-green-50/95 flex flex-col items-center justify-center z-20">
                  <CheckCircle className="w-16 h-16 text-green-500 mb-2" />
                  <p className="font-bold text-gray-800 text-lg">Confirmed!</p>
                  <p className="text-green-600 text-sm px-4">{message}</p>
                </motion.div>
              )}

              {status === "error" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-red-50/95 flex flex-col items-center justify-center z-20 p-4">
                  <AlertCircle className="w-16 h-16 text-red-500 mb-2" />
                  <p className="font-bold text-gray-800">Error</p>
                  <p className="text-red-600 text-sm px-4 text-center mb-4">{message}</p>
                  <button
                    onClick={performChecks}
                    className="bg-indigo-600 text-white px-5 py-2 rounded-xl font-semibold text-sm hover:bg-indigo-700 transition cursor-pointer"
                  >
                    Retry
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {status === "idle" && (
              <div className="absolute inset-0 border-2 border-white/30 pointer-events-none">
                <div className="absolute inset-[15%] border-2 border-indigo-500/80 rounded-lg" />
              </div>
            )}
          </div>

          {/* Location Warning Banner */}
          {locationWarning && status === "idle" && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-2 mx-auto max-w-[300px]">
              <p className="text-amber-700 text-xs text-center">{locationWarning}</p>
            </div>
          )}

          <p className="text-xs text-gray-400">Ensure good lighting and hold steady.</p>
        </div>
      </motion.div>
    </div>
  );
};

export default SeminarQRScanner;
