import { useMemo } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { FiBarChart2 } from "react-icons/fi";
import { useAuth } from "../../context/AuthContext";
import { useExpenses } from "../../context/ExpenseContext";
import { useQuests } from "../../context/QuestContext";
import { formatCurrency, getTodayString, sumExpenses } from "../../utils/formatters";
import Avatar from "../../components/Avatar/Avatar";

function CategoryEmoji({ cat }) {
  const map = { Food: "🍱", Commute: "🚌", "School Expenses": "📚", Others: "🛍️" };
  return <span>{map[cat] || "💸"}</span>;
}

export default function Dashboard() {
  const { currentUser, userProfile } = useAuth();
  const { expenses } = useExpenses();
  const { quests } = useQuests();

  const dailyBudget = userProfile?.dailyBudget || 300;
  const todayStr = getTodayString();

  const todayExpenses = useMemo(() => expenses.filter((e) => e.date === todayStr), [expenses, todayStr]);
  const todayTotal = sumExpenses(todayExpenses);
  const pct = Math.min((todayTotal / dailyBudget) * 100, 100);
  const remaining = Math.max(dailyBudget - todayTotal, 0);
  const isOver = todayTotal > dailyBudget;

  const recentExpenses = expenses.slice(0, 5);
  const activeQuest = quests.find((q) => !q.completed);
  const name = currentUser?.displayName?.split(" ")[0] || "there";

  const circ = 2 * Math.PI * 40;
  const dashOff = circ * (1 - pct / 100);

  return (
    <div className="page-content">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>

        {/* Greeting row */}
        <div className="d-flex align-items-center justify-content-between mb-3">
          <div className="d-flex align-items-center gap-3">
            <Avatar name={currentUser?.displayName || "User"} size={48} />
            <div>
              <p className="text-secondary small mb-0">Good day 👋</p>
              <h2 className="fw-black text-white mb-0">Hey, {name}!</h2>
            </div>
          </div>
          <span className="badge rounded-pill" style={{ background: "rgba(99,102,241,.15)", border: "1px solid rgba(99,102,241,.3)", color: "#818cf8", fontSize: ".8rem", padding: ".4rem .875rem" }}>
            ⭐ {userProfile?.totalPoints || 0} pts
          </span>
        </div>

        {/* Budget card */}
        <div className={`card rounded-4 mb-3 ${isOver ? "border-danger" : ""}`}
          style={{ background: isOver ? "rgba(239,68,68,.1)" : "rgba(99,102,241,.08)", borderColor: isOver ? "rgba(239,68,68,.3)" : "rgba(99,102,241,.25)" }}>
          <div className="card-body d-flex align-items-center gap-3">
            {/* SVG ring */}
            <div className="budget-ring-wrap">
              <svg width="100" height="100" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="10" />
                <circle cx="50" cy="50" r="40" fill="none" stroke={isOver ? "#ef4444" : "#6366f1"}
                  strokeWidth="10" strokeDasharray={circ} strokeDashoffset={dashOff}
                  strokeLinecap="round" transform="rotate(-90 50 50)"
                  style={{ transition: "stroke-dashoffset .6s ease" }} />
              </svg>
              <div className="budget-ring-label">
                <span className="budget-ring-pct">{Math.round(pct)}%</span>
                <span className="budget-ring-sub">used</span>
              </div>
            </div>

            {/* Stats — Bootstrap grid */}
            <div className="row g-2 flex-fill">
              <div className="col-12">
                <p className="text-uppercase small fw-semibold text-secondary mb-0" style={{ fontSize: ".65rem" }}>Spent Today</p>
                <p className={`fw-bold mb-0 ${isOver ? "text-danger" : "text-white"}`}>{formatCurrency(todayTotal)}</p>
              </div>
              <div className="col-6">
                <p className="text-uppercase small fw-semibold text-secondary mb-0" style={{ fontSize: ".65rem" }}>Remaining</p>
                <p className={`fw-bold mb-0 ${isOver ? "text-danger" : "text-success"}`}>
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

        {/* Analytics shortcut */}
        <Link to="/analytics" className="text-decoration-none mb-3 d-block">
          <div className="card rounded-3 glass-card" style={{ background: "rgba(99,102,241,.12)", border: "1px solid rgba(99,102,241,.2)" }}>
            <div className="card-body d-flex align-items-center justify-content-between py-2">
              <div className="d-flex align-items-center gap-2">
                <FiBarChart2 style={{ color: "#818cf8" }} />
                <span className="fw-bold text-white small">View Spending Analytics</span>
              </div>
              <span className="text-secondary small">→</span>
            </div>
          </div>
        </Link>

        {/* Streak badge */}
        <div className="d-flex align-items-center gap-2 px-3 py-2 rounded-3 mb-3"
          style={{ background: "rgba(245,158,11,.08)", border: "1px solid rgba(245,158,11,.2)" }}>
          <span>🔥</span>
          <span className="fw-semibold" style={{ color: "#fbbf24", fontSize: ".9rem" }}>
            {userProfile?.currentStreak || 0}-day budget streak
          </span>
        </div>

        {/* Active Quest */}
        {activeQuest && (
          <div className="mb-3">
            <p className="text-uppercase small fw-semibold text-secondary mb-2" style={{ fontSize: ".75rem" }}>Active Quest</p>
            <div className="card rounded-3 glass-card">
              <div className="card-body d-flex align-items-start gap-3">
                <span style={{ fontSize: "1.5rem" }}>{activeQuest.icon}</span>
                <div className="flex-fill">
                  <p className="fw-bold text-white mb-1 small">{activeQuest.title}</p>
                  <p className="text-secondary mb-2" style={{ fontSize: ".75rem" }}>{activeQuest.description}</p>
                  <div className="progress mb-1" style={{ height: 5 }}>
                    <div className="progress-bar"
                      style={{ width: `${Math.min((activeQuest.progress / activeQuest.target) * 100, 100)}%`, background: "linear-gradient(90deg,#6366f1,#8b5cf6)" }} />
                  </div>
                  <p className="text-secondary mb-0" style={{ fontSize: ".7rem", textAlign: "right" }}>
                    {activeQuest.progress}/{activeQuest.target}
                  </p>
                </div>
                <span className="badge" style={{ background: "rgba(99,102,241,.15)", color: "#818cf8", border: "1px solid rgba(99,102,241,.3)", fontSize: ".75rem" }}>
                  +{activeQuest.pointsReward}pt
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Recent Expenses */}
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

      </motion.div>
    </div>
  );
}
