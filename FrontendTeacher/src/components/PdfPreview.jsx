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
      className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-md flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="relative bg-surface border border-line rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Simple Header */}
        <div className="flex items-center justify-between bg-paper px-4 sm:px-6 py-3 border-b border-line flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-xs">PDF</span>
              </div>
              <h3 className="font-bold text-ink font-display truncate text-sm sm:text-base" title={title}>
                {title || "Document.pdf"}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-2 flex-shrink-0">
            {/* Download Button */}
            <button 
              onClick={handleDownload}
              className="p-2 hover:bg-paper-hover text-ink-soft hover:text-ink rounded-xl transition-colors cursor-pointer"
              title="Download PDF"
            >
              <Download className="w-5 h-5" />
            </button>

            {/* Close Button */}
            <button 
              onClick={onClose}
              className="p-2 hover:bg-paper-hover text-ink-soft hover:text-ink rounded-xl transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PDF Viewer */}
        <div className="flex-1 bg-paper-hover overflow-hidden">
          <iframe 
            src={embedUrl}
            className="w-full h-full border-none"
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