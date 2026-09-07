import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import ClassCard from "../components/ClassCard";
import NewClass from "../components/NewClass";
import { motion, AnimatePresence } from "framer-motion";
import PageTransition from "../components/PageTransition";
import { getClassrooms, createClassroom, deleteClassroom, updateClassroom } from "../api/classroomApi";
import { getStoredUser } from "../utils/authStorage";
import SeminarQRGenerator from "../components/SeminarQRGenerator";
import ToastNotification from "../components/ToastNotification";
import ConfirmationCard from "../components/ConfirmationCard";
import PWAInstallPrompt from "../components/PWAInstallPrompt";
import { QrCode, ClipboardList, Plus, SlidersHorizontal, ChevronDown } from "lucide-react";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSeminarQR, setShowSeminarQR] = useState(false);

  // Tab View Mode: "active" | "archived"
  const [viewMode, setViewMode] = useState("active");

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [currentSort, setCurrentSort] = useState("all");
  const [showFilterPop, setShowFilterPop] = useState(false);
  const filterRef = useRef(null);

  // Toast notification state
  const [toast, setToast] = useState({ message: '', type: 'success' });

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    type: 'danger',
    onConfirm: null,
  });

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
  }, []);

  const clearToast = useCallback(() => {
    setToast({ message: '', type: 'success' });
  }, []);

  const showConfirm = useCallback(({ title, message, confirmText, cancelText, type, onConfirm }) => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      confirmText: confirmText || 'Confirm',
      cancelText: cancelText || 'Cancel',
      type: type || 'danger',
      onConfirm,
    });
  }, []);

  const closeConfirm = useCallback(() => {
    setConfirmDialog(prev => ({ ...prev, isOpen: false, onConfirm: null }));
  }, []);

  const user = getStoredUser() || {};
  const teacherId = user.id || user._id;
  const role = "teacher";

  const todayDate = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const getOverallAvgAttendance = () => {
    const activeClasses = classes.filter(c => c.isArchived !== true);
    if (activeClasses.length === 0) return 100;
    const total = activeClasses.reduce((sum, cls) => sum + (cls.avgAttendance || 100), 0);
    return Math.round(total / activeClasses.length);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 5) return "Hello";
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    if (hour < 21) return "Good evening";
    return "Hello";
  };

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        setLoading(true);
        // Pass true to load both active and archived classes at once
        const data = await getClassrooms(teacherId, role, true);
        console.log("Fetched classrooms:", data);
        setClasses(data || []);
      } catch (error) {
        console.error("Error fetching classrooms:", error);
      } finally {
        setLoading(false);
      }
    };
    
    if (teacherId) {
      fetchClasses();
    }
  }, [teacherId]);

  // Click outside listener for filter popup
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setShowFilterPop(false);
      }
    };
    if (showFilterPop) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showFilterPop]);

  const handleCreateClass = async (newClassData) => {
    try {
      const { name, subject, colorTheme, themeImage, themeId } = newClassData;

      const response = await createClassroom({
        teacherId,
        name,
        subject,
        colorTheme,
        themeImage,
        themeId,
      });

      if (response && response.classroom) {
        setClasses((prev) => [...prev, response.classroom]);
        showToast('Class created successfully!', 'success');
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error creating classroom:", error);
      showToast("Failed to create classroom", 'error');
    }
  };

  const handleUpdateClass = async (updates) => {
    if (!editingClass) return;
    try {
      const response = await updateClassroom(editingClass._id, {
        teacherId,
        ...updates,
      });

      if (response && response.classroom) {
        setClasses((prev) =>
          prev.map((cls) =>
            (cls._id || cls.id) === editingClass._id ? response.classroom : cls
          )
        );
        showToast("Class updated successfully", 'success');
      }
    } catch (error) {
      console.error("Error updating classroom:", error);
      showToast("Failed to update classroom", 'error');
    } finally {
      setEditingClass(null);
      setIsModalOpen(false);
    }
  };

  const executeDeleteClass = async (classId) => {
    try {
      await deleteClassroom(classId, teacherId);
      
      // Remove from state
      setClasses((prev) => prev.filter(c => (c._id || c.id) !== classId));
      
      showToast("Class deleted successfully!", 'success');
    } catch (error) {
      console.error("Error deleting classroom:", error);
      showToast(error.response?.data?.error || "Failed to delete classroom", 'error');
    }
  };

  const handleDeleteClass = (classId, className) => {
    showConfirm({
      title: 'Delete Class',
      message: `Are you sure you want to delete "${className}"? This action cannot be undone and all class data will be permanently removed.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger',
      onConfirm: () => {
        closeConfirm();
        executeDeleteClass(classId);
      },
    });
  };

  const executeArchiveClass = async (classId, archiveState) => {
    try {
      await updateClassroom(classId, { isArchived: archiveState });
      
      // Update in-memory state status
      setClasses((prev) =>
        prev.map((c) =>
          (c._id || c.id) === classId ? { ...c, isArchived: archiveState } : c
        )
      );
      showToast(archiveState ? "Class archived successfully!" : "Class restored successfully!", 'success');
    } catch (error) {
      console.error("Error updating archive status:", error);
      showToast(error.response?.data?.error || "Failed to update classroom status", 'error');
    }
  };

  const handleArchiveClass = (classId, archiveState = true, className) => {
    const title = archiveState ? 'Archive Class' : 'Restore Class';
    const message = archiveState
      ? `Are you sure you want to archive "${className}"? It will be moved to your archived classes list.`
      : `Are you sure you want to restore "${className}"? It will be moved back to your active classes.`;

    showConfirm({
      title,
      message,
      confirmText: archiveState ? 'Archive' : 'Restore',
      cancelText: 'Cancel',
      type: 'warning',
      onConfirm: () => {
        closeConfirm();
        executeArchiveClass(classId, archiveState);
      },
    });
  };

  const handleClassClick = (classItem) => {
    // Only navigate to classroom details if it's active (not archived)
    if (classItem.isArchived) {
      showToast("This class is archived. Please restore it first to view student details and sessions.", 'info');
      return;
    }
    navigate(`/class/${classItem._id}`);
  };

  const handleLogoClick = () => {
    navigate('/');
  };

  // Local search, filtering, and tab selectors logic
  const getFilteredClasses = () => {
    let list = [...classes];
    
    // 1. Filter by active vs archived viewMode
    if (viewMode === "active") {
      list = list.filter(c => c.isArchived !== true);
    } else {
      list = list.filter(c => c.isArchived === true);
    }
    
    // 2. Search filter
    if (searchTerm.trim() !== "") {
      const term = searchTerm.toLowerCase();
      list = list.filter(c => 
        (c.name && c.name.toLowerCase().includes(term)) ||
        (c.subject && c.subject.toLowerCase().includes(term)) ||
        (c.classCode && c.classCode.toLowerCase().includes(term))
      );
    }
    
    // 3. Sorting filter
    if (currentSort === "name") {
      list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    } else if (currentSort === "students") {
      list.sort((a, b) => (b.students?.length || 0) - (a.students?.length || 0));
    } else if (currentSort === "newest") {
      list.sort((a, b) => {
        const aId = a._id || "";
        const bId = b._id || "";
        return bId.localeCompare(aId);
      });
    }
    
    return list;
  };

  const visibleClasses = getFilteredClasses();

  return (
    <div className="min-h-screen bg-paper font-body text-ink">
      <Header onLogoClick={handleLogoClick} />
      
      <PageTransition className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        
        {/* Welcome Hero Panel */}
        <section className="flex flex-wrap gap-6 justify-between items-end mb-8 mt-2">
          <div>
            <p className="font-mono text-xs uppercase tracking-wider text-violet-600 font-semibold mb-2">{todayDate}</p>
            <h1 className="font-display font-semibold text-3xl sm:text-4xl mb-1.5 tracking-tight text-ink">
              {getGreeting()}, <span className="text-violet-600 font-bold">{user.name ? user.name.split(' ')[0] : 'Teacher'}</span>
            </h1>
            <p className="text-sm sm:text-base text-ink-soft">Here's what's happening across your classes today.</p>
          </div>
          
          {/* Stats Ledger - hidden on mobile view */}
          <div className="hidden sm:flex bg-surface border border-line rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-r border-dashed border-line min-w-[108px] text-center sm:text-left">
              <span className="font-mono font-semibold text-2xl text-ink block">
                {classes.filter(c => c.isArchived !== true).length}
              </span>
              <span className="text-[11px] text-ink-soft uppercase tracking-wider font-semibold">Classes</span>
            </div>
            <div className="px-5 py-3.5 min-w-[108px] text-center sm:text-left">
              <span className="font-mono font-semibold text-2xl text-ink block">{getOverallAvgAttendance()}%</span>
              <span className="text-[11px] text-ink-soft uppercase tracking-wider font-semibold">Avg Attendance</span>
            </div>
          </div>
        </section>

        {/* Section Heading & Page Actions */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mt-12 mb-6">
          <div>
            <h2 className="font-display text-2xl font-semibold mb-1 text-ink">
              {viewMode === "active" ? "My Active Classes" : "Archived Classes"}
            </h2>
            <p className="text-sm text-ink-soft">
              {viewMode === "active" 
                ? "Manage your classes and share codes with students" 
                : "Browse historical classes or restore them to active view"
              }
            </p>
          </div>
          
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto">
            <button
              onClick={() => setShowSeminarQR(true)}
              className="px-4 py-2.5 bg-surface hover:bg-violet-50 text-ink hover:text-violet-600 border border-line rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer w-full sm:w-auto col-span-1"
            >
              <QrCode className="w-4 h-4 text-violet-600" />
              Seminar QR
            </button>
            <button
              onClick={() => navigate('/seminar-attendance')}
              className="px-4 py-2.5 bg-surface hover:bg-teal-50 text-ink hover:text-teal-700 border border-line rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer w-full sm:w-auto col-span-1"
            >
              <ClipboardList className="w-4 h-4 text-teal-600" />
              Seminar Records
            </button>
            <button
              onClick={() => {
                setEditingClass(null);
                setIsModalOpen(true);
              }}
              className="px-5 py-2.5 bg-violet-600 hover:bg-violet-950 text-white rounded-xl font-bold text-xs sm:text-sm transition-all shadow-sm cursor-pointer flex items-center justify-center gap-2 w-full sm:w-auto col-span-2"
            >
              <Plus className="w-4 h-4 text-white stroke-[2.5px]" />
              Create New Class
            </button>
          </div>
        </div>

        {/* Search, Filter & Sorting Panel */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between mb-6">
          <div className="relative flex-1 max-w-md">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-soft pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>
            </svg>
            <input 
              type="text" 
              placeholder="Search by class name, subject or code"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-line rounded-xl text-sm text-ink bg-surface focus:outline-none focus:ring-2 focus:ring-violet-600 focus:ring-offset-1 focus:border-transparent font-medium shadow-sm"
            />
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* View Selector Toggle (Active vs Archived) */}
            <div className="bg-surface border border-line rounded-xl p-1 flex items-center shadow-sm">
              <button
                onClick={() => setViewMode("active")}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === "active" 
                    ? "bg-violet-600 text-white shadow-sm" 
                    : "text-ink-soft hover:text-violet-600 hover:bg-violet-50/50"
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setViewMode("archived")}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === "archived" 
                    ? "bg-violet-600 text-white shadow-sm" 
                    : "text-ink-soft hover:text-violet-600 hover:bg-violet-50/50"
                }`}
              >
                Archived
              </button>
            </div>

            {/* Filter Dropdown */}
            <div className="relative w-full sm:w-auto" ref={filterRef}>
              <button 
                onClick={() => setShowFilterPop(!showFilterPop)}
                className="w-full sm:w-auto px-5 py-2.5 bg-surface hover:bg-violet-50 text-ink hover:text-violet-600 border border-line rounded-xl font-bold text-sm transition-all flex items-center justify-between sm:justify-start gap-2.5 cursor-pointer shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-[#6B6478] stroke-[2px]" />
                  <span>{currentSort === 'all' ? 'Filter' : `Filter: ${currentSort === 'name' ? 'Name' : currentSort === 'students' ? 'Students' : 'Newest'}`}</span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showFilterPop ? 'rotate-180' : ''}`} />
              </button>
              
              <AnimatePresence>
                {showFilterPop && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: -5 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -5 }}
                    className="absolute right-0 mt-2 w-44 bg-surface border border-line rounded-lg shadow-md py-1.5 z-40"
                  >
                    <button 
                      onClick={() => { setCurrentSort('name'); setShowFilterPop(false); }}
                      className={`w-full text-left px-4 py-2 text-[13.5px] hover:bg-violet-50 ${currentSort === 'name' ? 'text-violet-600 font-bold' : 'text-ink'}`}
                    >
                      Name (A–Z)
                    </button>
                    <button 
                      onClick={() => { setCurrentSort('students'); setShowFilterPop(false); }}
                      className={`w-full text-left px-4 py-2 text-[13.5px] hover:bg-violet-50 ${currentSort === 'students' ? 'text-violet-600 font-bold' : 'text-ink'}`}
                    >
                      Most students
                    </button>
                    <button 
                      onClick={() => { setCurrentSort('newest'); setShowFilterPop(false); }}
                      className={`w-full text-left px-4 py-2 text-[13.5px] hover:bg-violet-50 ${currentSort === 'newest' ? 'text-violet-600 font-bold' : 'text-ink'}`}
                    >
                      Newest first
                    </button>
                    <button 
                      onClick={() => { setCurrentSort('all'); setShowFilterPop(false); }}
                      className={`w-full text-left px-4 py-2 text-[13.5px] hover:bg-violet-50 ${currentSort === 'all' ? 'text-violet-600 font-bold' : 'text-ink'}`}
                    >
                      Clear sort
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Classes grid display */}
        {loading ? (
          <div className="flex items-center justify-center min-h-[300px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p className="text-sm sm:text-base text-ink-soft">Loading classrooms...</p>
            </div>
          </div>
        ) : (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6"
          >
            {/* Render dynamically filtered classrooms */}
            {visibleClasses.map((classItem) => (
              <motion.div key={classItem._id} variants={itemVariants} className="h-full">
                <ClassCard
                  classData={{
                    id: classItem._id,
                    _id: classItem._id,
                    name: classItem.name,
                    subject: classItem.subject || classItem.name,
                    studentCount: classItem.students?.length || 0,
                    classCode: classItem.classCode,
                    students: classItem.students,
                    color: classItem.colorTheme || classItem.color || "bg-gradient-to-br from-purple-500 to-purple-700",
                    colorTheme: classItem.colorTheme,
                    themeImage: classItem.themeImage,
                    themeId: classItem.themeId,
                    isArchived: classItem.isArchived,
                  }}
                  onClick={() => handleClassClick(classItem)}
                  onDelete={handleDeleteClass}
                  onArchive={handleArchiveClass}
                  onEdit={() => {
                    setEditingClass(classItem);
                    setIsModalOpen(true);
                  }}
                />
              </motion.div>
            ))}

            {/* Redesigned Add a new class dashed card - Hide in archived mode */}
            {viewMode === "active" && (
              <motion.div variants={itemVariants} className="h-full relative min-h-[260px]">
                <div 
                  onClick={() => {
                    setEditingClass(null);
                    setIsModalOpen(true);
                  }}
                  className="border-2 border-dashed border-line hover:border-violet-600 rounded-2xl bg-transparent hover:bg-violet-50 h-full flex flex-col items-center justify-center p-5 text-center cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-1 transform"
                >
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-11 h-11 rounded-full bg-violet-50 flex items-center justify-center mb-3">
                      <svg className="w-5 h-5 stroke-violet-600" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round">
                        <path d="M12 5v14M5 12h14"/>
                      </svg>
                    </div>
                    <strong className="text-ink text-[14.5px] block font-bold mb-0.5">Add a new class</strong>
                    <span className="text-ink-soft text-[12.5px]">Set up a class and get a join code</span>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </PageTransition>

      {/* Modal overlays */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50">
            <NewClass
              isOpen={isModalOpen}
              onClose={() => {
                setIsModalOpen(false);
                setEditingClass(null);
              }}
              onCreate={handleCreateClass}
              onUpdate={handleUpdateClass}
              initialData={editingClass}
              mode={editingClass ? "edit" : "create"}
            />
          </div>
        )}
      </AnimatePresence>
      {showSeminarQR && (
        <SeminarQRGenerator onClose={() => setShowSeminarQR(false)} />
      )}

      {/* Toast Notification */}
      <ToastNotification
        message={toast.message}
        type={toast.type}
        onClose={clearToast}
      />

      {/* Confirmation Card Dialog */}
      <ConfirmationCard
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        cancelText={confirmDialog.cancelText}
        type={confirmDialog.type}
        onConfirm={confirmDialog.onConfirm}
        onCancel={closeConfirm}
      />
      
      {/* PWA Install Prompt */}
      <PWAInstallPrompt />
    </div>
  );
};

export default Dashboard;