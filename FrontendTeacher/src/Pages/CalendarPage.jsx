import React, { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Plus, X, CalendarDays, Loader, Clock, AlignLeft, Trash2, MapPin } from 'lucide-react';

const CalendarPage = () => {
    const { classId } = useParams();
    const navigate = useNavigate();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [deleting, setDeleting] = useState(false);
    
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const teacherId = currentUser.id || currentUser._id;

    const [newEvent, setNewEvent] = useState({
        title: '',
        type: 'class',
        startDate: '',
        startTime: '10:00',
        endDate: '',
        endTime: '11:00',
        description: ''
    });

    useEffect(() => {
        fetchEvents();
    }, [teacherId]);

    const fetchEvents = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`http://localhost:5000/api/calendar/teacher/${teacherId}`);
            if (response.data.success) {
                const formattedEvents = response.data.events.map(event => ({
                    id: event._id,
                    title: event.title,
                    start: event.startDate,
                    end: event.endDate,
                    backgroundColor: getEventColor(event.type),
                    borderColor: getEventColor(event.type),
                    allDay: event.type === 'assignment',
                    classNames: ['calendar-event'],
                    extendedProps: {
                        type: event.type,
                        description: event.description,
                        className: event.classId?.name || 'Class',
                        originalStart: event.startDate,
                        originalEnd: event.endDate
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

    const handleDateClick = (arg) => {
        setNewEvent({
            ...newEvent,
            startDate: arg.dateStr,
            endDate: arg.dateStr
        });
        setIsModalOpen(true);
    };

    const handleEventClick = (info) => {
        const eventObj = events.find(e => e.id === info.event.id);
        if (eventObj) {
            setSelectedEvent(eventObj);
        }
    };

    const handleDeleteEvent = async () => {
        if (!selectedEvent) return;
        if (!window.confirm("Are you sure you want to delete this event? This action cannot be undone.")) return;

        setDeleting(true);
        try {
            await axios.delete(`http://localhost:5000/api/calendar/${selectedEvent.id}`);
            await fetchEvents();
            setSelectedEvent(null);
        } catch (error) {
            console.error("Error deleting event:", error);
            alert("Failed to delete event");
        } finally {
            setDeleting(false);
        }
    };

    const handleSubmit = async () => {
        setSubmitting(true);

        try {
            let startDateTime, endDateTime;
            
            // Assignment ke liye sirf date, no timing
            if (newEvent.type === 'assignment') {
                startDateTime = new Date(newEvent.startDate);
                startDateTime.setHours(0, 0, 0, 0);
                endDateTime = new Date(newEvent.startDate);
                endDateTime.setHours(23, 59, 59, 999);
            } 
            // Quiz aur Test ke liye timing chahiye
            else if (['quiz', 'test'].includes(newEvent.type)) {
                startDateTime = new Date(`${newEvent.startDate}T${newEvent.startTime}`);
                endDateTime = new Date(`${newEvent.endDate || newEvent.startDate}T${newEvent.endTime}`);
            }
            // Live Class ke liye timing chahiye
            else {
                startDateTime = new Date(`${newEvent.startDate}T${newEvent.startTime}`);
                endDateTime = new Date(`${newEvent.endDate || newEvent.startDate}T${newEvent.endTime}`);
            }

            const payload = {
                title: newEvent.title,
                type: newEvent.type,
                classId: classId,
                teacherId: teacherId,
                startDate: startDateTime,
                endDate: endDateTime,
                description: newEvent.description
            };

            await axios.post('http://localhost:5000/api/calendar/create', payload);
            await fetchEvents();
            setIsModalOpen(false);
            setNewEvent({
                title: '',
                type: 'class',
                startDate: '',
                startTime: '10:00',
                endDate: '',
                endTime: '11:00',
                description: ''
            });

        } catch (error) {
            console.error("Error creating event:", error);
            alert("Failed to create event");
        } finally {
            setSubmitting(false);
        }
    };

    const isAssignment = newEvent.type === 'assignment';
    const needsTiming = !isAssignment;

    // Helper to format date for display
    const formatDate = (dateString) => {
        if (!dateString) return '';
        const options = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    };

    const formatTime = (dateString) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="w-full bg-gradient-to-br from-gray-50 via-white to-gray-50">
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
                    background: linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%) !important;
                    color: white !important;
                    border-color: #8B5CF6 !important;
                    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3) !important;
                }
                
                .fc .fc-button-active:hover {
                    background: linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%) !important;
                    transform: translateY(-1px);
                }
                
                .fc .fc-button:disabled {
                    opacity: 0.4 !important;
                    cursor: not-allowed !important;
                }
                
                .fc .fc-button .fc-icon {
                    font-size: 0.875rem !important;
                }
                
                @media (min-width: 768px) {
                    .fc .fc-button .fc-icon {
                        font-size: 1rem !important;
                    }
                }
                
                .fc .fc-col-header {
                    background: linear-gradient(to bottom, #F9FAFB, #F3F4F6);
                    border-bottom: 2px solid #E5E7EB !important;
                }
                
                .fc .fc-col-header-cell {
                    padding: 0.75rem 0.5rem !important;
                    border: none !important;
                }
                
                @media (min-width: 768px) {
                    .fc .fc-col-header-cell {
                        padding: 1rem 0.5rem !important;
                    }
                }
                
                .fc .fc-col-header-cell-cushion {
                    color: #6B7280 !important;
                    font-weight: 700 !important;
                    font-size: 0.625rem !important;
                    text-transform: uppercase !important;
                    letter-spacing: 0.05em !important;
                }
                
                @media (min-width: 768px) {
                    .fc .fc-col-header-cell-cushion {
                        font-size: 0.75rem !important;
                    }
                }
                
                .fc .fc-daygrid-day {
                    transition: background-color 0.2s ease;
                }
                
                .fc .fc-daygrid-day:hover {
                    background-color: #F9FAFB !important;
                }
                
                .fc .fc-daygrid-day-number {
                    color: #374151 !important;
                    font-weight: 600 !important;
                    font-size: 0.8125rem !important;
                    padding: 0.375rem !important;
                }
                
                @media (min-width: 768px) {
                    .fc .fc-daygrid-day-number {
                        font-size: 0.875rem !important;
                        padding: 0.5rem !important;
                    }
                }
                
                .fc .fc-day-today {
                    background: linear-gradient(135deg, #EDE9FE 0%, #F3E8FF 100%) !important;
                    position: relative;
                }
                
                .fc .fc-day-today .fc-daygrid-day-number {
                    background: linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%);
                    color: white !important;
                    border-radius: 0.5rem;
                    width: 1.75rem;
                    height: 1.75rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0.25rem;
                }
                
                @media (min-width: 768px) {
                    .fc .fc-day-today .fc-daygrid-day-number {
                        width: 2rem;
                        height: 2rem;
                    }
                }
                
                .fc-event.calendar-event {
                    border: none !important;
                    border-radius: 0.375rem !important;
                    padding: 0.25rem 0.5rem !important;
                    margin: 0.125rem 0.25rem !important;
                    font-size: 0.75rem !important;
                    font-weight: 600 !important;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08) !important;
                    transition: all 0.2s ease !important;
                    cursor: pointer;
                }
                
                @media (min-width: 768px) {
                    .fc-event.calendar-event {
                        border-radius: 0.5rem !important;
                        padding: 0.375rem 0.625rem !important;
                        font-size: 0.8125rem !important;
                    }
                }
                
                .fc-event.calendar-event:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.12) !important;
                }
                
                .fc .fc-daygrid-event-dot {
                    display: none !important;
                }
                
                .fc .fc-timegrid-slot {
                    height: 3rem !important;
                    border-color: #F3F4F6 !important;
                }
                
                @media (min-width: 768px) {
                    .fc .fc-timegrid-slot {
                        height: 3.5rem !important;
                    }
                }
                
                .fc .fc-timegrid-slot-label {
                    color: #6B7280 !important;
                    font-size: 0.625rem !important;
                    font-weight: 600 !important;
                    padding-right: 0.5rem !important;
                }
                
                @media (min-width: 768px) {
                    .fc .fc-timegrid-slot-label {
                        font-size: 0.75rem !important;
                        padding-right: 0.75rem !important;
                    }
                }
                
                .fc .fc-timegrid-event {
                    border-radius: 0.5rem !important;
                    border: none !important;
                    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1) !important;
                }
                
                .fc .fc-daygrid-more-link {
                    color: #8B5CF6 !important;
                    font-weight: 600 !important;
                    font-size: 0.625rem !important;
                    padding: 0.25rem 0.5rem !important;
                    border-radius: 0.375rem !important;
                    background: #F5F3FF !important;
                    margin: 0.125rem 0.25rem !important;
                }
                
                @media (min-width: 768px) {
                    .fc .fc-daygrid-more-link {
                        font-size: 0.75rem !important;
                    }
                }
                
                .fc .fc-daygrid-more-link:hover {
                    background: #EDE9FE !important;
                    color: #7C3AED !important;
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

            <div className="bg-white/80 backdrop-blur-xl border-b border-gray-200/50 px-3 md:px-6 py-3 md:py-4 sticky top-0 z-30 shadow-sm rounded-xl mb-6">
                <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 md:gap-4 min-w-0">
                        <button
                            onClick={() => navigate(`/class/${classId}`)}
                            className="group p-2 hover:bg-gray-100 rounded-xl transition-all duration-200 flex-shrink-0"
                        >
                            <ArrowLeft className="w-4 h-4 md:w-5 md:h-5 text-gray-600 group-hover:text-gray-900 transition-colors" />
                        </button>
                        <div className="flex items-center gap-2 md:gap-3 min-w-0">
                            <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/30 flex-shrink-0">
                                <CalendarDays className="w-4 h-4 md:w-5 md:h-5 text-white" />
                            </div>
                            <div className="min-w-0">
                                <h1 className="text-base md:text-xl font-bold text-gray-900 truncate">Class Calendar</h1>
                                <p className="text-xs md:text-sm text-gray-500 hidden sm:block">Manage schedules & deadlines</p>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="group flex items-center gap-1.5 md:gap-2 px-3 md:px-5 py-2 md:py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-purple-500/30 hover:shadow-purple-500/40 hover:-translate-y-0.5 text-sm md:text-base flex-shrink-0"
                    >
                        <Plus className="w-4 h-4 md:w-5 md:h-5 group-hover:rotate-90 transition-transform duration-200" />
                        <span className="hidden sm:inline">New Event</span>
                        <span className="sm:hidden">Add</span>
                    </button>
                </div>
            </div>

            <div className="p-3 md:p-6 max-w-[1600px] mx-auto">
                {loading ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 h-[calc(100vh-120px)] md:h-[calc(100vh-160px)] flex items-center justify-center">
                        <Loader className="w-8 h-8 text-purple-600 animate-spin" />
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
                            dateClick={handleDateClick}
                            eventClick={handleEventClick}
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
                        />
                    </div>
                )}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl md:rounded-2xl shadow-2xl w-full max-w-md">
                        <div className="px-4 md:px-6 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-t-xl md:rounded-t-2xl relative">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="absolute top-3 right-3 p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-all"
                            >
                                <X className="w-5 h-5" />
                            </button>
                            <h3 className="font-bold text-lg md:text-xl text-white">Create New Event</h3>
                            <p className="text-xs md:text-sm text-purple-100 mt-1">Schedule your classes and deadlines</p>
                        </div>
                        
                        <div className="p-4 md:p-5 space-y-3">
                            {/* Event Type */}
                            <div>
                                <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-2">Event Type</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { value: 'class', label: 'Live Class', emoji: '🎓' },
                                        { value: 'assignment', label: 'Assignment', emoji: '📝' },
                                        { value: 'quiz', label: 'Quiz', emoji: '📋' },
                                        { value: 'test', label: 'Test', emoji: '📄' }
                                    ].map((type) => (
                                        <button
                                            key={type.value}
                                            type="button"
                                            onClick={() => setNewEvent({...newEvent, type: type.value})}
                                            className={`p-2 rounded-lg border-2 transition-all text-left ${
                                                newEvent.type === type.value
                                                    ? 'border-purple-500 bg-purple-50 shadow-md'
                                                    : 'border-gray-200 hover:border-gray-300 bg-white'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg">{type.emoji}</span>
                                                <span className={`text-xs md:text-sm font-semibold ${
                                                    newEvent.type === type.value ? 'text-purple-700' : 'text-gray-700'
                                                }`}>
                                                    {type.label}
                                                </span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Title */}
                            <div>
                                <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1.5">
                                    {isAssignment ? 'Assignment Title' : newEvent.type === 'quiz' ? 'Quiz Title' : newEvent.type === 'test' ? 'Test Title' : 'Class Title'}
                                </label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-3 py-2 text-sm md:text-base border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
                                    placeholder={isAssignment ? "e.g., Physics Chapter 5" : newEvent.type === 'quiz' ? "e.g., Weekly Quiz #3" : newEvent.type === 'test' ? "e.g., Mid-term Exam" : "e.g., Live Physics Review"}
                                    value={newEvent.title}
                                    onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                                />
                            </div>

                            {/* Date */}
                            <div>
                                <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1.5">
                                    {isAssignment ? 'Submission Deadline' : newEvent.type === 'quiz' ? 'Quiz Date' : newEvent.type === 'test' ? 'Test Date' : 'Class Date'}
                                </label>
                                <input
                                    type="date"
                                    required
                                    className="w-full px-3 py-2 text-sm md:text-base border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
                                    value={newEvent.startDate}
                                    onChange={(e) => setNewEvent({...newEvent, startDate: e.target.value, endDate: e.target.value})}
                                />
                                {isAssignment && (
                                    <p className="text-xs text-gray-500 mt-1.5">Last date to submit assignment</p>
                                )}
                            </div>

                            {/* Time Fields - Only for Live Class, Quiz, and Test */}
                            {needsTiming && (
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1.5">
                                            {newEvent.type === 'quiz' ? 'Start Time' : newEvent.type === 'test' ? 'Start Time' : 'Start Time'}
                                        </label>
                                        <div className="relative">
                                            <Clock className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                                            <input
                                                type="time"
                                                required
                                                className="w-full pl-9 pr-2 py-2 text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
                                                value={newEvent.startTime}
                                                onChange={(e) => setNewEvent({...newEvent, startTime: e.target.value})}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1.5">
                                            {newEvent.type === 'quiz' ? 'End Time' : newEvent.type === 'test' ? 'End Time' : 'End Time'}
                                        </label>
                                        <div className="relative">
                                            <Clock className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                                            <input
                                                type="time"
                                                required
                                                className="w-full pl-9 pr-2 py-2 text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
                                                value={newEvent.endTime}
                                                onChange={(e) => setNewEvent({...newEvent, endTime: e.target.value})}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {needsTiming && (
                                <p className="text-xs text-gray-500 -mt-1">
                                    {newEvent.type === 'quiz' ? 'Quiz duration and timing' : 
                                     newEvent.type === 'test' ? 'Test duration and timing' : 
                                     'Class session timing'}
                                </p>
                            )}

                            {/* Description */}
                            <div>
                                <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1.5">
                                    Description <span className="text-gray-400 font-normal">(Optional)</span>
                                </label>
                                <div className="relative">
                                    <AlignLeft className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
                                    <textarea
                                        className="w-full pl-9 pr-3 py-2 text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none resize-none transition"
                                        rows="2"
                                        placeholder="Add details..."
                                        value={newEvent.description}
                                        onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                                    />
                                </div>
                            </div>

                            {/* Buttons */}
                            <div className="flex gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 py-2 text-sm font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSubmit}
                                    disabled={submitting || !newEvent.title || !newEvent.startDate}
                                    className="flex-1 py-2 text-sm bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold rounded-lg transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {submitting ? (
                                        <Loader className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <>
                                            <Plus className="w-4 h-4" />
                                            Create
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Event Detail Modal (Deleting support) */}
            {selectedEvent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl md:rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
                        <div className="relative p-0 overflow-hidden">
                            {/* Header Gradient */}
                            <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-br from-purple-600 to-indigo-600"></div>
                            
                            <div className="relative pt-12 px-6 pb-6">
                                {/* Type Badge & Close */}
                                <div className="flex justify-between items-start mb-4">
                                    <div className="bg-white p-3 rounded-2xl shadow-lg border border-gray-100">
                                        <CalendarDays className="w-8 h-8 text-purple-600" />
                                    </div>
                                    <button 
                                        onClick={() => setSelectedEvent(null)}
                                        className="bg-black/20 hover:bg-black/30 text-white p-1.5 rounded-full transition-colors backdrop-blur-md"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                                
                                <h3 className="text-xl font-bold text-gray-900 mb-1">{selectedEvent.title}</h3>
                                <p className="text-sm font-medium text-purple-600 uppercase tracking-wide opacity-90">{selectedEvent.extendedProps?.type}</p>
                                
                                <div className="mt-6 space-y-4">
                                    <div className="flex items-start gap-3 text-gray-600">
                                        <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
                                        <div>
                                            <p className="font-medium text-gray-900">{formatDate(selectedEvent.start)}</p>
                                            {!selectedEvent.allDay && (
                                                <p className="text-sm">
                                                    {formatTime(selectedEvent.extendedProps?.originalStart)} - {formatTime(selectedEvent.extendedProps?.originalEnd)}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {selectedEvent.extendedProps?.description && (
                                        <div className="flex items-start gap-3 text-gray-600">
                                            <AlignLeft className="w-5 h-5 text-gray-400 mt-0.5" />
                                            <p className="text-sm leading-relaxed">{selectedEvent.extendedProps.description}</p>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-8">
                                    <button
                                        onClick={handleDeleteEvent}
                                        disabled={deleting}
                                        className="w-full flex items-center justify-center gap-2 py-3 bg-red-50 text-red-600 font-semibold rounded-xl hover:bg-red-100 hover:text-red-700 transition-all border border-red-100 group"
                                    >
                                        {deleting ? (
                                            <Loader className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <>
                                                <Trash2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                                Delete Event
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CalendarPage;