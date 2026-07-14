import express from "express";
import { requireAuth } from "@clerk/express";
import {
  getTypingStatusHandler,
  setTypingStatusHandler,
} from "../controllers/typingController";

const router = express.Router();

router.use(requireAuth);
router.post("/conversations/:conversationId/typing", setTypingStatusHandler);
router.get("/conversations/:conversationId/typing", getTypingStatusHandler);

export default router;
