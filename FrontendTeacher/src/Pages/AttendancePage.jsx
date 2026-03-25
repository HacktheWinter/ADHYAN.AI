import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import io from "socket.io-client";
import api from "../api/axios";
import { ChevronLeft, QrCode, PenTool, CalendarDays, Activity } from "lucide-react";
import { SOCKET_URL } from "../config";

import QRAttendance from "../components/Attendance/QRAttendance";
import ManualAttendance from "../components/Attendance/ManualAttendance";
import AttendanceRegister from "../components/Attendance/AttendanceRegister";
import AttendanceAnalysis from "../components/Attendance/AttendanceAnalysis";

const AttendancePage = () => {
  const { classId, panel } = useParams();
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [socket, setSocket] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const validPanels = new Set(["qr", "manual", "register", "analysis"]);
  const activeTab = validPanels.has(panel) ? panel : "manual";

  useEffect(() => {
    if (!classId) return;
    if (validPanels.has(panel)) return;
    navigate(`/class/${classId}/attendance/manual`, { replace: true });
  }, [classId, panel, navigate]);


  // Initialize socket only when QR tab is active.
  // Manual/Register tabs do not need a socket connection.
  useEffect(() => {
    if (activeTab !== "qr") {
      setSocket(null);
      return;
    }

    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("[AttendancePage] Socket connected:", newSocket.id);
      newSocket.emit("join_class", classId);
    });

    newSocket.on("disconnect", (reason) => {
      console.log("[AttendancePage] Socket disconnected:", reason);
    });

    // Cleanup only when component unmounts
    return () => {
      console.log("[AttendancePage] Cleaning up socket");
      newSocket.emit("leave_class", classId);
      newSocket.disconnect();
    };
  }, [classId, activeTab]);

  // Fetch Class Students once
  useEffect(() => {
    const fetchClassStudents = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/classroom/${classId}`);
        if (response.data && response.data.classroom) {
          const fetchedStudents = response.data.classroom.students || [];
          const sortedStudents = [...fetchedStudents].sort((a, b) => 
            a.name.localeCompare(b.name)
          );
          setStudents(sortedStudents);
        }
      } catch (err) {
        console.error("Error fetching class students:", err);
        setError("Failed to load student list.");
      } finally {
        setLoading(false);
      }
    };
    if (classId) fetchClassStudents();
  }, [classId]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col pt-6 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto w-full space-y-6">
        
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex flex-col gap-1">
            <button
              onClick={() => navigate(`/class/${classId}`)}
              className="flex items-center gap-1 text-sm font-medium text-purple-600 hover:text-purple-700 transition w-fit cursor-pointer bg-purple-50 px-3 py-1.5 rounded-lg"
            >
               <ChevronLeft className="w-4 h-4" />
               Back to Class
            </button>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mt-2">
              Attendance Hub
            </h1>
            <p className="text-gray-500">Manage real-time, manual, and historical attendance seamlessly</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex p-1 space-x-2 bg-white rounded-2xl shadow-sm border border-gray-100 max-w-2xl overflow-x-auto hide-scrollbar">
            <button
              onClick={() => navigate(`/class/${classId}/attendance/qr`)}
              className={`flex-1 flex justify-center items-center gap-2 py-3 px-4 text-sm font-bold rounded-xl whitespace-nowrap transition-all duration-200 cursor-pointer ${
                activeTab === 'qr'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <QrCode className="w-4 h-4" />
              Live QR Scanner
            </button>
            <button
              onClick={() => navigate(`/class/${classId}/attendance/manual`)}
              className={`flex-1 flex justify-center items-center gap-2 py-3 px-4 text-sm font-bold rounded-xl whitespace-nowrap transition-all duration-200 cursor-pointer ${
                activeTab === 'manual'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <PenTool className="w-4 h-4" />
              Manual Entry
            </button>
            <button
              onClick={() => navigate(`/class/${classId}/attendance/register`)}
              className={`flex-1 flex justify-center items-center gap-2 py-3 px-4 text-sm font-bold rounded-xl whitespace-nowrap transition-all duration-200 cursor-pointer ${
                activeTab === 'register'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <CalendarDays className="w-4 h-4" />
              ERP Register
            </button>
            <button
              onClick={() => navigate(`/class/${classId}/attendance/analysis`)}
              className={`flex-1 flex justify-center items-center gap-2 py-3 px-4 text-sm font-bold rounded-xl whitespace-nowrap transition-all duration-200 cursor-pointer ${
                activeTab === 'analysis'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Activity className="w-4 h-4" />
              Analysis
            </button>
        </div>

        {/* Content Area */}
        <div className="w-full relative">
            {loading ? (
                 <div className="flex flex-col justify-center items-center min-h-[400px] bg-white rounded-3xl border border-gray-100 shadow-sm">
                    <div className="w-12 h-12 border-4 border-purple-100 border-t-purple-600 rounded-full animate-spin mb-4 shadow-sm" />
                    <p className="text-gray-500 font-medium">Loading classroom data...</p>
                 </div>
            ) : error ? (
                 <div className="bg-red-50 text-red-700 p-6 rounded-2xl shadow-sm font-medium border border-red-100">
                     {error}
                 </div>
            ) : (
                <div className="transition-all duration-300">
                    {activeTab === 'qr' && (
                      <div className="animate-in fade-in duration-500">
                            <QRAttendance classId={classId} students={students} socket={socket} onNavigateToManual={() => navigate(`/class/${classId}/attendance/manual`)} />
                        </div>
                    )}
                    {activeTab === 'manual' && (
                      <div className="animate-in fade-in duration-500">
                            <ManualAttendance classId={classId} students={students} />
                        </div>
                    )}
                    {activeTab === 'register' && (
                      <div className="animate-in fade-in duration-500">
                            <AttendanceRegister classId={classId} students={students} />
                        </div>
                    )}
                    {activeTab === 'analysis' && (
                      <div className="animate-in fade-in duration-500">
                            <AttendanceAnalysis classId={classId} students={students} />
                        </div>
                    )}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default AttendancePage;
