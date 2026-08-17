import React from 'react';

const Loader = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 w-full">
      <div className="flex items-center space-x-4">
        <div className="w-10 h-10 rounded-full border-4 border-purple-200 border-t-purple-600 animate-spin"></div>
        <span className="text-3xl font-bold text-gray-800 tracking-wide">
          ADHYAN.AI
        </span>
      </div>
      <p className="mt-3 text-sm text-gray-500 animate-pulse font-medium">Loading...</p>
    </div>
  );
};

export default Loader;
