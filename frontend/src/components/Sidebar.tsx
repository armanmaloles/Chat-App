import { NavLink } from "react-router-dom";

const navItems = [
  { to: "/app/conversations", label: "Chats", icon: "💬" },
  { to: "/app/groups", label: "Groups", icon: "👥" },
  { to: "/app/favorites", label: "Favorites", icon: "⭐" },
  { to: "/app/settings", label: "Settings", icon: "⚙️" },
];

const Sidebar = () => {
  return (
    <div className="sidebar">
      <nav className="sidebar__nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `sidebar__nav-item ${isActive ? "active" : ""}`
            }
          >
            <span className="sidebar__nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export default Sidebar;
