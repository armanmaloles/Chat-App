import { NavLink, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";

const navItems = [
  { to: "/app/conversations", label: "Chats", icon: "💬" },
  { to: "/app/groups", label: "Groups", icon: "👥" },
  { to: "/app/settings", label: "Settings", icon: "⚙️" },
];

const Sidebar = () => {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem("chatApp:sidebarCollapsed");
      return raw === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("chatApp:sidebarCollapsed", collapsed ? "1" : "0");
    } catch {
      /* noop */
    }
  }, [collapsed]);

  return (
    <div className={`sidebar ${collapsed ? "sidebar--collapsed" : ""}`}>
      <div className="sidebar__toggle-wrapper">
        <button
          type="button"
          className="sidebar__toggle-btn"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={() => setCollapsed((c) => !c)}
        >
          <span className="sidebar__toggle-icon">{collapsed ? ">" : "<"}</span>
        </button>
      </div>

      <nav className="sidebar__nav">
        {navItems.map((item) => {
          const itemActive =
            item.to === "/app/conversations"
              ? location.pathname.startsWith("/app/conversations") ||
                location.pathname.startsWith("/app/chat")
              : location.pathname === item.to;

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={() =>
                `sidebar__nav-item ${itemActive ? "active" : ""}`
              }
              title={item.label}
            >
              <span className="sidebar__nav-icon">{item.icon}</span>
              <span className="sidebar__nav-label">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
};

export default Sidebar;
