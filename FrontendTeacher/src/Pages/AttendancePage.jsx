import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import io from "socket.io-client";
import api from "../api/axios";
import { ChevronLeft, PenTool, CalendarDays, Activity } from "lucide-react";
import { SOCKET_URL } from "../config";

import Attendance from "../components/Attendance/Attendance";
import AttendanceRegister from "../components/Attendance/AttendanceRegister";
import AttendanceAnalysis from "../components/Attendance/AttendanceAnalysis";

const AttendancePage = () => {
  const { classId, panel } = useParams();
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [socket, setSocket] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const validPanels = new Set(["attendance", "register", "analysis"]);
  const activeTab = validPanels.has(panel) ? panel : "attendance";

  useEffect(() => {
    if (!classId) return;
    if (validPanels.has(panel)) return;
    navigate(`/class/${classId}/attendance/attendance`, { replace: true });
  }, [classId, panel, navigate]);


  // Initialize socket for Attendance mode
  useEffect(() => {
    if (activeTab !== "attendance") {
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
    <div className="min-h-screen bg-paper flex flex-col pt-6 pb-12 px-4 sm:px-6 lg:px-8 font-body text-ink">
      <div className="max-w-7xl mx-auto w-full space-y-6">
        
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex flex-col gap-1">
            <button
              onClick={() => navigate(`/class/${classId}`)}
              className="flex items-center gap-1 text-sm font-bold text-violet-dark hover:opacity-80 transition w-fit cursor-pointer bg-violet-50 border border-line px-3 py-1.5 rounded-lg"
            >
               <ChevronLeft className="w-4 h-4" />
               Back to Class
            </button>
            <h1 className="text-3xl font-semibold font-display text-ink tracking-tight mt-2">
              Attendance Hub
            </h1>
            <p className="text-ink-soft text-sm">Manage real-time, manual, and historical attendance seamlessly</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex p-1 space-x-2 bg-surface rounded-2xl shadow-sm border border-line max-w-xl overflow-x-auto hide-scrollbar">
            <button
              onClick={() => navigate(`/class/${classId}/attendance/attendance`)}
              className={`flex-1 flex justify-center items-center gap-2 py-3 px-4 text-sm font-bold rounded-xl whitespace-nowrap transition-all duration-200 cursor-pointer ${
                activeTab === 'attendance'
                  ? 'bg-violet-dark text-white shadow-md'
                  : 'text-ink-soft hover:text-ink hover:bg-line/20'
              }`}
            >
              <PenTool className="w-4 h-4" />
              Attendance
            </button>
            <button
              onClick={() => navigate(`/class/${classId}/attendance/register`)}
              className={`flex-1 flex justify-center items-center gap-2 py-3 px-4 text-sm font-bold rounded-xl whitespace-nowrap transition-all duration-200 cursor-pointer ${
                activeTab === 'register'
                  ? 'bg-violet-dark text-white shadow-md'
                  : 'text-ink-soft hover:text-ink hover:bg-line/20'
              }`}
            >
              <CalendarDays className="w-4 h-4" />
              ERP Register
            </button>
            <button
              onClick={() => navigate(`/class/${classId}/attendance/analysis`)}
              className={`flex-1 flex justify-center items-center gap-2 py-3 px-4 text-sm font-bold rounded-xl whitespace-nowrap transition-all duration-200 cursor-pointer ${
                activeTab === 'analysis'
                  ? 'bg-violet-dark text-white shadow-md'
                  : 'text-ink-soft hover:text-ink hover:bg-line/20'
              }`}
            >
              <Activity className="w-4 h-4" />
              Analysis
            </button>
        </div>

        {/* Content Area */}
        <div className="w-full relative">
            {loading ? (
                 <div className="flex flex-col justify-center items-center min-h-[400px] bg-surface rounded-3xl border border-line shadow-sm">
                    <div className="w-12 h-12 border-4 border-violet-100 border-t-violet-dark rounded-full animate-spin mb-4 shadow-sm" />
                    <p className="text-ink-soft font-medium">Loading classroom data...</p>
                 </div>
            ) : error ? (
                 <div className="bg-rose-100 dark:bg-rose-955/40 text-rose-800 dark:text-rose-350 p-6 rounded-2xl shadow-sm font-bold border border-line animate-fade-in">
                     {error}
                 </div>
            ) : (
                 <div className="transition-all duration-300">
                     {activeTab === 'attendance' && (
                       <div className="animate-in fade-in duration-500">
                             <Attendance classId={classId} students={students} socket={socket} />
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
