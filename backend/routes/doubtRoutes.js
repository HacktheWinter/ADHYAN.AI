import express from "express";
import { authMiddleware, authorizeRoles } from "../middleware/authMiddleware.js";
import {
  getAllDoubts,
  getDoubtsByClass,
  postDoubt,
  editDoubt,
  deleteDoubt,
  addReply,
  deleteReply,
  editReply,
} from "../controllers/doubtController.js";

const router = express.Router();

router.use(authMiddleware, authorizeRoles("teacher", "student"));

// GET routes
router.get("/", getAllDoubts);
router.get("/:classId", getDoubtsByClass);

// DOUBT CRUD
router.post("/", postDoubt);
router.put("/edit/:id", editDoubt);
router.delete("/:id", deleteDoubt);

// REPLIES
router.post("/reply/:id", addReply);
router.put("/delete-reply/:id", deleteReply);
router.put("/edit-reply/:id", editReply);

export default router;
