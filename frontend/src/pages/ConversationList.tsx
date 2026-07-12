import { useEffect, useState } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import { Link, useLocation } from "react-router-dom";
import { getUserConversations } from "../api";
import UserList from "../components/UserList";

type ConversationItem = {
  conversation: {
    id: string;
    name?: string | null;
    isGroup?: boolean;
    creator?: { id?: string; name?: string | null };
    members?: Array<{ user?: { id?: string; name?: string | null; email?: string | null; imageUrl?: string | null } }>;
    messages?: Array<{
      content: string;
      createdAt?: string;
      sender?: { id?: string; name?: string | null };
    }>;
  };
};

const formatRelativeTime = (dateString?: string) => {
  if (!dateString) return "";

  const date = new Date(dateString);
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
};

const ConversationList = () => {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [readTimestamps, setReadTimestamps] = useState<Record<string, string>>({});
  const { getToken } = useAuth();
  const { user } = useUser();
  const location = useLocation();

  useEffect(() => {
    const loadConversations = async () => {
      if (!user?.id) return;

      try {
        const token = await getToken();
        const response = await getUserConversations(user.id, token);
        const uniqueConversations = response.data
          .filter(
            (item: ConversationItem, index: number, self: ConversationItem[]) =>
              self.findIndex((other: ConversationItem) => other.conversation.id === item.conversation.id) === index,
          )
          .sort((a: ConversationItem, b: ConversationItem) => {
            const aTime = a.conversation.messages?.[0]?.createdAt;
            const bTime = b.conversation.messages?.[0]?.createdAt;
            if (!aTime && !bTime) return 0;
            if (!aTime) return 1;
            if (!bTime) return -1;
            return new Date(bTime).getTime() - new Date(aTime).getTime();
          });
        setConversations(uniqueConversations);
      } catch (error) {
        console.error("Failed to load conversations", error);
      }
    };

    const handleConversationUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{
        conversationId: string;
        content: string;
        senderId: string;
        senderName: string;
        createdAt: string;
      }>;

      setConversations((current) => {
        const updated: ConversationItem[] = [];
        let updatedEntry: ConversationItem | null = null;

        current.forEach((entry) => {
          if (entry.conversation.id !== customEvent.detail.conversationId) {
            updated.push(entry);
            return;
          }

          updatedEntry = {
            ...entry,
            conversation: {
              ...entry.conversation,
              messages: [
                {
                  content: customEvent.detail.content,
                  createdAt: customEvent.detail.createdAt,
                  sender: {
                    id: customEvent.detail.senderId,
                    name: customEvent.detail.senderName,
                  },
                },
                ...((entry.conversation.messages as any[]) || []),
              ],
            },
          };
        });

        if (updatedEntry) {
          return [updatedEntry, ...updated];
        }

        return current;
      });
    };

    const loadReadState = () => {
      const keys = Object.keys(localStorage).filter((key) => key.startsWith("chatApp:conversation:read:"));
      const timestamps: Record<string, string> = {};
      keys.forEach((key) => {
        const conversationId = key.replace("chatApp:conversation:read:", "");
        const value = localStorage.getItem(key);
        if (value) timestamps[conversationId] = value;
      });
      setReadTimestamps(timestamps);
    };

    void loadConversations();
    loadReadState();
    const intervalId = window.setInterval(() => void loadConversations(), 5000);
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void loadConversations();
      }
    };
    const handleReadEvent = () => {
      loadReadState();
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key?.startsWith("chatApp:conversation:read:")) {
        loadReadState();
      }
    };

    window.addEventListener("conversationUpdated", handleConversationUpdate);
    window.addEventListener("conversationRead", handleReadEvent);
    window.addEventListener("storage", handleStorage);
    window.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("conversationUpdated", handleConversationUpdate);
      window.removeEventListener("conversationRead", handleReadEvent);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [getToken, user?.id]);

  return (
    <div className="page page--conversation-list">
      <h1>Conversations</h1>
      <UserList showActions />
      <div className="conversation-list">
        {conversations.length === 0 ? (
          <div className="conversation-list__empty">No conversations yet.</div>
        ) : (
          conversations.map((entry) => {
            const currentUserId = user?.id;
            const otherUser = entry.conversation.members?.find(
              (member) => member.user?.id && member.user.id !== currentUserId,
            )?.user;
            const title = otherUser?.name || otherUser?.email || entry.conversation.name || "Private Chat";
            const lastMessage = entry.conversation.messages?.[0];
            const senderName = lastMessage?.sender?.id === currentUserId ? "You" : lastMessage?.sender?.name || "Unknown";
            const subtitle = lastMessage ? `${senderName}: ${lastMessage.content}` : "Tap to open chat";
            const time = formatRelativeTime(lastMessage?.createdAt);
            const isActive = location.pathname === `/app/chat/${entry.conversation.id}`;
            const lastReadAt = readTimestamps[entry.conversation.id]
              ? new Date(readTimestamps[entry.conversation.id])
              : null;
            const isUnread = Boolean(
              lastMessage &&
                !isActive &&
                (!lastReadAt || (lastMessage.createdAt && new Date(lastMessage.createdAt) > lastReadAt)),
            );

            return (
              <Link
                key={entry.conversation.id}
                to={`/app/chat/${entry.conversation.id}`}
                className={`conversation-list__item${location.pathname === `/app/chat/${entry.conversation.id}` ? " conversation-list__item--active" : ""}`}
              >
                <div className="conversation-list__avatar">
                  {otherUser?.imageUrl ? (
                    <img
                      src={otherUser.imageUrl}
                      alt={otherUser.name || title}
                      className="conversation-list__avatar-img"
                    />
                  ) : (
                    <span>
                      {title
                        .split(" ")
                        .slice(0, 2)
                        .map((word) => word[0])
                        .join("")
                        .toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="conversation-list__details">
                  <div className="conversation-list__name">{title}</div>
                  <div className={`conversation-list__subtitle${isUnread ? " conversation-list__subtitle--unread" : ""}`}>{subtitle}</div>
                </div>
                <div className="conversation-list__meta">
                  <span className="conversation-list__time">{time}</span>
                  {lastMessage && isUnread && <span className="conversation-list__badge" />}
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ConversationList;
