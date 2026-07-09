import express from "express";
import { requireAuth } from "@clerk/express";
import {
  createConversationHandler,
  getConversationHandler,
  getUserConversationsHandler,
} from "../controllers/conversationsController";

const router = express.Router();

router.use(requireAuth);

router.post("/conversations", createConversationHandler);
router.get("/conversations/:conversationId", getConversationHandler);
router.get("/users/:userId/conversations", getUserConversationsHandler);

export default router;
