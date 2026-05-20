import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { FiHome, FiList, FiAward, FiBarChart2, FiUser, FiTrendingUp, FiCode, FiShield, FiLogOut } from "react-icons/fi";
import { useFriends } from "../context/FriendContext";
import { useAuth } from "../context/AuthContext";
import SignOutModal from "./SignOutModal";

// Base navigation configuration
const sidebarLinks = [
  { to: "/dashboard",   icon: <FiHome />,     label: "Home" },
  { to: "/expenses",    icon: <FiList />,     label: "Expenses" },
  { to: "/quests",      icon: <FiAward />,    label: "Quests" },
  { to: "/leaderboard", icon: <FiBarChart2 />, label: "Leaderboard" },
  { to: "/analytics",   icon: <FiTrendingUp />, label: "Analytics" },
  { to: "/profile",     icon: <FiUser />,     label: "Profile" },
  { to: "/developers",  icon: <FiCode />,     label: "Meet the Team" },
];

/**
 * Sidebar Component
 * 
 * Purpose: Renders the vertical sidebar navigation bar on desktop viewports.
 * Key Details:
 *  - Uses Bootstrap class `d-none d-lg-flex` to hide the component entirely on mobile devices 
 *    and display it on large viewports (desktop screen layout).
 *  - Inspects `isAdmin` from `AuthContext` to **dynamically append the Admin Settings link** 
 *    only if the logged-in profile has administrative access.
 *  - Displays notification badges for pending incoming friend invitations.
 *  - Includes a sign-out button pinned to the bottom of the sidebar that opens
 *    a confirmation modal before logging the user out.
 */
export default function Sidebar() {
  const { pendingCount } = useFriends();
  const { isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [showSignOut, setShowSignOut] = useState(false);

  // Create a mutable copy of default navigation links
  const activeLinks = [...sidebarLinks];
  
  // Conditional link injection based on administrator status
  if (isAdmin) {
    activeLinks.push({ to: "/admin", icon: <FiShield />, label: "Admin Settings" });
  }

  // Handles confirmed sign out: logs out and redirects to login
  async function handleSignOut() {
    try {
      await logout();
      navigate("/login");
    } catch (err) {
      console.error("Sign out failed:", err);
    }
  }

  return (
    <>
      <aside className="sidebar d-none d-lg-flex">
        {/* Platform branding logo and title */}
        <div className="sidebar__brand mb-4 px-3 d-flex align-items-center gap-2">
          <span className="fw-bold fs-4 text-white tactical-title">
            Peso<span style={{ color: "var(--pd-primary)" }}>Dash</span>
          </span>
        </div>

        {/* Navigation link mapping */}
        <nav className="nav flex-column gap-2 flex-grow-1">
          {activeLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              // Appends active CSS classes to highlight the selected menu item
              className={({ isActive }) => 
                `sidebar__item d-flex align-items-center gap-3 px-3 py-2.5 rounded-3 text-decoration-none ${
                  isActive ? "active" : ""
                }`
              }
            >
              <span className="sidebar__icon d-flex align-items-center position-relative">
                {link.icon}
                {/* Profile notification badge indicator */}
                {link.to === "/profile" && pendingCount > 0 && (
                  <span className="sidebar__badge" />
                )}
              </span>
              <span className="sidebar__label fw-semibold">{link.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Sign out button pinned to the bottom of the sidebar */}
        <div className="sidebar__signout">
          <button
            className="sidebar-signout-btn"
            onClick={() => setShowSignOut(true)}
            id="sidebar-signout-btn"
          >
            <FiLogOut />
            <span>Sign Out</span>
          </button>
        </div>

      </aside>

      {/* Confirmation modal rendered outside the aside to avoid z-index stacking issues */}
      <SignOutModal
        show={showSignOut}
        onCancel={() => setShowSignOut(false)}
        onConfirm={handleSignOut}
      />
    </>
  );
}
