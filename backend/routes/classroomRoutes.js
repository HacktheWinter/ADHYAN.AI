// Backend/routes/classroomRoutes.js
import express from "express";
import { authMiddleware, authorizeRoles } from "../middleware/authMiddleware.js";
import {
  createClassroom,
  joinClassroom,
  getClassrooms,
  getClassroomById,
  updateClassroom,
  deleteClassroom,
  startMeeting,
  endMeeting,
  leaveClassroom,
} from "../controllers/classroomController.js";

const router = express.Router();

router.post("/create", authMiddleware, authorizeRoles("teacher"), createClassroom);
router.post("/join", authMiddleware, authorizeRoles("student"), joinClassroom);
router.get("/", authMiddleware, authorizeRoles("teacher", "student"), getClassrooms);
router.get("/:classId", authMiddleware, authorizeRoles("teacher", "student"), getClassroomById);
router.put("/:classId", authMiddleware, authorizeRoles("teacher"), updateClassroom);
router.delete("/:classId", authMiddleware, authorizeRoles("teacher"), deleteClassroom);
router.put(
  "/:classId/meeting/start",
  authMiddleware,
  authorizeRoles("teacher"),
  startMeeting
);
router.put(
  "/:classId/meeting/end",
  authMiddleware,
  authorizeRoles("teacher"),
  endMeeting
);

router.post("/:classId/leave", authMiddleware, authorizeRoles("student"), leaveClassroom);

export default router;
