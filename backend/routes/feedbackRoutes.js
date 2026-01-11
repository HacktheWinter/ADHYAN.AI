import express from "express";
import { authMiddleware, authorizeRoles } from "../middleware/authMiddleware.js";

import {
  createFeedback,
  getActiveFeedback,
  getFeedbackForm,
  submitFeedback,
  getFeedbackResults,
  getAllFeedbackResults,
  deleteFeedback,
  deleteResponse,
} from "../controllers/feedbackController.js";


const router = express.Router();

/* Teacher creates feedback */
router.post(
  "/create",
  authMiddleware,
  authorizeRoles("teacher"),
  createFeedback
);

/* Student checks if feedback exists */
router.get(
  "/active/:classId",
  authMiddleware,
  getActiveFeedback
);

/* Student gets feedback questions */
router.get(
  "/form/:classId",
  authMiddleware,
  authorizeRoles("student"),
  getFeedbackForm
);

/* Student submits feedback */
router.post(
  "/submit",
  authMiddleware,
  authorizeRoles("student"),
  submitFeedback
);

/* Teacher views results */
router.get(
  "/results/:classId",
  authMiddleware,
  authorizeRoles("teacher"),
  getFeedbackResults
);


// Teacher views ALL feedback history (old + new)
router.get(
  "/results/all/:classId",
  authMiddleware,
  authorizeRoles("teacher"),
  getAllFeedbackResults
);

/* Teacher deletes a feedback session */
router.delete(
  "/delete/:feedbackId",
  authMiddleware,
  authorizeRoles("teacher"),
  deleteFeedback
);

/* Teacher deletes a specific student response */
router.delete(
  "/response/:feedbackId/:studentId",
  authMiddleware,
  authorizeRoles("teacher"),
  deleteResponse
);

export default router;
