import { Outlet, Link, useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import ConversationList from "../pages/ConversationList";
import Favorites from "../pages/Favorites";
import Groups from "../pages/Groups";
import Notifications from "../pages/Notifications";
import Settings from "../pages/Settings";
import { useAuth } from "@clerk/clerk-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import NotificationsModal from "../components/NotificationsModal";

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
  const { isSignedIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname || "";

  useEffect(() => {
    if (!isSignedIn) navigate("/");
  }, [isSignedIn, navigate]);

  const showChatPlaceholder = !path.startsWith("/app/chat/");
  let content;
  if (path.startsWith("/app/favorites")) {
    content = <Favorites />;
  } else if (path.startsWith("/app/groups")) {
    content = <Groups />;
  } else if (path.startsWith("/app/notifications")) {
    content = <Notifications />;
  } else if (path.startsWith("/app/settings")) {
    content = <Settings />;
  } else {
    content = <ConversationList />;
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

      <div className="app-content">
        <aside className="app-sidebar">
          <Sidebar />
        </aside>

        <section className="app-conversations">{content}</section>

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
      </div>
    </div>
  );
};

export default ChatLayout;
