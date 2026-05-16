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
    description: "Spend ≤ ₱200 on Food this week",
    target: 200,
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
      
      // Auto-initialize if empty and not just registered
      if (snap.empty && !initializing) {
        initializeQuests();
      }
    });
    return unsub;
  }, [currentUser]);

  async function initializeQuests() {
    if (!currentUser || initializing) return;
    setInitializing(true);
    try {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekStartStr = weekStart.toISOString().split("T")[0];

      for (const template of QUEST_TEMPLATES) {
        await addDoc(collection(db, "quests"), {
          ...template,
          uid: currentUser.uid,
          progress: 0,
          completed: false,
          weekStart: weekStartStr,
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
