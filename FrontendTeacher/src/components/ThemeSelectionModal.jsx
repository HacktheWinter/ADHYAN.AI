import React, { useState } from 'react';
import { X } from 'lucide-react';
import { themeCategories, getThemesByCategory } from '../data/themeData';

const ThemeSelectionModal = ({ isOpen, onClose, onSelectTheme, currentTheme }) => {
  const [activeCategory, setActiveCategory] = useState('general');
  const [selectedTheme, setSelectedTheme] = useState(currentTheme || null);

  if (!isOpen) return null;

  const handleThemeClick = (theme) => {
    setSelectedTheme(theme);
  };

  const handleSelectTheme = () => {
    if (selectedTheme) {
      onSelectTheme(selectedTheme);
      onClose();
    }
  };

  const currentThemes = getThemesByCategory(activeCategory);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
      <div className="bg-surface border border-line rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden animate-slideDown">
        {/* Header */}
        <div className="p-5 border-b border-line flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold text-ink">Select class theme</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-line rounded-full transition-colors text-ink-soft hover:text-ink cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category Tabs */}
        <div className="border-b border-line bg-paper">
          <div className="flex overflow-x-auto px-4">
            {themeCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`px-4 py-3 text-sm font-semibold whitespace-nowrap transition-colors border-b-2 cursor-pointer ${
                  activeCategory === category.id
                    ? 'border-purple-700 text-purple-700 dark:text-[#A78BFA]'
                    : 'border-transparent text-ink-soft hover:text-ink'
                }`}
              >
                <span className="mr-1">{category.icon}</span>
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {/* Theme Grid */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {currentThemes.map((theme) => (
              <div
                key={theme.id}
                onClick={() => handleThemeClick(theme)}
                className={`cursor-pointer rounded-xl overflow-hidden border-4 transition-all transform hover:scale-105 ${
                  selectedTheme?.id === theme.id
                    ? 'border-purple-700 dark:border-[#A78BFA] shadow-md'
                    : 'border-transparent hover:border-purple-300'
                }`}
              >
                <div
                  className="h-32 flex items-center justify-center relative"
                  style={
                    theme.type === 'image'
                      ? {
                          backgroundImage: `url(${theme.value})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                        }
                      : {
                          background: theme.value,
                        }
                  }
                >
                  {/* Pattern Overlay - You can customize based on theme.pattern */}
                  {theme.pattern === 'geometric' && (
                    <div className="absolute inset-0 opacity-20">
                      <svg className="w-full h-full" viewBox="0 0 100 100">
                        <circle cx="20" cy="20" r="15" fill="white" />
                        <circle cx="50" cy="50" r="10" fill="white" />
                        <rect x="70" y="10" width="20" height="20" fill="white" />
                      </svg>
                    </div>
                  )}
                  
                  {theme.pattern === 'books' && (
                    <div className="absolute inset-0 opacity-20 flex items-end justify-center gap-2 p-4">
                      <div className="w-3 h-16 bg-white rounded-sm transform -rotate-12"></div>
                      <div className="w-3 h-20 bg-white rounded-sm"></div>
                      <div className="w-3 h-14 bg-white rounded-sm transform rotate-12"></div>
                    </div>
                  )}

                  {theme.pattern === 'tech' && (
                    <div className="absolute inset-0 opacity-20 flex items-center justify-center gap-2">
                      <div className="w-8 h-12 bg-white rounded"></div>
                      <div className="w-12 h-8 bg-white rounded"></div>
                    </div>
                  )}

                  {theme.pattern === 'nature' && (
                    <div className="absolute inset-0 opacity-20">
                      <svg className="w-full h-full" viewBox="0 0 100 100">
                        <path d="M30 50 Q40 30, 50 50 Q60 30, 70 50" stroke="white" fill="none" strokeWidth="3"/>
                      </svg>
                    </div>
                  )}

                  {theme.pattern === 'abstract' && (
                    <div className="absolute inset-0 opacity-20">
                      <div className="absolute top-4 left-4 w-16 h-16 bg-white rounded-full"></div>
                      <div className="absolute bottom-4 right-4 w-12 h-12 bg-white rounded-full"></div>
                    </div>
                  )}

                  {theme.pattern === 'music' && (
                    <div className="absolute inset-0 opacity-20 flex items-center justify-center">
                      <svg className="w-16 h-16" viewBox="0 0 24 24" fill="white">
                        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                      </svg>
                    </div>
                  )}

                  {/* Selection Indicator */}
                  {selectedTheme?.id === theme.id && (
                    <div className="absolute top-2 right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-lg">
                      <div className="w-4 h-4 bg-purple-600 rounded-full"></div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-line flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-sm border border-line text-ink-soft hover:text-ink font-semibold rounded-xl hover:bg-line transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSelectTheme}
            disabled={!selectedTheme}
            className="btn-settings-blue px-6 py-2.5 text-sm font-semibold rounded-xl cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Select class theme
          </button>
        </div>
      </div>
    </div>
  );
};

export default ThemeSelectionModal;
