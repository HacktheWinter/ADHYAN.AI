import express from "express";
import { createDoubt, getDoubts, addReply } from "../controllers/doubtController.js";

const router = express.Router();

router.post("/", createDoubt);
router.get("/:classId", getDoubts);
router.post("/:doubtId/replies", addReply);

export default router;
