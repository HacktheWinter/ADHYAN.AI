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
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <FileText className="w-6 h-6 text-purple-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-gray-900">{post.author}</span>
              <span className="text-gray-400">•</span>
              <span className="text-sm text-gray-500">{post.date}</span>
            </div>
            <h3 className="text-gray-900 font-medium mb-3">{post.title}</h3>
            
            {post.files.length > 0 && (
              <div className="space-y-2 mt-3">
                {post.files.map((file, index) => (
                  <div 
                    key={index} 
                    className="flex items-center gap-3 bg-gray-50 rounded-lg p-3 cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleFileClick(file)}
                  >
                    <div className="w-8 h-8 bg-purple-100 rounded flex items-center justify-center">
                      <FileText className="w-4 h-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{file.name}</p>
                      <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl h-5/6 flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">{selectedFile.name}</h3>
              <button
                onClick={closePreview}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <iframe
                src={selectedFile.url}
                className="w-full h-full"
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