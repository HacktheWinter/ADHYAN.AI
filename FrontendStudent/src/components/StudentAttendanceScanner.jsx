import React, { useState, useRef } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";
import { X, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import api from '../api/axios';
import LivenessDetector from './LivenessDetector';

const StudentAttendanceScanner = ({ classId, student, onClose }) => {
  const [scanResult, setScanResult] = useState(null);
  const [status, setStatus] = useState("initializing"); // initializing, idle, processing_qr, liveness, processing_face, success, error
  const [message, setMessage] = useState("Preparing secure session...");
  const [isFaceRegistered, setIsFaceRegistered] = useState(false);
  const [userLocation, setUserLocation] = useState(null);

  // Phase 1: Pre-checks (Location & Registration Status)
  React.useEffect(() => {
    const performChecks = async () => {
      try {
        // 1. Check Face Status
        const faceRes = await api.get('/face/status');
        setIsFaceRegistered(faceRes.data.isRegistered);

        // 2. Clear/Check Location
        if ("geolocation" in navigator) {
          setMessage("Determining Classroom Location...");
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
        setStatus("error");
        const isDenial = err.code === 1 || err.message?.includes("denied");
        setMessage(isDenial 
          ? "Location permission is required for production attendance. Please enable it in your browser settings." 
          : "Failed to initialize secure session. Check your connection or GPS.");
      }
    };

    performChecks();
  }, [classId]);

  const handleScan = (result) => {
    if (result && result[0] && status === "idle") {
      const token = result[0].rawValue;
      if (!token) return;
      setScanResult(token);
      setStatus("liveness"); 
    }
  };

  const handleLivenessVerified = async (faceBlob) => {
     setStatus("processing_face");
     setMessage(isFaceRegistered ? "Verifying Identity..." : "Registering Face & Marking Attendance...");

     const formData = new FormData();
     formData.append('token', scanResult);
     formData.append('latitude', userLocation?.lat);
     formData.append('longitude', userLocation?.lng);

     if (isFaceRegistered) {
       // Regular Verification
       formData.append('image', faceBlob, 'verify_face.jpg');
       try {
         const response = await api.post(`/attendance/session/${classId}/verify-face`, formData, {
           headers: { 'Content-Type': 'multipart/form-data' }
         });

         if (response.data.success) {
           setStatus("success");
           setMessage("Attendance Marked Successfully!");
           setTimeout(() => onClose(), 2000);
         }
       } catch (err) {
         setStatus("error");
         setMessage(err.response?.data?.error || "Verification failed.");
         setTimeout(() => setStatus("idle"), 3000);
       }
     } else {
       // On-the-spot Registration then Mark Attendance
       const registerData = new FormData();
       registerData.append('images', faceBlob, 'face_1.jpg'); // Sending liveness frame as first registration image
       
       try {
         // Step 1: Register Face
         await api.post('/face/register', registerData, {
           headers: { 'Content-Type': 'multipart/form-data' }
         });

         // Step 2: Mark Attendance (backend checkRegistrationStatus middleware will now pass)
         formData.append('image', faceBlob, 'verify_face.jpg');
         const response = await api.post(`/attendance/session/${classId}/verify-face`, formData, {
           headers: { 'Content-Type': 'multipart/form-data' }
         });

         if (response.data.success) {
           setStatus("success");
           setMessage("Face Registered & Attendance Marked!");
           setTimeout(() => onClose(), 2000);
         }
       } catch (err) {
         setStatus("error");
         setMessage(err.response?.data?.error || "Registration flow failed.");
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
    <>
      {status === 'liveness' && (
          <LivenessDetector onVerified={handleLivenessVerified} onCancel={cancelLiveness} />
      )}

      <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 ${status === 'liveness' ? 'hidden' : 'flex'}`}>
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative"
        >
          <button onClick={onClose} className="absolute top-4 right-4 z-10 p-2 bg-black/20 hover:bg-black/40 rounded-full text-white transition-colors cursor-pointer">
            <X size={20} />
          </button>

          <div className="p-6 text-center">
              <h2 className="text-xl font-bold text-gray-800 mb-2">
                {status === "initializing" ? "Securing Session..." : "Scan Attendance QR"}
              </h2>
              <p className="text-gray-500 text-sm mb-4">
                {status === "initializing" 
                  ? "Verifying location and system readiness..." 
                  : "Point your camera at the teacher's screen. You will verify your face next."}
              </p>

              <div className="relative rounded-xl overflow-hidden aspect-square bg-black mb-4 mx-auto max-w-[300px]">
                  {status === "initializing" && (
                    <div className="absolute inset-0 bg-gray-50 flex flex-col items-center justify-center">
                      <Loader2 className="w-12 h-12 text-purple-600 animate-spin mb-3" />
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
                      {status === "processing_face" && (
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center z-20">
                              <Loader2 className="w-12 h-12 text-purple-600 animate-spin mb-2" />
                              <p className="font-semibold text-gray-700">{message}</p>
                          </motion.div>
                      )}

                      {status === "success" && (
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-green-50/95 flex flex-col items-center justify-center z-20">
                              <CheckCircle className="w-16 h-16 text-green-500 mb-2" />
                              <p className="font-bold text-gray-800 text-lg">Present!</p>
                              <p className="text-green-600 text-sm">{message}</p>
                          </motion.div>
                      )}

                      {status === "error" && (
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-red-50/95 flex flex-col items-center justify-center z-20">
                              <AlertCircle className="w-16 h-16 text-red-500 mb-2" />
                              <p className="font-bold text-gray-800">Error</p>
                              <p className="text-red-600 text-sm px-4">{message}</p>
                          </motion.div>
                      )}
                  </AnimatePresence>
                  
                  {status === "idle" && (
                      <div className="absolute inset-0 border-2 border-white/30 pointer-events-none">
                          <div className="absolute inset-[15%] border-2 border-purple-500/80 rounded-lg"></div>
                      </div>
                  )}
              </div>

              <p className="text-xs text-gray-400">Ensure good lighting and hold steady.</p>
          </div>
        </motion.div>
      </div>
    </>
  );
};

export default StudentAttendanceScanner;
