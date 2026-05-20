import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * ProtectedRoute Component
 * 
 * Purpose: Ensures only authenticated and active (non-disabled) users can access standard app pages.
 * How it works:
 *  1. Checks if the user is authenticated via Firebase Auth.
 *  2. Evaluates the user's account state (`disabled` flag from Firestore user profile).
 *  3. If the user is flagged as disabled/suspended by an administrator:
 *     - An effect triggers an automatic Firebase logout.
 *     - Redirects the user to the login screen with a state payload (`disabledError: true`), 
 *       which triggers a red warning banner on the login page.
 *  4. Redirects unauthenticated users to `/login`.
 */
export default function ProtectedRoute({ children }) {
  const { currentUser, userProfile, logout } = useAuth();

  // Watcher effect: If a user is currently logged in, but their account gets disabled 
  // (e.g. by an administrator on the dashboard), log them out immediately from Firebase.
  useEffect(() => {
    if (currentUser && userProfile?.disabled) {
      logout();
    }
  }, [currentUser, userProfile, logout]);

  // Redirect to login page if no authenticated user session exists
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Redirect to login page and pass disabled status if account is suspended
  if (userProfile?.disabled) {
    return <Navigate to="/login" replace state={{ disabledError: true }} />;
  }

  // Render child pages (e.g. Dashboard, Expenses, Quests) if account is active and verified
  return children;
}
