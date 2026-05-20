import { createContext, useContext, useEffect, useState } from "react";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  getDoc,
  getDocs,
  increment,
  arrayRemove
} from "firebase/firestore";
import { db } from "../firebase/firebase";
import { useAuth } from "./AuthContext";

// ExpenseContext: Stores user-specific expense logs and handles DB writes/reads.
const ExpenseContext = createContext(null);

export function ExpenseProvider({ children }) {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();

  // Effect: Attaches a real-time listener to the '/expenses' collection in Firestore.
  // Filters documents by matching 'uid == currentUser.uid' so users only see their own data.
  // Orders records in descending order by date so newest purchases show up first.
  useEffect(() => {
    if (!currentUser) {
      setExpenses([]);
      setLoading(true);
      return;
    }
    
    const q = query(
      collection(db, "expenses"),
      where("uid", "==", currentUser.uid),
      orderBy("date", "desc")
    );
    
    // onSnapshot: Fires a callback immediately with the current collection state,
    // and then fires again anytime an expense is added, edited, or deleted.
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setExpenses(data);
      setLoading(false);
    }, (err) => {
      console.error("ExpenseContext onSnapshot failed:", err);
    });
    
    return unsub; // Clean up subscription on logout or unmount
  }, [currentUser]);

  // CREATE: Saves a new expense record to Firestore.
  // Automatically attaches the current user's UID and a server-side timestamp.
  async function addExpense(data) {
    await addDoc(collection(db, "expenses"), {
      ...data,
      uid: currentUser.uid,
      createdAt: serverTimestamp(),
    });
  }

  // UPDATE: Edits properties (amount, category, note, date) of an existing expense document.
  async function updateExpense(id, data) {
    const expRef = doc(db, "expenses", id);
    const snap = await getDoc(expRef);
    const oldData = snap.exists() ? snap.data() : null;
    
    await updateDoc(expRef, data);
    
    // Audit for potential cheating (e.g. changing past expense amount)
    if (oldData) {
      await auditExpenseCheatLoophole(oldData);
      if (oldData.date !== data.date) {
        await auditExpenseCheatLoophole(data);
      }
    }
  }

  // DELETE: Permanently removes an expense document from the database.
  async function deleteExpense(id) {
    const expRef = doc(db, "expenses", id);
    const snap = await getDoc(expRef);
    const oldData = snap.exists() ? snap.data() : null;

    await deleteDoc(expRef);

    // Audit for potential cheating (e.g. deleting past expense to bypass limits)
    if (oldData) {
      await auditExpenseCheatLoophole(oldData);
    }
  }

  // --- ANTI-CHEAT AUDIT ---
  // Recalculates validity of past daily quests if a user deletes/edits historical expenses
  async function auditExpenseCheatLoophole(expenseData) {
    // 1. Check if the expense is from a past date. Today's quests haven't awarded points yet, so no need to audit.
    const ph = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }));
    const y = ph.getFullYear();
    const m = String(ph.getMonth() + 1).padStart(2, "0");
    const d = String(ph.getDate()).padStart(2, "0");
    const todayStr = `${y}-${m}-${d}`;
    
    if (expenseData.date >= todayStr) return;

    // 2. Fetch all user quests
    const qSnap = await getDocs(query(collection(db, "quests"), where("uid", "==", currentUser.uid)));
    const quests = qSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // 3. Fetch all remaining expenses for that specific past date
    const expSnap = await getDocs(query(collection(db, "expenses"), where("uid", "==", currentUser.uid), where("date", "==", expenseData.date)));
    const dayExpenses = expSnap.docs.map(d => d.data());
    const dayTotal = dayExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

    // 4. Fetch user's daily budget
    const userRef = doc(db, "users", currentUser.uid);
    const userSnap = await getDoc(userRef);
    const dailyBudget = userSnap.data()?.dailyBudget || 300;

    let pointsToDeduct = 0;

    // 5. Evaluate if the past date was in the completion history of any daily quest
    for (const quest of quests) {
      const qType = quest.questType;
      if (quest.period === "daily") {
        const historyEntry = quest.completionHistory?.find(h => h.date === expenseData.date);
        if (historyEntry) {
          let stillValid = false;

          // Re-run success logic based on the updated expenses list
          if (qType === "streak") {
            stillValid = dayTotal <= dailyBudget;
          } else if (qType === "total_spend_limit" || qType === "category") {
            const catTotal = dayExpenses.filter(e => e.category === quest.category).reduce((sum, e) => sum + Number(e.amount), 0);
            stillValid = catTotal <= Number(quest.target);
          } else if (qType === "zero_splurge_days" || qType === "zero_splurge") {
            const catTotal = dayExpenses.filter(e => e.category === (quest.category || "Others")).reduce((sum, e) => sum + Number(e.amount), 0);
            stillValid = (dayExpenses.length > 0 && catTotal === 0);
          } else if (qType === "savings_goal") {
            const saved = Math.max(0, dailyBudget - dayTotal);
            stillValid = saved >= Number(quest.target);
          }

          if (!stillValid) {
            pointsToDeduct += quest.pointsReward;
            await updateDoc(doc(db, "quests", quest.id), {
              timesCompleted: increment(-1),
              completionHistory: arrayRemove(historyEntry)
            });
          }
        }
      }
    }

    // 6. Safely deduct farmed points
    if (pointsToDeduct > 0) {
      await updateDoc(userRef, {
        totalPoints: increment(-pointsToDeduct)
      });
      console.warn(`[Anti-Cheat] Deducted ${pointsToDeduct} points for invalidated past quest.`);
    }
  }

  return (
    <ExpenseContext.Provider
      value={{ expenses, loading, addExpense, updateExpense, deleteExpense }}
    >
      {children}
    </ExpenseContext.Provider>
  );
}

// useExpenses Hook: Clean shortcut to consume the expense logs in UI components.
export function useExpenses() {
  return useContext(ExpenseContext);
}
