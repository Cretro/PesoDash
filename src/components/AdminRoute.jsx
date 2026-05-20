import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * AdminRoute Component
 * 
 * Purpose: Protects administrator-only pages (like the Admin Dashboard) from access by standard users.
 * How it works:
 *  1. Retrieves the current authentication state and the 'isAdmin' flag from AuthContext.
 *  2. If the user is not logged in, it redirects them to the /login page.
 *  3. If the user is logged in but does not have the 'admin' role, it redirects them to the standard /dashboard.
 *  4. If the user is a verified administrator, it renders the protected child components.
 */
export default function AdminRoute({ children }) {
  const { currentUser, isAdmin } = useAuth();

  // Redirect to login if user is not authenticated at all
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Redirect to the regular dashboard if the user is authenticated but not an admin
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  // Render the admin content if both checks pass
  return children;
}
