import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import {
  getConversationMessages,
  sendMessage,
  deleteMessage,
  setTypingStatus,
  getTypingStatus,
} from "../lib/api";
import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";

type MessageAttachment = {
  kind: "image" | "video" | "document";
  mimeType: string;
  fileName: string;
  fileSize: number;
  dataUrl: string;
  extension: string;
};

type BackendMessage = {
  id: string;
  content: string;
  createdAt?: string;
  sender?: {
    id?: string;
    name?: string | null;
  };
};

type ChatMessage = {
  id: string;
  author: string;
  content: string;
  senderId: string;
  attachments?: MessageAttachment[];
  createdAt?: string;
  deleted?: boolean;
  deletedById?: string;
  deletedByName?: string;
  isSystemMessage?: boolean;
};

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const parseMessagePayload = (content: string) => {
  if (!content) {
      return {
        text: "",
        attachments: undefined as MessageAttachment[] | undefined,
        deleted: false,
        deletedById: undefined,
        deletedByName: undefined,
      };
    }

    try {
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed === "object") {
        if (parsed.deleted) {
          return {
            text: "",
            attachments: undefined as MessageAttachment[] | undefined,
            deleted: true,
            deletedById: typeof parsed.deletedById === "string" ? parsed.deletedById : undefined,
            deletedByName: typeof parsed.deletedByName === "string" ? parsed.deletedByName : undefined,
          };
        }

        const rawAttachments = Array.isArray(parsed.attachments)
          ? parsed.attachments
          : parsed.attachment
          ? [parsed.attachment]
          : undefined;

        const attachments = rawAttachments?.map(
          (attachment: MessageAttachment & { extension?: string }) => {
            const extensionFromName = attachment.fileName?.split(".").pop()?.toLowerCase() ?? "";
            return {
              ...attachment,
              kind: attachment.kind ?? getAttachmentKind(attachment.mimeType),
              extension: attachment.extension ?? extensionFromName,
              fileSize: attachment.fileSize ?? 0,
              dataUrl: attachment.dataUrl ?? "",
              mimeType: attachment.mimeType ?? "",
              fileName: attachment.fileName ?? "file",
            };
          },
        );

        return {
          text: typeof parsed.text === "string" ? parsed.text : "",
          attachments,
          deleted: false,
          deletedById: undefined,
          deletedByName: undefined,
        };
      }
    } catch {
      // Fall back to plain text content.
    }

    return {
      text: content,
      attachments: undefined as MessageAttachment[] | undefined,
      deleted: false,
      deletedById: undefined,
      deletedByName: undefined,
    };
  };

const getAttachmentKind = (mimeType: string) => {
  if (!mimeType) return "document" as const;
  if (mimeType.startsWith("image/")) return "image" as const;
  if (mimeType.startsWith("video/")) return "video" as const;
  return "document" as const;
};

const isSystemMessageContent = (content: string): boolean => {
  return /(.+\s)?(joined|left)\s(the\s)?group/.test(content);
};

