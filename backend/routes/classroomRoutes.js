// Backend/routes/classroomRoutes.js
import express from "express";
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

router.post("/create", createClassroom);
router.post("/join", joinClassroom);
router.get("/", getClassrooms);
router.get("/:classId", getClassroomById);
router.put("/:classId", updateClassroom);
router.delete("/:classId", deleteClassroom);
router.put("/:classId/meeting/start", startMeeting);
router.put("/:classId/meeting/end", endMeeting);

router.post("/:classId/leave", leaveClassroom);

export default router;
