import type { Request, Response } from "express";
import {
  deleteMessage,
  getConversationMessages,
  getMessageById,
  sendMessage,
} from "../db/queries";

type AttachmentPayload = {
  dataUrl?: string;
  fileName?: string;
  mimeType?: string;
  fileSize?: number;
  kind?: string;
};

type MessagePayload = {
  senderId: string;
  content?: string;
  attachment?: AttachmentPayload;
  attachments?: AttachmentPayload[];
};

export const createMessageHandler = async (req: Request, res: Response) => {
  try {
    const conversationId = Array.isArray(req.params.conversationId)
      ? req.params.conversationId[0]
      : req.params.conversationId;

    const body = req.body as MessagePayload;

    if (!body.senderId || typeof body.senderId !== "string") {
      return res.status(400).json({ error: "senderId is required" });
    }

    const attachments = Array.isArray(body.attachments)
      ? body.attachments
      : body.attachment
      ? [body.attachment]
      : [];
    const content = typeof body.content === "string" ? body.content : "";
    const allowedMimeTypes = [
      // images
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/gif",
      "image/webp",
      "image/svg+xml",
      // videos
      "video/mp4",
      "video/webm",
      "video/quicktime",
      // documents
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "text/csv",
    ];

    let storedContent = content;

    if (attachments.length > 0) {
      const validatedAttachments = attachments.map((attachment) => {
        const mime = attachment.mimeType ?? "";
        if (!mime || !allowedMimeTypes.includes(mime)) {
          throw new Error("Unsupported file type");
        }

        const kind = mime.startsWith("video/") ? "video" : mime.startsWith("image/") ? "image" : "document";

        return {
          fileName: attachment.fileName,
          mimeType: mime,
          fileSize: attachment.fileSize ?? 0,
          dataUrl: attachment.dataUrl,
          kind,
        };
      });

      storedContent = JSON.stringify({
        text: content,
        attachments: validatedAttachments,
      });
    }

    const message = await sendMessage({
      conversationId,
      senderId: body.senderId,
      content: storedContent,
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
