import { Outlet, Link, useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import ConversationList from "../pages/ConversationList";
import Groups from "../pages/Groups";
import Notifications from "../pages/Notifications";
import Settings from "../pages/Settings";
import { useAuth, useUser } from "@clerk/clerk-react";
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import NotificationsModal from "../components/NotificationsModal";
import {
  getUserConversations,
  getConversationMessages,
  heartbeatUser,
  clearHeartbeatUser,
  getUser as getUserApi,
} from "../lib/api";

type NotificationSummary = {
  conversationId: string;
  conversationName: string;
  unreadCount: number;
  latestAt: string;
  isGroup?: boolean;
  otherMemberId?: string;
  otherMemberName?: string | null;
  otherMemberImage?: string | null;
};

type ConversationMember = {
  user?: {
    id?: string;
    name?: string | null;
    email?: string | null;
    imageUrl?: string | null;
  };
};

type ConversationMessage = {
  content: string;
  createdAt?: string;
  sender?: {
    id?: string;
    name?: string | null;
  };
};

type Conversation = {
  id: string;
  name?: string | null;
  isGroup?: boolean;
  members?: ConversationMember[];
  messages?: ConversationMessage[];
};

type UserConversationItem = {
  conversation: Conversation;
  notificationsEnabled: boolean;
};

function NotificationBell() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getConversationTitle = useCallback(
    (conversation: Conversation) => {
      if (conversation.isGroup) {
        return conversation.name || "Group chat";
      }

      const otherMember = conversation.members?.find(
        (member: ConversationMember) => member.user?.id !== user?.id,
      )?.user;

      return otherMember?.name || otherMember?.email || "Conversation";
    },
    [user?.id],
  );

  const getLastReadDate = (conversationId: string) => {
    const stored = localStorage.getItem(
      `chatApp:conversation:read:${conversationId}`,
    );
    return stored ? new Date(stored) : new Date(0);
  };

  const loadNotifications = useCallback(async () => {
    if (!user?.id) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = await getToken();
      const response = await getUserConversations(user.id, token);
      const summaries = await Promise.all(
        (response.data as UserConversationItem[])
          .filter((item) => item.notificationsEnabled)
          .map(async (item) => {
            const conversationId = item.conversation.id;
            if (!conversationId) return null;

            const latestMessage = item.conversation.messages?.[0];
            if (!latestMessage?.createdAt) return null;

            const lastReadDate = getLastReadDate(conversationId);
            const latestMessageDate = new Date(latestMessage.createdAt);
            if (latestMessageDate <= lastReadDate) return null;

            const messageResponse = await getConversationMessages(
              conversationId,
              token,
            );
            const unreadCount = (messageResponse.data as ConversationMessage[]).filter(
              (message) =>
                message.createdAt &&
                new Date(message.createdAt) > lastReadDate &&
                message.sender?.id !== user.id,
            ).length;

            if (unreadCount === 0) return null;

            const isGroup = Boolean(item.conversation?.isGroup);
            let otherMemberId: string | undefined;
            let otherMemberName: string | null | undefined;
            let otherMemberImage: string | null | undefined;

            if (!isGroup) {
              const other = item.conversation.members?.find(
                (m: ConversationMember) => m.user?.id !== user?.id,
              )?.user;
              if (other) {
                otherMemberId = other.id;
                otherMemberName = other.name ?? other.email ?? null;
                otherMemberImage = other.imageUrl ?? null;
              }
            }

            return {
              conversationId,
              conversationName: getConversationTitle(item.conversation),
              unreadCount,
              latestAt: latestMessage.createdAt,
              isGroup,
              otherMemberId,
              otherMemberName,
              otherMemberImage,
            };
          }),
      );

      const filteredSummaries = (summaries.filter(Boolean) as NotificationSummary[]);
      filteredSummaries.sort(
        (a, b) => new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime(),
      );
      setNotifications(filteredSummaries);
    } catch (fetchError) {
      console.error("Failed to load notifications", fetchError);
      setError("Unable to fetch notifications. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [getToken, user?.id, getConversationTitle]);

  useEffect(() => {
    const load = async () => {
      await loadNotifications();
    };

    void load();
  }, [loadNotifications]);

  useEffect(() => {
    if (!open) return;

    const load = async () => {
      await loadNotifications();
    };

    void load();
  }, [open, loadNotifications]);

  useEffect(() => {
    if (open) return;

    const handleRead = () => {
      void loadNotifications();
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key?.startsWith("chatApp:conversation:read:")) {
        handleRead();
      }
    };

    const handleConversationUpdate = () => {
      void loadNotifications();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void loadNotifications();
      }
    };

    window.addEventListener("conversationRead", handleRead);
    window.addEventListener("storage", handleStorage);
    window.addEventListener("conversationUpdated", handleConversationUpdate);
    window.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("conversationRead", handleRead);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("conversationUpdated", handleConversationUpdate);
      window.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [loadNotifications, open]);

  const handleNotificationBellClick = () => {
    if (open) {
      setOpen(false);
      return;
    }

    setOpen(true);
  };

  return (
    <div style={{ display: "inline-block" }}>
      <button
        className={`app-icon notification-bell${open ? " notification-bell--open" : ""}`}
        aria-label="Notifications"
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={handleNotificationBellClick}
        type="button"
      >
        🔔
      </button>
      {notifications.length > 0 && (
        <span className="notification-bell__indicator" aria-hidden="true" />
      )}
      {open && (
        <div style={{ position: "absolute", right: 0, top: 44, zIndex: 60 }}>
          <NotificationsModal
            notifications={notifications}
            loading={loading}
            error={error}
            onClose={() => setOpen(false)}
            onRefresh={() => {
              void loadNotifications();
            }}
            onConversationClick={(conversationId, isGroup) => {
              setOpen(false);
              if (isGroup) {
                try {
                  localStorage.setItem("chatApp:activeGroupId", conversationId);
                } catch {
                  // ignore
                }
                // notify other components in this window that active group changed
                try {
                  window.dispatchEvent(
                    new CustomEvent("activeGroupChanged", {
                      detail: { activeGroupId: conversationId },
                    }),
                  );
                } catch {
                  // ignore
                }
                navigate(`/app/groups/${conversationId}`);
                return;
              }

              try {
                localStorage.removeItem("chatApp:activeGroupId");
              } catch {
                // ignore
              }
              try {
                window.dispatchEvent(
                  new CustomEvent("activeGroupChanged", {
                    detail: { activeGroupId: null },
                  }),
                );
              } catch {
                // ignore
              }
              navigate(`/app/chat/${conversationId}`);
            }}
          />
        </div>
      )}
    </div>
  );
}

const ChatLayout = () => {
  const { isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname || "";
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem("chatApp:sidebarCollapsed") === "1";
    } catch {
      return false;
    }
  });
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [conversationCollapsed, setConversationCollapsed] = useState<boolean>(
    () => {
      try {
        return (
          localStorage.getItem("chatApp:conversationListCollapsed") === "1"
        );
      } catch {
        return false;
      }
    },
  );
  const [activeStatusEnabled, setActiveStatusEnabled] = useState<boolean>(
    () => {
      try {
        return localStorage.getItem("chatApp:activeStatusEnabled") !== "0";
      } catch {
        return true;
      }
    },
  );

  useEffect(() => {
    try {
      localStorage.setItem(
        "chatApp:sidebarCollapsed",
        sidebarCollapsed ? "1" : "0",
      );
    } catch {
      /* noop */
    }
  }, [sidebarCollapsed]);

  useEffect(() => {
    try {
      localStorage.setItem(
        "chatApp:conversationListCollapsed",
        conversationCollapsed ? "1" : "0",
      );
    } catch {
      /* noop */
    }
  }, [conversationCollapsed]);

  const toggleSidebar = () => setSidebarCollapsed((value) => !value);
  const toggleMobileSidebar = () => setMobileSidebarOpen((value) => !value);
  const closeMobileSidebar = () => setMobileSidebarOpen(false);
  const toggleConversationCollapsed = () =>
    setConversationCollapsed((value) => !value);

  useEffect(() => {
    const handler = () => toggleConversationCollapsed();
    window.addEventListener("toggleConversationList", handler as EventListener);
    return () =>
      window.removeEventListener(
        "toggleConversationList",
        handler as EventListener,
      );
  }, []);

  useEffect(() => {
    const preferenceHandler = (event: Event) => {
      const customEvent = event as CustomEvent<{ enabled: boolean }>;
      setActiveStatusEnabled(customEvent.detail.enabled);
    };

    window.addEventListener(
      "activeStatusPreferenceChanged",
      preferenceHandler as EventListener,
    );
    return () =>
      window.removeEventListener(
        "activeStatusPreferenceChanged",
        preferenceHandler as EventListener,
      );
  }, []);

  useEffect(() => {
    if (!isSignedIn) navigate("/");
  }, [isSignedIn, navigate]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 640);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!isMobile) {
      setShowMobileChat(false);
    }
  }, [isMobile]);

  useEffect(() => {
    if (!isMobile) {
      setShowMobileChat(false);
      return;
    }

    setShowMobileChat(
      path.startsWith("/app/chat/") ||
        (path.startsWith("/app/groups/") && path !== "/app/groups"),
    );
  }, [isMobile, path]);

  useEffect(() => {
    const loadActiveStatusPreference = async () => {
      if (!isSignedIn || !user?.id) return;

      try {
        const token = await getToken();
        const response = await getUserApi(user.id, token);
        const enabled = response.data.activeStatusEnabled;
        if (typeof enabled === "boolean") {
          setActiveStatusEnabled(enabled);
          try {
            localStorage.setItem(
              "chatApp:activeStatusEnabled",
              enabled ? "1" : "0",
            );
          } catch {
            /* ignore */
          }
          if (!enabled) {
            await clearHeartbeatUser(token);
          }
        }
      } catch (error) {
        console.error("Failed to load active status preference", error);
      }
    };

    void loadActiveStatusPreference();
  }, [getToken, isSignedIn, user?.id]);

  useEffect(() => {
    const heartbeat = async () => {
      if (!isSignedIn || !activeStatusEnabled) return;
      try {
        const token = await getToken();
        await heartbeatUser(token);
      } catch (error) {
        console.error("Failed to heartbeat active user", error);
      }
    };

    if (activeStatusEnabled) {
      void heartbeat();
    }

    const intervalId = window.setInterval(() => void heartbeat(), 15000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [getToken, isSignedIn, activeStatusEnabled]);

  const showChatPlaceholder = !(
    path.startsWith("/app/chat/") ||
    (path.startsWith("/app/groups/") && path !== "/app/groups")
  );
  const hideChatOnSettings = path.startsWith("/app/settings");

  // When viewing Settings, ignore the conversation list collapsed state
  // so the Settings view remains static and unaffected by collapsing.
  const conversationCollapsedEffective = hideChatOnSettings
    ? false
    : conversationCollapsed;

  const mobileChatView =
    isMobile &&
    (path.startsWith("/app/chat/") ||
      (path.startsWith("/app/groups/") && path !== "/app/groups"));
  let content;
  if (path.startsWith("/app/groups")) {
    content = <Groups />;
  } else if (path.startsWith("/app/notifications")) {
    content = <Notifications />;
  } else if (path.startsWith("/app/settings")) {
    content = <Settings />;
  } else {
    content = (
      <ConversationList
        collapsed={conversationCollapsed}
        onToggle={toggleConversationCollapsed}
      />
    );
  }

  return (
    <div className="app-root">
      <header className="app-navbar">
        <div className="app-navbar__left">
          {showMobileChat ? (
            <button
              type="button"
              className="app-navbar__menu-btn app-navbar__back-btn"
              onClick={() => navigate("/app/conversations")}
              aria-label="Back to list"
            >
              ←
            </button>
          ) : (
            <>
              <button
                type="button"
                className="app-navbar__menu-btn"
                onClick={toggleMobileSidebar}
                aria-label="Open menu"
                aria-expanded={mobileSidebarOpen}
              >
                ☰
              </button>
              <Link to="/app/conversations" className="app-logo">
                💬 Chat App
              </Link>
            </>
          )}
        </div>

        <div className="app-navbar__right">
          <div style={{ position: "relative" }}>
            <NotificationBell />
          </div>
        </div>
      </header>

      {mobileSidebarOpen && (
        <>
          <div className="app-sidebar-backdrop" onClick={closeMobileSidebar} />
          <aside className="app-sidebar app-sidebar--overlay">
            <Sidebar
              collapsed={false}
              onToggle={toggleSidebar}
              onNavigate={closeMobileSidebar}
              onClose={closeMobileSidebar}
              isOverlay={true}
            />
          </aside>
        </>
      )}

      <div
        className={`app-content${sidebarCollapsed ? " app-content--sidebar-collapsed" : ""}${conversationCollapsedEffective ? " app-content--conversation-collapsed" : ""}${showMobileChat ? " app-content--mobile-chat" : ""}`}
      >
        {!showMobileChat && (
          <>
            <aside className="app-sidebar">
              <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
            </aside>
            <section className="app-conversations">{content}</section>
          </>
        )}

        {!hideChatOnSettings && (!isMobile || showMobileChat) && (
          <section className={`app-chat${showMobileChat ? " app-chat--mobile-full" : ""}`}>
            {showChatPlaceholder ? (
              <div className="app-chat__empty">
                <h2>Select a conversation</h2>
                <p>
                  Choose a chat from the list to start messaging. Your selected
                  conversation will appear here.
                </p>
              </div>
            ) : (
              <Outlet />
            )}
          </section>
        )}
      </div>
    </div>
  );
};

export default ChatLayout;
