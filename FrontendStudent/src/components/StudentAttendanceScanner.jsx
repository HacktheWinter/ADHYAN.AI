import React, { useState, useEffect, useRef } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";
import io from "socket.io-client";
import { X, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Adjust URL based on environment
const SOCKET_URL = "http://localhost:5000";

const StudentAttendanceScanner = ({ classId, student, onClose }) => {
  const [scanResult, setScanResult] = useState(null);
  const [status, setStatus] = useState("idle"); // idle, scanning, processing, success, error
  const [message, setMessage] = useState("");
  const socketRef = useRef(null);

  useEffect(() => {
    // Initialize Socket
    socketRef.current = io(SOCKET_URL);
    const socket = socketRef.current;

    socket.on("attendance_success", ({ message }) => {
      setStatus("success");
      setMessage(message || "Attendance Marked Successfully!");
      // Auto close after success
      setTimeout(() => {
        onClose();
      }, 2000);
    });

    socket.on("attendance_error", ({ message }) => {
      setStatus("error");
      setMessage(message || "Failed to mark attendance.");
      // Reset after error to allow retry
      setTimeout(() => {
        setStatus("idle"); // Go back to scanning
        setScanResult(null);
      }, 3000);
    });

    return () => {
      socket.disconnect();
    };
  }, [onClose]);

  const handleScan = (result) => {
    if (result && result[0] && status === "idle") {
      const token = result[0].rawValue;
      setScanResult(token);
      setStatus("processing");
      
      // Emit mark_attendance event
      if (socketRef.current) {
        socketRef.current.emit("mark_attendance", {
          classId: classId,
          studentId: student.studentId, // Ensure this matches what CourseDetailPage passes
          studentName: student.studentName,
          token: token
        });
      }
    }
  };

  const handleError = (err) => {
    console.error("QR Scan Error:", err);
    // Don't necessarily block UI for minor camera errors, but show something if critical
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
          className="absolute top-4 right-4 z-10 p-2 bg-black/20 hover:bg-black/40 rounded-full text-white transition-colors"
        >
          <X size={20} />
        </button>

        <div className="p-6 text-center">
            <h2 className="text-xl font-bold text-gray-800 mb-2">Scan Attendance QR</h2>
            <p className="text-gray-500 text-sm mb-4">Point your camera at the teacher's screen</p>

            <div className="relative rounded-xl overflow-hidden aspect-square bg-black mb-4 mx-auto max-w-[300px]">
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
                        <motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center z-20"
                        >
                            <Loader2 className="w-12 h-12 text-purple-600 animate-spin mb-2" />
                            <p className="font-semibold text-gray-700">Verifying...</p>
                        </motion.div>
                    )}

                    {status === "success" && (
                        <motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            className="absolute inset-0 bg-green-50/95 flex flex-col items-center justify-center z-20"
                        >
                            <CheckCircle className="w-16 h-16 text-green-500 mb-2" />
                            <p className="font-bold text-gray-800 text-lg">Present!</p>
                            <p className="text-green-600 text-sm">{message}</p>
                        </motion.div>
                    )}

                    {status === "error" && (
                        <motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
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
                        <div className="absolute inset-[15%] border-2 border-purple-500/80 rounded-lg"></div>
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

export default StudentAttendanceScanner;
