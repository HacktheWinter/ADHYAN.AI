import express from "express";
import {
  registerStudent,
  loginStudent,
  logoutStudent,
} from "../controllers/studentController.js";
import { authMiddleware, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", registerStudent);
router.post("/login", loginStudent);

router.post("/logout", authMiddleware, authorizeRoles("student"), logoutStudent);


export default router;
