import type { Request, Response } from "express";
import {
  createConversation,
  getConversationById,
  getUserConversations,
} from "../db/queries";

export const createConversationHandler = async (req: Request, res: Response) => {
  try {
    const conversation = await createConversation(req.body);
    res.status(201).json(conversation);
  } catch (error) {
    console.error("Create conversation error:", error);
    res.status(500).json({ error: "Failed to create conversation" });
  }
};

export const getConversationHandler = async (req: Request, res: Response) => {
  try {
    const conversationId = Array.isArray(req.params.conversationId)
      ? req.params.conversationId[0]
      : req.params.conversationId;
    const conversation = await getConversationById(conversationId);

    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    return res.status(200).json(conversation);
  } catch (error) {
    console.error("Get conversation error:", error);
    return res.status(500).json({ error: "Failed to fetch conversation" });
  }
};

export const getUserConversationsHandler = async (req: Request, res: Response) => {
  try {
    const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
    const conversations = await getUserConversations(userId);
    return res.status(200).json(conversations);
  } catch (error) {
    console.error("Get user conversations error:", error);
    return res.status(500).json({ error: "Failed to fetch conversations" });
  }
};
