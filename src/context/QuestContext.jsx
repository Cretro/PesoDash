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
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);
  const { currentUser, userProfile } = useAuth();
  const { expenses } = useExpenses();

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
        // Check if any quests need a weekly reset
        checkAndResetQuests(data);
      }
    });
    return unsub;
  }, [currentUser]);

  /** Auto-track quest progress whenever expenses or quests change */
  useEffect(() => {
    if (!quests.length || !expenses.length) return;
    syncQuestProgress(quests, expenses);
  }, [expenses, quests.map((q) => q.id).join(",")]);

  /** Calculates the correct progress for each active quest and writes it to Firestore */
  async function syncQuestProgress(questData, expenseData) {
    const weekStart = getCurrentWeekStart();
    const weekDates = getCurrentWeekDates();
    const dailyBudget = userProfile?.dailyBudget || 300;

    // Only expenses logged this week
    const weekExpenses = expenseData.filter((e) => weekDates.includes(e.date));

    for (const quest of questData) {
      if (quest.completed) continue; // Don't touch already-completed quests

      let newProgress = 0;

      if (quest.questType === "category") {
        // Sum all Food expenses this week
        newProgress = weekExpenses
          .filter((e) => e.category === quest.category)
          .reduce((sum, e) => sum + Number(e.amount), 0);

        // Cap at target (overspending still means quest is failed, not super-complete)
        newProgress = Math.min(newProgress, quest.target);

      } else if (quest.questType === "streak") {
        // Count consecutive days from Sunday up to TODAY where daily total <= dailyBudget
        const todayStr = getPHDateString();
        const pastAndTodayDates = weekDates.filter((d) => d <= todayStr);
        let streak = 0;
        for (const date of pastAndTodayDates) {
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

      } else if (quest.questType === "zero_splurge") {
        // A day qualifies only if it has at least 1 expense AND none are in "Others"
        const todayStr = getPHDateString();
        const pastAndTodayDates = weekDates.filter((d) => d <= todayStr);
        const hadZeroDay = pastAndTodayDates.some((date) => {
          const dayExpenses = weekExpenses.filter((e) => e.date === date);
          if (dayExpenses.length === 0) return false; // Unlogged days don't count
          const othersTotal = dayExpenses
            .filter((e) => e.category === "Others")
            .reduce((sum, e) => sum + Number(e.amount), 0);
          return othersTotal === 0;
        });
        newProgress = hadZeroDay ? 1 : 0;
      }

      const isCompleted = newProgress >= quest.target;

      // Only write to Firestore if something actually changed
      if (newProgress !== quest.progress || isCompleted !== quest.completed) {
        await updateDoc(doc(db, "quests", quest.id), {
          progress: newProgress,
          completed: isCompleted,
        });
      }
    }
  }

  /** Resets quests that belong to a previous week, preserving completion history */
  async function checkAndResetQuests(questData) {
    const currentWeek = getCurrentWeekStart();

    for (const quest of questData) {
      const updatePayload = {};

      // If this quest's week is in the past, it needs a reset
      if (quest.weekStart && quest.weekStart < currentWeek) {
        updatePayload.weekStart = currentWeek;
        updatePayload.progress = 0;
        updatePayload.completed = false;

        // Only record history entry if it was actually completed last week
        if (quest.completed) {
          updatePayload.timesCompleted = (quest.timesCompleted || 0) + 1;
          updatePayload.completionHistory = arrayUnion({
            weekStart: quest.weekStart,
            completedAt: getPHDateString(),
          });
        }
      }

      // Only write to Firestore if there's something to update
      if (Object.keys(updatePayload).length > 0) {
        await updateDoc(doc(db, "quests", quest.id), updatePayload);
      }
    }
  }

  async function initializeQuests() {
    if (!currentUser || initializing) return;
    setInitializing(true);
    try {
      const weekStartStr = getCurrentWeekStart();

      for (const template of QUEST_TEMPLATES) {
        await addDoc(collection(db, "quests"), {
          ...template,
          uid: currentUser.uid,
          progress: 0,
          completed: false,
          weekStart: weekStartStr,
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
      value={{ quests, loading, initializing, QUEST_TEMPLATES, initializeQuests, updateQuestProgress }}
    >
      {children}
    </QuestContext.Provider>
  );
}

export function useQuests() {
  return useContext(QuestContext);
}
