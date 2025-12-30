// FrontendStudent/src/Pages/Assignments.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { Clock, CheckCircle, Play, Eye, Loader, AlertCircle, FileText } from 'lucide-react';
import { getActiveAssignments, checkSubmission } from '../api/assignmentApi';
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

  const handleViewResult = (assignment) => {
    setSelectedAssignment(assignment);
    setShowResultModal(true);
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
                <button
                  onClick={() => handleTakeAssignment(assignment)}
                  className="w-full py-2 rounded-lg font-medium transition-colors bg-purple-700 text-white hover:bg-purple-800 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Play className="w-4 h-4" />
                  Start Assignment
                </button>
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
    </div>
  );
}
