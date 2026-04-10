import express from "express";
import { authMiddleware, authorizeRoles } from "../middleware/authMiddleware.js";
import {
  getAuditLogs,
  getAuditLogById,
  getAuditStats,
} from "../controllers/auditController.js";

const router = express.Router();

// GET /api/audit/stats — Aggregated statistics (teacher/principal only)
router.get(
  "/stats",
  authMiddleware,
  authorizeRoles("teacher", "principal"),
  getAuditStats
);

// GET /api/audit/logs — Paginated audit logs (teacher/principal only)
router.get(
  "/logs",
  authMiddleware,
  authorizeRoles("teacher", "principal"),
  getAuditLogs
);

// GET /api/audit/logs/:id — Single audit log detail (teacher/principal only)
router.get(
  "/logs/:id",
  authMiddleware,
  authorizeRoles("teacher", "principal"),
  getAuditLogById
);

export default router;
