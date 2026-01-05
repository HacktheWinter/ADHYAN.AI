import { useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import Header from "../components/Header";
import FeedbackBuilder from "../components/FeedbackBuilder";
import FeedbackResults from "../components/FeedbackResults";

const TeacherFeedbackPage = () => {
  const location = useLocation();
  const className = location.state?.className || "Class";
  const { classId } = useParams();
  const [activeTab, setActiveTab] = useState("create");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <Header />

      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="text-center mb-10">
          <h1 className="text-2xl font-semibold text-gray-900">
            Feedback – {className}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Create feedback forms and review student responses
          </p>

          {/* Tabs */}
          <div className="flex justify-center gap-10 mt-6 border-b">
            <button
              onClick={() => setActiveTab("create")}
              className={`pb-3 text-sm font-medium transition ${
                activeTab === "create"
                  ? "text-purple-700 border-b-2 border-purple-600"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              Create Feedback
            </button>

            <button
              onClick={() => setActiveTab("results")}
              className={`pb-3 text-sm font-medium transition ${
                activeTab === "results"
                  ? "text-purple-700 border-b-2 border-purple-600"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              See Results
            </button>
          </div>
        </div>

        {activeTab === "create" && <FeedbackBuilder classId={classId} />}

        {activeTab === "results" && <FeedbackResults classId={classId} />}
      </div>
    </div>
  );
};

export default TeacherFeedbackPage;
