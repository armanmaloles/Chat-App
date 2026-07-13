import { NavLink } from "react-router-dom";
import { useEffect, useState } from "react";

const navItems = [
  { to: "/app/conversations", label: "Chats", icon: "💬" },
  { to: "/app/groups", label: "Groups", icon: "👥" },
  { to: "/app/settings", label: "Settings", icon: "⚙️" },
];

const Sidebar = () => {
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
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={() => setCollapsed((c) => !c)}
          style={{
            background: "transparent",
            border: "none",
            color: "#cbd5e1",
            cursor: "pointer",
            fontSize: 16,
            padding: 6,
          }}
        >
          {collapsed ? ">" : "<"}
        </button>
      </div>

      <nav className="sidebar__nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `sidebar__nav-item ${isActive ? "active" : ""}`
            }
            title={item.label}
          >
            <span className="sidebar__nav-icon">{item.icon}</span>
            <span className="sidebar__nav-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export default Sidebar;
