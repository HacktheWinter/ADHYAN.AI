import React, { useState } from "react";
import { X } from "lucide-react";

const NewClass = ({ isOpen, onClose, onCreate }) => {
  const [formData, setFormData] = useState({
    name: "",
    subject: "",
    color: "bg-gradient-to-br from-purple-500 to-purple-700",
  });

  const colors = [
    { name: "Purple", value: "bg-gradient-to-br from-purple-500 to-purple-700" },
    { name: "Blue", value: "bg-gradient-to-br from-blue-500 to-blue-700" },
    { name: "Green", value: "bg-gradient-to-br from-green-500 to-green-700" },
    { name: "Orange", value: "bg-gradient-to-br from-orange-500 to-orange-700" },
    { name: "Red", value: "bg-gradient-to-br from-red-500 to-red-700" },
    { name: "Pink", value: "bg-gradient-to-br from-pink-500 to-pink-700" },
    { name: "Indigo", value: "bg-gradient-to-br from-indigo-500 to-indigo-700" },
    { name: "Teal", value: "bg-gradient-to-br from-teal-500 to-teal-700" },
  ];

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.name) {
      alert("Please enter class name");
      return;
    }

    onCreate({
      name: formData.name,
      subject: formData.subject,
      color: formData.color,
    });

    // Reset form and close modal
    setFormData({
      name: "",
      subject: "",
      color: "bg-gradient-to-br from-purple-500 to-purple-700",
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-start justify-center z-50 p-4 pt-8 sm:pt-20 overflow-y-auto">
      <div className="bg-white rounded-2xl sm:rounded-[24px] shadow-2xl w-full max-w-2xl overflow-hidden animate-slideDown my-auto">
        <div className="p-4 sm:p-5 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">Create New Class</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 cursor-pointer" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Left Column */}
          <div className="space-y-4 sm:space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Class Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., Math 101"
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base border border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subject (optional)
              </label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) =>
                  setFormData({ ...formData, subject: e.target.value })
                }
                placeholder="e.g., Mathematics"
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base border border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 sm:mb-3">
                Choose Color Theme
              </label>
              <div className="grid grid-cols-4 gap-2 sm:gap-3">
                {colors.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() =>
                      setFormData({ ...formData, color: color.value })
                    }
                    className={`h-12 sm:h-14 rounded-lg sm:rounded-xl ${color.value} transition-transform ${
                      formData.color === color.value
                        ? "ring-2 ring-purple-300 scale-105"
                        : "hover:scale-105"
                    }`}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Preview (Hidden on mobile) */}
          <div className="hidden lg:block space-y-3 sm:space-y-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Preview
            </label>
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg overflow-hidden border border-gray-200">
              <div
                className={`${formData.color} h-28 sm:h-36 flex items-center justify-center p-4 rounded-t-xl sm:rounded-t-2xl`}
              >
                <h3 className="text-lg sm:text-xl font-bold text-white text-center">
                  {formData.name || "Class Name"}
                </h3>
              </div>
              <div className="p-4 sm:p-5">
                <p className="text-gray-700 font-semibold text-sm sm:text-base mb-2">
                  {formData.subject || "Subject"}
                </p>
                <p className="text-gray-500 text-xs sm:text-sm">0 students</p>
              </div>
            </div>
          </div>

          {/* Bottom Buttons */}
          <div className="col-span-1 lg:col-span-2 flex flex-col sm:flex-row gap-3 sm:gap-4 pt-2 sm:pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 sm:px-6 py-2.5 text-sm sm:text-base border border-gray-300 text-gray-700 font-medium rounded-lg sm:rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 sm:px-6 py-2.5 text-sm sm:text-base bg-purple-600 text-white font-medium rounded-lg sm:rounded-xl hover:bg-purple-700 transition-colors cursor-pointer"
            >
              Create Class
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewClass;