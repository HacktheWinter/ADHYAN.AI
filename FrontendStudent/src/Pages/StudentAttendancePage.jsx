import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Scanner } from "@yudiel/react-qr-scanner";
import io from "socket.io-client";
import { ArrowLeft, CheckCircle, AlertCircle, Loader2, Camera } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getStoredUser } from "../utils/authStorage";

// Adjust URL based on environment
const SOCKET_URL = "http://localhost:5000" || "https://adhyan-ai-backend.onrender.com";

const StudentAttendancePage = () => {
  const { id: classId } = useParams(); // Note: route is /course/:id/attendance so param is id
  const navigate = useNavigate();
  const [scanResult, setScanResult] = useState(null);
  const [status, setStatus] = useState("idle"); // idle, scanning, processing, success, error
  const [message, setMessage] = useState("");
  const socketRef = useRef(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = getStoredUser();
    if (!storedUser) {
        navigate("/login");
        return;
    }
    setUser(storedUser);

    // Initialize Socket
    socketRef.current = io(SOCKET_URL);
    const socket = socketRef.current;

    socket.on("connect", () => {
        // console.log("Connected to socket for attendance");
    });

    socket.on("attendance_success", ({ message }) => {
      setStatus("success");
      setMessage(message || "Attendance Marked Successfully!");
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
  }, [navigate]);

  const handleScan = (result) => {
    if (result && result[0] && status === "idle") {
      const token = result[0].rawValue;
      if (!token) return;
      
      setScanResult(token);
      setStatus("processing");
      
      console.log("Attempting to emit mark_attendance:", {
          classId,
          studentId: user.id || user._id,
          studentName: user.name,
          token
      });

      // Emit mark_attendance event
      if (socketRef.current && user) {
        socketRef.current.emit("mark_attendance", {
          classId: classId,
          studentId: user.id || user._id, 
          studentName: user.name,
          token: token
        });
      } else {
        console.error("Socket or User missing", { socket: !!socketRef.current, user });
      }
    }
  };

  const handleError = (err) => {
    console.error("QR Scan Error:", err);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm p-4 flex items-center gap-4 sticky top-0 z-10">
        <button 
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
        >
            <ArrowLeft size={24} className="text-gray-700" />
        </button>
        <h1 className="text-lg font-bold text-gray-800">Mark Attendance</h1>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden relative">
            
            <div className="p-6 text-center">
                <div className="mb-6">
                    <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Camera size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Scan QR Code</h2>
                    <p className="text-gray-500">
                        Point your camera at the QR code displayed on the teacher's screen.
                    </p>
                </div>

                <div className="relative rounded-2xl overflow-hidden aspect-square bg-black shadow-inner mx-auto max-w-[320px]">
                    {status === "idle" && (
                        <Scanner 
                            onScan={handleScan} 
                            onError={handleError}
                            scanDelay={500}
                            allowMultiple={true}
                            styles={{ 
                                container: { width: "100%", height: "100%" },
                                video: { objectFit: "cover" }
                            }}
                            components={{
                                audio: false,
                                onOff: false,
                                torch: false,
                                zoom: false,
                                finder: false,
                            }}
                        />
                    )}

                    <AnimatePresence>
                        {status === "processing" && (
                            <motion.div 
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center z-20"
                            >
                                <Loader2 className="w-16 h-16 text-purple-600 animate-spin mb-4" />
                                <p className="font-semibold text-gray-700 text-lg">Verifying...</p>
                            </motion.div>
                        )}

                        {status === "success" && (
                            <motion.div 
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                className="absolute inset-0 bg-green-50/95 flex flex-col items-center justify-center z-20"
                            >
                                <CheckCircle className="w-20 h-20 text-green-500 mb-4" />
                                <p className="font-bold text-gray-800 text-xl">Present!</p>
                                <p className="text-green-600 font-medium">{message}</p>
                                <button 
                                    onClick={() => navigate(-1)}
                                    className="mt-8 px-6 py-2 bg-green-500 text-white rounded-lg font-medium shadow-lg shadow-green-200 hover:bg-green-600 transition-colors cursor-pointer"
                                >
                                    Done
                                </button>
                            </motion.div>
                        )}

                        {status === "error" && (
                            <motion.div 
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                className="absolute inset-0 bg-red-50/95 flex flex-col items-center justify-center z-20"
                            >
                                <AlertCircle className="w-20 h-20 text-red-500 mb-4" />
                                <p className="font-bold text-gray-800 text-xl">Error</p>
                                <p className="text-red-600 px-6 text-center">{message}</p>
                                <button 
                                    onClick={() => { setStatus("idle"); setScanResult(null); }}
                                    className="mt-8 px-6 py-2 bg-white border border-red-200 text-red-600 rounded-lg font-medium shadow-sm hover:bg-red-50 transition-colors cursor-pointer"
                                >
                                    Try Again
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                    
                    {/* Scanner Overlay Guide */}
                    {status === "idle" && (
                        <div className="absolute inset-0 border-[24px] border-black/30 pointer-events-none">
                            <div className="absolute inset-0 border-2 border-white/50 rounded-lg">
                                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-purple-500 rounded-tl-lg"></div>
                                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-purple-500 rounded-tr-lg"></div>
                                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-purple-500 rounded-bl-lg"></div>
                                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-purple-500 rounded-br-lg"></div>
                            </div>
                        </div>
                    )}
                </div>
                
                <p className="text-xs text-gray-400 mt-6">
                    Ensure the Quick Response code is within the frame.
                </p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default StudentAttendancePage;
