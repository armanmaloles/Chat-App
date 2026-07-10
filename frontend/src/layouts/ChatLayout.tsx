import { Outlet, Link, useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import ConversationList from "../pages/ConversationList";
import Favorites from "../pages/Favorites";
import Groups from "../pages/Groups";
import Notifications from "../pages/Notifications";
import Settings from "../pages/Settings";
import { UserButton, useAuth } from "@clerk/clerk-react";
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

  useEffect(() => {
    if (!isSignedIn) navigate("/");
  }, [isSignedIn, navigate]);
  return (
    <div className="app-root">
      <header className="app-navbar">
        <div className="app-navbar__left">
          <Link to="/app/conversations" className="app-logo">
            💬 Chat App
          </Link>
        </div>

        <div className="app-navbar__right">
          <input className="app-search" placeholder="Search chats" />
          <div style={{ position: "relative" }}>
            <NotificationBell />
          </div>
          <div style={{ marginLeft: 8 }}>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>

      <div className="app-content">
        <aside className="app-sidebar">
          <Sidebar />
        </aside>

        <section className="app-conversations">
          {(() => {
            const loc = useLocation();
            const path = loc.pathname || "";
            if (path.startsWith("/app/favorites")) return <Favorites />;
            if (path.startsWith("/app/groups")) return <Groups />;
            if (path.startsWith("/app/notifications")) return <Notifications />;
            if (path.startsWith("/app/settings")) return <Settings />;
            // default to conversations
            return <ConversationList />;
          })()}
        </section>

        <section className="app-chat">
          <Outlet />
        </section>
      </div>
    </div>
  );
};

export default ChatLayout;
