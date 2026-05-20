import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuests } from "../context/QuestContext";

/**
 * Quests Page Component
 * 
 * Purpose: Renders the active challenges and completed quest history log for the user.
 * Key features:
 *  1. Tab switching between Active and Completed quests.
 *  2. Real-time countdown timer tracking the exact remaining hours/minutes until midnight.
 *  3. Context-driven conditional rendering:
 *     - Daily binary quests (e.g. Budget Streak or Zero Splurge) render as status boxes showing "On Track" or "Failed".
 *     - Weekly or accumulative quests render visual progress bars with limit breach checks.
 *  4. Log list showing exactly when the quest was completed previously.
 */
export default function Quests() {
  const { quests, loading } = useQuests();
  const [tab, setTab] = useState("active");
  const [timeToMidnight, setTimeToMidnight] = useState("");

  // Countdown timer effect: Computes difference between current system time and next midnight.
  // Re-evaluates every minute to update the visual countdown.
  useEffect(() => {
    function updateCountdown() {
      const now = new Date();
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0); // Shifts timezone/hour anchor to exactly 12:00 AM next day
      const diffMs = midnight - now;
      const hours = Math.max(0, Math.floor(diffMs / 3600000));
      const minutes = Math.max(0, Math.floor((diffMs % 3600000) / 60000));
      setTimeToMidnight(`${hours}h ${minutes}m remaining`);
    }
    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);
    return () => clearInterval(interval);
  }, []);

  // Filter 1: Active Quests (Quests where the "completed" boolean is false this cycle)
  const active = quests.filter((q) => !q.completed);
  
  // Filter 2: Completed Quests (Either completed this week/cycle OR timesCompleted > 0 in history)
  const completed = quests.filter((q) => q.completed || (q.timesCompleted > 0));
  
  const list = tab === "active" ? active : completed;

  // Render simple fallback spinner if context is still retrieving documents from Firestore
  if (loading)
    return <div className="page-content text-secondary text-center pt-5">Loading quests…</div>;

  return (
    <div className="page-content" style={{ maxWidth: 720 }}>

      {/* Tab Selector: Uses Bootstrap nav-pills styling */}
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

      {/* Quest Cards Container */}
      <div className="d-flex flex-column gap-3">
        <AnimatePresence mode="wait">
          {list.map((quest, i) => {
            const isCompletedThisWeek = quest.completed;
            const completions = [...(quest.completionHistory || [])];
            
            // UI helper: If completed in this current cycle, append a mock completion log 
            // entry to the list so it visually appears immediately without waiting for database refresh.
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
            
            const qType = quest.questType || "streak";
            // Check if the quest is a category budget limit and the user has overspent.
            const isFailedSpendLimit = (qType === "category" || qType === "total_spend_limit") && quest.progress > quest.target;

            return (
              <motion.div key={quest.id} className="card rounded-4 glass-card"
                style={{ opacity: isCompletedThisWeek ? 0.65 : 1 }}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: isCompletedThisWeek ? 0.65 : 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ delay: i * 0.05 }} // Staggers card loading entries sequentially
              >
                <div className="card-body">
                  <div className="d-flex align-items-start gap-3 mb-2">
                    <span style={{ fontSize: "1.75rem", flexShrink: 0 }}>{quest.icon}</span>
                    <div className="flex-fill">
                      <p className="fw-bold text-white mb-1 small">{quest.title}</p>
                      <p className="text-secondary mb-0" style={{ fontSize: ".8rem" }}>{quest.description}</p>
                    </div>

                    {/* Status Badges */}
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
                      {/* Times Completed Count Counter */}
                      {(quest.timesCompleted > 0) && (
                        <span className="badge rounded-pill" style={{ background: "rgba(245,158,11,.15)", color: "#f59e0b", border: "1px solid rgba(245,158,11,.3)", fontSize: ".72rem" }}>
                          🏆 {quest.timesCompleted}x
                        </span>
                      )}
                    </div>
                  </div>

                  {/* ACTIVE TAB: Render Current Progress Controls */}
                  {tab === "active" && (
                    <div className="mt-2">
                      {quest.period === "daily" ? (
                        // --- BRANCH A: DAILY QUEST TRACKER ---
                        <>
                          {(qType === "streak" || qType === "zero_splurge_days" || qType === "zero_splurge") ? (
                            // Binary/Status Daily Challenges (Must hold state till midnight)
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
                            // Accumulative Daily Challenges (Savings targets, Category budgets)
                            (() => {
                              const isOverLimit = (qType === "category" || qType === "total_spend_limit") && quest.progress > quest.target;
                              const isGoalMet = qType === "savings_goal" && quest.progress >= quest.target;
                              const progressPercent = Math.min((quest.progress / quest.target) * 100, 100);
                              
                              return (
                                <>
                                  <div className="progress mb-1" style={{ height: 6 }}>
                                    <div className={`progress-bar ${isOverLimit ? "bg-danger" : ""}`} role="progressbar"
                                      style={{ 
                                        width: `${progressPercent}%`, 
                                        background: isOverLimit ? undefined : "linear-gradient(90deg,#6366f1,#8b5cf6)" 
                                      }}
                                      aria-valuenow={quest.progress} aria-valuemin={0} aria-valuemax={quest.target} />
                                  </div>
                                  <div className="d-flex justify-content-between align-items-center mt-1">
                                    <span className={`small fw-semibold ${isOverLimit ? "text-danger" : "text-success"}`} style={{ fontSize: ".72rem" }}>
                                      {isOverLimit 
                                        ? "❌ Budget Limit Exceeded" 
                                        : isGoalMet 
                                          ? "⏳ On Track (Goal Achieved)" 
                                          : "⏳ On Track"
                                      }
                                    </span>
                                    <span className="text-secondary font-monospace" style={{ fontSize: ".72rem" }}>
                                      ₱{quest.progress} / ₱{quest.target} • {isOverLimit ? "Resets at midnight" : timeToMidnight}
                                    </span>
                                  </div>
                                </>
                              );
                            })()
                          )}
                        </>
                      ) : (
                        // --- BRANCH B: WEEKLY QUEST TRACKER ---
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

                  {/* COMPLETED TAB: Render Historical Log of Completion Entries */}
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

        {/* Empty list fallbacks */}
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
