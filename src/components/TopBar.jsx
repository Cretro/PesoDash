import { useLocation } from "react-router-dom";

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

export default function TopBar() {
  const { pathname } = useLocation();
  return (
    <header className="top-bar">
      <span style={{ fontSize: "1.3rem" }}>💰</span>
      <h1 className="top-bar__title">{PAGE_TITLES[pathname] || "PesoDash"}</h1>
    </header>
  );
}
