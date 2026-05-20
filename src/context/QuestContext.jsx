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

// ==========================================
// QUEST CONTEXT SETUP
// ==========================================
// QuestContext acts as the core gaming and gamification engine of PesoDash.
// It is responsible for:
// 1. Loading active quests for the logged-in user in real-time.
// 2. Calculating quest completion progress whenever the user adds, edits, or deletes expenses.
// 3. Running midnight audit cycles to reset daily/weekly quests and award XP/Points.
// 4. Seeding default quests for brand new user registrations.
const QuestContext = createContext(null);

// QUEST_TEMPLATES: Hardcoded fallback quest configurations.
// These are loaded ONLY if the administrator has not defined any templates in Firestore
// or if the Firestore network fetch fails during app startup.
const QUEST_TEMPLATES = [
  {
    questType: "streak",
    title: "Budget Streak",
    description: "Stay within your daily budget for 7 days in a row",
    target: 7,
    pointsReward: 100,
    icon: "🔥",
    period: "persistent",
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
 * ANTI-CHEAT TIME RESOLVER (getTrueDate)
 * To prevent users from changing their phone/PC system clock to bypass budget cooldowns,
 * we query a world clock API on boot.
 * This function calculates the target offset and returns the secure network time.
 */
function getTrueDate() {
  const offset = window.__TIME_OFFSET__ || 0;
  return new Date(Date.now() + offset);
}

/** 
 * TIMEZONE NORMALIZER (getPHDateString)
 * Formats a Date object as a 'YYYY-MM-DD' string in Philippine Standard Time (PST).
 * This ensures that resets are aligned on a single timezone globally, avoiding bugs
 * where users crossing borders get premature quest resets.
 */
function getPHDateString(date = getTrueDate()) {
  const ph = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Manila" }));
  const y = ph.getFullYear();
  const m = String(ph.getMonth() + 1).padStart(2, "0");
  const d = String(ph.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** 
 * getCurrentWeekStart
 * Returns the YYYY-MM-DD representation of Sunday of the current week (Philippine Standard Time).
 * This helps weekly quest engines determine when the weekly budget loop started.
 */
function getCurrentWeekStart() {
  const ph = new Date(getTrueDate().toLocaleString("en-US", { timeZone: "Asia/Manila" }));
  ph.setDate(ph.getDate() - ph.getDay()); // Offset back to Sunday
  return getPHDateString(ph);
}

/**
 * getCurrentWeekDates
 * Generates an array of YYYY-MM-DD date strings for the current week (from Sunday to Saturday).
 * Helps search for all logged transactions within the current week.
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

/**
 * STREAK DETECTOR (calculatePastStreak)
 * Walk backward day-by-day starting from yesterday.
 * Evaluates expense totals on each past day against the daily budget.
 *
 * Excludes "today" since today is still active and budget could be broken before midnight.
 * Automatically stops walking backward if:
 * 1. The total spend on a past day exceeded the daily budget.
 * 2. We walk past the earliest date the user ever logged a transaction.
 */
function calculatePastStreak(expenseData, dailyBudget, todayStr) {
  if (!expenseData || expenseData.length === 0) return 0;

  // Find the boundary (earliest transaction date) so we don't loop infinitely
  const dates = expenseData.map((e) => e.date).filter(Boolean);
  if (dates.length === 0) return 0;
  const earliestDateStr = dates.reduce((min, d) => (d < min ? d : min), todayStr);

  let streak = 0;
  let currentDate = new Date(todayStr + "T00:00:00");

  // Start checking from yesterday
  currentDate.setDate(currentDate.getDate() - 1);

  while (true) {
    const dateStr = getPHDateString(currentDate);
    // Stop if we go before the user's first expense log
    if (dateStr < earliestDateStr) break;

    // Sum all transaction amounts for this specific date
    const dayTotal = expenseData
      .filter((e) => e.date === dateStr)
      .reduce((sum, e) => sum + Number(e.amount), 0);

    // If they stayed within budget, increment streak; otherwise break immediately
    if (dayTotal <= dailyBudget) {
      streak++;
    } else {
      break; 
    }

    currentDate.setDate(currentDate.getDate() - 1); // Move back another day
  }

  return streak;
}

export function QuestProvider({ children }) {
  const [quests, setQuests] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);
  const [timeSynced, setTimeSynced] = useState(false);

  // Consume Auth & Expense contexts to recalculate quest thresholds in real-time
  const { currentUser, userProfile, isAdmin } = useAuth();
  const { expenses } = useExpenses();

  // Refs to prevent infinite migration loops
  const templateMigrationDone = useRef(false);
  const questMigrationDone = useRef(false);

  // ==========================================
  // EFFECT 1: WORLD CLOCK API TIME SYNC
  // ==========================================
  // Runs once on startup. Fetches secure network time to verify system clocks.
  useEffect(() => {
    let isMounted = true;
    async function syncTime() {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000); // 2s timeout limit
        const res = await fetch("https://worldtimeapi.org/api/timezone/Asia/Manila", { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (res.ok) {
          const data = await res.json();
          const trueTime = new Date(data.utc_datetime).getTime();
          // Store time offset relative to local system clock
          window.__TIME_OFFSET__ = trueTime - Date.now();
        }
      } catch (err) {
        console.warn("[Anti-Cheat] Time sync failed, falling back to local clock.");
      }
      if (isMounted) setTimeSynced(true);
    }
    syncTime();
    return () => { isMounted = false; };
  }, []);

  // ==========================================
  // EFFECT 2: REAL-TIME TEMPLATES LISTENER
  // ==========================================
  // Subscribes to the '/questTemplates' collection in Firestore.
  // Updates the admin template cache. Includes auto-migration rules.
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "questTemplates"), (snap) => {
      if (!snap.empty) {
        // Run database migration to ensure legacy 'targetType' fields are renamed to 'questType'
        if (!templateMigrationDone.current) {
          templateMigrationDone.current = true;
          snap.docs.forEach(async (d) => {
            const data = d.data();
            const updates = {};
            if (data.hasOwnProperty("targetType")) {
              updates.questType = data.targetType || data.questType || "streak";
              updates.targetType = deleteField(); // Delete old field in DB
            }
            if (data.questType === "streak" && data.period !== "persistent") {
              updates.period = "persistent";
            }
            if (Object.keys(updates).length > 0) {
              await updateDoc(doc(db, "questTemplates", d.id), updates);
            }
          });
        }
        setTemplates(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } else {
        setTemplates(QUEST_TEMPLATES);
      }
    }, (err) => {
      console.error("QuestContext: Failed to load questTemplates, using defaults.", err);
      setTemplates(QUEST_TEMPLATES);
    });
    return unsub;
  }, []);

  // ==========================================
  // EFFECT 3: REAL-TIME ACTIVE QUESTS LISTENER
  // ==========================================
  // Subscribes to the '/quests' collection where 'uid == currentUser.uid'.
  // Automatically runs migration rules on fetched items.
  useEffect(() => {
    if (!currentUser || !timeSynced) {
      setQuests([]);
      setLoading(true);
      return;
    }
    const q = query(
      collection(db, "quests"),
      where("uid", "==", currentUser.uid)
    );
    const unsub = onSnapshot(q, (snap) => {
      // Run database migration on active user quests if legacy field formats are found
      if (!questMigrationDone.current) {
        questMigrationDone.current = true;
        snap.docs.forEach(async (d) => {
          const data = d.data();
          const updates = {};
          if (data.hasOwnProperty("targetType")) {
            updates.questType = data.targetType || data.questType || "streak";
            updates.targetType = deleteField();
          }
          if (data.questType === "streak" && data.period !== "persistent") {
            updates.period = "persistent";
          }
          if (Object.keys(updates).length > 0) {
            await updateDoc(doc(db, "quests", d.id), updates);
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
  }, [currentUser, timeSynced]);

  // ==========================================
  // EFFECT 4: AUTO-INITIALIZE QUESTS FOR NEW USERS
  // ==========================================
  // Seeds quest list from active templates if the user has no quest documents.
  useEffect(() => {
    if (loading || !currentUser || initializing) return;
    if (quests.length === 0) {
      initializeQuests();
    }
  }, [loading, quests.length, currentUser, initializing]);

  // ==========================================
  // EFFECT 5: RESET & AUDIT CONTROLLER
  // ==========================================
  // Runs anytime the app initializes, or when quests or expenses change.
  // Audits midnight date changes to reset quest values or award points.
  useEffect(() => {
    if (loading || !quests.length || !currentUser) return;
    syncQuestsWithTemplates(quests);
    checkAndResetQuests(quests, expenses);
  }, [loading, quests.map((q) => q.id).join(","), templates.length, expenses.length, currentUser]);

  // ==========================================
  // EFFECT 6: PROGRESS UPDATER
  // ==========================================
  // Recalculates user progress bars immediately when they add, edit, or delete expenses.
  useEffect(() => {
    if (loading || !quests.length || !currentUser) return;
    syncQuestProgress(quests, expenses);
  }, [expenses, quests.map((q) => q.id).join(","), loading, currentUser]);

  /** 
   * syncQuestProgress
   * Core logic representing the real-time gaming loops:
   * Maps current day/week expenses to all active user quests and writes progress updates to Firestore.
   */
  async function syncQuestProgress(questData, expenseData) {
    const weekDates = getCurrentWeekDates();
    const dailyBudget = userProfile?.dailyBudget || 300;
    const todayStr = getPHDateString();

    const weekExpenses = expenseData.filter((e) => weekDates.includes(e.date));
    const todayExpenses = expenseData.filter((e) => e.date === todayStr);

    for (const quest of questData) {
      let newProgress = 0;
      const qType = quest.questType;
      const qCategory = quest.category || null;
      const qTarget = Number(quest.target || 0);
      const isDaily = quest.period === "daily";

      const activeDates = isDaily ? [todayStr] : weekDates.filter((d) => d <= todayStr);
      const activeExpenses = isDaily ? todayExpenses : weekExpenses;

      // ----------------------------------------------------
      // PATH A: Budget Streak (Dynamic past streak + today status check)
      // ----------------------------------------------------
      if (qType === "streak") {
        const todayTotal = todayExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
        if (todayTotal > dailyBudget) {
          // Exceeded daily budget today: streak immediately drops to 0!
          newProgress = 0;
        } else {
          // Still on track today: count consecutive past days under budget starting from yesterday
          newProgress = calculatePastStreak(expenseData, dailyBudget, todayStr);
        }

      // ----------------------------------------------------
      // PATH B: Category Limit Target Days (Stay under target amount for X days in the week)
      // ----------------------------------------------------
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

      // ----------------------------------------------------
      // PATH C: Zero Splurge Days (Log ₱0 spent on specific categories)
      // ----------------------------------------------------
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
            if (dayExpenses.length === 0) continue; // User must log at least 1 item on that day to count it
            const catSpend = dayExpenses
              .filter((e) => e.category === (qCategory || "Others"))
              .reduce((sum, e) => sum + Number(e.amount), 0);
            if (catSpend === 0) {
              zeroDays++;
            }
          }
          newProgress = quest.questType === "zero_splurge" ? (zeroDays > 0 ? 1 : 0) : zeroDays;
        }

      // ----------------------------------------------------
      // PATH D: Total Category Spend Limits (Spend <= target amount total for the week)
      // ----------------------------------------------------
      } else if (qType === "category" || qType === "total_spend_limit") {
        const totalSpent = activeExpenses
          .filter((e) => e.category === qCategory)
          .reduce((sum, e) => sum + Number(e.amount), 0);
        newProgress = totalSpent;

      // ----------------------------------------------------
      // PATH E: Savings Goal (Remaining budget: (daily budget * elapsed days) - total spend)
      // ----------------------------------------------------
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

      // ----------------------------------------------------
      // COMPLETION EVALUATION (Immediate complete vs. Cooldown complete)
      // ----------------------------------------------------
      let isCompleted = false;
      if (qType === "streak") {
        // Streaks are audited at midnight. If they broke it today, clear completion; otherwise retain status.
        isCompleted = newProgress > 0 ? (quest.completed || false) : false;
      } else if (qType === "category" || qType === "total_spend_limit") {
        // Spend limits can only be confirmed once the week finishes without exceeding (cooldown reset).
        isCompleted = false;
      } else if (isDaily) {
        // Daily quests are only finalized at midnight to prevent users from editing values during active hours.
        isCompleted = false;
      } else {
        // Standard savings goals can be immediately marked completed once the threshold is crossed.
        isCompleted = newProgress >= qTarget;
      }

      // Prevent redundant DB transactions by checking if state actually changed
      if (newProgress !== quest.progress || isCompleted !== quest.completed) {
        await updateDoc(doc(db, "quests", quest.id), {
          progress: newProgress,
          completed: isCompleted,
        });
        if (qType === "streak") {
          // Keep User Document synchronized for Leaderboard and Dashboard displays
          await updateDoc(doc(db, "users", currentUser.uid), {
            currentStreak: newProgress,
          });
        }
      }
    }
  }

  /** 
   * syncQuestsWithTemplates
   * Syncs custom parameters (target limits, rewards, descriptions) if the administrator
   * edits the parent templates on the Admin Dashboard.
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
   * checkAndResetQuests (MIDNIGHT AUDIT ROUTINE)
   * This function checks if a day or week has rolled over since the last check.
   * If yes:
   * 1. Evaluates if success criteria were met during that interval.
   * 2. Adds points to the user document and writes to completion history.
   * 3. Resets progress counters and moves reset trackers to the active window.
   */
  async function checkAndResetQuests(questData, expenseData) {
    const currentWeek = getCurrentWeekStart();
    const todayStr = getPHDateString();
    const dailyBudget = userProfile?.dailyBudget || 300;

    for (const quest of questData) {
      const isDaily = quest.period === "daily";
      const qType = quest.questType;
      const qTarget = Number(quest.target || 0);

      // ====================================================
      // 1. STREAK ENGINE AUDIT
      // ====================================================
      // Evaluates past days since lastResetDate to increment streak.
      // Milestone rewards (e.g. points at 7 consecutive days) are evaluated and credited here.
      if (qType === "streak") {
        const lastReset = quest.lastResetDate || getPHDateString(new Date(Date.now() - 86400000));
        if (lastReset < todayStr) {
          let currentStreak = quest.progress || 0;
          let milestonesHit = 0;

          // Loop day-by-day from the last reset date up to yesterday
          let auditDate = new Date(lastReset + "T00:00:00");
          while (getPHDateString(auditDate) < todayStr) {
            const dateStr = getPHDateString(auditDate);
            const dayTotal = (expenseData || [])
              .filter((e) => e.date === dateStr)
              .reduce((sum, e) => sum + Number(e.amount), 0);

            if (dayTotal <= dailyBudget) {
              currentStreak++;
              // Earned milestone reward
              if (qTarget > 0 && currentStreak % qTarget === 0) {
                milestonesHit++;
              }
            } else {
              currentStreak = 0; // Streak broken
            }
            auditDate.setDate(auditDate.getDate() + 1);
          }

          // Credit points to user document for all hit milestones
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

          // Save audit snapshot
          await updateDoc(doc(db, "quests", quest.id), {
            lastResetDate: todayStr,
            progress: currentStreak,
            completed: milestonesHit > 0,
          });
        }
        continue; // Streaks do not use standard daily/weekly reset pathways below
      }

      // ====================================================
      // 2. DAILY QUEST AUDIT
      // ====================================================
      if (isDaily) {
        const lastReset = quest.lastResetDate || getPHDateString(new Date(Date.now() - 86400000));

        if (lastReset < todayStr) {
          const updatePayload = {
            lastResetDate: todayStr,
            progress: 0,
            completed: false,
          };

          // Re-evaluate target criteria before deleting progress
          let wasSuccessful = false;
          if (qType === "category" || qType === "total_spend_limit") {
            if (quest.progress <= qTarget) wasSuccessful = true;
          } else {
            if (quest.progress >= qTarget) wasSuccessful = true;
          }

          // Credit reward points
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

      // ====================================================
      // 3. WEEKLY QUEST AUDIT
      // ====================================================
      } else {
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

          // Credit reward points
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
   * initializeQuests (SEED SCRIPT)
   * Executed when a new user registers. Generates individual quest instances
   * matching active admin templates.
   */
  async function initializeQuests() {
    if (!currentUser || initializing || templates.length === 0) return;
    setInitializing(true);
    try {
      const weekStartStr = getCurrentWeekStart();
      const todayStr = getPHDateString();

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

  // Admin sandbox utility
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

export function useQuests() {
  return useContext(QuestContext);
}
