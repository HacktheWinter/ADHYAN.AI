import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import api from "../api/axios";
import { motion, AnimatePresence } from "framer-motion";
import io from "socket.io-client";
import { X } from "lucide-react";

// Initialize socket outside component to avoid multiple connections
// Adjust URL based on environment if needed, defaulting to port 5000 as per other files
const SOCKET_URL = "http://localhost:5000"; 

const AttendancePage = () => {
  const { classId } = useParams();
  const navigate = useNavigate();
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isQrActive, setIsQrActive] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [students, setStudents] = useState([]);
  const [presentStudentIds, setPresentStudentIds] = useState(new Set());
  const [socket, setSocket] = useState(null);
  const [activeUsersCount, setActiveUsersCount] = useState(0);

  // Fetch Class Students
  useEffect(() => {
    const fetchClassStudents = async () => {
      try {
        const response = await api.get(`/classroom/${classId}`);
        if (response.data && response.data.classroom) {
          setStudents(response.data.classroom.students || []);
        }
      } catch (err) {
        console.error("Error fetching class students:", err);
        setError("Failed to load student list.");
      }
    };
    fetchClassStudents();
  }, [classId]);

  // Setup Socket
  useEffect(() => {
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    newSocket.emit("join_class", classId);

    newSocket.on("attendance_update", ({ studentId }) => {
      setPresentStudentIds((prev) => new Set(prev).add(studentId));
    });
    
    newSocket.on("active_users_update", ({ count }) => {
        setActiveUsersCount(count);
    });

    return () => {
      newSocket.emit("leave_class", classId);
      newSocket.disconnect();
    };
  }, [classId]);


  const fetchToken = async () => {
    try {
      // Don't set full page loading, just token loading if needed
      // setLoading(true); 
      const response = await api.get(`/attendance/generate-token/${classId}`);
      if (response.data && response.data.token) {
        setToken(response.data.token);
        setError(null);
        
        // Notify backend that attendance is active with this token
        if (socket) {
             socket.emit("start_attendance", { classId, token: response.data.token });
        }
      }
    } catch (err) {
      console.error("Error fetching attendance token:", err);
      // Only set error if we don't have a token effectively
      if (!token) setError("Failed to load attendance token.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let intervalId;

    if (isQrActive) {
      setLoading(true);
      // Initial fetch when opened
      fetchToken();

      // Set interval to refresh every 3 seconds
      intervalId = setInterval(fetchToken, 3000);
    } else {
      setToken(""); // Clear token when closed
      if (socket) {
          socket.emit("stop_attendance", classId);
      }
    }

    // Cleanup
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isQrActive, classId, socket]); // Depend on socket to emit events

  const handleToggleQr = () => {
    setIsQrActive(!isQrActive);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col p-4 relative">
      {/* Header */}
      <div className="max-w-7xl mx-auto w-full flex justify-between items-center mb-6">
          <button
            onClick={() => navigate(`/class/${classId}`)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
             </svg>
             Back to Class
          </button>
          
          <div className="flex items-center gap-4">
              <div className="text-sm text-gray-500 hidden sm:block">Active Users: {activeUsersCount}</div>
              <button 
                onClick={() => setShowQrModal(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium shadow-md transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4h2v-4zM6 8v4M6 12v4M6 16v4M6 8H4m2 0h2m-2 4H4m2 0h2m-2 4H4m2 0h2m12-16v4m0 4v4m0 4v4m0-12h-2m2 0h2m-2 4h-2m2 0h2m-2 4h-2m2 0h2m-2 4h-2m2 0h2" />
                </svg>
                QR Session
              </button>
          </div>
      </div>

      <div className="max-w-7xl mx-auto w-full">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">Student List</h2>
                <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                    Present: {presentStudentIds.size} / {students.length}
                </div>
            </div>

            {students.length === 0 ? (
                <div className="text-center py-10 text-gray-500">No students enrolled in this class.</div>
            ) : (
                <div className="flex flex-col gap-3">
                    {students.map((student) => {
                        const isPresent = presentStudentIds.has(student._id);
                        return (
                            <motion.div 
                                key={student._id}
                                layout
                                className={`p-4 rounded-xl border flex items-center justify-between transition-colors ${
                                    isPresent 
                                        ? "bg-green-50 border-green-200 shadow-sm" 
                                        : "bg-white border-gray-100 hover:bg-gray-50"
                                }`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white text-lg ${
                                        isPresent ? "bg-green-500" : "bg-gray-400"
                                    }`}>
                                        {student.profilePhoto ? (
                                            <img src={student.profilePhoto} alt={student.name} className="w-full h-full rounded-full object-cover" />
                                        ) : (
                                            student.name.charAt(0).toUpperCase()
                                        )}
                                    </div>
                                    <div>
                                        <div className={`text-lg font-semibold ${isPresent ? "text-gray-900" : "text-gray-600"}`}>
                                            {student.name}
                                        </div>
                                        <div className="text-sm text-gray-500">{student.email}</div>
                                    </div>
                                </div>
                                
                                {isPresent && (
                                    <div className="bg-green-100 text-green-700 px-4 py-1 rounded-full text-sm font-medium flex items-center gap-2">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        Present
                                    </div>
                                )}
                            </motion.div>
                        );
                    })}
                </div>
            )}
          </div>
      </div>

      {/* QR Modal Overlay */}
      <AnimatePresence>
        {showQrModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative overflow-hidden"
            >
                <div className="p-6">
                    <button 
                        onClick={() => setShowQrModal(false)}
                        className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 bg-gray-100 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>

                    <div className="text-center">
                        <h2 className="text-xl font-bold text-gray-800 mb-2">QR Session</h2>
                        <p className="text-gray-500 mb-6 text-sm">
                        {isQrActive 
                            ? "Scan with Student App to mark attendance" 
                            : "Click 'Open QR' to start attendance session"}
                        </p>

                        <div className="flex justify-center items-center mb-6 h-64 bg-gray-100 rounded-lg overflow-hidden relative mx-auto max-w-[300px]">
                        {!isQrActive ? (
                            <div className="text-gray-400 flex flex-col items-center">
                            <svg className="w-16 h-16 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4h2v-4zM6 8v4M6 12v4M6 16v4M6 8H4m2 0h2m-2 4H4m2 0h2m-2 4H4m2 0h2m12-16v4m0 4v4m0 4v4m0-12h-2m2 0h2m-2 4h-2m2 0h2m-2 4h-2m2 0h2m-2 4h-2m2 0h2" />
                            </svg>
                            <span>QR is closed</span>
                            </div>
                        ) : loading && !token ? (
                            <div className="animate-spin h-10 w-10 border-4 border-purple-500 border-t-transparent rounded-full"></div>
                        ) : error ? (
                            <div className="text-red-500 px-4">{error}</div>
                        ) : (
                            <div className="bg-white p-4 rounded-lg shadow-sm">
                            <QRCodeCanvas value={token} size={200} level={"H"} includeMargin={true} />
                            </div>
                        )}
                        </div>

                        {isQrActive && (
                        <div className="flex items-center justify-center gap-2 text-sm text-purple-600 font-medium bg-purple-50 py-2 px-4 rounded-full mx-auto w-fit mb-6">
                            <svg className="w-4 h-4 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            QR updates every 3 seconds
                        </div>
                        )}

                        <button
                        onClick={handleToggleQr}
                        className={`w-full py-3 px-4 rounded-xl font-bold text-white transition-all transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer ${
                            isQrActive 
                            ? "bg-red-500 hover:bg-red-600 shadow-red-200" 
                            : "bg-purple-600 hover:bg-purple-700 shadow-purple-200"
                        } shadow-lg`}
                        >
                        {isQrActive ? "Close QR Session" : "Open QR Session"}
                        </button>
                    </div>
                </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AttendancePage;
