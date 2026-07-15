import { Outlet, Link, useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import ConversationList from "../pages/ConversationList";
import Groups from "../pages/Groups";
import Notifications from "../pages/Notifications";
import Settings from "../pages/Settings";
import { useAuth } from "@clerk/clerk-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import NotificationsModal from "../components/NotificationsModal";
import { heartbeatUser } from "../api";

function NotificationBell() {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ display: "inline-block" }}>
      <button
        className="app-icon"
        aria-label="Notifications"
        onClick={() => setOpen((v) => !v)}
        type="button"
      >
        🔔
      </button>
      {open && (
        <div style={{ position: "absolute", right: 0, top: 44, zIndex: 60 }}>
          <NotificationsModal onClose={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}

const ChatLayout = () => {
  const { isSignedIn, getToken } = useAuth();
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
    if (!isSignedIn) navigate("/");
  }, [isSignedIn, navigate]);

  useEffect(() => {
    const heartbeat = async () => {
      if (!isSignedIn) return;
      try {
        const token = await getToken();
        await heartbeatUser(token);
      } catch (error) {
        console.error("Failed to heartbeat active user", error);
      }
    };

    void heartbeat();
    const intervalId = window.setInterval(() => void heartbeat(), 15000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [getToken, isSignedIn]);

  const showChatPlaceholder = !(
    path.startsWith("/app/chat/") ||
    (path.startsWith("/app/groups/") && path !== "/app/groups")
  );
  const hideChatOnSettings = path.startsWith("/app/settings");
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
        className={`app-content${sidebarCollapsed ? " app-content--sidebar-collapsed" : ""}${conversationCollapsed ? " app-content--conversation-collapsed" : ""}`}
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
