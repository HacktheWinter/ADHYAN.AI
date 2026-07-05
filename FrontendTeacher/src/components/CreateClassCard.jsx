import React from 'react';
import { Plus } from 'lucide-react';

const CreateClassCard = ({ onClick }) => {
  return (
    <div
      onClick={onClick}
      className="cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-xl"
    >
      <div className="bg-surface rounded-xl shadow-lg overflow-hidden border border-line">
        <div className="bg-paper h-32 flex items-center justify-center border-b border-dashed border-line">
          <div className="w-12 h-12 bg-line rounded-full flex items-center justify-center">
            <Plus className="w-6 h-6 text-ink-soft" />
          </div>
        </div>
        <div className="p-6">
          <p className="text-ink font-semibold mb-2">Create New Class</p>
          <p className="text-ink-soft text-sm">Add a new class</p>
        </div>
      </div>
    </div>
  );
};

export default CreateClassCard;