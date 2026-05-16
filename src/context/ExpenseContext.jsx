import { createContext, useContext, useEffect, useReducer } from "react";
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

const ExpenseContext = createContext(null);

const initialState = { expenses: [], loading: true };

function reducer(state, action) {
  switch (action.type) {
    case "SET_EXPENSES":
      return { ...state, expenses: action.payload, loading: false };
    default:
      return state;
  }
}

export function ExpenseProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, "expenses"),
      where("uid", "==", currentUser.uid),
      orderBy("date", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      dispatch({ type: "SET_EXPENSES", payload: data });
    });
    return unsub;
  }, [currentUser]);

  async function addExpense(data) {
    await addDoc(collection(db, "expenses"), {
      ...data,
      uid: currentUser.uid,
      createdAt: serverTimestamp(),
    });
  }

  async function updateExpense(id, data) {
    await updateDoc(doc(db, "expenses", id), data);
  }

  async function deleteExpense(id) {
    await deleteDoc(doc(db, "expenses", id));
  }

  return (
    <ExpenseContext.Provider
      value={{ ...state, addExpense, updateExpense, deleteExpense }}
    >
      {children}
    </ExpenseContext.Provider>
  );
}

export function useExpenses() {
  return useContext(ExpenseContext);
}
