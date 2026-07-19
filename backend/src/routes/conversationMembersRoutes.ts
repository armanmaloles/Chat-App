import express from "express";
import { requireAuth } from "@clerk/express";
import {
  addMemberHandler,
  getConversationMembersHandler,
  removeMemberHandler,
  updateConversationMemberSettingsHandler,
} from "../controllers/conversationMembersController";

const router = express.Router();

router.use(requireAuth);

router.get("/conversations/:conversationId/members", getConversationMembersHandler);
router.post("/conversations/:conversationId/members", addMemberHandler);
router.put(
  "/conversations/:conversationId/members/:userId/settings",
  updateConversationMemberSettingsHandler,
);
router.delete("/conversations/:conversationId/members/:userId", removeMemberHandler);

export default router;
