import React, { useState } from "react";
import { X } from "lucide-react";
import ThemeSelectionModal from "./ThemeSelectionModal";
import general5 from '../assets/themes/general/general-5.jpg';
import { getAllThemes } from '../data/themeData';

const NewClass = ({ isOpen, onClose, onCreate, onUpdate, initialData, mode = "create" }) => {
  const [formData, setFormData] = useState({
    name: "",
    subject: "",
    color: general5,
    themeType: "color",
    themeImage: "",
    selectedTheme: { id: 'general-5', name: 'Theme 5', type: 'image', value: general5, pattern: 'custom' },
  });
  const [showThemeModal, setShowThemeModal] = useState(false);

  React.useEffect(() => {
    if (!initialData) {
      setFormData((prev) => ({
        ...prev,
        name: "",
        subject: "",
        color: general5,
        themeType: "color",
        themeImage: "",
        selectedTheme: { id: 'general-5', name: 'Theme 5', type: 'image', value: general5, pattern: 'custom' },
      }));
      return;
    }

    const isImageTheme = Boolean(initialData.themeImage);
    const colorThemeValue = initialData.colorTheme || initialData.color || general5;
    
    // Find matching theme from themeData based on colorTheme value
    let matchedTheme = null;
    if (!isImageTheme) {
      const allThemes = getAllThemes();
      matchedTheme = allThemes.find(theme => theme.value === colorThemeValue);
    }

    setFormData({
      name: initialData.name || "",
      subject: initialData.subject || "",
      color: colorThemeValue,
      themeType: isImageTheme ? "image" : "color",
      themeImage: initialData.themeImage || "",
      selectedTheme: matchedTheme || initialData.selectedTheme || { id: 'general-5', name: 'Theme 5', type: 'image', value: general5, pattern: 'custom' },
    });
  }, [initialData]);

  const handleThemeSelect = (theme) => {
    // Always keep themeType as 'color' for themes from modal
    // Only 'image' type should be for manual custom uploads
    setFormData({
      ...formData,
      themeType: 'color',
      color: theme.value,
      selectedTheme: theme,
      themeImage: '',
    });
    setShowThemeModal(false);
  };

  const handleImageUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setFormData((prev) => ({ ...prev, themeImage: reader.result || "", themeType: "image" }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.name) {
      alert("Please enter class name");
      return;
    }

    const payload = {
      selectedTheme: null,
      name: formData.name,
      subject: formData.subject,
      colorTheme: formData.color,
      themeImage: formData.themeType === "image" ? formData.themeImage : "",
      themeId: formData.selectedTheme ? formData.selectedTheme.id : null,
    };

    if (mode === "edit" && onUpdate) {
      onUpdate(payload);
    } else {
      onCreate(payload);
    }

    // Reset form and close modal
    setFormData({
      name: "",
      subject: "",
      color: general5,
      themeType: "color",
      themeImage: "",
      selectedTheme: { id: 'general-5', name: 'Theme 5', type: 'image', value: general5, pattern: 'custom' },
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-start justify-center z-50 p-4 pt-8 sm:pt-20 overflow-y-auto">
      <div className="bg-white rounded-2xl sm:rounded-[24px] shadow-2xl w-full max-w-2xl overflow-hidden animate-slideDown my-auto">
        <div className="p-4 sm:p-5 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">
            {mode === "edit" ? "Edit Class" : "Create New Class"}
          </h2>
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

            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 sm:mb-3">
                  Theme Style
                </label>
                <div className="flex flex-wrap gap-3">
                  <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                    formData.themeType === "color"
                      ? "border-purple-500 bg-purple-50"
                      : "border-gray-300 hover:border-purple-200"
                  }`}>
                    <input
                      type="radio"
                      name="themeType"
                      value="color"
                      checked={formData.themeType === "color"}
                      onChange={() => setFormData({ ...formData, themeType: "color", themeImage: "", selectedTheme: null })}
                    />
                    <span className="text-sm font-medium text-gray-700">Class theme</span>
                  </label>

                  <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                    formData.themeType === "image"
                      ? "border-purple-500 bg-purple-50"
                      : "border-gray-300 hover:border-purple-200"
                  }`}>
                    <input
                      type="radio"
                      name="themeType"
                      value="image"
                      checked={formData.themeType === "image"}
                      onChange={() => setFormData({ ...formData, themeType: "image", selectedTheme: null })}
                    />
                    <span className="text-sm font-medium text-gray-700">Custom image</span>
                  </label>
                </div>
              </div>

              {formData.themeType === "color" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 sm:mb-3">
                    Choose Color Theme
                  </label>
                  {/* Theme Preview Button */}
                  <button
                    type="button"
                    onClick={() => setShowThemeModal(true)}
                    className="w-full border-2 border-dashed border-gray-300 rounded-xl p-4 hover:border-purple-400 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div 
                        className="w-20 h-20 rounded-lg flex items-center justify-center overflow-hidden border border-gray-200"
                        style={{
                          backgroundImage: formData.color ? `url(${formData.color})` : 'none',
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          backgroundColor: !formData.color ? '#e5e7eb' : 'transparent',
                        }}
                      >
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-sm font-medium text-gray-900">
                          {formData.selectedTheme ? formData.selectedTheme.name : 'Select a theme'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Click to browse theme patterns
                        </p>
                      </div>
                    </div>
                  </button>

                  {/* Current Theme Info */}
                  {formData.selectedTheme && (
                    <div className="mt-2 flex items-center justify-between text-xs text-gray-600">
                      <span>
                        🎨 {formData.selectedTheme.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => setFormData({
                          ...formData,
                          selectedTheme: { id: 'general-5', name: 'Theme 5', type: 'image', value: general5, pattern: 'custom' },
                          color: general5
                        })}
                        className="text-red-600 hover:text-red-700 cursor-pointer"
                      >
                        Reset theme
                      </button>
                    </div>
                  )}
                </div>
              )}

              {formData.themeType === "image" && (
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2 sm:mb-3">
                    Upload cover image
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 sm:p-5 bg-gray-50">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="w-full text-sm text-gray-700"
                    />
                    <p className="mt-2 text-xs text-gray-500">Recommended size 1200x400px. We store the image with the class.</p>

                    {formData.themeImage && (
                      <div className="mt-3 relative">
                        <img
                          src={formData.themeImage}
                          alt="Class theme"
                          className="w-full h-32 sm:h-40 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, themeImage: "" })}
                          className="absolute top-2 right-2 px-2 py-1 text-xs bg-black/60 text-white rounded cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Preview (Hidden on mobile) */}
          <div className="hidden lg:block space-y-3 sm:space-y-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Preview
            </label>
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg overflow-hidden border border-gray-200">
              <div
                className="h-28 sm:h-36 flex items-center justify-center p-4 rounded-t-xl sm:rounded-t-2xl relative overflow-hidden"
                style={
                  formData.themeType === "image" && formData.themeImage
                    ? {
                        backgroundImage: `linear-gradient(135deg, rgba(0,0,0,0.15), rgba(0,0,0,0.3)), url(${formData.themeImage})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }
                    : formData.selectedTheme?.type === 'image'
                    ? {
                        backgroundImage: `linear-gradient(135deg, rgba(0,0,0,0.15), rgba(0,0,0,0.3)), url(${formData.color})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }
                    : {
                        background: formData.color,
                      }
                }
              >
                <h3 className="text-lg sm:text-xl font-bold text-white text-center drop-shadow-sm">
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
              {mode === "edit" ? "Save Changes" : "Create Class"}
            </button>
          </div>
        </form>
      </div>

      {/* Theme Selection Modal */}
      <ThemeSelectionModal
        isOpen={showThemeModal}
        onClose={() => setShowThemeModal(false)}
        onSelectTheme={handleThemeSelect}
        currentTheme={formData.selectedTheme}
      />
    </div>
  );
};

export default NewClass;
