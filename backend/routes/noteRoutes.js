// Backend/routes/noteRoutes.js
import express from "express";
import { authMiddleware, authorizeRoles } from "../middleware/authMiddleware.js";
import {
  uploadNote,
  getNotes,
  getNoteFile,
  getNotesByClassroom,
  deleteNote,
} from "../controllers/noteController.js";

const router = express.Router();

router.post("/upload", authMiddleware, authorizeRoles("teacher"), uploadNote);
router.get("/", getNotes);
router.get("/classroom/:classroomId", getNotesByClassroom);
router.get("/file/:fileId", getNoteFile);
router.delete("/:noteId", authMiddleware, authorizeRoles("teacher"), deleteNote);

export default router;
