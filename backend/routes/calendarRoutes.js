import express from "express";
import { createEvent, getTeacherEvents, getStudentEvents, deleteEvent, getAllStudentEvents } from "../controllers/calendarController.js";

const router = express.Router();

router.post("/create", createEvent);
router.get("/teacher/:teacherId", getTeacherEvents);
router.get("/student/:classId", getStudentEvents);
router.get("/student/all/:studentId", getAllStudentEvents);
router.delete("/:id", deleteEvent);

export default router;
