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

// ==========================================
// EXPENSE CONTEXT SETUP
// ==========================================
// ExpenseContext manages user-specific expense transactions.
// It subscribes to transactions in real-time, writes new entries to Firestore,
// and audits changes to prevent cheating (like editing past purchases to earn unearned points).
const ExpenseContext = createContext(null);

export function ExpenseProvider({ children }) {
  // expenses: Local state array storing all of the current user's transactions
  const [expenses, setExpenses] = useState([]);

  // loading: Indicates whether the initial collection snapshot query is still executing
  const [loading, setLoading] = useState(true);

  // currentUser: Extracted from AuthContext to dynamically bind Firestore queries to this session
  const { currentUser } = useAuth();

  /**
   * REAL-TIME EXPENSES SYNC LISTENER
   * Starts a snapshot listener on `/expenses` matching the current user's UID.
   * Orders transactions chronologically descending (newest on top).
   */
  useEffect(() => {
    // If there is no authenticated session, clear local lists and set loading state
    if (!currentUser) {
      setExpenses([]);
      setLoading(true);
      return;
    }
    
    // Construct Firestore query constraints
    const q = query(
      collection(db, "expenses"),
      where("uid", "==", currentUser.uid),
      orderBy("date", "desc")
    );
    
    // Subscribe to query matches
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setExpenses(data);
      setLoading(false);
    }, (err) => {
      console.error("ExpenseContext onSnapshot failed:", err);
    });
    
    // Cleanup callback executed on session logout or page change
    return unsub; 
  }, [currentUser]);

  /**
   * CREATE TRANSACTION
   * Saves a new purchase entry with category (e.g. Food), amount, date, and user details.
   */
  async function addExpense(data) {
    await addDoc(collection(db, "expenses"), {
      ...data,
      uid: currentUser.uid,
      // serverTimestamp stores Firestore clock time rather than client clock to prevent local clock spoofing
      createdAt: serverTimestamp(),
    });
  }

  /**
   * UPDATE TRANSACTION
   * Overwrites values in the database.
   * If a historical transaction is modified, we trigger a cheat audit.
   */
  async function updateExpense(id, data) {
    const expRef = doc(db, "expenses", id);
    const snap = await getDoc(expRef);
    const oldData = snap.exists() ? snap.data() : null;
    
    // Commit the update in Firestore
    await updateDoc(expRef, data);
    
    // Audit check: If they changed a past expense, we must check if it was cheating
    if (oldData) {
      await auditExpenseCheatLoophole(oldData);
      // If they changed the date, verify the new date target too
      if (oldData.date !== data.date) {
        await auditExpenseCheatLoophole(data);
      }
    }
  }

  /**
   * DELETE TRANSACTION
   * Removes transaction. Triggers audit to see if deleting a past purchase invalidates quest completion.
   */
  async function deleteExpense(id) {
    const expRef = doc(db, "expenses", id);
    const snap = await getDoc(expRef);
    const oldData = snap.exists() ? snap.data() : null;

    // Remove document from Firestore
    await deleteDoc(expRef);

    // Audit check: Did deleting this purchase retroactively make a failed past quest pass?
    // Actually, it check if a past quest that previously completed is still valid.
    // If a user deletes an expense, wait! Why would they points-cheat?
    // Ah, wait! If they edit a past transaction to be smaller or delete it, they might make a quest pass.
    // But what if they delete a transaction that was over-budget to try to farm points or restore a past streak?
    // Let's analyze the audit rules.
    if (oldData) {
      await auditExpenseCheatLoophole(oldData);
    }
  }

  /**
   * ANTI-CHEAT ENGINE (auditExpenseCheatLoophole)
   * Why is this needed?
   * If daily/weekly quests awarded points for yesterday because the user stayed under budget,
   * what happens if the user goes back and inserts/edits an expense for yesterday that puts them over budget?
   * Without this audit, they would keep the points while exceeding the budget.
   *
   * Steps:
   * 1. Ignore "today's" dates: active quests are evaluated live, points are only finalized at midnight.
   * 2. Scan all quests.
   * 3. Fetch all expenses logged on the modified past date.
   * 4. If a quest was completed on that date, re-verify compliance.
   * 5. If they violated constraints, subtract the points and remove the date from completion history.
   */
  async function auditExpenseCheatLoophole(expenseData) {
    // 1. Get current date in Manila timezone (Asia/Manila) utilizing secure offset
    const offset = window.__TIME_OFFSET__ || 0;
    const trueNow = new Date(Date.now() + offset);
    const ph = new Date(trueNow.toLocaleString("en-US", { timeZone: "Asia/Manila" }));
    const y = ph.getFullYear();
    const m = String(ph.getMonth() + 1).padStart(2, "0");
    const d = String(ph.getDate()).padStart(2, "0");
    const todayStr = `${y}-${m}-${d}`;
    
    // Ignore edits to today's purchases (since today's points haven't been awarded yet)
    if (expenseData.date >= todayStr) return;
 
    // 2. Load all active/historical quests for this user
    const qSnap = await getDocs(query(collection(db, "quests"), where("uid", "==", currentUser.uid)));
    const quests = qSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // 3. Fetch all expenses logged on the audited past date
    const expSnap = await getDocs(query(collection(db, "expenses"), where("uid", "==", currentUser.uid), where("date", "==", expenseData.date)));
    const dayExpenses = expSnap.docs.map(d => d.data());
    const dayTotal = dayExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

    // 4. Retrieve user's budget limit
    const userRef = doc(db, "users", currentUser.uid);
    const userSnap = await getDoc(userRef);
    const dailyBudget = userSnap.data()?.dailyBudget || 300;

    let pointsToDeduct = 0;

    // 5. Check all daily quests to see if they completed on the audited date
    for (const quest of quests) {
      const qType = quest.questType;
      if (quest.period === "daily") {
        const historyEntry = quest.completionHistory?.find(h => h.date === expenseData.date);
        if (historyEntry) {
          let stillValid = false;

          // Re-evaluate the logic for that specific day
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

          // If they are no longer eligible, strip points and log audit completion
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

    // 6. Deduct points if user cheated
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

// Custom hook to consume context provider states
export function useExpenses() {
  return useContext(ExpenseContext);
}
