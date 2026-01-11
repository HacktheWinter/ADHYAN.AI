import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar, Clock, ChevronRight, Loader, ChevronDown, ChevronUp } from 'lucide-react';
import EventDetailModal from './EventDetailModal';
import API_BASE_URL from '../config';

const UpcomingEventsSidebar = () => {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [isExpanded, setIsExpanded] = useState(false);
    
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const studentId = user.id || user._id;

    useEffect(() => {
        if (!studentId) return;

        const fetchUpcomingEvents = async () => {
            try {
                const response = await axios.get(`${API_BASE_URL}/calendar/student/all/${studentId}`);
                if (response.data.success) {
                    const allEvents = response.data.events;
                    const now = new Date();
                    const nextWeek = new Date();
                    nextWeek.setDate(now.getDate() + 7);

                    const upcoming = allEvents.filter(event => {
                        const eventDate = new Date(event.startDate);
                        const type = (event.type || '').toLowerCase();
                        // User requested: "assignment ka sirf chode ke" -> Exclude assignments
                        const isNotAssignment = type !== 'assignment'; 
                        const isUpcoming = eventDate >= now && eventDate <= nextWeek;
                        
                        return isUpcoming && isNotAssignment;
                    }).sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

                    setEvents(upcoming);
                    // if (upcoming.length > 0) setIsExpanded(true); // User requested default closed 
                }
            } catch (error) {
                console.error("Error fetching upcoming events:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchUpcomingEvents();
    }, [studentId]);

    const getTypeStyles = (type) => {
        switch(type) {
            case 'quiz': return { color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100', icon: '📋' };
            case 'assignment': return { color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', icon: '📝' };
            case 'test': return { color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100', icon: '📄' };
            default: return { color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', icon: '🎓' };
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        if (date.toDateString() === today.toDateString()) return 'Today';
        if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
        return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    };

    if (loading) return null; 

    if (events.length === 0) return null; 

    return (
        <div className="mb-8">
            <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors group cursor-pointer"
            >
                <div className="flex items-center gap-3">
                    <div className="bg-purple-100 p-2 rounded-lg text-purple-600">
                        <Calendar className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                        <h2 className="font-bold text-gray-900 text-sm sm:text-base">Upcoming Events</h2>
                        <p className="text-xs text-gray-500">Next 7 Days ({events.length})</p>
                    </div>
                </div>
                {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400 group-hover:text-gray-600" /> : <ChevronDown className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />}
            </button>

            {isExpanded && (
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
                    {events.map(event => {
                        const styles = getTypeStyles(event.type);
                        return (
                            <button
                                key={event._id}
                                onClick={() => setSelectedEvent({
                                    ...event,
                                    start: event.startDate,
                                    end: event.endDate,
                                    extendedProps: { type: event.type, className: event.classId?.name, description: event.description }
                                })}
                                className={`text-left p-3 rounded-xl border transition-all duration-200 hover:shadow-md group cursor-pointer ${styles.bg} ${styles.border} hover:bg-white bg-white`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white border border-gray-100 ${styles.color}`}>
                                        {event.type}
                                    </span>
                                    <span className="text-xs font-medium text-gray-500 flex items-center gap-1">
                                        {formatDate(event.startDate)}
                                    </span>
                                </div>
                                <h3 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-1 group-hover:text-purple-700 transition-colors">
                                    {event.title}
                                </h3>
                                <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                                    <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {new Date(event.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    {event.classId?.name && (
                                        <span className="truncate max-w-[150px] opacity-75 border-l border-gray-300 pl-3">
                                            {event.classId.name}
                                        </span>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}

            {selectedEvent && (
                <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
            )}
        </div>
    );
};

export default UpcomingEventsSidebar;
