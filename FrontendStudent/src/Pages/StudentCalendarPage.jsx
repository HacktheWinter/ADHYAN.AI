import React, { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, CalendarDays, Loader, RefreshCw, Clock } from 'lucide-react';
import EventDetailModal from '../components/EventDetailModal';

const StudentCalendarPage = () => {
    const { id: classId } = useParams();
    const navigate = useNavigate();
    const [events, setEvents] = useState([]);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if(classId) fetchEvents();
    }, [classId]);

    const fetchEvents = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`http://localhost:5000/api/calendar/student/${classId}`);
            if (response.data.success) {
                const formattedEvents = response.data.events.map(event => ({
                    id: event._id,
                    title: event.title,
                    start: event.startDate,
                    end: event.endDate || event.submissionDeadline,
                    backgroundColor: getEventColor(event.type),
                    borderColor: getEventColor(event.type),
                    allDay: event.type === 'assignment',
                    classNames: ['calendar-event'],
                    extendedProps: {
                        type: event.type,
                        description: event.description
                    }
                }));
                setEvents(formattedEvents);
            }
        } catch (error) {
            console.error("Error fetching events:", error);
        } finally {
            setLoading(false);
        }
    };

    const getEventColor = (type) => {
        switch(type) {
            case 'quiz': return '#8B5CF6';
            case 'assignment': return '#F59E0B';
            case 'test': return '#EF4444';
            case 'class': return '#10B981';
            default: return '#6B7280';
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
            <style>{`
                .fc {
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                }
                
                .fc .fc-toolbar {
                    padding: 1rem 1rem;
                    margin-bottom: 0 !important;
                    gap: 0.75rem;
                    flex-wrap: wrap;
                }
                
                @media (max-width: 768px) {
                    .fc .fc-toolbar {
                        padding: 0.75rem 0.5rem;
                        gap: 0.5rem;
                    }
                    
                    .fc .fc-toolbar.fc-header-toolbar {
                        flex-direction: column;
                        align-items: stretch !important;
                    }
                    
                    .fc .fc-toolbar-chunk {
                        display: flex;
                        justify-content: center;
                        margin: 0.25rem 0;
                    }
                }
                
                .fc .fc-toolbar-title {
                    font-size: 1.25rem !important;
                    font-weight: 700 !important;
                    color: #111827 !important;
                    letter-spacing: -0.025em;
                }
                
                @media (min-width: 768px) {
                    .fc .fc-toolbar-title {
                        font-size: 1.75rem !important;
                    }
                }
                
                .fc .fc-button {
                    background: white !important;
                    color: #374151 !important;
                    border: 1.5px solid #E5E7EB !important;
                    text-transform: capitalize !important;
                    font-weight: 600 !important;
                    font-size: 0.75rem !important;
                    padding: 0.5rem 0.875rem !important;
                    border-radius: 0.75rem !important;
                    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05) !important;
                    transition: all 0.2s ease !important;
                }
                
                @media (min-width: 768px) {
                    .fc .fc-button {
                        font-size: 0.875rem !important;
                        padding: 0.625rem 1.25rem !important;
                    }
                }
                
                .fc .fc-button:hover {
                    background: #F9FAFB !important;
                    border-color: #D1D5DB !important;
                    color: #111827 !important;
                    transform: translateY(-1px);
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1) !important;
                }
                
                .fc .fc-button-active {
                    background: linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%) !important;
                    color: white !important;
                    border-color: #7C3AED !important;
                    box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3) !important;
                }
                
                .fc .fc-button-active:hover {
                    background: linear-gradient(135deg, #6D28D9 0%, #5B21B6 100%) !important;
                    transform: translateY(-1px);
                }
                
                .fc .fc-day-today {
                    background: linear-gradient(135deg, #EDE9FE 0%, #DDD6FE 100%) !important;
                    position: relative;
                }
                
                .fc .fc-day-today .fc-daygrid-day-number {
                    background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%);
                    color: white !important;
                    border-radius: 0.5rem;
                    width: 1.75rem;
                    height: 1.75rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0.25rem;
                }
                
                .fc .fc-daygrid-more-link {
                    color: #7C3AED !important;
                    font-weight: 600 !important;
                    font-size: 0.625rem !important;
                    padding: 0.25rem 0.5rem !important;
                    border-radius: 0.375rem !important;
                    background: #EDE9FE !important;
                    margin: 0.125rem 0.25rem !important;
                }
                
                .fc .fc-daygrid-more-link:hover {
                    background: #DDD6FE !important;
                    color: #5B21B6 !important;
                }
                
                .fc .fc-scrollgrid {
                    border-color: #E5E7EB !important;
                    border-radius: 0.75rem !important;
                    overflow: hidden;
                }
                
                .fc .fc-scrollgrid td,
                .fc .fc-scrollgrid th {
                    border-color: #F3F4F6 !important;
                }
                
                .fc .fc-popover {
                    border-radius: 0.75rem !important;
                    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15) !important;
                    border: 1px solid #E5E7EB !important;
                }
                
                .fc .fc-popover-header {
                    background: #F9FAFB !important;
                    padding: 0.75rem 1rem !important;
                    border-bottom: 1px solid #E5E7EB !important;
                }
            `}</style>
            
            {/* Header */}
            <div className="bg-white/80 backdrop-blur-xl border-b border-gray-200/50 px-3 md:px-6 py-3 md:py-4 sticky top-0 z-30 shadow-sm">
                <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
                        <button
                            onClick={() => navigate(`/course/${classId}`)}
                            className="group p-2 hover:bg-gray-100 rounded-xl transition-all duration-200 flex-shrink-0 cursor-pointer"
                        >
                            <ArrowLeft className="w-4 h-4 md:w-5 md:h-5 text-gray-600 group-hover:text-gray-900 transition-colors" />
                        </button>
                        <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                            <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/30 flex-shrink-0">
                                <CalendarDays className="w-4 h-4 md:w-5 md:h-5 text-white" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <h1 className="text-base md:text-xl font-bold text-gray-900 truncate">Course Schedule</h1>
                                <p className="text-xs md:text-sm text-gray-500 hidden sm:block">Track your classes and deadlines</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
                        {/* Legend - Hidden on small mobile */}
                        <div className="hidden lg:flex items-center gap-3 text-xs font-semibold text-gray-600 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                            <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-purple-600"></div>
                                <span>Quiz</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                                <span>Assignment</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                <span>Test</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-emerald-600"></div>
                                <span>Class</span>
                            </div>
                        </div>
                        
                        <button
                            onClick={fetchEvents}
                            className="p-2 hover:bg-gray-100 rounded-xl transition text-gray-500 hover:text-purple-600 cursor-pointer flex-shrink-0"
                            title="Refresh"
                        >
                            <RefreshCw className={`w-4 h-4 md:w-5 md:h-5 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>
                
                {/* Mobile Legend */}
                <div className="lg:hidden flex items-center justify-center gap-3 md:gap-4 text-xs font-semibold text-gray-600 mt-3 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 overflow-x-auto">
                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                        <div className="w-2 h-2 rounded-full bg-purple-600"></div>
                        <span>Quiz</span>
                    </div>
                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                        <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                        <span>Assignment</span>
                    </div>
                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                        <span>Test</span>
                    </div>
                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                        <div className="w-2 h-2 rounded-full bg-emerald-600"></div>
                        <span>Class</span>
                    </div>
                </div>
            </div>

            {/* Calendar */}
            <div className="p-3 md:p-6 max-w-[1600px] mx-auto">
                {loading ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 h-[calc(100vh-140px)] md:h-[calc(100vh-180px)] flex items-center justify-center">
                        <div className="text-center">
                            <Loader className="w-8 h-8 text-purple-600 animate-spin mx-auto mb-3" />
                            <p className="text-sm text-gray-500">Loading schedule...</p>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl md:rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                        <FullCalendar
                            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                            initialView="dayGridMonth"
                            headerToolbar={{
                                left: 'prev,next today',
                                center: 'title',
                                right: 'dayGridMonth,timeGridWeek,timeGridDay'
                            }}
                            events={events}
                            eventClick={(info) => {
                                const eventObj = events.find(e => e.id === info.event.id);
                                if (eventObj) setSelectedEvent(eventObj);
                            }}
                            height="auto"
                            contentHeight="auto"
                            aspectRatio={1.8}
                            dayMaxEvents={3}
                            eventTimeFormat={{
                                hour: 'numeric',
                                minute: '2-digit',
                                meridiem: 'short'
                            }}
                            slotMinTime="08:00:00"
                            slotMaxTime="20:00:00"
                            allDaySlot={true}
                            nowIndicator={true}
                            eventDisplay="block"
                            displayEventTime={true}
                            displayEventEnd={false}
                            eventContent={(eventInfo) => (
                                <div className="flex flex-col px-1 overflow-hidden leading-tight cursor-pointer" title={eventInfo.event.title}>
                                    {eventInfo.timeText && (
                                        <div className="text-[10px] opacity-90 font-medium flex items-center gap-1">
                                            <Clock className="w-2.5 h-2.5" />
                                            {eventInfo.timeText}
                                        </div>
                                    )}
                                    <div className="font-bold text-xs truncate mt-0.5 text-white">
                                        {eventInfo.event.title}
                                    </div>
                                </div>
                            )}
                        />
                    </div>
                )}
            </div>
            
            {selectedEvent && (
                <EventDetailModal 
                    event={selectedEvent} 
                    onClose={() => setSelectedEvent(null)} 
                />
            )}
        </div>
    );
};

export default StudentCalendarPage;