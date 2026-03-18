import CalendarEvent from "../models/CalendarEvent.js";
import Classroom from "../models/Classroom.js";

// @desc    Create a new calendar event (Manual)
// @route   POST /api/calendar/create
// @access  Teacher
export const createEvent = async (req, res) => {
    try {
        const { title, type, classId, teacherId, startDate, endDate, description } = req.body;

        const newEvent = new CalendarEvent({
            title,
            type,
            classId,
            teacherId,
            startDate,
            endDate: endDate || startDate, // Default to same day if not provided
            description,
        });

        await newEvent.save();
        res.status(201).json({ success: true, event: newEvent });
    } catch (error) {
        console.error("Error creating event:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// @desc    Get all events for a teacher (across all their classes)
// @route   GET /api/calendar/teacher/:teacherId
// @access  Teacher
export const getTeacherEvents = async (req, res) => {
    try {
        const { teacherId } = req.params;

        // Optional: Filter by specific class if query param provided
        const { classId } = req.query;

        let query = { teacherId };
        if (classId) {
            query.classId = classId;
        }

        const events = await CalendarEvent.find(query).populate('classId', 'name');
        res.status(200).json({ success: true, events });
    } catch (error) {
        console.error("Error fetching teacher events:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// @desc    Get all events for a student (for a specific class)
// @route   GET /api/calendar/student/:classId
// @access  Student
export const getStudentEvents = async (req, res) => {
    try {
        const { classId } = req.params;

        const events = await CalendarEvent.find({ classId });
        res.status(200).json({ success: true, events });
    } catch (error) {
        console.error("Error fetching student events:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// @desc    Get all events for a student (across ALL enrolled classes)
// @route   GET /api/calendar/student/all/:studentId
// @access  Student
export const getAllStudentEvents = async (req, res) => {
    try {
        const { studentId } = req.params;

        // 1. Find all classrooms where the student is enrolled
        const enrolledClassrooms = await Classroom.find({ students: studentId }).select('_id name');

        if (!enrolledClassrooms.length) {
            return res.status(200).json({ success: true, events: [] });
        }

        const classIds = enrolledClassrooms.map(cls => cls._id);

        // 2. Find events for these classrooms
        // Only fetch future events or recent past (optional, but for "Upcoming" we usually want future)
        // User wants "events scheduled within the next 7 days" for sidebar, but full calendar needs all.
        // Let's return all and filter on frontend for flexibility, or maybe add query params.
        // For simplicity and to match existing patterns, let's fetch all.
        const events = await CalendarEvent.find({ classId: { $in: classIds } })
            .populate('classId', 'name')
            .sort({ startDate: 1 });

        res.status(200).json({ success: true, events });
    } catch (error) {
        console.error("Error fetching all student events:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// @desc    Delete a calendar event
// @route   DELETE /api/calendar/:id
// @access  Teacher
export const deleteEvent = async (req, res) => {
    try {
        const { id } = req.params;
        const event = await CalendarEvent.findById(id);

        if (!event) {
            return res.status(404).json({ success: false, message: "Event not found" });
        }

        // Optional: Check if the user is the teacher who created it (if strict ownership is needed)
        // if (event.teacherId.toString() !== req.user.id) { ... }

        await CalendarEvent.findByIdAndDelete(id);
        res.status(200).json({ success: true, message: "Event deleted" });
    } catch (error) {
        console.error("Error deleting event:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};
