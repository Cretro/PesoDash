import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { currentUser, userProfile, logout } = useAuth();

  useEffect(() => {
    if (currentUser && userProfile?.disabled) {
      logout();
    }
  }, [currentUser, userProfile, logout]);

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (userProfile?.disabled) {
    return <Navigate to="/login" replace state={{ disabledError: true }} />;
  }

  return children;
}
