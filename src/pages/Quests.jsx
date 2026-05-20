import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuests } from "../context/QuestContext";

export default function Quests() {
  const { quests, loading } = useQuests();
  const [tab, setTab] = useState("active");
  const [timeToMidnight, setTimeToMidnight] = useState("");

  useEffect(() => {
    function updateCountdown() {
      const now = new Date();
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0); // Next midnight
      const diffMs = midnight - now;
      const hours = Math.max(0, Math.floor(diffMs / 3600000));
      const minutes = Math.max(0, Math.floor((diffMs % 3600000) / 60000));
      setTimeToMidnight(`${hours}h ${minutes}m remaining`);
    }
    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);
    return () => clearInterval(interval);
  }, []);

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
            const completions = [...(quest.completionHistory || [])];
            if (quest.completed) {
              const currentResetRef = quest.period === "daily"
                ? quest.lastResetDate || new Date().toISOString().split("T")[0]
                : quest.weekStart || new Date().toISOString().split("T")[0];
              const alreadyExists = completions.some(
                (c) => c.date === currentResetRef || c.weekStart === currentResetRef
              );
              if (!alreadyExists) {
                completions.push({
                  completedAt: new Date().toISOString().split("T")[0],
                  isCurrent: true
                });
              }
            }
            const lastEntry = completions.at(-1);
            const lastCompletedDate = lastEntry?.completedAt
              ? new Date(lastEntry.completedAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })
              : null;
            
            const qType = quest.targetType || quest.questType || "streak";
            const isFailedSpendLimit = (qType === "category" || qType === "total_spend_limit") && quest.progress > quest.target;

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
                      {isCompletedThisWeek ? (
                        <span className="badge bg-success rounded-pill">✅ Done</span>
                      ) : isFailedSpendLimit ? (
                        <span className="badge bg-danger rounded-pill">❌ Limit Exceeded</span>
                      ) : tab === "completed" ? (
                        null
                      ) : (
                        <span className="badge rounded-pill" style={{ background: "rgba(99,102,241,.15)", color: "#818cf8", border: "1px solid rgba(99,102,241,.3)", fontSize: ".75rem" }}>
                          +{quest.pointsReward}pt
                        </span>
                      )}
                      {/* Times completed badge */}
                      {(quest.timesCompleted > 0) && (
                        <span className="badge rounded-pill" style={{ background: "rgba(245,158,11,.15)", color: "#f59e0b", border: "1px solid rgba(245,158,11,.3)", fontSize: ".72rem" }}>
                          🏆 {quest.timesCompleted}x
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Progress / Status display — only for active quests */}
                  {tab === "active" && (
                    <div className="mt-2">
                      {quest.period === "daily" ? (
                        // Daily Quest Layout
                        <>
                          {(qType === "streak" || qType === "zero_splurge_days" || qType === "zero_splurge") ? (
                            // Binary Daily Quests (On Track vs Failed)
                            quest.progress === 1 ? (
                              <div className="d-flex align-items-center justify-content-between p-2 rounded-3" 
                                style={{ background: "rgba(16, 185, 129, 0.06)", border: "1px solid rgba(16, 185, 129, 0.15)", color: "#34d399" }}>
                                <span className="small fw-semibold">
                                  ⏳ On Track ({qType === "streak" ? "Under Budget" : `₱0 on ${quest.category || "Others"}`})
                                </span>
                                <span className="small text-secondary font-monospace" style={{ fontSize: ".72rem" }}>
                                  {timeToMidnight}
                                </span>
                              </div>
                            ) : (
                              <div className="d-flex align-items-center justify-content-between p-2 rounded-3" 
                                style={{ background: "rgba(239, 68, 68, 0.06)", border: "1px solid rgba(239, 68, 68, 0.15)", color: "#f87171" }}>
                                <span className="small fw-semibold">
                                  ❌ Failed ({qType === "streak" ? "Exceeded Budget" : `Spent on ${quest.category || "Others"}`})
                                </span>
                                <span className="small text-secondary font-monospace" style={{ fontSize: ".72rem" }}>
                                  Resets at midnight
                                </span>
                              </div>
                            )
                          ) : (
                            // Accumulative Daily Quests (Total Spend Limit / Category / Savings Goal)
                            (() => {
                              const isOverLimit = (qType === "category" || qType === "total_spend_limit") && quest.progress > quest.target;
                              const isGoalMet = qType === "savings_goal" && quest.progress >= quest.target;
                              const isFailing = isOverLimit;
                              const progressPercent = Math.min((quest.progress / quest.target) * 100, 100);
                              
                              return (
                                <>
                                  <div className="progress mb-1" style={{ height: 6 }}>
                                    <div className={`progress-bar ${isFailing ? "bg-danger" : ""}`} role="progressbar"
                                      style={{ 
                                        width: `${progressPercent}%`, 
                                        background: isFailing ? undefined : "linear-gradient(90deg,#6366f1,#8b5cf6)" 
                                      }}
                                      aria-valuenow={quest.progress} aria-valuemin={0} aria-valuemax={quest.target} />
                                  </div>
                                  <div className="d-flex justify-content-between align-items-center mt-1">
                                    <span className={`small fw-semibold ${isFailing ? "text-danger" : "text-success"}`} style={{ fontSize: ".72rem" }}>
                                      {isFailing 
                                        ? "❌ Budget Limit Exceeded" 
                                        : isGoalMet 
                                          ? "⏳ On Track (Goal Achieved)" 
                                          : "⏳ On Track"
                                      }
                                    </span>
                                    <span className="text-secondary font-monospace" style={{ fontSize: ".72rem" }}>
                                      ₱{quest.progress} / ₱{quest.target} • {isFailing ? "Resets at midnight" : timeToMidnight}
                                    </span>
                                  </div>
                                </>
                              );
                            })()
                          )}
                        </>
                      ) : (
                        // Weekly Quest Layout
                        <>
                          <div className="progress mb-1" style={{ height: 6 }}>
                            <div className={`progress-bar ${isFailedSpendLimit ? "bg-danger" : ""}`} role="progressbar"
                              style={{ 
                                width: `${Math.min((quest.progress / quest.target) * 100, 100)}%`, 
                                background: isFailedSpendLimit ? undefined : "linear-gradient(90deg,#6366f1,#8b5cf6)" 
                              }}
                              aria-valuenow={quest.progress} aria-valuemin={0} aria-valuemax={quest.target} />
                          </div>
                          <div className="d-flex justify-content-between align-items-center mt-1">
                            <span className={`small fw-semibold ${isFailedSpendLimit ? "text-danger" : "text-secondary"}`} style={{ fontSize: ".72rem" }}>
                              {isFailedSpendLimit ? "❌ Limit Exceeded" : "Weekly Quest"}
                            </span>
                            <span className="text-secondary" style={{ fontSize: ".72rem" }}>
                              {qType === "category" || qType === "total_spend_limit" || qType === "savings_goal"
                                ? `₱${quest.progress} / ₱${quest.target}`
                                : `${quest.progress} / ${quest.target} days`}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Detailed completion history log */}
                  {tab === "completed" && completions.length > 0 && (
                    <div className="mt-2 pt-2 border-top border-white border-opacity-5">
                      <p className="text-secondary small fw-bold mb-1.5" style={{ fontSize: "0.65rem", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                        Completion Log ({quest.timesCompleted || completions.length}x):
                      </p>
                      <div className="d-flex flex-wrap gap-1.5">
                        {completions.map((entry, idx) => {
                          const dateVal = entry.completedAt || entry.date || entry.weekStart;
                          const formatted = dateVal 
                            ? new Date(dateVal).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })
                            : "Unknown Date";
                          const isCurrent = entry.isCurrent;
                          return (
                            <span 
                              key={idx} 
                              className="badge rounded-pill" 
                              style={{ 
                                background: isCurrent ? "rgba(99, 102, 241, 0.08)" : "rgba(16, 185, 129, 0.08)", 
                                color: isCurrent ? "#818cf8" : "#34d399", 
                                fontSize: "0.68rem", 
                                border: isCurrent ? "1px solid rgba(99, 102, 241, 0.15)" : "1px solid rgba(16, 185, 129, 0.15)", 
                                padding: "0.2rem 0.5rem" 
                              }}
                            >
                              📅 {formatted} {isCurrent && "(Current Cycle)"}
                            </span>
                          );
                        })}
                      </div>
                    </div>
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
