import React, { useState } from 'react';
import { FileText, X } from 'lucide-react';

const PostCard = ({ post }) => {
  const [selectedFile, setSelectedFile] = useState(null);

  // Default post data if not provided
  if (!post) {
    return null;
  }

  const handleFileClick = (file) => {
    // Create a blob URL for the file
    const blob = new Blob([file], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    setSelectedFile({ url, name: file.name });
  };

  const closePreview = () => {
    if (selectedFile) {
      URL.revokeObjectURL(selectedFile.url);
      setSelectedFile(null);
    }
  };

  return (
    <>
      <div className="bg-surface rounded-2xl border border-line shadow-sm p-6 hover:shadow-md transition-shadow">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-violet-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <FileText className="w-6 h-6 text-violet-700 dark:text-violet-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-ink font-display">{post.author}</span>
              <span className="text-ink-soft/40">•</span>
              <span className="text-sm text-ink-soft">{post.date}</span>
            </div>
            <h3 className="text-ink font-semibold text-lg mb-3">{post.title}</h3>
            
            {post.files && post.files.length > 0 && (
              <div className="space-y-2 mt-3">
                {post.files.map((file, index) => (
                  <div 
                    key={index} 
                    className="flex items-center gap-3 bg-paper hover:bg-paper-hover border border-line/40 rounded-xl p-3 cursor-pointer transition-all duration-200"
                    onClick={() => handleFileClick(file)}
                  >
                    <div className="w-8 h-8 bg-violet-500/10 rounded-lg flex items-center justify-center">
                      <FileText className="w-4 h-4 text-violet-700 dark:text-violet-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-ink leading-tight">{file.name}</p>
                      <p className="text-xs text-ink-soft mt-0.5">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PDF Preview Modal */}
      {selectedFile && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-line rounded-2xl w-full max-w-4xl h-5/6 flex flex-col overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-line">
              <h3 className="text-lg font-bold font-display text-ink truncate mr-4">{selectedFile.name}</h3>
              <button
                onClick={closePreview}
                className="p-2 hover:bg-paper-hover rounded-xl text-ink-soft hover:text-ink transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 bg-paper overflow-hidden">
              <iframe
                src={selectedFile.url}
                className="w-full h-full border-none"
                title="PDF Preview"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PostCard;