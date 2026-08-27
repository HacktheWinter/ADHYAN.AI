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
    <div className="bg-surface rounded-2xl border border-line shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-line flex items-center gap-4 bg-paper/25">
        <button
          onClick={onBack}
          disabled={isGenerating}
          className="text-ink-soft hover:text-ink disabled:opacity-40 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 flex-1">
          <Edit3 className="w-5 h-5 text-violet-600 dark:text-violet-400" />
          <h3 className="text-base font-bold text-ink font-display">Add Topics to Generate Assessment</h3>
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
          className="w-full px-0 py-0 bg-transparent focus:outline-none text-ink placeholder:text-ink-soft/40 resize-none overflow-hidden text-sm leading-relaxed min-h-[24px] max-h-[200px]"
          disabled={isGenerating}
          rows={1}
        />

        {/* Topics List */}
        {topics.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-xs text-ink-soft font-semibold mb-2">
              Added Topics ({topics.length}):
            </p>
            <div className="flex flex-wrap gap-2">
              {topics.map((topic, index) => (
                <div
                  key={index}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-paper border border-line/65 text-ink rounded-xl text-sm"
                >
                  <span>{topic}</span>
                  <button
                    onClick={() => onRemoveTopic(index)}
                    disabled={isGenerating}
                    className="text-ink-soft hover:text-error-hover transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer with Add Button */}
      <div className="px-6 py-4 border-t border-line flex justify-end">
        <button
          onClick={handleAdd}
          disabled={!inputValue.trim() || isGenerating}
          className="px-6 py-2 bg-violet-700 hover:bg-violet-800 text-white dark:bg-violet-950/40 dark:text-violet-300 border border-transparent dark:border-violet-700/60 dark:hover:border-violet-500 dark:hover:bg-violet-950/80 font-bold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all text-sm cursor-pointer shadow-sm"
        >
          Add
        </button>
      </div>
    </div>
  );
};

export default TopicsInputCard;