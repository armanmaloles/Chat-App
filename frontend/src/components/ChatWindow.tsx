import { useEffect, useRef, useState } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import {
  getConversationMessages,
  sendMessage,
  setTypingStatus,
  getTypingStatus,
} from "../api";
import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";

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
  createdAt?: string;
};

const ChatWindow = ({ conversationId }: { conversationId?: string }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isConversationLoaded, setIsConversationLoaded] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Array<{ userId: string; userName: string }>>([]);
  const [isTyping, setIsTyping] = useState(false);
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

  const saveDraft = (id?: string, text: string = "") => {
    if (!id) return;
    localStorage.setItem(getDraftKey(id), text);
  };

  const loadDraft = (id?: string) => {
    if (!id) return "";
    return localStorage.getItem(getDraftKey(id)) || "";
  };

  useEffect(() => {
    // Save previous conversation's draft
    if (prevConversationIdRef.current) {
      saveDraft(prevConversationIdRef.current, draft);
    }

    // Load current conversation's draft
    const newDraft = loadDraft(conversationId);
    setDraft(newDraft);

    // Update ref
    prevConversationIdRef.current = conversationId;
  }, [conversationId]);

  useEffect(() => {
    // Save draft to localStorage whenever it changes
    saveDraft(conversationId, draft);
  }, [draft, conversationId]);

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
          messagesResponse.data.map((message: BackendMessage) => ({
            id: message.id,
            author:
              message.sender?.id === user?.id
                ? "You"
                : message.sender?.name || "Unknown",
            content: message.content,
            senderId: message.sender?.id || "",
            createdAt: message.createdAt,
          })),
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
      setIsTyping(typing);
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

  const handleSend = async () => {
    if (!draft.trim() || !conversationId || !user?.id) return;

    setIsSending(true);

    try {
      const token = await getToken();
      const response = await sendMessage(
        conversationId,
        {
          senderId: user.id,
          content: draft.trim(),
        },
        token,
      );

      const createdMessage = response.data;
      const newChatMessage = {
        id: createdMessage.id,
        author:
          createdMessage.sender?.id === user.id
            ? "You"
            : createdMessage.sender?.name || "You",
        content: createdMessage.content,
        senderId: createdMessage.sender?.id || user.id,
        createdAt: createdMessage.createdAt || new Date().toISOString(),
      };

      setMessages((current) => [...current, newChatMessage]);
      setDraft("");
      void updateTypingStatus(false);
      requestAnimationFrame(() => scrollToBottom());

      window.dispatchEvent(
        new CustomEvent("conversationUpdated", {
          detail: {
            conversationId,
            content: createdMessage.content,
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
              createdAt={message.createdAt}
              isOwn={message.senderId === user?.id}
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
            onSend={handleSend}
            disabled={isSending}
          />
        )}
      </div>
    </section>
  );
};

export default ChatWindow;
