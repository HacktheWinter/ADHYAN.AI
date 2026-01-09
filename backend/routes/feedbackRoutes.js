import express from "express";
import { authMiddleware, authorizeRoles } from "../middleware/authMiddleware.js";

import {
  createFeedback,
  getActiveFeedback,
  getFeedbackForm,
  submitFeedback,
  getFeedbackResults,
  getAllFeedbackResults,
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


export default router;
