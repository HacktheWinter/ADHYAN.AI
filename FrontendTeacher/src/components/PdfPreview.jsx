import React from 'react';
import { X, Download } from 'lucide-react';

const PdfPreview = ({ url, title, onClose }) => {
  if (!url) return null;

  // PDF ko embed URL me convert karo (toolbar hide karne ke liye)
  const embedUrl = `${url}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`;

  const handleDownload = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Create a temporary link and trigger download
    const link = document.createElement('a');
    link.href = url;
    link.download = title || 'document.pdf';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div 
      className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="relative bg-white rounded-lg shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Simple Header */}
        <div className="flex items-center justify-between bg-gray-100 px-4 sm:px-6 py-3 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-xs">PDF</span>
              </div>
              <h3 className="font-semibold text-gray-800 truncate text-sm sm:text-base" title={title}>
                {title || "Document.pdf"}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-2 flex-shrink-0">
            {/* Download Button */}
            <button 
              onClick={handleDownload}
              className="p-2 hover:bg-gray-200 rounded transition-colors cursor-pointer"
              title="Download PDF"
            >
              <Download className="w-5 h-5 text-gray-700" />
            </button>

            {/* Close Button */}
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-200 rounded transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5 text-gray-700" />
            </button>
          </div>
        </div>

        {/* PDF Viewer */}
        <div className="flex-1 bg-gray-300 overflow-hidden">
          <iframe 
            src={embedUrl}
            className="w-full h-full border-0"
            style={{ 
              border: 'none',
              display: 'block'
            }}
            title={title}
          />
        </div>
      </div>
    </div>
  );
};

export default PdfPreview;