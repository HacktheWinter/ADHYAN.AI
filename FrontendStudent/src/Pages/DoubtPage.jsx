import React from "react";
import { useParams } from "react-router-dom";
import DoubtChat from "../components/DoubtChat";

export default function DoubtPage() {
  const { id: classId } = useParams();

  const user = JSON.parse(localStorage.getItem("user"));

  // If user is not logged in
  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <p className="text-gray-700 text-lg">
          You must be logged in to access this page.
        </p>
      </div>
    );
  }

  // If no class ID found
  if (!classId) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <p className="text-gray-700 text-lg">Class ID is missing.</p>
      </div>
    );
  }

  return (
    <div className="h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-md">
        <h1 className="text-xl font-bold">Class Doubt Portal</h1>
        <p className="text-sm opacity-90">Class ID: {classId}</p>
      </div>

      {/* Chat Section */}
      <div className="flex-1 overflow-hidden">
        <DoubtChat classId={classId} user={user} />
      </div>
    </div>
  );
}
