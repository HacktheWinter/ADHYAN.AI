// FrontendStudent/src/Pages/CodingRound.jsx
import React, { useState, useEffect, useCallback } from "react";
import { useOutletContext, useNavigate, useParams } from "react-router-dom";
import {
  Code2,
  Clock,
  Play,
  CheckCircle,
  AlertCircle,
  Loader,
  FileCode,
  Lock,
  Shield,
  Info,
  X,
} from "lucide-react";
import { getActiveCodingAssessments } from "../api/codingAssessmentApi";

export default function CodingRound() {
  const { classInfo } = useOutletContext();
  const { id: classId } = useParams();
  const navigate = useNavigate();

  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [showInstructionModal, setShowInstructionModal] = useState(false);

  const fetchAssessments = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getActiveCodingAssessments(classId);
      setAssessments(data.assessments || []);
    } catch (error) {
      console.error("Error fetching coding assessments:", error);
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    fetchAssessments();
  }, [fetchAssessments]);

  const handleOpenInstructionModal = (assessment) => {
    setSelectedAssessment(assessment);
    setShowInstructionModal(true);
  };

  const handleConfirmStartExam = () => {
    if (!selectedAssessment) return;
    const targetId = selectedAssessment._id;
    setShowInstructionModal(false);
    setSelectedAssessment(null);
    navigate(`/coding-round/${classId}/${targetId}`);
  };

  const getAssessmentStatus = (assessment) => {
    const now = new Date();

    if (assessment.alreadySubmitted) {
      return { text: 'Submitted', color: 'bg-green-100 text-green-800', icon: CheckCircle };
    }

    if (assessment.endTime && now > new Date(assessment.endTime)) {
      return { text: 'Expired', color: 'bg-red-100 text-red-800', icon: AlertCircle };
    }

    if (assessment.startTime && now < new Date(assessment.startTime)) {
      return { text: 'Upcoming', color: 'bg-blue-100 text-blue-800', icon: Clock };
    }

    return { text: 'Active', color: 'bg-purple-100 text-purple-800', icon: Play };
  };

  const getRemainingTime = (assessment) => {
    if (!assessment.endTime) return 'No time limit';

    const now = new Date();
    const end = new Date(assessment.endTime);
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
        <span className="ml-3 text-gray-600">Loading coding rounds...</span>
      </div>
    );
  }

  if (assessments.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Code2 className="w-8 h-8 text-purple-600" />
        </div>
        <p className="text-xl font-semibold text-gray-900 mb-2">No Coding Rounds Available</p>
        <p className="text-gray-500">Your teacher hasn't published any coding rounds yet.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {assessments.map((assessment) => {
          const status = getAssessmentStatus(assessment);
          const StatusIcon = status.icon;
          const isExpired = assessment.endTime && new Date() > new Date(assessment.endTime);
          const canTake = !assessment.alreadySubmitted && !isExpired;

          return (
            <div
              key={assessment._id}
              className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900 flex-1">
                  {assessment.title}
                </h3>
                <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${status.color}`}>
                  <StatusIcon className="w-3 h-3" />
                  {status.text}
                </span>
              </div>

              <div className="space-y-2 text-sm text-gray-600 mb-4">
                <p className="flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-purple-600" />
                  <span>HTML + CSS + JS Coding Task</span>
                </p>

                <p className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {assessment.duration} minutes
                </p>

                {assessment.endTime && (
                  <p className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {getRemainingTime(assessment)}
                  </p>
                )}
              </div>

              {/* Action Button */}
              {assessment.alreadySubmitted ? (
                <button
                  disabled
                  className="w-full py-2 rounded-lg font-medium bg-green-100 text-green-800 cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Submitted
                </button>
              ) : canTake ? (
                <button
                  onClick={() => handleOpenInstructionModal(assessment)}
                  className="w-full py-2 rounded-lg font-medium transition-colors bg-purple-700 text-white hover:bg-purple-800 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Play className="w-4 h-4" />
                  Start Coding Round
                </button>
              ) : (
                <button
                  disabled
                  className="w-full py-2 rounded-lg font-medium bg-gray-100 text-gray-400 cursor-not-allowed"
                >
                  Round Expired
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Coding Round Instructions Modal */}
      {showInstructionModal && selectedAssessment && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-body">
          <div className="max-w-2xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-gray-100">
            {/* Header */}
            <div className="bg-white px-8 py-6 border-b border-gray-100 flex items-center justify-between sticky top-0 z-10">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-1">{selectedAssessment.title}</h1>
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">
                  Coding Round Instructions
                </p>
              </div>
              <button
                onClick={() => {
                  setShowInstructionModal(false);
                  setSelectedAssessment(null);
                }}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-8 overflow-y-auto space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-col items-center justify-center text-center">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-purple-600" />
                    Time Limit
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {selectedAssessment.duration ? `${selectedAssessment.duration} Min` : 'No Limit'}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-col items-center justify-center text-center">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <FileCode className="w-4 h-4 text-purple-600" />
                    Environment
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    HTML + CSS + JS
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-lg font-bold text-gray-900 border-b pb-2">Important Guidelines</h3>

                <div className="flex gap-4 items-start p-4 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                  <Shield className="w-6 h-6 text-purple-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">Full Screen Proctored</h4>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      This exam is strictly proctored. You must remain in full-screen mode at all times. <strong>Exiting full-screen 4 times will automatically submit your attempt.</strong>
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 items-start p-4 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                  <Info className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">Auto-Save & Real-Time Live Preview</h4>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      Your code will be auto-saved every 30 seconds. You can run and inspect live HTML, CSS, and JS output anytime during the exam.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 items-start p-4 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                  <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">Do Not Switch Tabs or Refresh</h4>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      Switching tabs or closing windows will record a proctoring violation. <strong>Refreshing the page more than 4 times will automatically submit your test.</strong>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-4 mt-auto">
              <button
                onClick={() => {
                  setShowInstructionModal(false);
                  setSelectedAssessment(null);
                }}
                className="px-6 py-2.5 font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmStartExam}
                className="px-8 py-2.5 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl transition-colors shadow-md shadow-purple-600/20 cursor-pointer flex items-center gap-2"
              >
                <Play className="w-4 h-4 fill-current" />
                I Understand, Start Exam
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

