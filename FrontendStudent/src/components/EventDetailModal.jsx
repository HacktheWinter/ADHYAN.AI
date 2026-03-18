import React from 'react';
import { X, CalendarDays, Clock, AlignLeft, MapPin } from 'lucide-react';

const EventDetailModal = ({ event, onClose }) => {
    if (!event) return null;

    const getEventColor = (type) => {
        switch(type) {
            case 'quiz': return 'text-purple-600 bg-purple-100';
            case 'assignment': return 'text-amber-600 bg-amber-100';
            case 'test': return 'text-red-600 bg-red-100';
            case 'class': return 'text-emerald-600 bg-emerald-100';
            default: return 'text-gray-600 bg-gray-100';
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const options = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    };

    const formatTime = (dateString) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const colorClasses = getEventColor(event.extendedProps?.type || event.type);
    const eventType = (event.extendedProps?.type || event.type || 'Event');

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm md:max-w-md overflow-hidden relative transform transition-all scale-100">
                {/* Header Pattern */}
                <div className={`absolute top-0 left-0 right-0 h-32 opacity-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-gray-900 via-gray-100 to-transparent`}></div>

                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 bg-white/80 hover:bg-white text-gray-500 hover:text-gray-900 p-2 rounded-full transition-all backdrop-blur-md shadow-sm border border-gray-100 cursor-pointer"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="relative pt-8 px-6 pb-8">
                    {/* Event Icon/Badge */}
                    <div className="mb-6 flex justify-center">
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg ${colorClasses.replace('text-', 'bg-').split(' ')[0]} bg-opacity-10`}>
                            <span className="text-3xl">
                                {eventType === 'quiz' ? '📋' : 
                                 eventType === 'assignment' ? '📝' : 
                                 eventType === 'test' ? '📄' : 
                                 '🎓'}
                            </span>
                        </div>
                    </div>

                    <div className="text-center space-y-2 mb-8">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${colorClasses}`}>
                            {eventType}
                        </span>
                        <h3 className="text-2xl font-bold text-gray-900 leading-tight">
                            {event.title}
                        </h3>
                        {event.extendedProps?.className && (
                            <p className="text-sm font-medium text-gray-500">
                                {event.extendedProps.className}
                            </p>
                        )}
                    </div>
                    
                    <div className="space-y-4 bg-gray-50 rounded-xl p-5 border border-gray-100">
                        <div className="flex items-start gap-4">
                            <div className="bg-white p-2 rounded-lg shadow-sm text-purple-600">
                                <CalendarDays className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Date</p>
                                <p className="font-semibold text-gray-900">{formatDate(event.start)}</p>
                            </div>
                        </div>

                        {!event.allDay && (
                            <div className="flex items-start gap-4">
                                <div className="bg-white p-2 rounded-lg shadow-sm text-purple-600">
                                    <Clock className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Time</p>
                                    <p className="font-semibold text-gray-900">
                                        {formatTime(event.start)}
                                        {event.end && ` - ${formatTime(event.end)}`}
                                    </p>
                                </div>
                            </div>
                        )}
                        
                        {(event.extendedProps?.description || event.description) && (
                            <div className="flex items-start gap-4 pt-2 border-t border-gray-200 mt-2">
                                <div className="bg-white p-2 rounded-lg shadow-sm text-purple-600 mt-1">
                                    <AlignLeft className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Description</p>
                                    <p className="text-sm text-gray-600 leading-relaxed">
                                        {event.extendedProps?.description || event.description}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EventDetailModal;
