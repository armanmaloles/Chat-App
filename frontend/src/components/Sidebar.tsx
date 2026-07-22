import { NavLink, useLocation } from "react-router-dom";

const navItems = [
  { to: "/app/conversations", label: "Chats", icon: "💬" },
  { to: "/app/groups", label: "Groups", icon: "👥" },
  { to: "/app/settings", label: "Settings", icon: "⚙️" },
];

const Sidebar = ({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) => {
  const location = useLocation();

  return (
    <div className={`sidebar ${collapsed ? "sidebar--collapsed" : ""}`}>
      <div className="sidebar__toggle-wrapper">
        <button
          type="button"
          className="sidebar__toggle-btn"
          onClick={onToggle}
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Expand" : "Collapse"}
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? "›" : "‹"}
        </button>
      </div>

      <nav className="sidebar__nav">
        {navItems.map((item) => {
          const itemActive =
            item.to === "/app/conversations"
              ? location.pathname.startsWith("/app/conversations") ||
                location.pathname.startsWith("/app/chat")
              : item.to === "/app/groups"
              ? location.pathname.startsWith("/app/groups")
              : location.pathname === item.to;

          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => {
                if (item.to === "/app/conversations") {
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
                }
              }}
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
