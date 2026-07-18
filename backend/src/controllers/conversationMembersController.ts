import type { Request, Response } from "express";
import {
  addMemberToConversation,
  getConversationMembers,
  removeMemberFromConversation,
  sendMessage,
  getUserById,
  getConversationById,
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

    // Check if conversation is a group before creating system message
    const conversation = await getConversationById(conversationId);
    
    // Only create system message for group conversations
    if (conversation?.isGroup) {
      let user = null;
      try {
        user = await getUserById(req.body.userId);
      } catch (userError) {
        console.error("Failed to get user info:", userError);
      }

      if (user && user.name) {
        try {
          await sendMessage({
            conversationId,
            senderId: req.body.userId,
            content: `${user.name} joined the group`,
          });
        } catch (messageError) {
          // Log error but don't fail the request - member addition was successful
          console.error("Failed to create system message:", messageError);
        }
      }
    }

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
    
    // Get user info before removing
    let user = null;
    try {
      user = await getUserById(userId);
    } catch (userError) {
      console.error("Failed to get user info:", userError);
    }
    
    const member = await removeMemberFromConversation(conversationId, userId);

    if (!member) {
      return res.status(404).json({ error: "Membership not found" });
    }

    // Check if conversation is a group before creating system message
    const conversation = await getConversationById(conversationId);
    
    // Only create system message for group conversations
    if (conversation?.isGroup && user && user.name) {
      try {
        await sendMessage({
          conversationId,
          senderId: userId,
          content: `${user.name} left the group`,
        });
      } catch (messageError) {
        // Log error but don't fail the request - member removal was successful
        console.error("Failed to create system message:", messageError);
      }
    }

    return res.status(200).json(member);
  } catch (error) {
    console.error("Remove conversation member error:", error);
    return res.status(500).json({ error: "Failed to remove member" });
  }
};
