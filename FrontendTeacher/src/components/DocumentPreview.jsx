import React, { useState, useEffect } from 'react';
import { X, Download, Loader, FileText, Table } from 'lucide-react';
import * as mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import { downloadFile } from '../utils/downloadFile';

const DocumentPreview = ({ url, title, mimeType, onClose }) => {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isPdf = mimeType === 'application/pdf' || title?.toLowerCase().endsWith('.pdf');
  const isWord = mimeType?.includes('wordprocessingml.document') || title?.toLowerCase().endsWith('.docx');
  const isExcel = mimeType?.includes('spreadsheetml.sheet') || title?.toLowerCase().endsWith('.xlsx') || title?.toLowerCase().endsWith('.xls') || mimeType?.includes('ms-excel');

  useEffect(() => {
    if (!url) return;
    
    if (isPdf) {
      setLoading(false);
      return;
    }

    const fetchDocument = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();

        if (isWord) {
          const result = await mammoth.convertToHtml({ arrayBuffer });
          setContent(result.value);
        } else if (isExcel) {
          const workbook = XLSX.read(arrayBuffer, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const html = XLSX.utils.sheet_to_html(worksheet);
          setContent(html);
        } else {
          setError("Preview not supported for this file type. Please download it.");
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load document preview.");
      } finally {
        setLoading(false);
      }
    };

    fetchDocument();
  }, [url, mimeType, title, isPdf, isWord, isExcel]);

  const handleDownload = (e) => {
    e.preventDefault();
    e.stopPropagation();
    downloadFile(url, title || 'document');
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
        {/* Header */}
        <div className="flex items-center justify-between bg-paper px-4 sm:px-6 py-3 border-b border-line flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="flex items-center gap-2 min-w-0">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isPdf ? 'bg-red-600' : isExcel ? 'bg-green-600' : 'bg-blue-600'}`}>
                {isPdf ? <span className="text-white font-bold text-xs">PDF</span> : 
                 isExcel ? <Table className="w-5 h-5 text-white" /> : 
                 <FileText className="w-5 h-5 text-white" />}
              </div>
              <h3 className="font-bold text-ink font-display truncate text-sm sm:text-base" title={title}>
                {title || "Document"}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-2 flex-shrink-0">
            <button 
              onClick={handleDownload}
              className="p-2 hover:bg-paper-hover text-ink-soft hover:text-ink rounded-xl transition-colors cursor-pointer"
              title="Download File"
            >
              <Download className="w-5 h-5" />
            </button>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-paper-hover text-ink-soft hover:text-ink rounded-xl transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Viewer Area */}
        <div className="flex-1 bg-paper-hover overflow-auto relative flex flex-col">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center">
              <Loader className="w-8 h-8 text-violet-500 animate-spin mb-4" />
              <p className="text-ink-soft font-medium">Loading document...</p>
            </div>
          ) : error ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <FileText className="w-16 h-16 text-ink-soft mb-4 opacity-50" />
              <p className="text-ink font-medium text-lg mb-2">{error}</p>
              <button onClick={handleDownload} className="px-6 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition font-medium flex items-center gap-2 mt-4 cursor-pointer">
                <Download className="w-4 h-4" /> Download File
              </button>
            </div>
          ) : isPdf ? (
            <iframe 
              src={`${url}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`}
              className="w-full h-full border-none flex-1"
              style={{ border: 'none', display: 'block' }}
              title={title}
            />
          ) : (
            <div className="p-6 sm:p-10 bg-white min-h-full mx-auto w-full max-w-4xl shadow-sm text-black doc-preview-content overflow-x-auto">
               <style>{`
                  .doc-preview-content table { border-collapse: collapse; width: 100%; margin-bottom: 1rem; }
                  .doc-preview-content th, .doc-preview-content td { border: 1px solid #d1d5db; padding: 8px 12px; text-align: left; }
                  .doc-preview-content th { background-color: #f3f4f6; font-weight: 600; }
                  .doc-preview-content h1 { font-size: 1.5rem; font-weight: bold; margin-bottom: 1rem; }
                  .doc-preview-content h2 { font-size: 1.25rem; font-weight: bold; margin-bottom: 0.875rem; }
                  .doc-preview-content h3 { font-size: 1.125rem; font-weight: bold; margin-bottom: 0.75rem; }
                  .doc-preview-content p { margin-bottom: 0.75rem; line-height: 1.5; }
                  .doc-preview-content ul, .doc-preview-content ol { padding-left: 1.5rem; margin-bottom: 1rem; }
                  .doc-preview-content li { margin-bottom: 0.25rem; }
               `}</style>
               <div dangerouslySetInnerHTML={{ __html: content }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentPreview;
