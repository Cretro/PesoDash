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

export function QuestProvider({ children }) {
  const [quests, setQuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);
  const { currentUser } = useAuth();

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

  /** Resets quests that belong to a previous week, preserving completion history */
  async function checkAndResetQuests(questData) {
    const currentWeek = getCurrentWeekStart();

    for (const quest of questData) {
      const updatePayload = {};

      // One-time migration: fix stale Frugal Foodie target from ₱200 → ₱1,000
      if (quest.questType === "category" && quest.target === 200) {
        updatePayload.target = 1000;
        updatePayload.description = "Spend ≤ ₱1,000 on Food this week";
      }

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
