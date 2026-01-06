import React from "react";
import { useParams } from "react-router-dom";
import DoubtChat from "../components/DoubtChat";
import { getStoredUser } from "../utils/authStorage";

export default function DoubtPage() {
  const { id: classId } = useParams();

  const user = getStoredUser();

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
    <div
      className="bg-white rounded-xl border overflow-hidden shadow-lg"
      style={{ height: "calc(100vh - 280px)" }}
    >
      <DoubtChat classId={classId} user={user} />
    </div>
  );
}
