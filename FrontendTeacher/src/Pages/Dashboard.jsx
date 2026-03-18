import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import ClassCard from "../components/ClassCard";
import NewClass from "../components/NewClass";
import { motion } from "framer-motion";
import PageTransition from "../components/PageTransition";
import { getClassrooms, createClassroom, deleteClassroom, updateClassroom } from "../api/classroomApi";
import { getStoredUser } from "../utils/authStorage";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [loading, setLoading] = useState(true);

  const user = getStoredUser() || {};
  const teacherId = user.id || user._id;
  const role = "teacher";

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        setLoading(true);
        const data = await getClassrooms(teacherId, role);
        console.log("Fetched classrooms:", data);
        setClasses(data || []);
      } catch (error) {
        console.error("Error fetching classrooms:", error);
      } finally {
        setLoading(false);
      }
    };
    
    if (teacherId) {
      fetchClasses();
    }
  }, [teacherId]);

  const handleCreateClass = async (newClassData) => {
    try {
      const { name, subject, colorTheme, themeImage, themeId } = newClassData;

      const response = await createClassroom({
        teacherId,
        name,
        subject,
        colorTheme,
        themeImage,
        themeId,
      });

      if (response && response.classroom) {
        setClasses((prev) => [...prev, response.classroom]);
        alert(`Class created successfully! Class Code: ${response.classroom.classCode}`);
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error creating classroom:", error);
      alert("Failed to create classroom");
    }
  };

  const handleUpdateClass = async (updates) => {
    if (!editingClass) return;
    try {
      const response = await updateClassroom(editingClass._id, {
        teacherId,
        ...updates,
      });

      if (response && response.classroom) {
        setClasses((prev) =>
          prev.map((cls) =>
            (cls._id || cls.id) === editingClass._id ? response.classroom : cls
          )
        );
        alert("Class updated successfully");
      }
    } catch (error) {
      console.error("Error updating classroom:", error);
      alert("Failed to update classroom");
    } finally {
      setEditingClass(null);
      setIsModalOpen(false);
    }
  };

  const handleDeleteClass = async (classId) => {
    try {
      await deleteClassroom(classId, teacherId);
      
      // Remove from state
      setClasses((prev) => prev.filter(c => (c._id || c.id) !== classId));
      
      alert("Class deleted successfully!");
    } catch (error) {
      console.error("Error deleting classroom:", error);
      alert(error.response?.data?.error || "Failed to delete classroom");
    }
  };

  const handleClassClick = (classItem) => {
    navigate(`/class/${classItem._id}`);
  };

  const handleLogoClick = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onLogoClick={handleLogoClick} />
      <PageTransition className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">
              My Classes
            </h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">
              Manage your classes and share codes with students
            </p>
          </div>
          {classes.length > 0 && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setEditingClass(null);
                setIsModalOpen(true);
              }}
              className="w-full sm:w-auto px-4 py-2 sm:py-2.5 bg-blue-600 text-white text-sm sm:text-base font-medium rounded-lg hover:bg-blue-700 transition cursor-pointer whitespace-nowrap"
            >
              + Create New Class
            </motion.button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p className="text-sm sm:text-base text-gray-500">Loading classrooms...</p>
            </div>
          </div>
        ) : classes.length === 0 ? (
          <div className="text-center mt-12 sm:mt-20 px-4">
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-700 mb-4">
              You haven't created any classrooms yet.
            </h2>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setEditingClass(null);
                setIsModalOpen(true);
              }}
              className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white text-sm sm:text-base font-medium rounded-lg hover:bg-blue-700 transition cursor-pointer"
            >
              + Create Your First Class
            </motion.button>
          </div>
        ) : (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6"
          >
            {classes.map((classItem) => (
              <motion.div key={classItem._id} variants={itemVariants} className="h-full">
                <ClassCard
                  classData={{
                    id: classItem._id,
                    _id: classItem._id,
                    name: classItem.name,
                    subject: classItem.subject || classItem.name,
                    studentCount: classItem.students?.length || 0,
                    classCode: classItem.classCode,
                    students: classItem.students,
                    color: classItem.colorTheme || classItem.color || "bg-gradient-to-br from-purple-500 to-purple-700",
                    colorTheme: classItem.colorTheme,
                    themeImage: classItem.themeImage,
                    themeId: classItem.themeId, // Pass themeId
                  }}
                  onClick={() => handleClassClick(classItem)}
                  onDelete={handleDeleteClass}
                  onEdit={() => {
                    setEditingClass(classItem);
                    setIsModalOpen(true);
                  }}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </PageTransition>

      {isModalOpen && (
        <div className="fixed inset-0 z-50">
          <NewClass
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false);
              setEditingClass(null);
            }}
            onCreate={handleCreateClass}
            onUpdate={handleUpdateClass}
            initialData={editingClass}
            mode={editingClass ? "edit" : "create"}
          />
        </div>
      )}
    </div>
  );
};

export default Dashboard;