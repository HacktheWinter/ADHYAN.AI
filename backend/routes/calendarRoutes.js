import express from "express";
import { authMiddleware, authorizeRoles } from "../middleware/authMiddleware.js";
import { createEvent, getTeacherEvents, getStudentEvents, deleteEvent, getAllStudentEvents } from "../controllers/calendarController.js";

const router = express.Router();

router.post("/create", authMiddleware, authorizeRoles("teacher"), createEvent);
router.get("/teacher/:teacherId", authMiddleware, authorizeRoles("teacher"), getTeacherEvents);
router.get("/student/:classId", authMiddleware, authorizeRoles("student"), getStudentEvents);
router.get("/student/all/:studentId", authMiddleware, authorizeRoles("student"), getAllStudentEvents);
router.delete("/:id", authMiddleware, authorizeRoles("teacher"), deleteEvent);

export default router;
