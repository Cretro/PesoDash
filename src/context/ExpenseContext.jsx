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
    if (!currentUser) return;
    
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
    await updateDoc(doc(db, "expenses", id), data);
  }

  // DELETE: Permanently removes an expense document from the database.
  async function deleteExpense(id) {
    await deleteDoc(doc(db, "expenses", id));
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
