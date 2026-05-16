import { createContext, useContext, useEffect, useReducer } from "react";
import {
  collection, doc, setDoc, updateDoc, onSnapshot,
  query, where, getDocs, serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase/firebase";
import { useAuth } from "./AuthContext";

const FriendContext = createContext(null);

function reducer(state, action) {
  switch (action.type) {
    case "SET": return { ...state, friends: action.payload, loading: false };
    default:    return state;
  }
}

export function FriendProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, { friends: [], loading: true });
  const { currentUser } = useAuth();

  // Real-time listener on the current user's friends subcollection
  useEffect(() => {
    if (!currentUser) return;
    const q = collection(db, "users", currentUser.uid, "friends");
    const unsub = onSnapshot(q, (snap) => {
      dispatch({ type: "SET", payload: snap.docs.map((d) => ({ id: d.id, ...d.data() })) });
    });
    return unsub;
  }, [currentUser]);

  /** Search for a user by email in the top-level users collection */
  async function findUserByEmail(email) {
    const q = query(collection(db, "users"), where("email", "==", email.trim().toLowerCase()));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { uid: d.id, ...d.data() };
  }

  /** Send a friend request. Creates a pending doc in both subcollections. */
  async function sendFriendRequest(email) {
    if (!currentUser) throw new Error("Not logged in");
    const target = await findUserByEmail(email);
    if (!target) throw new Error("No user found with that email.");
    if (target.uid === currentUser.uid) throw new Error("You can't add yourself!");

    // Check if already exists
    const existing = state.friends.find((f) => f.id === target.uid);
    if (existing) throw new Error(`Already ${existing.status === "accepted" ? "friends" : "request pending"}.`);

    const payload = {
      status: "pending",
      sentBy: currentUser.uid,
      createdAt: serverTimestamp(),
    };

    // Write to sender's subcollection
    await setDoc(doc(db, "users", currentUser.uid, "friends", target.uid), {
      ...payload,
      friendUid: target.uid,
      friendName: target.displayName,
      friendEmail: target.email,
    });

    // Write to receiver's subcollection (incoming request)
    await setDoc(doc(db, "users", target.uid, "friends", currentUser.uid), {
      ...payload,
      friendUid: currentUser.uid,
      friendName: currentUser.displayName,
      friendEmail: currentUser.email,
    });
  }

  /** Accept an incoming friend request */
  async function acceptRequest(friendUid) {
    await updateDoc(doc(db, "users", currentUser.uid, "friends", friendUid), { status: "accepted" });
    await updateDoc(doc(db, "users", friendUid, "friends", currentUser.uid), { status: "accepted" });
  }

  /** Decline / remove a friend */
  async function declineRequest(friendUid) {
    await updateDoc(doc(db, "users", currentUser.uid, "friends", friendUid), { status: "declined" });
    await updateDoc(doc(db, "users", friendUid, "friends", currentUser.uid), { status: "declined" });
  }

  const accepted  = state.friends.filter((f) => f.status === "accepted");
  const incoming  = state.friends.filter((f) => f.status === "pending" && f.sentBy !== currentUser?.uid);
  const pending   = state.friends.filter((f) => f.status === "pending" && f.sentBy === currentUser?.uid);

  return (
    <FriendContext.Provider value={{
      friends: state.friends, loading: state.loading,
      accepted, incoming, pending,
      pendingCount: incoming.length,
      sendFriendRequest, acceptRequest, declineRequest,
    }}>
      {children}
    </FriendContext.Provider>
  );
}

export function useFriends() {
  return useContext(FriendContext);
}
