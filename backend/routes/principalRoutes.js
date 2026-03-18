import express from "express";
import { authMiddleware, authorizeRoles } from "../middleware/authMiddleware.js";
import {
  loginPrincipal,
  logoutPrincipal,
  registerPrincipal,
} from "../controllers/principalAuthController.js";
import {
  requestPrincipalPasswordReset,
  resetPrincipalPassword,
} from "../controllers/passwordResetController.js";
import {
  getPrincipalActivity,
  getPrincipalClassDetail,
  getPrincipalClasses,
  getPrincipalDashboard,
  getPrincipalTeacherDetail,
  getPrincipalTeachers,
} from "../controllers/principalDashboardController.js";

const router = express.Router();

router.post("/register", registerPrincipal);
router.post("/login", loginPrincipal);
router.post("/forgot-password", requestPrincipalPasswordReset);
router.post("/reset-password", resetPrincipalPassword);
router.post("/logout", authMiddleware, authorizeRoles("principal"), logoutPrincipal);

router.get(
  "/dashboard",
  authMiddleware,
  authorizeRoles("principal"),
  getPrincipalDashboard
);
router.get(
  "/teachers",
  authMiddleware,
  authorizeRoles("principal"),
  getPrincipalTeachers
);
router.get(
  "/teachers/:teacherId",
  authMiddleware,
  authorizeRoles("principal"),
  getPrincipalTeacherDetail
);
router.get(
  "/classes",
  authMiddleware,
  authorizeRoles("principal"),
  getPrincipalClasses
);
router.get(
  "/classes/:classId",
  authMiddleware,
  authorizeRoles("principal"),
  getPrincipalClassDetail
);
router.get(
  "/activity",
  authMiddleware,
  authorizeRoles("principal"),
  getPrincipalActivity
);

export default router;
