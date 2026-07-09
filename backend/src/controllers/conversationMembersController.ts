import type { Request, Response } from "express";
import {
  addMemberToConversation,
  getConversationMembers,
  removeMemberFromConversation,
} from "../db/queries";

export const getConversationMembersHandler = async (req: Request, res: Response) => {
  try {
    const conversationId = Array.isArray(req.params.conversationId)
      ? req.params.conversationId[0]
      : req.params.conversationId;
    const members = await getConversationMembers(conversationId);
    return res.status(200).json(members);
  } catch (error) {
    console.error("Get conversation members error:", error);
    return res.status(500).json({ error: "Failed to fetch members" });
  }
};

export const addMemberHandler = async (req: Request, res: Response) => {
  try {
    const conversationId = Array.isArray(req.params.conversationId)
      ? req.params.conversationId[0]
      : req.params.conversationId;
    const member = await addMemberToConversation({
      conversationId,
      userId: req.body.userId,
    });

    return res.status(201).json(member);
  } catch (error) {
    console.error("Add conversation member error:", error);
    return res.status(500).json({ error: "Failed to add member" });
  }
};

export const removeMemberHandler = async (req: Request, res: Response) => {
  try {
    const conversationId = Array.isArray(req.params.conversationId)
      ? req.params.conversationId[0]
      : req.params.conversationId;
    const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
    const member = await removeMemberFromConversation(conversationId, userId);

    if (!member) {
      return res.status(404).json({ error: "Membership not found" });
    }

    return res.status(200).json(member);
  } catch (error) {
    console.error("Remove conversation member error:", error);
    return res.status(500).json({ error: "Failed to remove member" });
  }
};
