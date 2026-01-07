import React from 'react';
import { X, Download, FileText } from 'lucide-react';

const PdfPreview = ({ url, title, onClose }) => {
  if (!url) return null;

  // PDF URL me toolbar aur navigation hide karne ke liye parameters
  const embedUrl = `${url}#toolbar=0&navpanes=0&scrollbar=1`;

  const handleDownload = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
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
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white flex-shrink-0">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0 border border-red-100">
              <FileText className="w-5 h-5 text-red-600" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-900 truncate text-lg" title={title}>
                {title || "Document Preview"}
              </h3>
              <p className="text-xs text-gray-500">PDF Document</p>
            </div>
          </div>

          <div className="flex items-center gap-3 ml-4 flex-shrink-0">
            <button 
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors shadow-sm cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Download</span>
            </button>
            <div className="h-8 w-px bg-gray-200 mx-1"></div>
            <button 
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
              title="Close Preview"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content - Clean PDF without toolbar */}
        <div className="flex-1 bg-gray-50 p-4 overflow-hidden">
          <div className="w-full h-full bg-white rounded-lg shadow-inner border border-gray-200 overflow-hidden">
            <iframe 
              src={embedUrl} 
              className="w-full h-full border-0" 
              title={title || "PDF Document"}
              style={{ border: 'none', display: 'block' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PdfPreview;