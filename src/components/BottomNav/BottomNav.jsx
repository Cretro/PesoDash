import { NavLink } from "react-router-dom";
import { FiHome, FiList, FiBarChart2, FiAward, FiUser } from "react-icons/fi";
import { useFriends } from "../../context/FriendContext";

const tabs = [
  { to: "/dashboard",   icon: <FiHome />,     label: "Home" },
  { to: "/expenses",    icon: <FiList />,     label: "Expenses" },
  { to: "/quests",      icon: <FiAward />,    label: "Quests" },
  { to: "/leaderboard", icon: <FiBarChart2 />, label: "Ranks" },
  { to: "/profile",     icon: <FiUser />,     label: "Profile" },
];

export default function BottomNav() {
  const { pendingCount } = useFriends();

  return (
    <nav className="bottom-nav">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={({ isActive }) => `bottom-nav__item${isActive ? " active" : ""}`}
        >
          <span className="bottom-nav__icon position-relative">
            {tab.icon}
            {tab.to === "/profile" && pendingCount > 0 && (
              <span className="bottom-nav__badge" />
            )}
          </span>
          <span className="bottom-nav__label">{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
