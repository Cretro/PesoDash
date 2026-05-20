import { NavLink } from "react-router-dom";
import { FiHome, FiList, FiBarChart2, FiAward, FiUser } from "react-icons/fi";
import { useFriends } from "../context/FriendContext";

// Tabs Configuration Array: maps navigation paths to icons and labels
const tabs = [
  { to: "/dashboard",   icon: <FiHome />,     label: "Home" },
  { to: "/expenses",    icon: <FiList />,     label: "Expenses" },
  { to: "/quests",      icon: <FiAward />,    label: "Quests" },
  { to: "/leaderboard", icon: <FiBarChart2 />, label: "Ranks" },
  { to: "/profile",     icon: <FiUser />,     label: "Profile" },
];

/**
 * BottomNav Component
 * 
 * Purpose: Renders a sticky mobile navigation bar at the bottom of the screen.
 * Key Details:
 *  - Uses Bootstrap class `d-lg-none` so it is **only visible on mobile screens** and hidden on desktop.
 *  - Uses React Router `NavLink` which provides a clean mechanism to dynamically apply active CSS styles 
 *    based on the current browser URL path.
 *  - Watches `pendingCount` from `FriendContext` to render a red notification dot badge 
 *    on the Profile tab icon if the user has incoming friend requests.
 */
export default function BottomNav() {
  const { pendingCount } = useFriends();

  return (
    <nav className="bottom-nav d-lg-none">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          // Dynamically sets the active class if the link matches the current path
          className={({ isActive }) => `bottom-nav__item${isActive ? " active" : ""}`}
        >
          <span className="bottom-nav__icon position-relative">
            {tab.icon}
            {/* Renders a red indicator dot if there are unresolved incoming friend requests */}
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
