import { createContext, useContext, useEffect, useState, useRef } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  arrayUnion,
  increment,
  deleteField,
} from "firebase/firestore";
import { db } from "../firebase/firebase";
import { useAuth } from "./AuthContext";
import { useExpenses } from "./ExpenseContext";

// QuestContext: Manages active quests, user point awards, daily and weekly reset audit cycles.
const QuestContext = createContext(null);

// QUEST_TEMPLATES: Fallback quest definitions used only when the admin has NOT yet configured
// any templates in the '/questTemplates' Firestore collection, or if that fetch fails.
// Under normal operation, new users are seeded from the admin-managed Firestore templates instead.
const QUEST_TEMPLATES = [
  {
    questType: "streak",
    title: "Budget Streak",
    description: "Stay within your daily budget for 7 days in a row",
    target: 7,
    pointsReward: 100,
    icon: "🔥",
  },
  {
    questType: "category",
    title: "Frugal Foodie",
    description: "Spend ≤ ₱1,000 on Food this week",
    target: 1000,
    pointsReward: 50,
    icon: "🍱",
    category: "Food",
  },
  {
    questType: "zero_splurge",
    title: "Zero Splurge Day",
    description: "Log a day with ₱0 in the 'Others' category",
    target: 1,
    pointsReward: 30,
    icon: "💎",
    period: "daily",
  },
];

/** 
 * Helper: Returns a "YYYY-MM-DD" date string in Philippine Standard Time (PST).
 * Used for consistency across different users, preventing local timezone skew bugs.
 */
function getPHDateString(date = new Date()) {
  const ph = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Manila" }));
  const y = ph.getFullYear();
  const m = String(ph.getMonth() + 1).padStart(2, "0");
  const d = String(ph.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** 
 * Helper: Returns the start date (Sunday) of the current week in Philippine Standard Time.
 * Used to identify when a weekly quest cycle starts and ends.
 */
function getCurrentWeekStart() {
  const ph = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }));
  ph.setDate(ph.getDate() - ph.getDay()); // Subtract current weekday index to shift back to Sunday
  return getPHDateString(ph);
}

/** 
 * Helper: Returns all 7 dates (Sun to Sat) for the current week.
 * Used to map expenses and daily targets across the current weekly cycle.
 */
function getCurrentWeekDates() {
  const weekStart = getCurrentWeekStart();
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart + "T00:00:00");
    d.setDate(d.getDate() + i);
    dates.push(getPHDateString(d));
  }
  return dates;
}

