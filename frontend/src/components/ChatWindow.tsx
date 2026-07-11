import { useEffect, useState } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import { getConversationMessages, sendMessage } from "../api";
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
  const { getToken } = useAuth();
  const { user } = useUser();

  useEffect(() => {
    const loadMessages = async () => {
      if (!conversationId) return;

      try {
        const token = await getToken();
        const response = await getConversationMessages(conversationId, token);

        setMessages(
          response.data.map((message: BackendMessage) => ({
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
      } catch (error) {
        console.error("Failed to load messages", error);
      }
    };

    void loadMessages();
  }, [conversationId, getToken, user?.id]);

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
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            author={message.author}
            content={message.content}
            createdAt={message.createdAt}
            isOwn={message.senderId === user?.id}
          />
        ))}
      </div>
      <MessageInput
        value={draft}
        onChange={setDraft}
        onSend={handleSend}
        disabled={isSending}
      />
    </section>
  );
};

export default ChatWindow;