const ChatWindow = ({ conversationId }: { conversationId?: string }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [pendingAttachmentsByConversation, setPendingAttachmentsByConversation] = useState<Record<string, MessageAttachment[]>>({});
  const [isSending, setIsSending] = useState(false);
  const [isConversationLoaded, setIsConversationLoaded] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Array<{ userId: string; userName: string }>>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const typingDebounceRef = useRef<number | null>(null);
  const { getToken } = useAuth();
  const { user } = useUser();

  const markConversationRead = (conversationId?: string) => {
    if (!conversationId) return;
    const now = new Date().toISOString();
    localStorage.setItem(`chatApp:conversation:read:${conversationId}`, now);
    window.dispatchEvent(new Event("conversationRead"));
  };

  const prevConversationIdRef = useRef<string | undefined>(undefined);

  const getDraftKey = (id?: string) => `chatApp:draft:${id}`;

  const saveDraft = useCallback((id?: string, text: string = "") => {
    if (!id) return;
    localStorage.setItem(getDraftKey(id), text);
  }, []);

  const loadDraft = useCallback((id?: string) => {
    if (!id) return "";
    return localStorage.getItem(getDraftKey(id)) || "";
  }, []);

  useEffect(() => {
    // Save previous conversation's draft
    if (prevConversationIdRef.current) {
      saveDraft(prevConversationIdRef.current, draft);
    }

    // Load current conversation's draft asynchronously to avoid synchronous state update in effect.
    const newDraft = loadDraft(conversationId);
    const timeoutId = window.setTimeout(() => setDraft(newDraft), 0);

    // Update ref
    prevConversationIdRef.current = conversationId;

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [conversationId, draft, loadDraft, saveDraft]);

  const currentPendingAttachments = conversationId ? pendingAttachmentsByConversation[conversationId] || [] : [];

  const setCurrentPendingAttachments = (attachments: MessageAttachment[]) => {
    if (!conversationId) return;
    setPendingAttachmentsByConversation((current) => ({
      ...current,
      [conversationId]: attachments,
    }));
  };

  useEffect(() => {
    // Save draft to localStorage whenever it changes
    saveDraft(conversationId, draft);
  }, [draft, conversationId, saveDraft]);

  useEffect(() => {
    const loadMessages = async () => {
      if (!conversationId) {
        setIsConversationLoaded(false);
        return;
      }

      try {
        const token = await getToken();
        const [messagesResponse, typingResponse] = await Promise.all([
          getConversationMessages(conversationId, token),
          getTypingStatus(conversationId, token),
        ]);

        setMessages(
          messagesResponse.data
            .map((message: BackendMessage) => {
              const parsedContent = parseMessagePayload(message.content);
              return {
                id: message.id,
                author:
                  message.sender?.id === user?.id
                    ? "You"
                    : message.sender?.name || "Unknown",
                content: parsedContent.text,
                senderId: message.sender?.id || "",
                attachments: parsedContent.attachments,
                createdAt: message.createdAt,
                deleted: parsedContent.deleted,
                deletedById: parsedContent.deletedById,
                deletedByName: parsedContent.deletedByName,
                isSystemMessage: isSystemMessageContent(parsedContent.text),
              };
            })
            .filter((msg: ChatMessage, index: number, self: ChatMessage[]) => index === self.findIndex((m) => m.id === msg.id)),
        );

        setTypingUsers(
          typingResponse.data.filter((typingUser: { userId: string }) => typingUser.userId !== user?.id),
        );

        setIsConversationLoaded(true);
        markConversationRead(conversationId);
      } catch (error) {
        console.error("Failed to load messages", error);
        setIsConversationLoaded(false);
      }
    };

    void loadMessages();
    const intervalId = window.setInterval(() => void loadMessages(), 5000);
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void loadMessages();
      }
    };

    window.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [conversationId, getToken, user?.id]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  };

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages.length]);

  const updateTypingStatus = async (typing: boolean) => {
    if (!conversationId || !user?.id) return;

    try {
      const token = await getToken();
      await setTypingStatus(
        conversationId,
        { userId: user.id, isTyping: typing },
        token,
      );
    } catch (error) {
      console.error("Failed to update typing status", error);
    }
  };

  const handleDraftChange = (value: string) => {
    setDraft(value);

    if (!conversationId || !user?.id) return;

    updateTypingStatus(true);

    if (typingDebounceRef.current) {
      window.clearTimeout(typingDebounceRef.current);
    }

    typingDebounceRef.current = window.setTimeout(() => {
      void updateTypingStatus(false);
      typingDebounceRef.current = null;
    }, 1500);
  };

  const readFileAsAttachment = (file: File): Promise<MessageAttachment> =>
    new Promise((resolve, reject) => {
      const allowedMimeTypes = [
        "image/png",
        "image/jpeg",
        "image/jpg",
        "image/gif",
        "image/webp",
        "video/mp4",
        "video/webm",
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      ];

      // accept files by mime type or by extension fallback
      const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
      const allowedExtensions = ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx"];
      const isAllowed = allowedMimeTypes.includes(file.type) || allowedExtensions.includes(extension);
      if (!isAllowed) {
        reject(new Error("Unsupported file type"));
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        reject(new Error("File too large"));
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        resolve({
          kind: getAttachmentKind(file.type),
          mimeType: file.type || "application/octet-stream",
          fileName: file.name,
          fileSize: file.size,
          dataUrl,
          extension,
        });
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });

  const handleFileSelect = (files: File[] | null) => {
    if (!conversationId) return;
    if (!files || files.length === 0) {
      setCurrentPendingAttachments([]);
      return;
    }

    files.forEach((file) => {
      void readFileAsAttachment(file)
        .then((attachment) => {
          setPendingAttachmentsByConversation((current) => {
            const currentAttachments = current[conversationId] || [];
            return {
              ...current,
              [conversationId]: [...currentAttachments, attachment],
            };
          });
        })
        .catch((error) => {
          console.error("Failed to prepare attachment", error);
          window.alert("Please choose a supported file smaller than 10MB.");
        });
    });
  };

  const handleRemoveAttachment = (index: number) => {
    setCurrentPendingAttachments(currentPendingAttachments.filter((_, idx) => idx !== index));
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!conversationId || !user?.id) return;

    try {
      const token = await getToken();
      const response = await deleteMessage(messageId, token);
      const deletedMessage = response.data;
      const parsedContent = parseMessagePayload(deletedMessage.content);

      setMessages((current) =>
        current.map((message) =>
          message.id === messageId
            ? {
                ...message,
                content: parsedContent.text,
                attachments: parsedContent.attachments,
                deleted: parsedContent.deleted,
                deletedById: parsedContent.deletedById,
                deletedByName: parsedContent.deletedByName,
              }
            : message,
        ),
      );

      window.dispatchEvent(
        new CustomEvent("conversationUpdated", {
          detail: {
            conversationId,
            content: parsedContent.deleted ? "Message deleted" : parsedContent.text,
            senderId: user.id,
            senderName: "You",
            createdAt: new Date().toISOString(),
          },
        }),
      );
    } catch (error) {
      console.error("Failed to delete message", error);
    }
  };

  const handleSend = async () => {
    if ((!draft.trim() && currentPendingAttachments.length === 0) || !conversationId || !user?.id) return;

    setIsSending(true);

    try {
      const token = await getToken();
      const response = await sendMessage(
        conversationId,
        {
          senderId: user.id,
          content: draft.trim(),
          attachments: currentPendingAttachments.length > 0 ? currentPendingAttachments : undefined,
        },
        token,
      );

      const createdMessage = response.data;
      const parsedContent = parseMessagePayload(createdMessage.content);
      const newChatMessage = {
        id: createdMessage.id,
        author:
          createdMessage.sender?.id === user.id
            ? "You"
            : createdMessage.sender?.name || "You",
        content: parsedContent.text,
        senderId: createdMessage.sender?.id || user.id,
        attachments: parsedContent.attachments,
        createdAt: createdMessage.createdAt || new Date().toISOString(),
      };

      setMessages((current) => [...current, newChatMessage]);
      setDraft("");
      setCurrentPendingAttachments([]);
      void updateTypingStatus(false);
      requestAnimationFrame(() => scrollToBottom());

      window.dispatchEvent(
        new CustomEvent("conversationUpdated", {
          detail: {
            conversationId,
            content: parsedContent.text,
            senderId: createdMessage.sender?.id || user.id,
            senderName:
              createdMessage.sender?.id === user.id
                ? "You"
                : createdMessage.sender?.name || "Unknown",
            createdAt: createdMessage.createdAt || new Date().toISOString(),
          },
        }),
      );
    } catch (error) {
      console.error("Failed to send message", error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <section className="chat-window">
      <div className="chat-window__messages">
        {messages.length === 0 ? (
          <div className="chat-window__empty">
            <div className="chat-window__empty-icon">💬</div>
            <h2>Start a conversation</h2>
            <p>Send the first message to begin chatting</p>
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble
              key={message.id}
              author={message.author}
              content={message.content}
              attachments={message.attachments}
              createdAt={message.createdAt}
              isOwn={message.senderId === user?.id}
              deleted={message.deleted}
              deletedByName={message.deletedByName}
              onDelete={message.senderId === user?.id && !message.deleted ? () => void handleDeleteMessage(message.id) : undefined}
              isSystemMessage={message.isSystemMessage}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="chat-window__footer">
        {typingUsers.length > 0 && (
          <div className="chat-window__typing-indicator">
            {typingUsers.length === 1 ? (
              <span>{typingUsers[0].userName} is typing…</span>
            ) : (
              <span>Multiple people are typing…</span>
            )}
          </div>
        )}
        {isConversationLoaded && conversationId && (
          <MessageInput
            value={draft}
            onChange={handleDraftChange}
            onSend={() => { void handleSend(); }}
            onFileSelect={handleFileSelect}
            pendingAttachments={currentPendingAttachments}
            onRemoveAttachment={handleRemoveAttachment}
            disabled={isSending}
          />
        )}
      </div>
    </section>
  );
};

export default ChatWindow;
