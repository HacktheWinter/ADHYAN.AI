import express from "express";
import {
  requestStudentPasswordReset,
  requestTeacherPasswordReset,
  resetStudentPassword,
  resetTeacherPassword,
} from "../controllers/passwordResetController.js";

const router = express.Router();

router.post("/teacher/forgot-password", requestTeacherPasswordReset);
router.post("/student/forgot-password", requestStudentPasswordReset);
router.post("/teacher/reset-password", resetTeacherPassword);
router.post("/student/reset-password", resetStudentPassword);

export default router;
