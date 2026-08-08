import { useState, useEffect, useRef } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Plus, Download, ChevronDown, Loader2, FileSpreadsheet } from "lucide-react";
import Header from "../components/Header";
import FeedbackBuilder from "../components/FeedbackBuilder";
import FeedbackResults from "../components/FeedbackResults";
import * as XLSX from "xlsx";
import API_BASE_URL from "../config";
import { getStoredToken } from "../utils/authStorage";

const TeacherFeedbackPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const className = location.state?.className || "Class";
  const { classId } = useParams();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  
  // Dropdown states
  const [showDownloadDropdown, setShowDownloadDropdown] = useState(false);
  const [feedbackList, setFeedbackList] = useState([]);
  const dropdownRef = useRef(null);

  const handleBack = () => {
    navigate(-1);
  };

  const handleCreateSuccess = () => {
    setShowCreateModal(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDownloadDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchFeedbackForDropdown = async () => {
    try {
      // If we already have the list, just toggle
      if (feedbackList.length > 0) {
        setShowDownloadDropdown(!showDownloadDropdown);
        return;
      }
      
      setDownloadLoading(true); // temporary loading to fetch list
      const token = getStoredToken();
      if (!token) {
        alert("Authentication required. Please login again.");
        return;
      }
      
      const res = await fetch(
        `${API_BASE_URL}/feedback/results/all/${classId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.ok) {
        const data = await res.json();
        setFeedbackList(Array.isArray(data) ? data : []);
        setShowDownloadDropdown(true);
      } else {
        console.error("Failed to fetch feedback list");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setDownloadLoading(false);
    }
  };

  const generateExcel = (selection) => {
    try {
      setDownloadLoading(true);
      setShowDownloadDropdown(false); // close immediately
      
      let dataToExport = [];
      let fileName = `${className}_Feedback_Report.xlsx`;

      if (selection === "all") {
        dataToExport = feedbackList;
      } else {
        // selection is a specific feedback object
        dataToExport = [selection];
        const dateStr = new Date(selection.createdAt).toLocaleDateString().replace(/\//g, '-');
        fileName = `${className}_Feedback_${dateStr}.xlsx`;
      }

      if (dataToExport.length === 0) {
        alert("No data to export");
        return;
      }

      // Flatten data
      const rows = [];
      dataToExport.forEach((fb) => {
        const feedbackDate = new Date(fb.createdAt).toLocaleDateString();
        
        fb.responses.forEach((resp) => {
          const row = {
            "Feedback Date": feedbackDate,
            "Type": fb.isActive ? "Current" : "Past",
            "Student Name": resp.studentName,
            "Student Email": resp.studentEmail,
            "Comment": resp.comment || "",
          };

          resp.answers.forEach((ans, idx) => {
            row[`Q${idx + 1} Rating`] = ans.rating;
          });

          const avg = resp.answers.reduce((acc, curr) => acc + curr.rating, 0) / resp.answers.length;
          row["Average Rating"] = avg.toFixed(1);

          rows.push(row);
        });
      });

      if (rows.length === 0) {
        alert("No student responses found in selected feedback.");
        return;
      }

      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Results");
      XLSX.writeFile(workbook, fileName);

    } catch (error) {
      console.error("Export failed", error);
      alert("Failed to export Excel");
    } finally {
      setTimeout(() => setDownloadLoading(false), 500); // slight delay to show completion
    }
  };

  return (
    <div className="min-h-screen bg-paper text-ink font-body">
      {/* Navbar */}
      <Header />

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header Section */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
          <div className="flex items-start gap-3 sm:items-center sm:gap-4">
            <button
              onClick={handleBack}
              className="p-2.5 bg-surface hover:bg-paper-hover rounded-xl border border-line transition cursor-pointer text-ink-soft hover:text-ink flex-shrink-0 mt-0.5 sm:mt-0"
              title="Go back"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="min-w-0">
              <h1 className="text-2xl md:text-2xl font-bold text-ink font-display truncate">
                Feedback – {className}
              </h1>
              <p className="text-xs sm:text-sm text-ink-soft mt-0.5 sm:mt-1 leading-relaxed">
                Manage and review student feedback
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between md:justify-end gap-3 w-full md:w-auto">
             {/* Download Dropdown */}
             <div className="relative flex-shrink-0" ref={dropdownRef}>
               <button
                onClick={fetchFeedbackForDropdown}
                disabled={downloadLoading}
                className="bg-surface text-ink border border-line h-10 w-10 sm:h-12 sm:w-12 flex items-center justify-center rounded-xl hover:bg-paper-hover hover:text-violet-700 dark:hover:text-violet-400 transition shadow-sm cursor-pointer disabled:opacity-70"
                title="Download Results"
              >
                {downloadLoading ? (
                  <Loader2 className="animate-spin text-violet-700 dark:text-violet-400 w-4 h-4 sm:w-5 sm:h-5" />
                ) : (
                  <Download className="w-4 h-4 sm:w-5 sm:h-5" />
                )}
              </button>
              
              <AnimatePresence>
                {showDownloadDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-64 bg-surface rounded-xl shadow-xl border border-line overflow-hidden z-50 origin-top-right"
                  >
                    <div className="p-2 border-b border-line bg-paper">
                      <p className="text-xs font-semibold text-ink-soft uppercase tracking-wider px-2">Select Report</p>
                    </div>
                    
                    <div className="max-h-60 overflow-y-auto">
                      <button
                        onClick={() => generateExcel("all")}
                        className="w-full text-left px-4 py-3 hover:bg-violet-500/10 hover:text-violet-700 text-ink transition flex items-center gap-2 text-sm font-semibold cursor-pointer border-none bg-transparent"
                      >
                        <FileSpreadsheet size={16} className="text-violet-700" />
                        All Feedback (Combined)
                      </button>
                      
                      {feedbackList.map((fb, idx) => (
                        <button
                          key={fb._id}
                          onClick={() => generateExcel(fb)}
                          className="w-full text-left px-4 py-3 hover:bg-violet-500/10 hover:text-violet-700 text-ink transition flex items-center justify-between text-sm border-t border-line cursor-pointer border-none bg-transparent"
                        >
                          <div className="flex items-center gap-2">
                             <span className="text-ink-soft/40 text-xs font-bold">#{feedbackList.length - idx}</span>
                             <span className={fb.isActive ? "text-emerald-600 font-semibold" : "text-ink"}>
                               {new Date(fb.createdAt).toLocaleDateString()}
                             </span>
                          </div>
                          <span className="text-xs bg-paper text-ink-soft px-1.5 py-0.5 rounded-md font-bold">
                            {fb.responses.length}
                          </span>
                        </button>
                      ))}
                      
                      {feedbackList.length === 0 && (
                        <div className="px-4 py-3 text-sm text-ink-soft text-center">No feedback available</div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
             </div>
            
             <button
              onClick={() => setShowCreateModal(true)}
              className="flex-grow md:flex-none justify-center bg-violet-700 hover:bg-violet-800 text-white dark:bg-violet-950/40 dark:text-violet-300 border border-transparent dark:border-violet-700/60 dark:hover:border-violet-500 dark:hover:bg-violet-950/80 px-4 py-2 sm:px-6 sm:py-3 rounded-xl transition flex items-center gap-1.5 font-bold shadow-sm cursor-pointer text-xs sm:text-base"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Create Feedback</span>
            </button>
          </div>
        </div>

        {/* Results Section */}
        <FeedbackResults classId={classId} />
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <FeedbackBuilder
            classId={classId}
            onClose={() => setShowCreateModal(false)}
            onSuccess={handleCreateSuccess}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default TeacherFeedbackPage;
