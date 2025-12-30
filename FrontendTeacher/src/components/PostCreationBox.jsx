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
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-6">
      <div className="p-6">
        <textarea
          value={announcement}
          onChange={(e) => setAnnouncement(e.target.value)}
          placeholder="Share an announcement or upload notes..."
          className="w-full h-24 resize-none outline-none text-gray-700 placeholder-gray-400"
        />
        
        {attachedFiles.length > 0 && (
          <div className="mt-4 space-y-2">
            {attachedFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{file.name}</p>
                    <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <button onClick={() => removeFile(index)} className="p-1 hover:bg-gray-200 rounded">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
        <div>
          <input
            type="file"
            id="file-upload"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <label htmlFor="file-upload" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium cursor-pointer">
            <Upload className="w-5 h-5" />
            Attach Files
          </label>
        </div>
        <button
          onClick={handlePost}
          disabled={!announcement.trim() && attachedFiles.length === 0}
          className="px-6 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Post
        </button>
      </div>
    </div>
  );
};

export default PostCreationBox;
