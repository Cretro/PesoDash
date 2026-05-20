import { createContext, useContext, useEffect, useState } from "react";
import {
  collection, doc, setDoc, updateDoc, onSnapshot,
  query, where, getDocs, serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase/firebase";
import { useAuth } from "./AuthContext";

// ==========================================
// FRIEND CONTEXT SETUP
// ==========================================
// FriendContext manages social interactions in PesoDash (sending requests, accepting, declining, listing friends).
// It utilizes a bi-directional subcollection pattern:
// - Each friendship request exists in two subcollections:
//   - /users/{userA}/friends/{userB}
//   - /users/{userB}/friends/{userA}
// This keeps database queries fast and scoped, allowing users to see their friends list in real-time.
const FriendContext = createContext(null);

export function FriendProvider({ children }) {
  // friends: Stores raw documents retrieved from the current user's friends subcollection
  const [friends, setFriends] = useState([]);

  // loading: Indicates whether the initial Firestore onSnapshot subscription is still querying
  const [loading, setLoading] = useState(true);

  // currentUser: Session user utilized to dynamically build subcollection queries
  const { currentUser } = useAuth();

  /**
   * REAL-TIME FRIEND RELATIONSHIPS SYNC LISTENER
   * Listens to the current user's friends subcollection in real-time.
   */
  useEffect(() => {
    if (!currentUser) {
      setFriends([]);
      setLoading(true);
      return;
    }
    // Bind snapshot query to `/users/{uid}/friends`
    const q = collection(db, "users", currentUser.uid, "friends");
    const unsub = onSnapshot(q, (snap) => {
      setFriends(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => {
      // Diagnostic fallback: ensures UI spinner is unblocked even if database rules block access
      console.error("FriendContext onSnapshot failed:", err);
      setLoading(false);
    });
    return unsub;
  }, [currentUser]);

  /** 
   * findUserByEmail
   * Queries top-level user accounts to resolve an email address to a unique UID profile payload.
   */
  async function findUserByEmail(email) {
    const q = query(collection(db, "users"), where("email", "==", email.trim().toLowerCase()));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { uid: d.id, ...d.data() };
  }

  /** 
   * sendFriendRequest
   * Performs bi-directional writes to initiate a friendship:
   * 1. Outgoing Request Document: Created in the sender's subcollection.
   * 2. Incoming Request Document: Created in the receiver's subcollection.
   */
  async function sendFriendRequest(email) {
    if (!currentUser) throw new Error("Not logged in");
    const target = await findUserByEmail(email);
    if (!target) throw new Error("No user found with that email.");
    if (target.uid === currentUser.uid) throw new Error("You can't add yourself!");

    // Validate if the request already exists in current local relationship cache
    const existing = friends.find((f) => f.id === target.uid);
    if (existing) throw new Error(`Already ${existing.status === "accepted" ? "friends" : "request pending"}.`);

    const payload = {
      status: "pending",
      sentBy: currentUser.uid,
      createdAt: serverTimestamp(),
    };

    // Write outgoing item for the sender
    await setDoc(doc(db, "users", currentUser.uid, "friends", target.uid), {
      ...payload,
      friendUid: target.uid,
      friendName: target.displayName,
      friendEmail: target.email,
    });

    // Write incoming item for the recipient
    await setDoc(doc(db, "users", target.uid, "friends", currentUser.uid), {
      ...payload,
      friendUid: currentUser.uid,
      friendName: currentUser.displayName,
      friendEmail: currentUser.email,
    });
  }

  /** 
   * acceptRequest
   * Approves request. Overwrites 'status' to 'accepted' in BOTH user subcollections.
   */
  async function acceptRequest(friendUid) {
    await updateDoc(doc(db, "users", currentUser.uid, "friends", friendUid), { status: "accepted" });
    await updateDoc(doc(db, "users", friendUid, "friends", currentUser.uid), { status: "accepted" });
  }

  /** 
   * declineRequest
   * Rejects request or un-friends. Updates status to 'declined' in BOTH user documents.
   */
  async function declineRequest(friendUid) {
    await updateDoc(doc(db, "users", currentUser.uid, "friends", friendUid), { status: "declined" });
    await updateDoc(doc(db, "users", friendUid, "friends", currentUser.uid), { status: "declined" });
  }

  // Filter relationship objects into clean categories for presentation inside visual views
  const accepted  = friends.filter((f) => f.status === "accepted");
  const incoming  = friends.filter((f) => f.status === "pending" && f.sentBy !== currentUser?.uid);
  const pending   = friends.filter((f) => f.status === "pending" && f.sentBy === currentUser?.uid);

  return (
    <FriendContext.Provider value={{
      friends, loading,
      accepted, incoming, pending,
      pendingCount: incoming.length, // Exposed count used to render orange notification badges on navigators
      sendFriendRequest, acceptRequest, declineRequest,
    }}>
      {children}
    </FriendContext.Provider>
  );
}

// Hook shortcut
export function useFriends() {
  return useContext(FriendContext);
}
