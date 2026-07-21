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
import { getUserConversations, getConversationMessages, heartbeatUser, clearHeartbeatUser, getUser as getUserApi } from "../lib/api";

type NotificationSummary = {
  conversationId: string;
  conversationName: string;
  unreadCount: number;
  latestAt: string;
};

function NotificationBell() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getConversationTitle = useCallback((conversation: any) => {
    if (conversation.isGroup) {
      return conversation.name || "Group chat";
    }

    const otherMember = conversation.members?.find(
      (member: any) => member.user?.id !== user?.id,
    )?.user;

    return otherMember?.name || otherMember?.email || "Conversation";
  }, [user?.id]);

  const getLastReadDate = (conversationId: string) => {
    const stored = localStorage.getItem(`chatApp:conversation:read:${conversationId}`);
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
        (response.data as any[])
          .filter((item) => item.notificationsEnabled)
          .map(async (item) => {
            const conversationId = item.conversation.id;
            if (!conversationId) return null;

            const latestMessage = item.conversation.messages?.[0];
            if (!latestMessage?.createdAt) return null;

            const lastReadDate = getLastReadDate(conversationId);
            const latestMessageDate = new Date(latestMessage.createdAt);
            if (latestMessageDate <= lastReadDate) return null;

            const messageResponse = await getConversationMessages(conversationId, token);
            const unreadCount = (messageResponse.data as any[]).filter(
              (message) =>
                message.createdAt &&
                new Date(message.createdAt) > lastReadDate &&
                message.sender?.id !== user.id,
            ).length;

            if (unreadCount === 0) return null;

            return {
              conversationId,
              conversationName: getConversationTitle(item.conversation),
              unreadCount,
              latestAt: latestMessage.createdAt,
            };
          }),
      );

      setNotifications(
        summaries
          .filter((summary): summary is NotificationSummary => Boolean(summary))
          .sort((a, b) => new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime()),
      );
    } catch (fetchError) {
      console.error("Failed to load notifications", fetchError);
      setError("Unable to fetch notifications. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [getToken, user?.id]);

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

    window.addEventListener("conversationRead", handleRead);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("conversationRead", handleRead);
      window.removeEventListener("storage", handleStorage);
    };
  }, [loadNotifications, open]);

  return (
    <div style={{ display: "inline-block" }}>
      <button
        className="app-icon notification-bell"
        aria-label="Notifications"
        onClick={() => setOpen((v) => !v)}
        type="button"
      >
        🔔
      </button>
      {notifications.length > 0 && <span className="notification-bell__indicator" aria-hidden="true" />}
      {open && (
        <div style={{ position: "absolute", right: 0, top: 44, zIndex: 60 }}>
          <NotificationsModal
            notifications={notifications}
            loading={loading}
            error={error}
            onClose={() => setOpen(false)}
            onConversationClick={(conversationId) => {
              setOpen(false);
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
  const [conversationCollapsed, setConversationCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem("chatApp:conversationListCollapsed") === "1";
    } catch {
      return false;
    }
  });
  const [activeStatusEnabled, setActiveStatusEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem("chatApp:activeStatusEnabled") !== "0";
    } catch {
      return true;
    }
  });

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
  const toggleConversationCollapsed = () =>
    setConversationCollapsed((value) => !value);

  useEffect(() => {
    const handler = () => toggleConversationCollapsed();
    window.addEventListener("toggleConversationList", handler as EventListener);
    return () => window.removeEventListener("toggleConversationList", handler as EventListener);
  }, []);

  useEffect(() => {
    const preferenceHandler = (event: Event) => {
      const customEvent = event as CustomEvent<{ enabled: boolean }>;
      setActiveStatusEnabled(customEvent.detail.enabled);
    };

    window.addEventListener("activeStatusPreferenceChanged", preferenceHandler as EventListener);
    return () => window.removeEventListener("activeStatusPreferenceChanged", preferenceHandler as EventListener);
  }, []);

  useEffect(() => {
    if (!isSignedIn) navigate("/");
  }, [isSignedIn, navigate]);

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
            localStorage.setItem("chatApp:activeStatusEnabled", enabled ? "1" : "0");
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
  const conversationCollapsedEffective = hideChatOnSettings ? false : conversationCollapsed;
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
          <Link to="/app/conversations" className="app-logo">
            💬 Chat App
          </Link>
        </div>

        <div className="app-navbar__right">
          <div style={{ position: "relative" }}>
            <NotificationBell />
          </div>
        </div>
      </header>

      <div
        className={`app-content${sidebarCollapsed ? " app-content--sidebar-collapsed" : ""}${conversationCollapsedEffective ? " app-content--conversation-collapsed" : ""}`}
      >
        <aside className="app-sidebar">
          <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
        </aside>

        <section className="app-conversations">{content}</section>

        {!hideChatOnSettings && (
          <section className="app-chat">
            {showChatPlaceholder ? (
              <div className="app-chat__empty">
                <h2>Select a conversation</h2>
                <p>Choose a chat from the list to start messaging. Your selected conversation will appear here.</p>
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
