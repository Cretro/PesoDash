import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FiHome, FiList, FiAward, FiBarChart2, FiTrendingUp, FiUser, FiCode, FiShield, FiLogOut } from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import SignOutModal from "./SignOutModal";

// Mapping routes to standard page titles displayed on the header bar
const PAGE_TITLES = {
  "/dashboard":   "PesoDash",
  "/expenses":    "My Expenses",
  "/quests":      "Saving Quests",
  "/leaderboard": "Leaderboard",
  "/analytics":   "Analytics",
  "/profile":     "Profile",
  "/developers":  "The Team",
  "/admin":       "Admin Settings",
};

// Mapping routes to page icons
const PAGE_ICONS = {
  "/dashboard":   <FiHome />,
  "/expenses":    <FiList />,
  "/quests":      <FiAward />,
  "/leaderboard": <FiBarChart2 />,
  "/analytics":   <FiTrendingUp />,
  "/profile":     <FiUser />,
  "/developers":  <FiCode />,
  "/admin":       <FiShield />,
};

/**
 * TopBar Component
 * 
 * Purpose: Renders a sticky top header bar displaying the title of the active screen.
 * Key Logic points:
 *  - Inspects `pathname` from `useLocation()`.
 *  - Resolves the matching title from the `PAGE_TITLES` dictionary to display the screen name dynamically.
 *  - Includes a sign-out button that opens a confirmation modal before logging out.
 */
export default function TopBar() {
  const { pathname } = useLocation(); // Fetches current location pathname (e.g. "/dashboard")
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [showSignOut, setShowSignOut] = useState(false);

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
      <header className="top-bar">
        <span className="d-flex align-items-center" style={{ fontSize: "1.3rem", color: "var(--pd-primary)" }}>
          {PAGE_ICONS[pathname] || "💰"}
        </span>
        {/* Renders the resolved title from PAGE_TITLES key mapping. Falls back to "PesoDash" if path isn't mapped */}
        <h1 className="top-bar__title tactical-title">{PAGE_TITLES[pathname] || "PesoDash"}</h1>

        {/* Sign out button — aligned to far right of the top bar */}
        <button
          className="topbar-signout-btn"
          onClick={() => setShowSignOut(true)}
          title="Sign out"
          id="topbar-signout-btn"
        >
          <FiLogOut />
        </button>
      </header>

      {/* Confirmation modal rendered outside the header to avoid z-index stacking issues */}
      <SignOutModal
        show={showSignOut}
        onCancel={() => setShowSignOut(false)}
        onConfirm={handleSignOut}
      />
    </>
  );
}
