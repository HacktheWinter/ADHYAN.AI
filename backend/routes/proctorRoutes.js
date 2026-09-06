// Backend/routes/proctorRoutes.js
import express from "express";
import { authMiddleware, authorizeRoles } from "../middleware/authMiddleware.js";
import { uploadSnapshot } from "../controllers/proctorController.js";

const router = express.Router();

// Upload webcam snapshot (Student only)
router.post(
  "/upload-snapshot",
  authMiddleware,
  authorizeRoles("student"),
  uploadSnapshot
);

export default router;
