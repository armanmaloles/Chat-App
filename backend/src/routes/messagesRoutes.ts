import express from "express";
import { requireAuth } from "@clerk/express";
import {
  createMessageHandler,
  deleteMessageHandler,
  getConversationMessagesHandler,
  getMessageHandler,
} from "../controllers/messagesController";

const router = express.Router();

router.use(requireAuth);

router.post("/conversations/:conversationId/messages", createMessageHandler);
router.get("/messages/:messageId", getMessageHandler);
router.get("/conversations/:conversationId/messages", getConversationMessagesHandler);
router.delete("/messages/:messageId", deleteMessageHandler);

export default router;
