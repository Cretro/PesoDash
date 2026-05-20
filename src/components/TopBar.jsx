import { useLocation } from "react-router-dom";
import { FiHome, FiList, FiAward, FiBarChart2, FiTrendingUp, FiUser, FiCode, FiShield } from "react-icons/fi";

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
 */
export default function TopBar() {
  const { pathname } = useLocation(); // Fetches current location pathname (e.g. "/dashboard")
  
  return (
    <header className="top-bar">
      <span className="d-flex align-items-center" style={{ fontSize: "1.3rem", color: "var(--pd-primary)" }}>
        {PAGE_ICONS[pathname] || "💰"}
      </span>
      {/* Renders the resolved title from PAGE_TITLES key mapping. Falls back to "PesoDash" if path isn't mapped */}
      <h1 className="top-bar__title tactical-title">{PAGE_TITLES[pathname] || "PesoDash"}</h1>
    </header>
  );
}
