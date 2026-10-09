import React from 'react';
import { FileText, Table, Image as ImageIcon } from 'lucide-react';

const FileIcon = ({ fileName, mimeType }) => {
  const name = (fileName || "").toLowerCase();
  const type = (mimeType || "").toLowerCase();

  const isPdf = type === 'application/pdf' || name.endsWith('.pdf');
  const isWord = type.includes('wordprocessingml') || name.endsWith('.docx') || name.endsWith('.doc');
  const isExcel = type.includes('spreadsheetml') || name.endsWith('.xlsx') || name.endsWith('.xls') || type.includes('ms-excel');
  const isImage = type.startsWith('image/') || name.match(/\.(jpeg|jpg|gif|png)$/);

  if (isImage) {
    return (
      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-indigo-100 border border-indigo-200">
        <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
      </div>
    );
  }

  if (isPdf) {
    return (
      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-red-100 border border-red-200">
        <span className="text-red-600 font-bold text-[10px] sm:text-xs">PDF</span>
      </div>
    );
  }

  if (isExcel) {
    return (
      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-green-100 border border-green-200">
        <Table className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
      </div>
    );
  }

  // Default / Word
  return (
    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-blue-100 border border-blue-200">
      <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
    </div>
  );
};

export default FileIcon;
