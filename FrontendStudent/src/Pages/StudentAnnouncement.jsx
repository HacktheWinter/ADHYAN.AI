import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FileText, Download, X, Loader, ArrowLeft } from "lucide-react";
import { getAnnouncements, getAnnouncementFileUrl } from "../api/announcementApi";

import PdfPreview from "../components/PdfPreview";

// Note: We need to handle IDs separately since we are outside the CourseDetailPage context
// We can parse it from URL params or pass it if structured differently. 
// App.jsx route is: /course/:id/announcement, so useParams will work.

const StudentAnnouncement = () => {
    const { id: classId } = useParams();
    const navigate = useNavigate();

    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [previewFile, setPreviewFile] = useState(null);

    useEffect(() => {
        if (classId) {
            fetchAnnouncements();
        }
    }, [classId]);

    const fetchAnnouncements = async () => {
        try {
            setLoading(true);
            const response = await getAnnouncements(classId);
            setAnnouncements(response.announcements || []);
        } catch (error) {
            console.error("Error fetching announcements:", error);
        } finally {
            setLoading(false);
        }
    };

    const renderFilePreview = (fileId, mimeType, fileName) => {
        const url = getAnnouncementFileUrl(fileId);
        const isImage = mimeType?.startsWith('image/');
        const isPdf = mimeType === 'application/pdf';
        
        if (isImage) {
            return (
                <div className="mt-2 relative group max-w-sm cursor-pointer" onClick={() => setPreviewFile({ url, type: 'image', name: fileName })}>
                    <img src={url} alt="Attachment" className="rounded-lg border border-gray-200 object-cover max-h-60" />
                </div>
            );
        }
        
        return (
            <div 
                className={`mt-2 flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg max-w-sm ${isPdf ? 'cursor-pointer hover:bg-gray-100 transition-colors' : ''}`}
                onClick={isPdf ? () => setPreviewFile({ url, type: 'pdf', name: fileName }) : undefined}
            >
                <div className="p-2 bg-white rounded-md border border-gray-100 shadow-sm">
                    <FileText className="w-5 h-5 text-purple-600" />
                </div>
                 <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700 truncate">{fileName || "Attachment"}</p>
                    <p className="text-xs text-gray-500">Document</p>
                </div>
                <a 
                    href={url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-2 text-gray-400 hover:text-purple-600 hover:bg-white rounded-full transition-all cursor-pointer"
                    title="Download"
                    onClick={(e) => e.stopPropagation()}
                >
                    <Download className="w-4 h-4" />
                </a>
            </div>
        );
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10 min-h-screen">
             {/* Header */}
             <div className="mb-8 flex items-center gap-4">
                 <button
                    onClick={() => navigate(`/course/${classId}`)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
                 >
                     <ArrowLeft className="w-6 h-6 text-gray-700" />
                 </button>
                 <div>
                    <h1 className="text-2xl font-bold text-gray-900">Announcements</h1>
                    <p className="text-gray-500 text-sm">Updates from your teacher</p>
                 </div>
            </div>

            <div className="space-y-6 max-w-4xl mx-auto">
                {loading ? (
                    <div className="flex items-center justify-center min-h-[400px]">
                        <div className="text-center">
                            <Loader className="w-8 h-8 text-purple-600 animate-spin mx-auto mb-4" />
                            <p className="text-gray-500">Loading announcements...</p>
                        </div>
                    </div>
                ) : announcements.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <p className="text-2xl">📢</p>
                        </div>
                        <p className="text-gray-500 font-medium">No announcements yet</p>
                    </div>
                ) : (
                    announcements.map((announcement) => (
                        <div
                            key={announcement._id}
                            className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
                        >
                            <div className="p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-lg shadow-sm">
                                        {announcement.teacherId?.name?.charAt(0) || "T"}
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-gray-900">{announcement.teacherId?.name || "Teacher"}</h4>
                                        <p className="text-xs text-gray-500">
                                            {new Date(announcement.createdAt).toLocaleDateString(undefined, {
                                                weekday: 'short',
                                                month: 'short', 
                                                day: 'numeric',
                                                hour: '2-digit', 
                                                minute: '2-digit' 
                                            })}
                                        </p>
                                    </div>
                                </div>

                                <div className="pl-[52px]">
                                    <p className="text-gray-700 whitespace-pre-wrap leading-relaxed text-base">{announcement.message}</p>
                                    
                                    {announcement.fileId && (
                                        renderFilePreview(announcement.fileId, announcement.mimeType, announcement.fileName)
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Preview Modal */}
            {previewFile && (
                previewFile.type === 'pdf' ? (
                    <PdfPreview 
                        url={previewFile.url} 
                        title={previewFile.name} 
                        onClose={() => setPreviewFile(null)} 
                    />
                ) : (
                    <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setPreviewFile(null)}>
                        <div className="relative max-w-5xl w-full max-h-[90vh] flex flex-col items-center">
                            <button 
                                onClick={() => setPreviewFile(null)}
                                className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white transition-colors"
                            >
                                <X className="w-8 h-8" />
                            </button>
                            <img 
                                src={previewFile.url} 
                                alt={previewFile.name} 
                                className="max-w-full max-h-[85vh] rounded-lg shadow-2xl"
                                onClick={(e) => e.stopPropagation()}
                            />
                             <p className="text-white/80 mt-4 font-medium">{previewFile.name}</p>
                        </div>
                    </div>
                )
            )}
        </div>
    );
};

export default StudentAnnouncement;
