// FrontendTeacher/src/Pages/DoubtsPage.jsx
import React from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import DoubtChat from '../components/TeacherDoubts';

const DoubtsPage = () => {
  const { classId } = useParams();
  const { classData, currentUser } = useOutletContext();

  return (
    <div
      className="bg-white rounded-xl border overflow-hidden shadow-lg"
      style={{ height: "calc(100vh - 280px)" }}
    >
      <DoubtChat
        classId={classData._id || classData.id || classId}
        user={{
          id: currentUser._id || currentUser.id,
          _id: currentUser._id || currentUser.id,
          name: currentUser.name,
          role: currentUser.role || "teacher",
        }}
      />
    </div>
  );
};

export default DoubtsPage;