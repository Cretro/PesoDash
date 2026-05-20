import { createContext, useContext, useEffect, useState } from "react";
import {
  collection, doc, setDoc, updateDoc, onSnapshot,
  query, where, getDocs, serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase/firebase";
import { useAuth } from "./AuthContext";

// FriendContext: Exports friend-tracking states and operations (sending, accepting, declining requests)
const FriendContext = createContext(null);

export function FriendProvider({ children }) {
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();

  // Real-time listener on the current user's friends subcollection:
  // Listens to: /users/{currentUser.uid}/friends/
  // Fires instantly on updates, adding new incoming or outgoing requests to state.
  useEffect(() => {
    if (!currentUser) return;
    const q = collection(db, "users", currentUser.uid, "friends");
    const unsub = onSnapshot(q, (snap) => {
      setFriends(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => {
      // Diagnostic handler: logs errors (like permission denied) and unblocks UI loading spinner
      console.error("FriendContext onSnapshot failed:", err);
      setLoading(false);
    });
    return unsub;
  }, [currentUser]);

  /** 
   * Search for a user by email in the top-level users collection.
   * Runs a Firestore query: where("email", "==", targetEmail)
   */
  async function findUserByEmail(email) {
    const q = query(collection(db, "users"), where("email", "==", email.trim().toLowerCase()));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { uid: d.id, ...d.data() };
  }

  /** 
   * Send a friend request.
   * To keep operations real-time and secure, a document is written to two locations:
   *  1. Sender's list: /users/{senderUid}/friends/{receiverUid} (status: "pending")
   *  2. Receiver's list: /users/{receiverUid}/friends/{senderUid} (status: "pending")
   */
  async function sendFriendRequest(email) {
    if (!currentUser) throw new Error("Not logged in");
    const target = await findUserByEmail(email);
    if (!target) throw new Error("No user found with that email.");
    if (target.uid === currentUser.uid) throw new Error("You can't add yourself!");

    // Check if a relationship (pending request or accepted friendship) already exists in local state
    const existing = friends.find((f) => f.id === target.uid);
    if (existing) throw new Error(`Already ${existing.status === "accepted" ? "friends" : "request pending"}.`);

    const payload = {
      status: "pending",
      sentBy: currentUser.uid,
      createdAt: serverTimestamp(),
    };

    // Write to sender's subcollection (representing an outgoing request)
    await setDoc(doc(db, "users", currentUser.uid, "friends", target.uid), {
      ...payload,
      friendUid: target.uid,
      friendName: target.displayName,
      friendEmail: target.email,
    });

    // Write to receiver's subcollection (representing an incoming request)
    await setDoc(doc(db, "users", target.uid, "friends", currentUser.uid), {
      ...payload,
      friendUid: currentUser.uid,
      friendName: currentUser.displayName,
      friendEmail: currentUser.email,
    });
  }

  /** 
   * Accept an incoming friend request.
   * Updates the status to "accepted" in both the user's and the friend's subcollections.
   */
  async function acceptRequest(friendUid) {
    await updateDoc(doc(db, "users", currentUser.uid, "friends", friendUid), { status: "accepted" });
    await updateDoc(doc(db, "users", friendUid, "friends", currentUser.uid), { status: "accepted" });
  }

  /** 
   * Decline or remove a friend request.
   * Sets the status in both documents to "declined".
   */
  async function declineRequest(friendUid) {
    await updateDoc(doc(db, "users", currentUser.uid, "friends", friendUid), { status: "declined" });
    await updateDoc(doc(db, "users", friendUid, "friends", currentUser.uid), { status: "declined" });
  }

  // Filter friends into clean category arrays for easy component rendering
  const accepted  = friends.filter((f) => f.status === "accepted");
  const incoming  = friends.filter((f) => f.status === "pending" && f.sentBy !== currentUser?.uid);
  const pending   = friends.filter((f) => f.status === "pending" && f.sentBy === currentUser?.uid);

  return (
    <FriendContext.Provider value={{
      friends, loading,
      accepted, incoming, pending,
      pendingCount: incoming.length, // Display count for notification badges (Sidebar/BottomNav)
      sendFriendRequest, acceptRequest, declineRequest,
    }}>
      {children}
    </FriendContext.Provider>
  );
}

// useFriends Hook: Quick-access hook for consuming FriendContext values inside components
export function useFriends() {
  return useContext(FriendContext);
}
