import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuests } from "../context/QuestContext";

export default function Quests() {
  const { quests, loading } = useQuests();
  const [tab, setTab] = useState("active");

  // Active = not completed this week
  const active = quests.filter((q) => !q.completed);
  // Completed tab = quests that have EVER been completed (timesCompleted > 0 OR completed this week)
  const completed = quests.filter((q) => q.completed || (q.timesCompleted > 0));
  const list = tab === "active" ? active : completed;

  if (loading)
    return <div className="page-content text-secondary text-center pt-5">Loading quests…</div>;

  return (
    <div className="page-content" style={{ maxWidth: 720 }}>

      {/* Tab switcher */}
      <ul className="nav nav-pills nav-fill mb-3 p-1 rounded-3" style={{ background: "rgba(255,255,255,.04)" }}>
        {[["active", `Active (${active.length})`], ["completed", `Completed (${completed.length})`]].map(([key, label]) => (
          <li className="nav-item" key={key}>
            <button className={`nav-link w-100 fw-semibold ${tab === key ? "active" : ""}`}
              onClick={() => setTab(key)} id={`quests-tab-${key}`} style={{ fontSize: ".875rem" }}>
              {label}
            </button>
          </li>
        ))}
      </ul>

      <div className="d-flex flex-column gap-3">
        <AnimatePresence mode="wait">
          {list.map((quest, i) => {
            const isCompletedThisWeek = quest.completed;
            const lastEntry = quest.completionHistory?.at(-1);
            const lastCompletedDate = lastEntry?.completedAt
              ? new Date(lastEntry.completedAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })
              : null;

            return (
              <motion.div key={quest.id} className="card rounded-4 glass-card"
                style={{ opacity: isCompletedThisWeek ? 0.65 : 1 }}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: isCompletedThisWeek ? 0.65 : 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ delay: i * 0.05 }}
              >
                <div className="card-body">
                  <div className="d-flex align-items-start gap-3 mb-2">
                    <span style={{ fontSize: "1.75rem", flexShrink: 0 }}>{quest.icon}</span>
                    <div className="flex-fill">
                      <p className="fw-bold text-white mb-1 small">{quest.title}</p>
                      <p className="text-secondary mb-0" style={{ fontSize: ".8rem" }}>{quest.description}</p>
                    </div>

                    {/* Badge — show completion status */}
                    <div className="d-flex flex-column align-items-end gap-1">
                      {isCompletedThisWeek
                        ? <span className="badge bg-success rounded-pill">✅ Done</span>
                        : tab === "completed"
                          ? null
                          : <span className="badge rounded-pill" style={{ background: "rgba(99,102,241,.15)", color: "#818cf8", border: "1px solid rgba(99,102,241,.3)", fontSize: ".75rem" }}>
                              +{quest.pointsReward}pt
                            </span>
                      }
                      {/* Times completed badge */}
                      {(quest.timesCompleted > 0) && (
                        <span className="badge rounded-pill" style={{ background: "rgba(245,158,11,.15)", color: "#f59e0b", border: "1px solid rgba(245,158,11,.3)", fontSize: ".72rem" }}>
                          🏆 {quest.timesCompleted}x
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Progress bar — only for active quests not yet completed */}
                  {!isCompletedThisWeek && tab === "active" && (
                    <>
                      <div className="progress mb-1" style={{ height: 6 }}>
                        <div className="progress-bar" role="progressbar"
                          style={{ width: `${Math.min((quest.progress / quest.target) * 100, 100)}%`, background: "linear-gradient(90deg,#6366f1,#8b5cf6)" }}
                          aria-valuenow={quest.progress} aria-valuemin={0} aria-valuemax={quest.target} />
                      </div>
                      <p className="text-secondary mb-0 text-end" style={{ fontSize: ".72rem" }}>
                        {quest.questType === "category"
                          ? `₱${quest.progress} / ₱${quest.target}`
                          : `${quest.progress} / ${quest.target} days`}
                      </p>
                    </>
                  )}

                  {/* Last completed date — shown on completed tab */}
                  {tab === "completed" && lastCompletedDate && (
                    <p className="text-secondary mb-0" style={{ fontSize: ".75rem" }}>
                      Last completed: {lastCompletedDate}
                    </p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {list.length === 0 && (
          <div className="card rounded-3 glass-card">
            <div className="card-body text-center py-5">
              <div style={{ fontSize: "2.5rem" }}>{tab === "completed" ? "🎉" : "🎯"}</div>
              <p className="text-secondary small mt-2">
                {tab === "completed" ? "No completed quests yet!" : "All quests completed! 🎉"}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="card rounded-3 mt-3" style={{ background: "rgba(99,102,241,.06)", border: "1px solid rgba(99,102,241,.15)" }}>
        <div className="card-body py-2 px-3">
          <p className="mb-0 small" style={{ color: "#818cf8" }}>💡 Quests are automatically tracked based on your logged expenses.</p>
        </div>
      </div>

    </div>
  );
}
