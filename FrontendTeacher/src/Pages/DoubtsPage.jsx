import React from 'react';
import { useParams } from 'react-router-dom';
import DoubtChat from '../components/TeacherDoubts';
import { getStoredUser } from '../utils/authStorage';

const DoubtsPage = () => {
  const { classId } = useParams();
  const currentUser = getStoredUser() || {};

  return (
    <div className="min-h-screen bg-transparent">
      <DoubtChat
        classId={classId}
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