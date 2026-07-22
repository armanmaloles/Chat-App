import { useEffect, useState } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import { Link, useLocation } from "react-router-dom";
import { getUserConversations } from "../lib/api";
import UserList from "../components/UserList";

type ConversationItem = {
  conversation: {
    id: string;
    name?: string | null;
    isGroup?: boolean;
    creator?: { id?: string; name?: string | null };
    members?: Array<{
      user?: {
        id?: string;
        name?: string | null;
        email?: string | null;
        imageUrl?: string | null;
        isOnline?: boolean;
        isActive?: boolean;
      };
    }>;
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

const getAttachmentPreview = (content: string, senderName: string) => {
  if (!content) return `${senderName}:`;

  try {
    const parsed = JSON.parse(content);
    if (parsed && typeof parsed === "object") {
      if (parsed.deleted) {
        return "Message deleted";
      }

      if (Array.isArray(parsed.attachments) ? parsed.attachments.length > 0 : parsed.attachment) {
        if (senderName === "You") {
          return `You sent an attachment`;
        }
        return `${senderName} sent an attachment`;
      }
      if (typeof parsed.text === "string" && parsed.text.trim()) {
        return `${senderName}: ${parsed.text}`;
      }
    }
  } catch {
    // Fall back to raw content
  }

  return `${senderName}: ${content}`;
};

const ConversationList = ({
  collapsed: collapsedProp,
  onToggle,
}: {
  collapsed?: boolean;
  onToggle?: () => void;
}) => {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [readTimestamps, setReadTimestamps] = useState<Record<string, string>>(
    {},
  );
  const [localCollapsed, setLocalCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem("chatApp:conversationListCollapsed") === "1";
    } catch {
      return false;
    }
  });
  const collapsed = collapsedProp ?? localCollapsed;
  const toggleCollapsed = onToggle ?? (() => setLocalCollapsed((c) => !c));
  const { getToken } = useAuth();
  const { user } = useUser();
  const location = useLocation();

  useEffect(() => {
    if (collapsedProp !== undefined) return;

    try {
      localStorage.setItem(
        "chatApp:conversationListCollapsed",
        localCollapsed ? "1" : "0",
      );
    } catch {
      /* noop */
    }
  }, [localCollapsed, collapsedProp]);

  useEffect(() => {
    const loadConversations = async () => {
      if (!user?.id) return;

      try {
        const token = await getToken();
        const response = await getUserConversations(user.id, token);
        const uniqueConversations = response.data
          .filter(
            (item: ConversationItem, index: number, self: ConversationItem[]) =>
              self.findIndex(
                (other: ConversationItem) =>
                  other.conversation.id === item.conversation.id,
              ) === index,
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
                ...(entry.conversation.messages || []),
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
      const keys = Object.keys(localStorage).filter((key) =>
        key.startsWith("chatApp:conversation:read:"),
      );
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
      window.removeEventListener(
        "conversationUpdated",
        handleConversationUpdate,
      );
      window.removeEventListener("conversationRead", handleReadEvent);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [getToken, user?.id]);

  const personalConversations = conversations.filter(
    (entry) => !entry.conversation.isGroup,
  );
  const selectedConversationId = location.pathname.startsWith("/app/chat/")
    ? location.pathname.split("/").pop()
    : null;

  return (
    <div
      className={`page page--conversation-list${collapsed ? " page--conversation-list--collapsed" : ""}`}
    >
      <div className="conversation-list__sidebar">
        <button
          className="conversation-list__toggle"
          onClick={toggleCollapsed}
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Expand" : "Collapse"}
          title={collapsed ? "Expand" : "Collapse"}
        > 
          {collapsed ? "›" : "‹"}
        </button>
        {!collapsed && (
          <div className="conversation-list__sidebar-content">
            <div className="conversation-list__header">
              <h1>Conversations</h1>
            </div>
            <UserList showActions />
            <div className="conversation-list__expanded-chats">
              <div className="conversation-list__section-heading">Your chats</div>
              <div className="conversation-list__scroll-wrapper">
                <div className="conversation-list conversation-list--scroll">
                  {personalConversations.length === 0 ? (
                    <div className="conversation-list__empty">
                      No conversations yet.
                    </div>
                  ) : (
                    personalConversations.map((entry) => {
                      const currentUserId = user?.id;
                      const otherUser = entry.conversation.members?.find(
                        (member) =>
                          member.user?.id && member.user.id !== currentUserId,
                      )?.user;
                      const title =
                        otherUser?.name ||
                        otherUser?.email ||
                        entry.conversation.name ||
                        "Private Chat";
                      const lastMessage = entry.conversation.messages?.[0];
                      const senderName =
                        lastMessage?.sender?.id === currentUserId
                          ? "You"
                          : lastMessage?.sender?.name || "Unknown";
                      const subtitle = lastMessage
                        ? getAttachmentPreview(lastMessage.content, senderName)
                        : "Tap to open chat";
                      const time = formatRelativeTime(lastMessage?.createdAt);
                      const isActive =
                        location.pathname === `/app/chat/${entry.conversation.id}`;
                      const lastReadAt = readTimestamps[entry.conversation.id]
                        ? new Date(readTimestamps[entry.conversation.id])
                        : null;
                      const isUnread = Boolean(
                        lastMessage &&
                          !isActive &&
                          (!lastReadAt ||
                            (lastMessage.createdAt &&
                              new Date(lastMessage.createdAt) > lastReadAt)),
                      );

                      return (
                        <Link
                          key={entry.conversation.id}
                          to={`/app/chat/${entry.conversation.id}`}
                          className={`conversation-list__item${selectedConversationId === entry.conversation.id ? " conversation-list__item--active" : ""}`}
                          onClick={() => {
                            try {
                              localStorage.removeItem("chatApp:activeGroupId");
                            } catch {
                              // ignore
                            }
                            try {
                              window.dispatchEvent(
                                new CustomEvent("activeGroupChanged", { detail: { activeGroupId: null } }),
                              );
                            } catch {
                              // ignore
                            }
                          }}
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
                            <div
                              className={`conversation-list__subtitle${isUnread ? " conversation-list__subtitle--unread" : ""}`}
                            >
                              {subtitle}
                            </div>
                          </div>
                          <div className="conversation-list__meta">
                            <span className="conversation-list__time">{time}</span>
                            {lastMessage && isUnread && (
                              <span className="conversation-list__badge" />
                            )}
                          </div>
                        </Link>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        {collapsed && (
          <>
            <div className="conversation-list__collapsed-label">Chat</div>
            <div className="conversation-list__collapsed-chats">
              {personalConversations.map((entry) => {
                const currentUserId = user?.id;
                const otherUser = entry.conversation.members?.find(
                  (member) =>
                    member.user?.id && member.user.id !== currentUserId,
                )?.user;
                const title =
                  otherUser?.name ||
                  otherUser?.email ||
                  entry.conversation.name ||
                  "Private Chat";
                const avatarLabel = otherUser?.name
                  ? otherUser.name.slice(0, 2).toUpperCase()
                  : title
                      .split(" ")
                      .slice(0, 2)
                      .map((word) => word[0])
                      .join("")
                      .toUpperCase();
                const lastMessage = entry.conversation.messages?.[0];
                const lastReadAt = readTimestamps[entry.conversation.id]
                  ? new Date(readTimestamps[entry.conversation.id])
                  : null;
                const isOnline = Boolean(otherUser?.isOnline || otherUser?.isActive);
                const isActive =
                  location.pathname === `/app/chat/${entry.conversation.id}`;
                const isUnread = Boolean(
                  lastMessage &&
                  !isActive &&
                  (!lastReadAt ||
                    (lastMessage.createdAt &&
                      new Date(lastMessage.createdAt) > lastReadAt)),
                );

                return (
                  <Link
                    key={entry.conversation.id}
                    to={`/app/chat/${entry.conversation.id}`}
                    className={`conversation-list__collapsed-item${isActive ? " conversation-list__collapsed-item--active" : ""}`}
                    title={title}
                    onClick={() => {
                      try {
                        localStorage.removeItem("chatApp:activeGroupId");
                      } catch {
                        // ignore
                      }
                      try {
                        window.dispatchEvent(
                          new CustomEvent("activeGroupChanged", { detail: { activeGroupId: null } }),
                        );
                      } catch {
                        // ignore
                      }
                    }}
                  >
                    <div className="conversation-list__collapsed-avatar-sm">
                      {otherUser?.imageUrl ? (
                        <img
                          src={otherUser.imageUrl}
                          alt={otherUser.name || title}
                        />
                      ) : (
                        <span>{avatarLabel}</span>
                      )}
                    </div>
                    {isOnline && (
                      <span className="conversation-list__collapsed-online-indicator" />
                    )}
                    {isUnread && (
                      <span className="conversation-list__collapsed-badge" />
                    )}
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ConversationList;
