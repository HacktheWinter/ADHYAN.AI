import mongoose from "mongoose";

const CalendarEventSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        enum: ["quiz", "assignment", "test", "class", "other"],
        required: true,
    },
    classId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Classroom",
        required: true,
    },
    teacherId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    startDate: {
        type: Date,
        required: true,
    },
    endDate: {
        type: Date, // For events like 'class' that have duration
    },
    submissionDeadline: {
        type: Date, // Specific for quizzes/assignments
    },
    description: {
        type: String,
    },
    relatedId: {
        type: mongoose.Schema.Types.ObjectId, // ID of the actual Quiz/Assignment if auto-created
        refPath: 'onModel'
    },
    onModel: {
        type: String,
        enum: ['Quiz', 'Assignment', 'TestPaper']
    }
}, { timestamps: true });

const CalendarEvent = mongoose.model("CalendarEvent", CalendarEventSchema);

export default CalendarEvent;
