import { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { FiBarChart2 } from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import { useExpenses } from "../context/ExpenseContext";
import { useQuests } from "../context/QuestContext";
import { formatCurrency, getTodayString, sumExpenses } from "../utils/formatters";
import Avatar from "../components/Avatar";

/**
 * CategoryEmoji Component
 * 
 * Helper mapping string categories to expressive emojis.
 */
function CategoryEmoji({ cat }) {
  const map = { Food: "🍱", Commute: "🚌", "School Expenses": "📚", Others: "🛍️" };
  return <span>{map[cat] || "💸"}</span>;
}

/**
 * Dashboard Page Component
 * 
 * Purpose: Renders the primary landing page for authenticated users.
 * Key Sections:
 *  1. **Circular Budget Progress Ring**: A clean visual showing percentage of today's budget spent.
 *  2. **Active Quest HUD**: Small summary card displaying progress on the current challenge.
 *  3. **Recent Transactions Feed**: Clean list showing the user's latest 5 log entries.
 */
export default function Dashboard() {
  // Consumer Hooks: Retrieve data pools from the global React Context Providers
  const { currentUser, userProfile } = useAuth();
  const { expenses } = useExpenses();
  const { quests } = useQuests();

  const dailyBudget = userProfile?.dailyBudget || 300;
  const todayStr = getTodayString(); // Gets current local date string (YYYY-MM-DD)

  // Live clock for the header
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // useMemo: Filters the full expense list to isolate items logged today.
  // Optimizes performance so this filtering loop only re-runs if expenses update.
  const todayExpenses = useMemo(() => expenses.filter((e) => e.date === todayStr), [expenses, todayStr]);
  const todayTotal = sumExpenses(todayExpenses);
  const pct = Math.min((todayTotal / dailyBudget) * 100, 100);
  const remaining = Math.max(dailyBudget - todayTotal, 0);
  const isOver = todayTotal > dailyBudget; // Triggers UI styling shifts (e.g. red borders)

  const recentExpenses = expenses.slice(0, 5); // Grabs the 5 most recent records
  const activeQuest = quests.find((q) => !q.completed); // Gets the first uncompleted quest
  const name = currentUser?.displayName?.split(" ")[0] || "there"; // Grabs first name

  // --- SVG Circular Progress Ring Mathematics ---
  // Formula for circle circumference: C = 2 * π * r
  // Here, radius (r) is 40. Circumference = 2 * Math.PI * 40 ≈ 251.2px
  const circ = 2 * Math.PI * 40;
  // Dash offset controls how much of the stroke is Hidden (drawn with empty space).
  // If 0% is used, offset = circ (completely empty ring).
  // If 100% is used, offset = 0 (completely filled ring).
  const dashOff = circ * (1 - pct / 100);

  return (
    <div className="page-content">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>

        {/* Header Section: Avatar and Point Counter */}
        <div className="d-flex align-items-center justify-content-between mb-4">
          <div className="d-flex align-items-center gap-3">
            <Avatar name={currentUser?.displayName || "User"} gender={userProfile?.gender} size={48} />
            <div>
              <p className="fw-bold mb-1" style={{ color: "#95C159", fontSize: "12px" }}>
                {now.toDateString()} at {now.toLocaleTimeString()}
              </p>
              <h2 className="text-white fw-bold mb-0 tactical-title">Welcome, {name}!</h2>
            </div>
          </div>
          <span className="badge rounded-pill" style={{ background: "rgba(234,179,8,.15)", border: "1px solid rgba(234,179,8,.3)", color: "var(--pd-reward)", fontSize: ".8rem", padding: ".4rem .875rem" }}>
            ⭐ {userProfile?.totalPoints || 0} pts
          </span>
        </div>

        <div className="row g-4">
          <div className="col-12 col-lg-7">

            {/* Circular Progress Ring & Spending stats */}
            <div className={`card rounded-4 mb-3 ${isOver ? "border-danger" : ""}`}
              style={{ background: isOver ? "rgba(217,83,79,.1)" : "var(--pd-surface)", borderColor: isOver ? "var(--pd-alert)" : "var(--pd-border)" }}>
              <div className="card-body d-flex align-items-center gap-4">

                {/* SVG Progress Circle rendering */}
                <div className="budget-ring-wrap" style={{ flexShrink: 0 }}>
                  <svg width="100" height="100" viewBox="0 0 100 100">
                    {/* Background grey track */}
                    <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,.05)" strokeWidth="10" />
                    {/* Active foreground indicator bar */}
                    <circle cx="50" cy="50" r="40" fill="none" stroke={isOver ? "var(--pd-alert)" : "var(--pd-primary)"}
                      strokeWidth="10" strokeDasharray={circ} strokeDashoffset={dashOff}
                      strokeLinecap="round" transform="rotate(-90 50 50)" // Rotates -90deg so progress starts at 12 o'clock
                      style={{ transition: "stroke-dashoffset .6s ease" }} />
                  </svg>
                  <div className="budget-ring-label">
                    <span className="budget-ring-pct">{Math.round(pct)}%</span>
                    <span className="budget-ring-sub">used</span>
                  </div>
                </div>

                {/* Numeric Budget Metrics */}
                <div className="row g-3 flex-fill">
                  <div className="col-12">
                    <p className="text-uppercase small fw-semibold text-secondary mb-0" style={{ fontSize: ".65rem" }}>Spent Today</p>
                    <p className={`fw-bold mb-0 fs-4 ${isOver ? "text-danger" : "text-white"}`}>{formatCurrency(todayTotal)}</p>
                  </div>
                  <div className="col-6">
                    <p className="text-uppercase small fw-semibold text-secondary mb-0" style={{ fontSize: ".65rem" }}>Remaining</p>
                    <p className={`fw-bold mb-0`} style={{ color: isOver ? "var(--pd-alert)" : "var(--pd-primary)" }}>
                      {isOver ? "Over!" : formatCurrency(remaining)}
                    </p>
                  </div>
                  <div className="col-6">
                    <p className="text-uppercase small fw-semibold text-secondary mb-0" style={{ fontSize: ".65rem" }}>Daily Budget</p>
                    <p className="fw-bold text-white mb-0">{formatCurrency(dailyBudget)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Streak Counter Alert */}
            <div className="d-flex align-items-center gap-2 px-3 py-2.5 rounded-3 mb-3"
              style={{ background: "rgba(234,179,8,.08)", border: "1px solid rgba(234,179,8,.2)" }}>
              <span>🔥</span>
              <span className="fw-semibold" style={{ color: "var(--pd-reward)", fontSize: ".9rem" }}>
                {userProfile?.currentStreak || 0}-day budget streak
              </span>
            </div>

            {/* Analytics navigation banner link */}
            <Link to="/analytics" className="text-decoration-none mb-3 d-block">
              <div className="card rounded-3 glass-card" style={{ background: "rgba(149,193,89,.1)", border: "1px solid rgba(149,193,89,.25)" }}>
                <div className="card-body d-flex align-items-center justify-content-between py-2.5">
                  <div className="d-flex align-items-center gap-2">
                    <FiBarChart2 style={{ color: "var(--pd-primary)" }} />
                    <span className="fw-bold text-white small">View Spending Analytics</span>
                  </div>
                  <span className="text-secondary small">→</span>
                </div>
              </div>
            </Link>
          </div>

          <div className="col-12 col-lg-5">
            {/* Active Quest HUD */}
            {activeQuest && (
              <div className="mb-4">
                <p className="text-uppercase small fw-semibold text-secondary mb-2" style={{ fontSize: ".75rem" }}>Active Quest</p>
                <div className="card rounded-3 glass-card">
                  <div className="card-body d-flex align-items-start gap-3">
                    <span style={{ fontSize: "1.5rem" }}>{activeQuest.icon}</span>
                    <div className="flex-fill">
                      <p className="fw-bold text-white mb-1 small">{activeQuest.title}</p>
                      <p className="text-secondary mb-2" style={{ fontSize: ".75rem" }}>{activeQuest.description}</p>
                      <div className="progress mb-1" style={{ height: 5 }}>
                        <div className="progress-bar"
                          style={{ width: `${Math.min((activeQuest.progress / activeQuest.target) * 100, 100)}%`, background: "var(--pd-primary)" }} />
                      </div>
                      <p className="text-secondary mb-0" style={{ fontSize: ".7rem", textAlign: "right" }}>
                        {activeQuest.progress}/{activeQuest.target}
                      </p>
                    </div>
                    <span className="badge" style={{ background: "rgba(234,179,8,.15)", color: "var(--pd-reward)", border: "1px solid rgba(234,179,8,.3)", fontSize: ".75rem" }}>
                      +{activeQuest.pointsReward}pt
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Recent Expenses Feed */}
            <div>
              <p className="text-uppercase small fw-semibold text-secondary mb-2" style={{ fontSize: ".75rem" }}>Recent Expenses</p>
              {recentExpenses.length === 0
                ? <div className="card rounded-3 glass-card"><div className="card-body text-center text-secondary small py-4">No expenses yet. Tap + to add one!</div></div>
                : <ul className="list-group list-group-flush rounded-3" style={{ overflow: "hidden" }}>
                  {recentExpenses.map((e) => (
                    <li key={e.id} className="list-group-item d-flex align-items-center gap-3 px-3 py-2">
                      <span style={{ fontSize: "1.2rem" }}><CategoryEmoji cat={e.category} /></span>
                      <div className="flex-fill">
                        <p className="fw-semibold text-white mb-0 small">{e.note || e.category}</p>
                        <p className="text-secondary mb-0" style={{ fontSize: ".7rem" }}>{e.date}</p>
                      </div>
                      <span className="fw-bold text-danger small">{formatCurrency(e.amount)}</span>
                    </li>
                  ))}
                </ul>
              }
            </div>
          </div>
        </div>

      </motion.div>
    </div>
  );
}
