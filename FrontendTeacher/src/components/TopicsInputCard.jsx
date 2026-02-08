// FrontendTeacher/src/components/TopicsInputCard.jsx
import React, { useState, useRef, useEffect } from 'react';
import { X, Edit3, ArrowLeft } from 'lucide-react';

const TopicsInputCard = ({ topics, onAddTopic, onRemoveTopic, onBack, isGenerating }) => {
  const [inputValue, setInputValue] = useState('');
  const textareaRef = useRef(null);

  // Auto-resize textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [inputValue]);

  const handleAdd = () => {
    if (inputValue.trim()) {
      onAddTopic(inputValue.trim());
      setInputValue('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-4">
        <button
          onClick={onBack}
          disabled={isGenerating}
          className="text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 cursor-pointer" />
        </button>
        <div className="flex items-center gap-2 flex-1">
          <Edit3 className="w-5 h-5 text-gray-700" />
          <h3 className="text-base font-semibold text-gray-900">Add Topics to Generate Quiz</h3>
        </div>
      </div>

      {/* Input Section */}
      <div className="px-6 py-4">
        <textarea
          ref={textareaRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="Add Topics."
          className="w-full px-0 py-0 bg-transparent focus:outline-none text-gray-900 placeholder:text-gray-400 resize-none overflow-hidden text-sm leading-relaxed min-h-[24px] max-h-[200px]"
          disabled={isGenerating}
          rows={1}
        />

        {/* Topics List */}
        {topics.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-xs text-gray-600 font-medium mb-2">
              Added Topics ({topics.length}):
            </p>
            <div className="flex flex-wrap gap-2">
              {topics.map((topic, index) => (
                <div
                  key={index}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm"
                >
                  <span>{topic}</span>
                  <button
                    onClick={() => onRemoveTopic(index)}
                    disabled={isGenerating}
                    className="text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    <X className="w-3.5 h-3.5 cursor-pointer" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer with Add Button */}
      <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
        <button
          onClick={handleAdd}
          disabled={!inputValue.trim() || isGenerating}
          className="px-5 py-2 bg-blue-600 text-white font-medium rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm cursor-pointer"
        >
          Add
        </button>
      </div>
    </div>
  );
};

export default TopicsInputCard;