import React from 'react';
import { Plus } from 'lucide-react';

const CreateClassCard = ({ onClick }) => {
  return (
    <div
      onClick={onClick}
      className="cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-xl"
    >
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="bg-gradient-to-br from-gray-100 to-gray-200 h-32 flex items-center justify-center">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
            <Plus className="w-6 h-6 text-gray-400" />
          </div>
        </div>
        <div className="p-6">
          <p className="text-gray-700 font-semibold mb-2">Create New Class</p>
          <p className="text-gray-500 text-sm">Add a new class</p>
        </div>
      </div>
    </div>
  );
};

export default CreateClassCard;