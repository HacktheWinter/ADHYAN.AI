// FrontendStudent/src/Pages/Assignments.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { Clock, CheckCircle, Play, Eye, Loader, AlertCircle, FileText, Upload, X, MoreVertical, HelpCircle } from 'lucide-react';
import { getActiveAssignments, checkSubmission, submitAssignmentPDF } from '../api/assignmentApi';
import TakeAssignmentModal from '../components/TakeAssignmentModal';
import AssignmentResultModal from '../components/AssignmentResultModal';

export default function Assignments() {
  const { id: classId } = useParams();
  const { classInfo } = useOutletContext();
  
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState({});
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [showTakingModal, setShowTakingModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileError, setFileError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showQuestionsModal, setShowQuestionsModal] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.dropdown-container')) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    fetchAssignments();
  }, [classId]);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const response = await getActiveAssignments(classId);
      const assignmentsData = response.assignments || [];
      
      // Check submissions for each assignment
      const submissionChecks = await Promise.all(
        assignmentsData.map(assignment => 
          checkSubmission(assignment._id, classInfo.studentId)
        )
      );
      
      const submissionMap = {};
      assignmentsData.forEach((assignment, index) => {
        submissionMap[assignment._id] = {
          hasSubmitted: submissionChecks[index].hasSubmitted,
          status: submissionChecks[index].status
        };
      });
      
      setAssignments(assignmentsData);
      setSubmissions(submissionMap);
    } catch (error) {
      console.error('Error fetching assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTakeAssignment = (assignment) => {
    setSelectedAssignment(assignment);
    setShowTakingModal(true);
  };

  const handleOpenQuestions = (assignment) => {
    setSelectedAssignment(assignment);
    setShowQuestionsModal(true);
  };

  const handleViewResult = (assignment) => {
    setSelectedAssignment(assignment);
    setShowResultModal(true);
  };

  const handleUploadPDF = (assignment) => {
    setSelectedAssignment(assignment);
    setSelectedFile(null);
    setFileError('');
    setShowUploadModal(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setFileError('Please select a valid PDF file.');
      setSelectedFile(null);
      return;
    }

    if (file.size > 4 * 1024 * 1024) { // 4MB maximum
      setFileError('File too large. Maximum size is 4MB.');
      setSelectedFile(null);
      return;
    }

    setFileError('');
    setSelectedFile(file);
  };

  const handlePDFSubmit = async () => {
    if (!selectedFile || !selectedAssignment) return;

    try {
      setUploading(true);
      await submitAssignmentPDF(selectedAssignment._id, classInfo.studentId, selectedFile);
      setShowUploadModal(false);
      setSelectedFile(null);
      setSelectedAssignment(null);
      fetchAssignments();
    } catch (error) {
       console.error('Error uploading PDF:', error);
       setFileError(error.response?.data?.error || 'Failed to upload PDF. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleAssignmentSubmitted = () => {
    setShowTakingModal(false);
    setSelectedAssignment(null);
    fetchAssignments();
  };

  const getAssignmentStatus = (assignment) => {
    const submission = submissions[assignment._id];
    const now = new Date();
    
    if (submission?.hasSubmitted) {
      if (submission.status === 'checked') {
        return { text: 'Completed', color: 'bg-green-100 text-green-800', icon: CheckCircle };
      } else {
        return { text: 'Pending Result', color: 'bg-yellow-100 text-yellow-800', icon: Clock };
      }
    }
    
    if (!assignment.isActive) {
      return { text: 'Expired', color: 'bg-red-100 text-red-800', icon: AlertCircle };
    }
    
    if (assignment.dueDate && now > new Date(assignment.dueDate)) {
      return { text: 'Overdue', color: 'bg-red-100 text-red-800', icon: AlertCircle };
    }
    
    return { text: 'Active', color: 'bg-purple-100 text-purple-800', icon: Play };
  };

  const getTimeRemaining = (assignment) => {
    if (!assignment.dueDate) return 'No deadline';
    
    const now = new Date();
    const due = new Date(assignment.dueDate);
    const diff = due - now;
    
    if (diff <= 0) return 'Overdue';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''} left`;
    }
    
    if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} left`;
    }
    
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${minutes} minute${minutes > 1 ? 's' : ''} left`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-8 h-8 text-purple-600 animate-spin" />
        <span className="ml-3 text-gray-600">Loading assignments...</span>
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <FileText className="w-8 h-8 text-purple-600" />
        </div>
        <p className="text-xl font-semibold text-gray-900 mb-2">No Assignments Available</p>
        <p className="text-gray-500">Your teacher hasn't published any assignments yet.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {assignments.map((assignment) => {
          const status = getAssignmentStatus(assignment);
          const StatusIcon = status.icon;
          const submission = submissions[assignment._id];
          const isExpired = !assignment.isActive || (assignment.dueDate && new Date() > new Date(assignment.dueDate));
          const canTake = !submission?.hasSubmitted && !isExpired;

          return (
            <div 
              key={assignment._id} 
              className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900 flex-1">
                  {assignment.title}
                </h3>
                <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${status.color}`}>
                  <StatusIcon className="w-3 h-3" />
                  {status.text}
                </span>
              </div>

              {assignment.description && (
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">{assignment.description}</p>
              )}

              <div className="space-y-2 text-sm text-gray-600 mb-4">
                <p className="flex items-center gap-2">
                  <span className="font-medium">📝</span> 
                  {assignment.questions?.length || 0} questions • {assignment.totalMarks} marks
                </p>

                {assignment.dueDate && (
                  <p className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Due: {new Date(assignment.dueDate).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                )}

                {assignment.dueDate && !isExpired && (
                  <p className="flex items-center gap-2 text-orange-600 font-medium">
                    <Clock className="w-4 h-4" />
                    {getTimeRemaining(assignment)}
                  </p>
                )}
              </div>

              {/* Action Button */}
              {submission?.hasSubmitted ? (
                submission.status === 'checked' ? (
                  <button
                    onClick={() => handleViewResult(assignment)}
                    className="w-full py-2 rounded-lg font-medium transition-colors bg-green-600 text-white hover:bg-green-700 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Eye className="w-4 h-4" />
                    View Result
                  </button>
                ) : (
                  <button
                    disabled
                    className="w-full py-2 rounded-lg font-medium bg-yellow-100 text-yellow-800 cursor-not-allowed"
                  >
                    <Clock className="w-4 h-4 inline mr-2" />
                    Awaiting Results
                  </button>
                )
              ) : canTake ? (
                <div className="flex gap-2 w-full relative">
                  <button
                    onClick={() => handleOpenQuestions(assignment)}
                    className="flex-1 py-2 rounded-lg font-medium transition-colors bg-purple-700 text-white hover:bg-purple-800 flex items-center justify-center gap-2 cursor-pointer text-sm"
                  >
                    <HelpCircle className="w-4 h-4" />
                    View Questions
                  </button>
                  <div className="dropdown-container">
                    <button
                      onClick={() => setOpenDropdownId(openDropdownId === assignment._id ? null : assignment._id)}
                      className="w-10 h-full rounded-lg border-2 border-gray-200 text-gray-600 hover:bg-gray-50 flex items-center justify-center cursor-pointer transition-colors"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>
                    {openDropdownId === assignment._id && (
                      <div className="absolute right-0 bottom-full mb-2 w-48 bg-white border border-gray-200 rounded-lg shadow-xl z-20 py-1 overflow-hidden transform transition-all origin-bottom-right">
                        <button
                          onClick={() => {
                            setOpenDropdownId(null);
                            handleTakeAssignment(assignment);
                          }}
                          className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 cursor-pointer transition-colors"
                        >
                          <Play className="w-4 h-4 text-purple-600" />
                          Start Online
                        </button>
                        <button
                          onClick={() => {
                            setOpenDropdownId(null);
                            handleUploadPDF(assignment);
                          }}
                          className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 cursor-pointer transition-colors"
                        >
                          <Upload className="w-4 h-4 text-purple-600" />
                          Upload PDF
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <button
                  disabled
                  className="w-full py-2 rounded-lg font-medium bg-gray-100 text-gray-400 cursor-not-allowed"
                >
                  {isExpired ? 'Assignment Expired' : 'Not Available'}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Take Assignment Modal */}
      {showTakingModal && selectedAssignment && (
        <TakeAssignmentModal
          assignment={selectedAssignment}
          studentId={classInfo.studentId}
          studentName={classInfo.studentName}
          onClose={() => {
            setShowTakingModal(false);
            setSelectedAssignment(null);
          }}
          onSubmit={handleAssignmentSubmitted}
        />
      )}

      {/* Assignment Result Modal */}
      {showResultModal && selectedAssignment && (
        <AssignmentResultModal
          assignmentId={selectedAssignment._id}
          studentId={classInfo.studentId}
          onClose={() => {
            setShowResultModal(false);
            setSelectedAssignment(null);
          }}
        />
      )}

      {/* PDF Upload Modal */}
      {showUploadModal && selectedAssignment && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Upload Assignment</h3>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setSelectedFile(null);
                  setFileError('');
                }}
                className="text-gray-400 hover:text-gray-600 cursor-pointer" 
                disabled={uploading}
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-6">
              <p className="font-medium text-gray-900 mb-1">{selectedAssignment.title}</p>
              <p className="text-sm text-gray-600">
                {selectedAssignment.questions?.length} questions • {selectedAssignment.totalMarks} marks
              </p>
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center mb-4">
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-900 mb-1">Select a PDF file to upload</p>
              <p className="text-xs text-gray-500 mb-4">Maximum file size: 4MB</p>
              
              <input
                type="file"
                id="pdf-upload"
                accept="application/pdf"
                className="hidden"
                onChange={handleFileChange}
                disabled={uploading}
              />
              <label
                htmlFor="pdf-upload"
                className={`inline-block px-4 py-2 bg-purple-100 text-purple-700 font-medium rounded-lg ${uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-purple-200'} transition-colors text-sm`}
              >
                Browse Files
              </label>
            </div>

            {selectedFile && (
              <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-200 mb-4">
                <div className="flex items-center gap-3 overflow-hidden">
                  <FileText className="w-5 h-5 text-purple-600 flex-shrink-0" />
                  <span className="text-sm text-gray-700 truncate">{selectedFile.name}</span>
                </div>
                {!uploading && (
                  <button onClick={() => setSelectedFile(null)} className="text-gray-400 hover:text-red-500 mr-2 flex-shrink-0 cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}

            {fileError && <p className="text-red-500 text-sm mb-4">{fileError}</p>}

            <button
              onClick={handlePDFSubmit}
              disabled={!selectedFile || uploading}
              className="w-full py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              {uploading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                'Submit Assignment'
              )}
            </button>
          </div>
        </div>
      )}

      {/* Questions Modal */}
      {showQuestionsModal && selectedAssignment && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{selectedAssignment.title}</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedAssignment.questions?.length || 0} questions • {selectedAssignment.totalMarks} marks total
                </p>
              </div>
              <button
                onClick={() => {
                  setShowQuestionsModal(false);
                  setSelectedAssignment(null);
                }}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {selectedAssignment.questions?.map((q, idx) => (
                <div key={q._id || idx} className="bg-gray-50 rounded-lg border border-gray-200 p-5">
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="font-semibold text-gray-800 text-base">Question {idx + 1}</h4>
                    <span className="text-xs font-bold text-purple-700 bg-purple-100 px-3 py-1 rounded-full uppercase tracking-wider">
                      {q.marks} Marks
                    </span>
                  </div>
                  <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{q.question}</p>
                </div>
              ))}
              {(!selectedAssignment.questions || selectedAssignment.questions.length === 0) && (
                <div className="text-center py-10">
                  <HelpCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">No questions available for this assignment.</p>
                </div>
              )}
            </div>
            
            <div className="p-5 border-t border-gray-200 flex flex-col sm:flex-row justify-end gap-3 bg-gray-50">
               <button
                  onClick={() => {
                     setShowQuestionsModal(false);
                     handleUploadPDF(selectedAssignment);
                  }}
                  className="px-5 py-2.5 border-2 border-purple-600 text-purple-700 font-bold rounded-lg hover:bg-purple-100 flex items-center justify-center gap-2 cursor-pointer transition-colors flex-1 sm:flex-none"
                >
                  <Upload className="w-4 h-4" />
                  Upload PDF
                </button>
               <button
                  onClick={() => {
                     setShowQuestionsModal(false);
                     handleTakeAssignment(selectedAssignment);
                  }}
                  className="px-5 py-2.5 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm flex-1 sm:flex-none"
                >
                  <Play className="w-4 h-4" />
                  Start Online
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
