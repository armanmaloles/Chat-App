import type { Request, Response } from "express";
import { requireAuth } from "@clerk/express";
import { getUserById } from "../db/queries";

type ClerkRequest = Request & {
  auth?: {
    userId?: string;
  };
};

const typingStatuses = new Map<string, {
  conversationId: string;
  userId: string;
  userName: string;
  updatedAt: Date;
}>();

const TYPING_TIMEOUT_MS = 5000;

const getTypingKey = (conversationId: string, userId: string) =>
  `${conversationId}:${userId}`;

const cleanupTypingStatuses = () => {
  const now = Date.now();
  for (const [key, value] of typingStatuses.entries()) {
    if (now - value.updatedAt.getTime() > TYPING_TIMEOUT_MS) {
      typingStatuses.delete(key);
    }
  }
};

export const setTypingStatusHandler = async (req: Request, res: Response) => {
  try {
    const conversationId = Array.isArray(req.params.conversationId)
      ? req.params.conversationId[0]
      : req.params.conversationId;

    const authReq = req as ClerkRequest;
    const isTyping = Boolean(req.body.isTyping);
    const bodyUserId = Array.isArray(req.body.userId)
      ? req.body.userId[0]
      : req.body.userId;
    const userId = authReq.auth?.userId || bodyUserId;

    if (!conversationId || !userId) {
      return res.status(400).json({ error: "Missing conversationId or userId" });
    }

    const user = await getUserById(userId);
    const userName = user?.name || user?.email || "Unknown";

    const key = getTypingKey(conversationId, userId);

    if (isTyping) {
      typingStatuses.set(key, {
        conversationId,
        userId,
        userName,
        updatedAt: new Date(),
      });
    } else {
      typingStatuses.delete(key);
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Set typing status error:", error);
    return res.status(500).json({ error: "Failed to update typing status" });
  }
};

export const getTypingStatusHandler = async (req: Request, res: Response) => {
  try {
    const conversationId = Array.isArray(req.params.conversationId)
      ? req.params.conversationId[0]
      : req.params.conversationId;

    if (!conversationId) {
      return res.status(400).json({ error: "Missing conversationId" });
    }

    cleanupTypingStatuses();

    const typingUsers = Array.from(typingStatuses.values())
      .filter((status) => status.conversationId === conversationId)
      .map((status) => ({
        userId: status.userId,
        userName: status.userName,
      }));

    return res.status(200).json(typingUsers);
  } catch (error) {
    console.error("Get typing status error:", error);
    return res.status(500).json({ error: "Failed to fetch typing status" });
  }
};
