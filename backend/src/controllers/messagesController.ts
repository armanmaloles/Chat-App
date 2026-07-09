import type { Request, Response } from "express";
import {
  deleteMessage,
  getConversationMessages,
  getMessageById,
  sendMessage,
} from "../db/queries";

export const createMessageHandler = async (req: Request, res: Response) => {
  try {
    const conversationId = Array.isArray(req.params.conversationId)
      ? req.params.conversationId[0]
      : req.params.conversationId;
    const message = await sendMessage({
      conversationId,
      senderId: req.body.senderId,
      content: req.body.content,
    });

    return res.status(201).json(message);
  } catch (error) {
    console.error("Create message error:", error);
    return res.status(500).json({ error: "Failed to send message" });
  }
};

export const getMessageHandler = async (req: Request, res: Response) => {
  try {
    const messageId = Array.isArray(req.params.messageId) ? req.params.messageId[0] : req.params.messageId;
    const message = await getMessageById(messageId);

    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    return res.status(200).json(message);
  } catch (error) {
    console.error("Get message error:", error);
    return res.status(500).json({ error: "Failed to fetch message" });
  }
};

export const getConversationMessagesHandler = async (req: Request, res: Response) => {
  try {
    const conversationId = Array.isArray(req.params.conversationId)
      ? req.params.conversationId[0]
      : req.params.conversationId;
    const messages = await getConversationMessages(conversationId);
    return res.status(200).json(messages);
  } catch (error) {
    console.error("Get conversation messages error:", error);
    return res.status(500).json({ error: "Failed to fetch messages" });
  }
};

export const deleteMessageHandler = async (req: Request, res: Response) => {
  try {
    const messageId = Array.isArray(req.params.messageId) ? req.params.messageId[0] : req.params.messageId;
    const message = await deleteMessage(messageId);

    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    return res.status(200).json(message);
  } catch (error) {
    console.error("Delete message error:", error);
    return res.status(500).json({ error: "Failed to delete message" });
  }
};
