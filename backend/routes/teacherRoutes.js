import express from "express";
import {
  registerTeacher,
  loginTeacher,
  logoutTeacher,
} from "../controllers/teacherController.js";
import { authMiddleware, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", registerTeacher);
router.post("/login", loginTeacher);

router.post("/logout", authMiddleware, authorizeRoles("teacher"), logoutTeacher);


export default router;
