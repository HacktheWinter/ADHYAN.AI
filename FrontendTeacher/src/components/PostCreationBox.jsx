import React, { useState } from 'react';
import { Upload, FileText, X } from 'lucide-react';

const PostCreationBox = ({ onCreatePost }) => {
  const [announcement, setAnnouncement] = useState('');
  const [attachedFiles, setAttachedFiles] = useState([]);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setAttachedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handlePost = () => {
    if (!announcement.trim() && attachedFiles.length === 0) return;
    
    onCreatePost({
      title: announcement.trim() || attachedFiles[0]?.name.replace(/\.[^/.]+$/, '') || 'Untitled',
      files: attachedFiles
    });
    
    setAnnouncement('');
    setAttachedFiles([]);
  };

  return (
    <div className="bg-surface rounded-2xl border border-line shadow-sm mb-6 overflow-hidden">
      <div className="p-6">
        <textarea
          value={announcement}
          onChange={(e) => setAnnouncement(e.target.value)}
          placeholder="Share an announcement or upload notes..."
          className="w-full h-24 bg-transparent resize-none outline-none text-ink placeholder:text-ink-soft/40 text-sm leading-relaxed"
        />
        
        {attachedFiles.length > 0 && (
          <div className="mt-4 space-y-2">
            {attachedFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between bg-paper border border-line/45 rounded-xl p-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-500/10 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-brand" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-ink leading-tight">{file.name}</p>
                    <p className="text-xs text-ink-soft mt-0.5">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <button 
                  onClick={() => removeFile(index)} 
                  className="p-1.5 hover:bg-paper-hover rounded-lg text-ink-soft hover:text-ink transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="flex items-center justify-between px-6 py-4 border-t border-line bg-paper/40">
        <div>
          <input
            type="file"
            id="file-upload"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <label htmlFor="file-upload" className="flex items-center gap-2 text-ink-soft hover:text-ink font-semibold text-sm transition-colors cursor-pointer">
            <Upload className="w-4 h-4" />
            Attach Files
          </label>
        </div>
        <button
          onClick={handlePost}
          disabled={!announcement.trim() && attachedFiles.length === 0}
          className="px-6 py-2 bg-violet-700 hover:bg-violet-800 text-white dark:bg-violet-950/40 dark:text-violet-300 border border-transparent dark:border-violet-700/60 dark:hover:border-violet-500 dark:hover:bg-violet-950/80 font-semibold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer text-sm shadow-sm"
        >
          Post
        </button>
      </div>
    </div>
  );
};

export default PostCreationBox;
