// FrontendStudent/src/Pages/TestPapers.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { Clock, CheckCircle, Play, Eye, Loader, AlertCircle, FileText } from 'lucide-react';
import { getActiveTestPapers, checkSubmission } from '../api/testApi';
import TakeTestModal from '../components/TakeTestModal';
import TestResultModal from '../components/TestResultModal';

export default function TestPapers() {
  const { id: classId } = useParams();
  const { classInfo } = useOutletContext();
  
  const [testPapers, setTestPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState({});
  const [selectedTest, setSelectedTest] = useState(null);
  const [showTakingModal, setShowTakingModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);

  useEffect(() => {
    fetchTestPapers();
  }, [classId]);

  const fetchTestPapers = async () => {
    try {
      setLoading(true);
      const response = await getActiveTestPapers(classId);
      const testPapersData = response.testPapers || [];
      
      // Check submissions for each test
      const submissionChecks = await Promise.all(
        testPapersData.map(test => 
          checkSubmission(test._id, classInfo.studentId)
        )
      );
      
      const submissionMap = {};
      testPapersData.forEach((test, index) => {
        submissionMap[test._id] = {
          hasSubmitted: submissionChecks[index].hasSubmitted,
          status: submissionChecks[index].status
        };
      });
      
      setTestPapers(testPapersData);
      setSubmissions(submissionMap);
    } catch (error) {
      console.error('Error fetching test papers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTakeTest = (test) => {
    setSelectedTest(test);
    setShowTakingModal(true);
  };

  const handleViewResult = (test) => {
    setSelectedTest(test);
    setShowResultModal(true);
  };

  const handleTestSubmitted = () => {
    setShowTakingModal(false);
    setSelectedTest(null);
    fetchTestPapers();
  };

  const getTestStatus = (test) => {
    const submission = submissions[test._id];
    const now = new Date();
    
    if (submission?.hasSubmitted) {
      if (submission.status === 'checked') {
        return { text: 'Completed', color: 'bg-green-100 text-green-800', icon: CheckCircle };
      } else {
        return { text: 'Pending Result', color: 'bg-yellow-100 text-yellow-800', icon: Clock };
      }
    }
    
    if (!test.isActive) {
      return { text: 'Expired', color: 'bg-red-100 text-red-800', icon: AlertCircle };
    }
    
    if (test.startTime && now < new Date(test.startTime)) {
      return { text: 'Upcoming', color: 'bg-blue-100 text-blue-800', icon: Clock };
    }
    
    return { text: 'Active', color: 'bg-purple-100 text-purple-800', icon: Play };
  };

  const getRemainingTime = (test) => {
    if (!test.endTime) return 'No time limit';
    
    const now = new Date();
    const end = new Date(test.endTime);
    const diff = end - now;
    
    if (diff <= 0) return 'Expired';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days} day${days > 1 ? 's' : ''} left`;
    }
    
    if (hours > 0) {
      return `${hours}h ${minutes}m left`;
    }
    
    return `${minutes} minutes left`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-8 h-8 text-purple-600 animate-spin" />
        <span className="ml-3 text-gray-600">Loading test papers...</span>
      </div>
    );
  }

  if (testPapers.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <FileText className="w-8 h-8 text-purple-600" />
        </div>
        <p className="text-xl font-semibold text-gray-900 mb-2">No Test Papers Available</p>
        <p className="text-gray-500">Your teacher hasn't published any test papers yet.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {testPapers.map((test) => {
          const status = getTestStatus(test);
          const StatusIcon = status.icon;
          const submission = submissions[test._id];
          const isExpired = !test.isActive || (test.endTime && new Date() > new Date(test.endTime));
          const canTake = !submission?.hasSubmitted && !isExpired;

          return (
            <div 
              key={test._id} 
              className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900 flex-1">
                  {test.title}
                </h3>
                <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${status.color}`}>
                  <StatusIcon className="w-3 h-3" />
                  {status.text}
                </span>
              </div>

              <div className="space-y-2 text-sm text-gray-600 mb-4">
                <p className="flex items-center gap-2">
                  <span className="font-medium">📝</span> 
                  {test.questions?.length || 0} questions • {test.totalMarks} marks
                </p>
                
                {test.duration && (
                  <p className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {test.duration} minutes
                  </p>
                )}

                {test.endTime && (
                  <p className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {getRemainingTime(test)}
                  </p>
                )}
              </div>

              {/* Action Button */}
              {submission?.hasSubmitted ? (
                submission.status === 'checked' ? (
                  <button
                    onClick={() => handleViewResult(test)}
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
                  onClick={() => handleTakeTest(test)}
                  className="w-full py-2 rounded-lg font-medium transition-colors bg-purple-700 text-white hover:bg-purple-800 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Play className="w-4 h-4" />
                  Take Test
                </button>
              ) : (
                <button
                  disabled
                  className="w-full py-2 rounded-lg font-medium bg-gray-100 text-gray-400 cursor-not-allowed"
                >
                  Test Expired
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Take Test Modal */}
      {showTakingModal && selectedTest && (
        <TakeTestModal
          testPaper={selectedTest}
          studentId={classInfo.studentId}
          studentName={classInfo.studentName}
          onClose={() => {
            setShowTakingModal(false);
            setSelectedTest(null);
          }}
          onSubmit={handleTestSubmitted}
        />
      )}

      {/* Test Result Modal */}
      {showResultModal && selectedTest && (
        <TestResultModal
          testPaperId={selectedTest._id}
          studentId={classInfo.studentId}
          onClose={() => {
            setShowResultModal(false);
            setSelectedTest(null);
          }}
        />
      )}
    </div>
  );
}