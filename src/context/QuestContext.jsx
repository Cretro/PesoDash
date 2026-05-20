import { createContext, useContext, useEffect, useState } from "react";
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
} from "firebase/firestore";
import { db } from "../firebase/firebase";
import { useAuth } from "./AuthContext";
import { useExpenses } from "./ExpenseContext";

const QuestContext = createContext(null);

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

/** Returns a "YYYY-MM-DD" string for the current date in Philippine Time */
function getPHDateString(date = new Date()) {
  const ph = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Manila" }));
  const y = ph.getFullYear();
  const m = String(ph.getMonth() + 1).padStart(2, "0");
  const d = String(ph.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Returns the current week's Sunday as a "YYYY-MM-DD" string in Philippine Time */
function getCurrentWeekStart() {
  const ph = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }));
  ph.setDate(ph.getDate() - ph.getDay()); // Sunday = start of week
  return getPHDateString(ph);
}

/** Returns all dates in the current week (Sun–Sat) as "YYYY-MM-DD" strings in PH Time */
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
  const [templates, setTemplates] = useState(QUEST_TEMPLATES);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);
  const { currentUser, userProfile, isAdmin } = useAuth();
  const { expenses } = useExpenses();

  // Load and sync user quests from Firestore
  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, "quests"),
      where("uid", "==", currentUser.uid)
    );
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setQuests(data);
      setLoading(false);

      // Auto-initialize if empty
      if (snap.empty && !initializing) {
        initializeQuests();
      } else {
        // Sync active quests with template updates (like period shifting)
        syncQuestsWithTemplates(data);
        // Check if any quests need a weekly reset
        checkAndResetQuests(data);
      }
    }, (err) => {
      console.error("QuestContext onSnapshot failed:", err);
    });
    return unsub;
  }, [currentUser]);

  /** Auto-track quest progress whenever expenses or quests change */
  useEffect(() => {
    if (!quests.length) return;
    syncQuestProgress(quests, expenses);
  }, [expenses, quests.map((q) => q.id).join(",")]);

  /** Calculates the correct progress for each active quest and writes it to Firestore */
  async function syncQuestProgress(questData, expenseData) {
    const weekStart = getCurrentWeekStart();
    const weekDates = getCurrentWeekDates();
    const dailyBudget = userProfile?.dailyBudget || 300;
    const todayStr = getPHDateString();

    // Only expenses logged this week
    const weekExpenses = expenseData.filter((e) => weekDates.includes(e.date));
    const todayExpenses = expenseData.filter((e) => e.date === todayStr);

    for (const quest of questData) {
      let newProgress = 0;
      const qType = quest.targetType || quest.questType || "streak";
      const qCategory = quest.category || null;
      const qTarget = Number(quest.target || 0);
      const isDaily = quest.period === "daily";

      // Only evaluate dates up to today for progress tracking
      const activeDates = isDaily ? [todayStr] : weekDates.filter((d) => d <= todayStr);
      const activeExpenses = isDaily ? todayExpenses : weekExpenses;

      if (qType === "streak" || qType === "streak_under_budget") {
        if (isDaily) {
          // Stay under budget today
          const todayTotal = todayExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
          newProgress = todayTotal <= dailyBudget ? 1 : 0;
        } else {
          // Count consecutive days from Sunday up to TODAY where daily total <= dailyBudget
          let streak = 0;
          for (const date of activeDates) {
            const dayTotal = weekExpenses
              .filter((e) => e.date === date)
              .reduce((sum, e) => sum + Number(e.amount), 0);
            if (dayTotal <= dailyBudget) {
              streak++;
            } else {
              break; // Streak is broken
            }
          }
          newProgress = streak;
        }

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

      } else if (qType === "zero_splurge_days" || qType === "zero_splurge") {
        if (isDaily) {
          // Daily zero splurge: 1 if they spent ₱0 on target category today; 0 if they spent > 0
          const catSpend = todayExpenses
            .filter((e) => e.category === (qCategory || "Others"))
            .reduce((sum, e) => sum + Number(e.amount), 0);
          newProgress = catSpend === 0 ? 1 : 0;
        } else {
          // Weekly zero splurge: count days with logged activity and ₱0 in target category
          let zeroDays = 0;
          for (const date of activeDates) {
            const dayExpenses = activeExpenses.filter((e) => e.date === date);
            if (dayExpenses.length === 0) continue;
            const catSpend = dayExpenses
              .filter((e) => e.category === (qCategory || "Others"))
              .reduce((sum, e) => sum + Number(e.amount), 0);
            if (catSpend === 0) {
              zeroDays++;
            }
          }
          newProgress = quest.questType === "zero_splurge" ? (zeroDays > 0 ? 1 : 0) : zeroDays;
        }

      } else if (qType === "category" || qType === "total_spend_limit") {
        // Sum spending in category
        const totalSpent = activeExpenses
          .filter((e) => e.category === qCategory)
          .reduce((sum, e) => sum + Number(e.amount), 0);
        newProgress = totalSpent;

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

      // Check completion status
      let isCompleted = false;
      if (qType === "category" || qType === "total_spend_limit") {
        // Evaluated only at reset
        isCompleted = false;
      } else if (isDaily) {
        // Daily quests are only finalized at midnight, so they cannot be completed during the day
        isCompleted = false;
      } else {
        isCompleted = newProgress >= qTarget;
      }

      // Only write to Firestore if something actually changed
      if (newProgress !== quest.progress || isCompleted !== quest.completed) {
        await updateDoc(doc(db, "quests", quest.id), {
          progress: newProgress,
          completed: isCompleted,
        });
      }
    }
  }

  /** Syncs user's active quests with current admin template fields (for example, if period changed from weekly to daily) */
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
        const expectedQuestType = template.questType || template.targetType || "streak";

        if (quest.period !== expectedPeriod) updates.period = expectedPeriod;
        if (Number(quest.target) !== expectedTarget) updates.target = expectedTarget;
        if (Number(quest.pointsReward) !== expectedPoints) updates.pointsReward = expectedPoints;
        if (quest.category !== expectedCategory) updates.category = expectedCategory;
        if (quest.description !== expectedDesc) updates.description = expectedDesc;
        if (quest.icon !== expectedIcon) updates.icon = expectedIcon;
        if (quest.questType !== expectedQuestType) {
          updates.questType = expectedQuestType;
          updates.targetType = expectedQuestType;
        }

        if (Object.keys(updates).length > 0) {
          await updateDoc(doc(db, "quests", quest.id), updates);
        }
      }
    }
  }

  /** Resets quests that belong to a previous week or day, checking total limit successes */
  async function checkAndResetQuests(questData) {
    const currentWeek = getCurrentWeekStart();
    const todayStr = getPHDateString();

    for (const quest of questData) {
      const isDaily = quest.period === "daily";

      if (isDaily) {
        // Daily quest reset: if lastResetDate is in the past (before today)
        const lastReset = quest.lastResetDate || getPHDateString(new Date(Date.now() - 86400000));
        if (lastReset < todayStr) {
          const updatePayload = {
            lastResetDate: todayStr,
            progress: 0,
            completed: false,
          };

          const qType = quest.targetType || quest.questType || "streak";
          const qTarget = Number(quest.target || 0);

          // Audit success at the end of the day
          let wasSuccessful = false;
          if (qType === "category" || qType === "total_spend_limit") {
            if (quest.progress <= qTarget) {
              wasSuccessful = true;
            }
          } else {
            if (quest.progress >= qTarget) {
              wasSuccessful = true;
            }
          }

          if (wasSuccessful) {
            updatePayload.timesCompleted = (quest.timesCompleted || 0) + 1;
            updatePayload.completionHistory = arrayUnion({
              date: lastReset,
              completedAt: todayStr,
            });
            // Award the points when successfully finishing the daily period
            await updateDoc(doc(db, "users", currentUser.uid), {
              totalPoints: increment(quest.pointsReward),
            });
          }

          await updateDoc(doc(db, "quests", quest.id), updatePayload);
        }
      } else {
        // Weekly quest reset
        if (quest.weekStart && quest.weekStart < currentWeek) {
          const updatePayload = {
            weekStart: currentWeek,
            progress: 0,
            completed: false,
          };

          const qType = quest.targetType || quest.questType || "streak";
          const qTarget = Number(quest.target || 0);

          let wasSuccessful = quest.completed;
          if (qType === "category" || qType === "total_spend_limit") {
            if (quest.progress <= qTarget) {
              wasSuccessful = true;
            }
          } else {
            if (quest.progress >= qTarget) {
              wasSuccessful = true;
            }
          }

          if (wasSuccessful) {
            updatePayload.timesCompleted = (quest.timesCompleted || 0) + 1;
            updatePayload.completionHistory = arrayUnion({
              weekStart: quest.weekStart,
              completedAt: getPHDateString(),
            });
            // Award the points when successfully finishing the weekly period
            await updateDoc(doc(db, "users", currentUser.uid), {
              totalPoints: increment(quest.pointsReward),
            });
          }

          await updateDoc(doc(db, "quests", quest.id), updatePayload);
        }
      }
    }
  }

  async function initializeQuests() {
    if (!currentUser || initializing || templates.length === 0) return;
    setInitializing(true);
    try {
      const weekStartStr = getCurrentWeekStart();
      const todayStr = getPHDateString();

      for (const template of templates) {
        await addDoc(collection(db, "quests"), {
          questType: template.questType || template.targetType || "streak",
          targetType: template.targetType || template.questType || "streak",
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
