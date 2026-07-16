import axios from "axios";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3001/api",
});

export const getAuthHeaders = (token?: string | null) =>
  token ? { Authorization: `Bearer ${token}` } : undefined;

type UserPayload = {
  id: string;
  email?: string | null;
  name?: string | null;
  imageUrl?: string | null;
};

type ConversationPayload = {
  name?: string | null;
  isGroup?: boolean;
  createdBy: string;
};

type MessageAttachmentPayload = {
  fileName: string;
  mimeType: string;
  fileSize: number;
  dataUrl: string;
};

type MessagePayload = {
  senderId: string;
  content: string;
  attachment?: MessageAttachmentPayload;
  attachments?: MessageAttachmentPayload[];
};

export const getHealth = async (token?: string | null) =>
  apiClient.get("/health", { headers: getAuthHeaders(token) });

export const upsertUser = async (payload: UserPayload, token?: string | null) =>
  apiClient.post("/users/upsert", payload, {
    headers: getAuthHeaders(token),
  });

export const getUser = async (id: string, token?: string | null) =>
  apiClient.get(`/users/${id}`, { headers: getAuthHeaders(token) });

export const getUsers = async (token?: string | null) =>
  apiClient.get("/users", { headers: getAuthHeaders(token) });

export const heartbeatUser = async (token?: string | null) =>
  apiClient.post("/users/active", null, {
    headers: getAuthHeaders(token),
  });

export const updateUser = async (
  id: string,
  payload: Partial<UserPayload>,
  token?: string | null,
) => apiClient.put(`/users/${id}`, payload, { headers: getAuthHeaders(token) });

export const deleteUser = async (id: string, token?: string | null) =>
  apiClient.delete(`/users/${id}`, { headers: getAuthHeaders(token) });

export const createConversation = async (
  payload: ConversationPayload,
  token?: string | null,
) => apiClient.post("/conversations", payload, { headers: getAuthHeaders(token) });

export const getConversation = async (id: string, token?: string | null) =>
  apiClient.get(`/conversations/${id}`, { headers: getAuthHeaders(token) });

export const getUserConversations = async (userId: string, token?: string | null) =>
  apiClient.get(`/users/${userId}/conversations`, {
    headers: getAuthHeaders(token),
  });

export const getConversationMembers = async (
  conversationId: string,
  token?: string | null,
) => apiClient.get(`/conversations/${conversationId}/members`, {
  headers: getAuthHeaders(token),
});

export const addConversationMember = async (
  conversationId: string,
  userId: string,
  token?: string | null,
) =>
  apiClient.post(
    `/conversations/${conversationId}/members`,
    { userId },
    { headers: getAuthHeaders(token) },
  );

export const removeConversationMember = async (
  conversationId: string,
  userId: string,
  token?: string | null,
) =>
  apiClient.delete(`/conversations/${conversationId}/members/${userId}`, {
    headers: getAuthHeaders(token),
  });

export const getConversationMessages = async (
  conversationId: string,
  token?: string | null,
) =>
  apiClient.get(`/conversations/${conversationId}/messages`, {
    headers: getAuthHeaders(token),
  });

export const setTypingStatus = async (
  conversationId: string,
  payload: { userId: string; isTyping: boolean },
  token?: string | null,
) =>
  apiClient.post(
    `/conversations/${conversationId}/typing`,
    payload,
    { headers: getAuthHeaders(token) },
  );

export const getTypingStatus = async (
  conversationId: string,
  token?: string | null,
) =>
  apiClient.get(`/conversations/${conversationId}/typing`, {
    headers: getAuthHeaders(token),
  });

export const sendMessage = async (
  conversationId: string,
  payload: MessagePayload,
  token?: string | null,
) =>
  apiClient.post(`/conversations/${conversationId}/messages`, payload, {
    headers: getAuthHeaders(token),
  });
