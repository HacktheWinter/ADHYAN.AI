import React, { useState } from "react";
import { X, Upload } from "lucide-react";
import { motion } from "framer-motion";
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
  const fileInputRef = React.useRef(null);

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
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 bg-black/60 flex items-start justify-center z-50 p-4 pt-8 sm:pt-20 overflow-y-auto"
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="bg-surface border border-line rounded-2xl sm:rounded-[24px] shadow-2xl w-full max-w-2xl overflow-hidden my-auto"
      >
        <div className="p-4 sm:p-5 border-b border-line flex items-center justify-between">
          <h2 className="font-display text-lg sm:text-xl font-semibold text-ink">
            {mode === "edit" ? "Edit Class" : "Create New Class"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-line rounded-full transition-colors text-ink-soft hover:text-ink cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Left Column */}
          <div className="space-y-4 sm:space-y-5">
            <div>
              <label className="block text-xs font-bold text-ink-soft uppercase tracking-wider mb-2">
                Class Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., Math 101"
                className="w-full px-3 sm:px-4 py-2.5 text-sm border border-line bg-paper text-ink rounded-lg sm:rounded-xl focus:ring-2 focus:ring-purple-600 focus:border-transparent focus:outline-none transition"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-ink-soft uppercase tracking-wider mb-2">
                Subject (optional)
              </label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) =>
                  setFormData({ ...formData, subject: e.target.value })
                }
                placeholder="e.g., Mathematics"
                className="w-full px-3 sm:px-4 py-2.5 text-sm border border-line bg-paper text-ink rounded-lg sm:rounded-xl focus:ring-2 focus:ring-purple-600 focus:border-transparent focus:outline-none transition"
              />
            </div>

            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs font-bold text-ink-soft uppercase tracking-wider mb-2 sm:mb-3">
                  Theme Style
                </label>
                <div className="flex flex-wrap gap-3">
                  <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                    formData.themeType === "color"
                      ? "theme-radio-active"
                      : "border-line hover:border-purple-300"
                  }`}>
                    <input
                      type="radio"
                      name="themeType"
                      value="color"
                      checked={formData.themeType === "color"}
                      onChange={() =>
                        setFormData((prev) => ({
                          ...prev,
                          themeType: "color",
                          themeImage: "",
                          selectedTheme: prev.selectedTheme || {
                            id: "general-5",
                            name: "Theme 5",
                            type: "image",
                            value: general5,
                            pattern: "custom",
                          },
                          color: prev.color || general5,
                        }))
                      }
                    />
                    <span className="text-sm font-semibold text-ink">Class theme</span>
                  </label>

                  <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                    formData.themeType === "image"
                      ? "theme-radio-active"
                      : "border-line hover:border-purple-300"
                  }`}>
                    <input
                      type="radio"
                      name="themeType"
                      value="image"
                      checked={formData.themeType === "image"}
                      onChange={() =>
                        setFormData((prev) => ({
                          ...prev,
                          themeType: "image",
                        }))
                      }
                    />
                    <span className="text-sm font-semibold text-ink">Custom image</span>
                  </label>
                </div>
              </div>

              {formData.themeType === "color" && (
                <div>
                  <label className="block text-xs font-bold text-ink-soft uppercase tracking-wider mb-2 sm:mb-3">
                    Choose Color Theme
                  </label>
                  {/* Theme Preview Button */}
                  <button
                    type="button"
                    onClick={() => setShowThemeModal(true)}
                    className="w-full border border-dashed border-line bg-paper rounded-xl p-4 hover:border-purple-455 transition-colors cursor-pointer text-ink"
                  >
                    <div className="flex items-center gap-4">
                      <div 
                        className="w-20 h-20 rounded-lg flex items-center justify-center overflow-hidden border border-line"
                        style={{
                          backgroundImage: formData.color ? `url(${formData.color})` : 'none',
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          backgroundColor: !formData.color ? '#e5e7eb' : 'transparent',
                        }}
                      >
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-sm font-semibold text-ink">
                          {formData.selectedTheme ? formData.selectedTheme.name : 'Select a theme'}
                        </p>
                        <p className="text-xs text-ink-soft mt-1">
                          Click to browse theme patterns
                        </p>
                      </div>
                    </div>
                  </button>

                  {/* Current Theme Info */}
                  {formData.selectedTheme && (
                    <div className="mt-2 flex items-center justify-between text-xs text-ink-soft">
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
                        className="text-rose-650 hover:text-rose-700 cursor-pointer"
                      >
                        Reset theme
                      </button>
                    </div>
                  )}
                </div>
              )}

              {formData.themeType === "image" && (
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-ink-soft uppercase tracking-wider mb-2 sm:mb-3">
                    Upload cover image
                  </label>
                  <div className="border-2 border-dashed border-line rounded-xl p-4 sm:p-5 bg-paper">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 border border-line bg-surface text-ink hover:bg-line text-xs font-bold rounded-xl shadow-sm transition cursor-pointer flex items-center gap-2"
                      >
                        <Upload className="w-4 h-4 text-purple-700 dark:text-[#A78BFA]" />
                        Choose File
                      </button>
                      <span className="text-xs text-ink-soft font-medium">
                        {formData.themeImage ? "Selected image uploaded" : "No file chosen"}
                      </span>
                    </div>
                    <p className="mt-2.5 text-[11px] text-ink-soft leading-relaxed">Recommended size 1200x400px. We store the image with the class.</p>

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

          {/* Right Column - Preview */}
          <div className="block space-y-3 sm:space-y-4">
            <label className="block text-xs font-bold text-ink-soft uppercase tracking-wider mb-2">
              Preview
            </label>
            <div className="bg-surface rounded-xl sm:rounded-2xl shadow-sm overflow-hidden border border-line">
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
                <p className="text-ink font-semibold text-sm sm:text-base mb-2">
                  {formData.subject || "Subject"}
                </p>
                <p className="text-ink-soft text-xs sm:text-sm">0 students</p>
              </div>
            </div>
          </div>

          {/* Bottom Buttons */}
          <div className="col-span-1 lg:col-span-2 flex flex-col sm:flex-row gap-3 sm:gap-4 pt-2 sm:pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 sm:px-6 py-2.5 text-sm sm:text-base border border-line text-ink-soft hover:text-ink font-semibold rounded-lg sm:rounded-xl hover:bg-line transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-settings-blue flex-1 px-4 sm:px-6 py-2.5 text-sm sm:text-base font-semibold rounded-lg sm:rounded-xl cursor-pointer"
            >
              {mode === "edit" ? "Save Changes" : "Create Class"}
            </button>
          </div>
        </form>
      </motion.div>

      {/* Theme Selection Modal */}
      <ThemeSelectionModal
        isOpen={showThemeModal}
        onClose={() => setShowThemeModal(false)}
        onSelectTheme={handleThemeSelect}
        currentTheme={formData.selectedTheme}
      />
    </motion.div>
  );
};

export default NewClass;
