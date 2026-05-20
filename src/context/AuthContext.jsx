import { createContext, useContext, useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp, onSnapshot } from "firebase/firestore";
import { auth, db } from "../firebase/firebase";

// ==========================================
// AUTH CONTEXT SETUP
// ==========================================
// AuthContext serves as the global state container for everything related to authentication
// and the current user's profile details. It exports credentials, hooks, and helpers.
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // currentUser: Stores the Firebase Auth user session details (email, uid, base auth status)
  const [currentUser, setCurrentUser] = useState(null);

  // userProfile: Stores the custom user data from our Firestore '/users' collection (streak, points, budget, role)
  const [userProfile, setUserProfile] = useState(null);

  // loading: Prevents UI rendering before checking session status
  const [loading, setLoading] = useState(true);

  /** 
   * REGISTRATION FUNCTION
   * 1. Creates a user account in Firebase Authentication.
   * 2. Sets their public auth display name.
   * 3. Seeds the initial Firestore collection record with default starting parameters.
   */
  async function register(email, password, displayName) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName });
    
    // Seed initial Firestore collection record with default starting parameters
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

  /**
   * LOGIN FUNCTION
   * Standard Firebase helper to sign in a user by comparing credentials with Firebase Auth databases.
   */
  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  /**
   * LOGOUT FUNCTION
   * Standard Firebase helper to terminate the current session. Automatically resets currentUser.
   */
  function logout() {
    return signOut(auth);
  }

  /**
   * LIFE-CYCLE LISTENER: AUTH STATE & PROFILE DOCUMENT
   * This critical hook registers an auth state changed listener when the app loads.
   * - If a user is logged in, it binds a real-time 'onSnapshot' listener to the user's doc in Firestore.
   * - This ensures that if points, budgets, or streaks update anywhere in the DB, the entire UI syncs immediately.
   */
  useEffect(() => {
    let profileUnsub = null;
    const authUnsub = onAuthStateChanged(auth, async (user) => {
      try {
        setCurrentUser(user);
        if (user) {
          // Set up real-time listener for the user's profile document under '/users/{uid}'
          profileUnsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
            if (snap.exists()) {
              setUserProfile(snap.data());
            }
          }, (err) => {
            console.error("AuthContext: Failed to fetch user profile real-time.", err);
          });
        } else {
          // Clear profile on logout
          setUserProfile(null);
          if (profileUnsub) {
            profileUnsub();
            profileUnsub = null;
          }
        }
      } catch (err) {
        console.error("Auth initialization error:", err);
      } finally {
        // Stop loading once the auth checker resolves the session status
        setLoading(false);
      }
    });

    // Unsubscribe from active listeners when component unmounts to prevent memory leaks
    return () => {
      authUnsub();
      if (profileUnsub) profileUnsub();
    };
  }, []);

  // Packaged values exposed to the entire React component tree via AuthContext.Provider
  const value = {
    currentUser,
    userProfile,
    setUserProfile,
    // Computed property checking if role in DB is "admin"
    isAdmin: userProfile?.role === "admin", 
    register,
    login,
    logout,
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
