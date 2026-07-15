import type { Request, Response } from "express";
import { createUser, getAllUsers, getUserById, updateUser, upsertUser, deleteUser } from "../db/queries";

const activeStatuses = new Map<string, number>();
const ACTIVE_TIMEOUT_MS = 30000;

export const isUserActive = (userId: string) => activeStatuses.has(userId);

const cleanupActiveStatuses = () => {
  const now = Date.now();
  for (const [userId, lastSeen] of activeStatuses.entries()) {
    if (now - lastSeen > ACTIVE_TIMEOUT_MS) {
      activeStatuses.delete(userId);
    }
  }
};

const formatUserWithActive = (user: any) => ({
  ...user,
  isActive: activeStatuses.has(user.id),
});

export const createUserHandler = async (req: Request, res: Response) => {
  try {
    const user = await createUser(req.body);
    res.status(201).json(user);
  } catch (error) {
    console.error("Create user error:", error);
    res.status(500).json({ error: "Failed to create user" });
  }
};

export const upsertUserHandler = async (req: Request, res: Response) => {
  try {
    const user = await upsertUser(req.body);
    res.status(200).json(user);
  } catch (error) {
    console.error("Upsert user error:", error);
    res.status(500).json({ error: "Failed to save user" });
  }
};

export const getUsersHandler = async (_req: Request, res: Response) => {
  try {
    cleanupActiveStatuses();
    const users = await getAllUsers();
    return res.status(200).json(users.map(formatUserWithActive));
  } catch (error) {
    console.error("Get users error:", error);
    return res.status(500).json({ error: "Failed to fetch users" });
  }
};

export const setActiveHandler = async (req: Request, res: Response) => {
  try {
    const authUserId = (req as any).auth?.userId;
    if (!authUserId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    activeStatuses.set(authUserId, Date.now());
    cleanupActiveStatuses();

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Set active status error:", error);
    return res.status(500).json({ error: "Failed to update active status" });
  }
};

export const getUserHandler = async (req: Request, res: Response) => {
  try {
    const userId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const user = await getUserById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.status(200).json(user);
  } catch (error) {
    console.error("Get user error:", error);
    return res.status(500).json({ error: "Failed to fetch user" });
  }
};

export const updateUserHandler = async (req: Request, res: Response) => {
  try {
    const userId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const user = await updateUser(userId, req.body);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.status(200).json(user);
  } catch (error) {
    console.error("Update user error:", error);
    return res.status(500).json({ error: "Failed to update user" });
  }
};

export const deleteUserHandler = async (req: Request, res: Response) => {
  try {
    const userId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const authUserId = (req as any).auth?.userId;

    if (!authUserId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (authUserId !== userId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const user = await deleteUser(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.status(200).json({ message: "User account deleted" });
  } catch (error) {
    console.error("Delete user error:", error);
    return res.status(500).json({ error: "Failed to delete user" });
  }
};
