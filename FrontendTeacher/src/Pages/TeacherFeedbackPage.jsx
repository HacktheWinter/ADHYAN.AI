import { useState, useEffect, useRef } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Plus, Download, ChevronDown, Loader2, FileSpreadsheet } from "lucide-react";
import Header from "../components/Header";
import FeedbackBuilder from "../components/FeedbackBuilder";
import FeedbackResults from "../components/FeedbackResults";
import * as XLSX from "xlsx";

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
      const token = localStorage.getItem("token");
      
      const res = await fetch(
        `http://localhost:5000/api/feedback/results/all/${classId}`,
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
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <Header />

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header Section */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBack}
              className="p-2 hover:bg-white rounded-lg border border-gray-200 transition cursor-pointer"
              title="Go back"
            >
              <ArrowLeft size={20} className="text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Feedback – {className}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Manage and review student feedback
              </p>
            </div>
          </div>

          <div className="flex gap-3">
             {/* Download Dropdown */}
             <div className="relative" ref={dropdownRef}>
               <button
                onClick={fetchFeedbackForDropdown}
                disabled={downloadLoading}
                className="bg-white text-gray-700 border border-gray-200 h-12 w-12 flex items-center justify-center rounded-xl hover:bg-gray-50 hover:text-purple-600 transition shadow-sm cursor-pointer disabled:opacity-70"
                title="Download Results"
              >
                {downloadLoading ? (
                  <Loader2 className="animate-spin text-purple-600" size={20} />
                ) : (
                  <Download size={20} />
                )}
              </button>
              
              <AnimatePresence>
                {showDownloadDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50 origin-top-right"
                  >
                    <div className="p-2 border-b border-gray-100 bg-gray-50">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2">Select Report</p>
                    </div>
                    
                    <div className="max-h-60 overflow-y-auto">
                      <button
                        onClick={() => generateExcel("all")}
                        className="w-full text-left px-4 py-3 hover:bg-purple-50 hover:text-purple-700 transition flex items-center gap-2 text-sm font-medium"
                      >
                        <FileSpreadsheet size={16} />
                        All Feedback (Combined)
                      </button>
                      
                      {feedbackList.map((fb, idx) => (
                        <button
                          key={fb._id}
                          onClick={() => generateExcel(fb)}
                          className="w-full text-left px-4 py-3 hover:bg-purple-50 hover:text-purple-700 transition flex items-center justify-between text-sm border-t border-gray-50"
                        >
                          <div className="flex items-center gap-2">
                             <span className="text-gray-400 text-xs">#{feedbackList.length - idx}</span>
                             <span className={fb.isActive ? "text-green-600 font-medium" : "text-gray-700"}>
                               {new Date(fb.createdAt).toLocaleDateString()}
                             </span>
                          </div>
                          <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-md">
                            {fb.responses.length}
                          </span>
                        </button>
                      ))}
                      
                      {feedbackList.length === 0 && (
                        <div className="px-4 py-3 text-sm text-gray-500 text-center">No feedback available</div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
             </div>
            
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-purple-600 text-white px-6 py-3 rounded-xl hover:bg-purple-700 transition flex items-center gap-2 font-medium shadow-lg shadow-purple-200 cursor-pointer"
            >
              <Plus size={20} />
              Create Feedback
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