export function QuestProvider({ children }) {
  const [quests, setQuests] = useState([]);
  // Start with empty array; populated from Firestore or hardcoded fallback below
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);
  const { currentUser, userProfile, isAdmin } = useAuth();
  const { expenses } = useExpenses();
  const templateMigrationDone = useRef(false);
  const questMigrationDone = useRef(false);

  // Effect: Subscribes in real-time to the admin-managed '/questTemplates' collection.
  // When the admin adds/edits/removes templates in the AdminDashboard, this keeps 'templates'
  // in sync so that newly registered users are seeded with the latest set of quests.
  // Falls back to the hardcoded QUEST_TEMPLATES if the Firestore collection is still empty.
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "questTemplates"), (snap) => {
      if (!snap.empty) {
        // Run migration once: clean up deprecated targetType if present
        if (!templateMigrationDone.current) {
          templateMigrationDone.current = true;
          snap.docs.forEach(async (d) => {
            if (d.data().hasOwnProperty("targetType")) {
              const data = d.data();
              const qType = data.targetType || data.questType || "streak";
              await updateDoc(doc(db, "questTemplates", d.id), {
                questType: qType,
                targetType: deleteField(),
              });
            }
          });
        }
        setTemplates(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } else {
        // No admin templates configured yet, use the hardcoded defaults
        setTemplates(QUEST_TEMPLATES);
      }
    }, (err) => {
      console.error("QuestContext: Failed to load questTemplates, using defaults.", err);
      setTemplates(QUEST_TEMPLATES);
    });
    return unsub;
  }, []);

  // Effect: Subscribes in real-time to the active user's quests.
  // Query filters the global 'quests' collection to matching UIDs: where("uid", "==", currentUser.uid)
  useEffect(() => {
    if (!currentUser) {
      setQuests([]);
      setLoading(true);
      return;
    }
    const q = query(
      collection(db, "quests"),
      where("uid", "==", currentUser.uid)
    );
    const unsub = onSnapshot(q, (snap) => {
      // Run migration once: clean up deprecated targetType if present
      if (!questMigrationDone.current) {
        questMigrationDone.current = true;
        snap.docs.forEach(async (d) => {
          if (d.data().hasOwnProperty("targetType")) {
            const data = d.data();
            const qType = data.targetType || data.questType || "streak";
            await updateDoc(doc(db, "quests", d.id), {
              questType: qType,
              targetType: deleteField(),
            });
          }
        });
      }
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setQuests(data);
      setLoading(false);
    }, (err) => {
      console.error("QuestContext onSnapshot failed:", err);
    });
    return unsub;
  }, [currentUser]);

  // Effect: Declares side-effects for initializing quests if none are found in the database.
  useEffect(() => {
    if (loading || !currentUser || initializing) return;
    if (quests.length === 0) {
      initializeQuests();
    }
  }, [loading, quests.length, currentUser, initializing]);

  // Effect: Audits resets and syncs quests with templates cleanly outside onSnapshot listener.
  useEffect(() => {
    if (loading || !quests.length || !currentUser) return;
    syncQuestsWithTemplates(quests);
    checkAndResetQuests(quests, expenses);
  }, [loading, quests.map((q) => q.id).join(","), templates.length, expenses.length, currentUser]);

  // Effect: Calculates and updates active quest progress whenever expenses log changes or quests shift.
  useEffect(() => {
    if (loading || !quests.length || !currentUser) return;
    syncQuestProgress(quests, expenses);
  }, [expenses, quests.map((q) => q.id).join(","), loading, currentUser]);

  /** 
   * CORE ENGINE FUNCTION: syncQuestProgress
   * Purpose: Tracks real-time user actions (expenses) and maps them to quest targets.
   * Runs locally inside the React state loop, executing updates to Firestore documents.
   */
  async function syncQuestProgress(questData, expenseData) {
    const weekDates = getCurrentWeekDates();
    const dailyBudget = userProfile?.dailyBudget || 300;
    const todayStr = getPHDateString();

    // Group expenses into current week (Sun–Sat) vs today only
    const weekExpenses = expenseData.filter((e) => weekDates.includes(e.date));
    const todayExpenses = expenseData.filter((e) => e.date === todayStr);

    for (const quest of questData) {
      let newProgress = 0;
      const qType = quest.questType;
      const qCategory = quest.category || null;
      const qTarget = Number(quest.target || 0);
      const isDaily = quest.period === "daily";

      // Dates that have passed or are active in the current quest tracking range
      const activeDates = isDaily ? [todayStr] : weekDates.filter((d) => d <= todayStr);
      const activeExpenses = isDaily ? todayExpenses : weekExpenses;

      // --- EVALUATION PATH 1: Streaks (Persistent consecutive days under daily budget) ---
      // Streaks persist across weeks — they are NOT reset weekly.
      // Today is excluded: the day is still in progress, so we can't confirm it yet.
      // The midnight audit (checkAndResetQuests) handles incrementing the streak each morning.
      if (qType === "streak") {
        const todayTotal = todayExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
        if (todayTotal > dailyBudget) {
          // Today already exceeded the budget — immediately reset the streak
          newProgress = 0;
        } else {
          // Today is still on track — preserve the stored streak (do not increment yet)
          newProgress = quest.progress || 0;
        }

        // --- EVALUATION PATH 2: Category Limit Target Days ---
      } else if (qType === "days_under_category_limit") {
        let daysCount = 0;
        for (const date of activeDates) {
          const dayCatTotal = activeExpenses
            .filter((e) => e.date === date && e.category === qCategory)
            .reduce((sum, e) => sum + Number(e.amount), 0);
          if (dayCatTotal <= qTarget) {
            daysCount++;
          }
        }
        newProgress = daysCount;

        // --- EVALUATION PATH 3: Zero Splurge (E.g. Log ₱0 spent in Others) ---
      } else if (qType === "zero_splurge_days" || qType === "zero_splurge") {
        if (isDaily) {
          const catSpend = todayExpenses
            .filter((e) => e.category === (qCategory || "Others"))
            .reduce((sum, e) => sum + Number(e.amount), 0);
          newProgress = catSpend === 0 ? 1 : 0;
        } else {
          let zeroDays = 0;
          for (const date of activeDates) {
            const dayExpenses = activeExpenses.filter((e) => e.date === date);
            if (dayExpenses.length === 0) continue; // Must log at least one expense on that day to count
            const catSpend = dayExpenses
              .filter((e) => e.category === (qCategory || "Others"))
              .reduce((sum, e) => sum + Number(e.amount), 0);
            if (catSpend === 0) {
              zeroDays++;
            }
          }
          newProgress = quest.questType === "zero_splurge" ? (zeroDays > 0 ? 1 : 0) : zeroDays;
        }

        // --- EVALUATION PATH 4: Total Spend Limits (Frugal Foodie: <= ₱1000 spend) ---
      } else if (qType === "category" || qType === "total_spend_limit") {
        const totalSpent = activeExpenses
          .filter((e) => e.category === qCategory)
          .reduce((sum, e) => sum + Number(e.amount), 0);
        newProgress = totalSpent;

        // --- EVALUATION PATH 5: Savings Goal (Budget remaining - spend) ---
      } else if (qType === "savings_goal") {
        if (isDaily) {
          const totalSpent = todayExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
          newProgress = Math.max(0, dailyBudget - totalSpent);
        } else {
          const elapsedDays = activeDates.length;
          const totalSpent = weekExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
          newProgress = Math.max(0, (dailyBudget * elapsedDays) - totalSpent);
        }
      }

      // --- COMPLETION AUDIT (Immediate vs. Midnight Audit) ---
      let isCompleted = false;
      if (qType === "streak") {
        // Streak milestones are awarded at midnight — preserve the stored completed state.
        // If the streak was just broken (progress reset to 0), clear the completed flag too.
        isCompleted = newProgress > 0 ? (quest.completed || false) : false;
      } else if (qType === "category" || qType === "total_spend_limit") {
        // Spend limits can only be completed when the week ends without overspending (audited at reset)
        isCompleted = false;
      } else if (isDaily) {
        // Daily quests are completed only after midnight passes to avoid cheating (audited at reset)
        isCompleted = false;
      } else {
        // Standard savings quests complete instantly once threshold is reached
        isCompleted = newProgress >= qTarget;
      }

      // Only write to database if the local calculated state differs from current Firestore values
      if (newProgress !== quest.progress || isCompleted !== quest.completed) {
        await updateDoc(doc(db, "quests", quest.id), {
          progress: newProgress,
          completed: isCompleted,
        });
        if (qType === "streak") {
          await updateDoc(doc(db, "users", currentUser.uid), {
            currentStreak: newProgress,
          });
        }
      }
    }
  }

  /** 
   * UTILITY: syncQuestsWithTemplates
   * Purpose: Syncs existing active user quests if the admin changes structural properties of templates.
   */
  async function syncQuestsWithTemplates(questData) {
    if (!templates.length) return;
    for (const quest of questData) {
      const template = templates.find((t) => t.title === quest.title);
      if (template) {
        const updates = {};
        const expectedPeriod = template.period || "weekly";
        const expectedTarget = Number(template.target || 0);
        const expectedPoints = Number(template.pointsReward || 0);
        const expectedCategory = template.category || null;
        const expectedDesc = template.description || "";
        const expectedIcon = template.icon || "";
        const expectedQuestType = template.questType;

        if (quest.period !== expectedPeriod) updates.period = expectedPeriod;
        if (Number(quest.target) !== expectedTarget) updates.target = expectedTarget;
        if (Number(quest.pointsReward) !== expectedPoints) updates.pointsReward = expectedPoints;
        if (quest.category !== expectedCategory) updates.category = expectedCategory;
        if (quest.description !== expectedDesc) updates.description = expectedDesc;
        if (quest.icon !== expectedIcon) updates.icon = expectedIcon;
        if (quest.questType !== expectedQuestType) {
          updates.questType = expectedQuestType;
        }

        if (Object.keys(updates).length > 0) {
          await updateDoc(doc(db, "quests", quest.id), updates);
        }
      }
    }
  }

  /** 
   * CORE RESET ENGINE: checkAndResetQuests
   * Purpose: Periodically audited on load. If the system time is past the target period boundary:
   *  1. Evaluates success/failure of the quest.
   *  2. If successful, increments 'timesCompleted', logs date into 'completionHistory', and awards points to the user document.
   *  3. Resets quest progress back to 0 and updates the rollover dates ('lastResetDate' or 'weekStart').
   */
  async function checkAndResetQuests(questData, expenseData) {
    const currentWeek = getCurrentWeekStart();
    const todayStr = getPHDateString();
    const dailyBudget = userProfile?.dailyBudget || 300;

    for (const quest of questData) {
      const isDaily = quest.period === "daily";
      const qType = quest.questType;
      const qTarget = Number(quest.target || 0);

      // --- STREAK QUESTS: Persistent cross-week streak ---
      // Streaks are NOT reset weekly. They persist until a day is failed.
      // At midnight, each completed past day is audited and added to the streak counter.
      // Points are awarded at every `target`-day milestone (e.g. every 7 days).
      if (qType === "streak") {
        const lastReset = quest.lastResetDate || getPHDateString(new Date(Date.now() - 86400000));
        if (lastReset < todayStr) {
          let currentStreak = quest.progress || 0;
          let milestonesHit = 0;

          // Audit every day from lastReset up to (but not including) today
          let auditDate = new Date(lastReset + "T00:00:00");
          while (getPHDateString(auditDate) < todayStr) {
            const dateStr = getPHDateString(auditDate);
            const dayTotal = (expenseData || [])
              .filter((e) => e.date === dateStr)
              .reduce((sum, e) => sum + Number(e.amount), 0);

            if (dayTotal <= dailyBudget) {
              currentStreak++;
              // Check milestone: award points every `target` consecutive days
              if (qTarget > 0 && currentStreak % qTarget === 0) {
                milestonesHit++;
              }
            } else {
              currentStreak = 0; // Day failed — reset the consecutive counter
            }
            auditDate.setDate(auditDate.getDate() + 1);
          }

          // Award cumulative points for all milestones hit during the audit window
          if (milestonesHit > 0) {
            await updateDoc(doc(db, "users", currentUser.uid), {
              totalPoints: increment(quest.pointsReward * milestonesHit),
              currentStreak: currentStreak,
            });
          } else {
            await updateDoc(doc(db, "users", currentUser.uid), {
              currentStreak: currentStreak,
            });
          }

          await updateDoc(doc(db, "quests", quest.id), {
            lastResetDate: todayStr,
            progress: currentStreak,
            completed: milestonesHit > 0,
          });
        }
        continue; // Skip the daily/weekly reset branches for streak quests
      }

      // --- Rollover Branch A: DAILY QUESTS ---
      if (isDaily) {
        const lastReset = quest.lastResetDate || getPHDateString(new Date(Date.now() - 86400000));

        // If lastResetDate is in the past (midnight has passed since last check)
        if (lastReset < todayStr) {
          const updatePayload = {
            lastResetDate: todayStr,
            progress: 0,
            completed: false,
          };

          // Audit success criteria at midnight
          let wasSuccessful = false;
          if (qType === "category" || qType === "total_spend_limit") {
            if (quest.progress <= qTarget) wasSuccessful = true;
          } else {
            if (quest.progress >= qTarget) wasSuccessful = true;
          }

          // If successful, log the event and credit points to the user profile
          if (wasSuccessful) {
            updatePayload.timesCompleted = (quest.timesCompleted || 0) + 1;
            updatePayload.completionHistory = arrayUnion({
              date: lastReset,
              completedAt: todayStr,
            });
            await updateDoc(doc(db, "users", currentUser.uid), {
              totalPoints: increment(quest.pointsReward),
            });
          }

          await updateDoc(doc(db, "quests", quest.id), updatePayload);
        }

        // --- Rollover Branch B: WEEKLY QUESTS ---
      } else {
        // If weekStart is in the past (Sunday has passed since last check)
        if (quest.weekStart && quest.weekStart < currentWeek) {
          const updatePayload = {
            weekStart: currentWeek,
            progress: 0,
            completed: false,
          };

          let wasSuccessful = quest.completed;
          if (qType === "category" || qType === "total_spend_limit") {
            if (quest.progress <= qTarget) wasSuccessful = true;
          } else {
            if (quest.progress >= qTarget) wasSuccessful = true;
          }

          // If successful, log the event and credit points to the user profile
          if (wasSuccessful) {
            updatePayload.timesCompleted = (quest.timesCompleted || 0) + 1;
            updatePayload.completionHistory = arrayUnion({
              weekStart: quest.weekStart,
              completedAt: getPHDateString(),
            });
            await updateDoc(doc(db, "users", currentUser.uid), {
              totalPoints: increment(quest.pointsReward),
            });
          }

          await updateDoc(doc(db, "quests", quest.id), updatePayload);
        }
      }
    }
  }

  /** 
   * INITIALIZER: initializeQuests
   * Purpose: Seeds active quest documents for newly registered users.
   */
  async function initializeQuests() {
    if (!currentUser || initializing || templates.length === 0) return;
    setInitializing(true);
    try {
      const weekStartStr = getCurrentWeekStart();
      const todayStr = getPHDateString();

      // Write template instances directly to '/quests' collection owned by the user's UID
      for (const template of templates) {
        await addDoc(collection(db, "quests"), {
          questType: template.questType,
          period: template.period || "weekly",
          title: template.title,
          description: template.description,
          target: Number(template.target),
          pointsReward: Number(template.pointsReward),
          icon: template.icon,
          category: template.category || null,
          uid: currentUser.uid,
          progress: 0,
          completed: false,
          weekStart: weekStartStr,
          lastResetDate: todayStr,
          timesCompleted: 0,
          completionHistory: [],
          createdAt: serverTimestamp(),
        });
      }
    } finally {
      setInitializing(false);
    }
  }

  // Admin utility for updating quest progress directly (mainly used for tests/mock triggers)
  async function updateQuestProgress(questId, progress, completed = false) {
    await updateDoc(doc(db, "quests", questId), { progress, completed });
  }

  return (
    <QuestContext.Provider
      value={{ quests, templates, loading, initializing, QUEST_TEMPLATES, initializeQuests, updateQuestProgress }}
    >
      {children}
    </QuestContext.Provider>
  );
}

// useQuests Hook: Consumer hook
export function useQuests() {
  return useContext(QuestContext);
}
