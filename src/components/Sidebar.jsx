import { NavLink } from "react-router-dom";
import { FiHome, FiList, FiAward, FiBarChart2, FiUser, FiTrendingUp, FiCode, FiShield } from "react-icons/fi";
import { useFriends } from "../context/FriendContext";
import { useAuth } from "../context/AuthContext";

const sidebarLinks = [
  { to: "/dashboard",   icon: <FiHome />,     label: "Home" },
  { to: "/expenses",    icon: <FiList />,     label: "Expenses" },
  { to: "/quests",      icon: <FiAward />,    label: "Quests" },
  { to: "/leaderboard", icon: <FiBarChart2 />, label: "Leaderboard" },
  { to: "/analytics",   icon: <FiTrendingUp />, label: "Analytics" },
  { to: "/profile",     icon: <FiUser />,     label: "Profile" },
  { to: "/developers",  icon: <FiCode />,     label: "Meet the Team" },
];

export default function Sidebar() {
  const { pendingCount } = useFriends();
  const { isAdmin } = useAuth();

  const activeLinks = [...sidebarLinks];
  if (isAdmin) {
    activeLinks.push({ to: "/admin", icon: <FiShield />, label: "Admin Settings" });
  }

  return (
    <aside className="sidebar d-none d-lg-flex">
      {/* Brand Logo */}
      <div className="sidebar__brand mb-4 px-3 d-flex align-items-center gap-2">
        <span style={{ fontSize: "1.6rem" }}>💰</span>
        <span className="fw-black fs-4 text-white">
          Peso<span className="gradient-text">Dash</span>
        </span>
      </div>

      {/* Nav Menu */}
      <nav className="nav flex-column gap-2 flex-grow-1">
        {activeLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) => 
              `sidebar__item d-flex align-items-center gap-3 px-3 py-2.5 rounded-3 text-decoration-none ${
                isActive ? "active" : ""
              }`
            }
          >
            <span className="sidebar__icon d-flex align-items-center position-relative">
              {link.icon}
              {link.to === "/profile" && pendingCount > 0 && (
                <span className="sidebar__badge" />
              )}
            </span>
            <span className="sidebar__label fw-semibold">{link.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer / SDG */}
      <div className="sidebar__footer mt-auto px-3 py-2 rounded-3" style={{ background: "rgba(255,255,255,.02)", border: "1px solid var(--pd-border)" }}>
        <p className="mb-0 text-secondary" style={{ fontSize: ".7rem" }}>
          SDG 8 · Financial Literacy
        </p>
      </div>
    </aside>
  );
}
