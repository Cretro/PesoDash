import { createContext, useContext, useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase/firebase";

// AuthContext: Holds the global session state and profile document of the logged-in user.
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  /** 
   * Registers a new user:
   *  1. Creates user in Firebase Authentication.
   *  2. Updates their profile displayName.
   *  3. Creates a corresponding document in the `/users` Firestore collection to store metadata 
   *     (daily budget, points, streaks) that Firebase Auth doesn't support by default.
   */
  async function register(email, password, displayName) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName });
    await setDoc(doc(db, "users", cred.user.uid), {
      displayName,
      email,
      totalPoints: 0,
      currentStreak: 0,
      dailyBudget: 300,
      createdAt: serverTimestamp(),
    });
    return cred;
  }

  // Logs the user in using Firebase Authentication
  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  // Logs the user out of the Firebase session
  function logout() {
    return signOut(auth);
  }

  // Fetches custom user profile details from Firestore using their unique UID
  async function fetchUserProfile(uid) {
    const snap = await getDoc(doc(db, "users", uid));
    if (snap.exists()) setUserProfile(snap.data());
  }

  // Effect: Attaches a Firebase Auth listener to track session changes (login, logout, refresh).
  // Wrapped in try-catch-finally to guarantee the page stops showing a black loading screen 
  // even if network or Firestore errors occur during startup.
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      try {
        setCurrentUser(user);
        if (user) await fetchUserProfile(user.uid);
        else setUserProfile(null);
      } catch (err) {
        console.error("Auth initialization error:", err);
      } finally {
        setLoading(false);
      }
    });
    return unsub;
  }, []);

  const value = {
    currentUser,
    userProfile,
    setUserProfile,
    isAdmin: userProfile?.role === "admin", // Exposes boolean helper for admin route guard validation
    register,
    login,
    logout,
    fetchUserProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

// useAuth Hook: Quick-access hook for components to consume user auth states
export function useAuth() {
  return useContext(AuthContext);
}
