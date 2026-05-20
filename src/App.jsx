import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider }   from "./context/AuthContext";
import { ExpenseProvider } from "./context/ExpenseContext";
import { QuestProvider }  from "./context/QuestContext";
import { FriendProvider } from "./context/FriendContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import TopBar    from "./components/TopBar";
import BottomNav from "./components/BottomNav";
import FAB       from "./components/FAB";
import Sidebar   from "./components/Sidebar";

import Landing    from "./pages/Landing";
import Login      from "./pages/Login";
import Register   from "./pages/Register";
import Dashboard  from "./pages/Dashboard";
import Expenses   from "./pages/Expenses";
import Quests     from "./pages/Quests";
import Leaderboard from "./pages/Leaderboard";
import Analytics  from "./pages/Analytics";
import Profile    from "./pages/Profile";
import Developers from "./pages/Developers";
import AdminDashboard from "./pages/AdminDashboard";

import "./App.css";

// PROTECTED Routes Array: All pages standard users can visit if they are logged in.
// Centralizing pages in this array allows us to map and protect them dynamically,
// reducing boilerplate code.
const PROTECTED = [
  { path: "/dashboard",   element: <Dashboard /> },
  { path: "/expenses",    element: <Expenses /> },
  { path: "/quests",      element: <Quests /> },
  { path: "/leaderboard", element: <Leaderboard /> },
  { path: "/analytics",   element: <Analytics /> },
  { path: "/profile",     element: <Profile /> },
  { path: "/developers",  element: <Developers /> },
];

/**
 * AppLayout Wrapper Component
 * 
 * Purpose: Ensures all standard internal pages share the same consistent visual dashboard layout.
 * Elements:
 *  - **Sidebar**: Renders the vertical sidebar navigation bar on desktop screens.
 *  - **TopBar**: Renders page title/header information.
 *  - **BottomNav**: Renders the bottom navigation bar on mobile/touch screens.
 *  - **FAB**: The Floating Action Button that opens the quick-add transaction modal.
 */
function AppLayout({ children }) {
  return (
    <>
      <Sidebar />
      <div className="app-content-area">
        <TopBar />
        <main className="app-main">{children}</main>
        <FAB />
      </div>
      <BottomNav />
    </>
  );
}

/**
 * Main App Entrypoint
 * 
 * Crucial Concept: **The Provider Nesting Hierarchy (Order of Contexts)**
 * 1. `BrowserRouter` wraps the whole tree to enable SPA routing.
 * 2. `AuthProvider` sits at the top because all other contexts need the `currentUser.uid` to query Firestore.
 * 3. `ExpenseProvider` sits above `QuestProvider` because the Quest Engine needs to inspect the current transaction logs to compute completion states.
 * 4. `FriendProvider` sits under `AuthProvider` to fetch friendship records for active users.
 */
export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AuthProvider>
        <ExpenseProvider>
          <QuestProvider>
            <FriendProvider>
              <div className="app-shell">
                <Routes>
                  {/* Public routes (anyone can visit, no login required) */}
                  <Route path="/"         element={<Landing />} />
                  <Route path="/login"    element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  
                  {/* Map over protected pages and wrap them in the security guards */}
                  {PROTECTED.map(({ path, element }) => (
                    <Route key={path} path={path} element={
                      <ProtectedRoute>
                        <AppLayout>{element}</AppLayout>
                      </ProtectedRoute>
                    } />
                  ))}
                  
                  {/* Strict Admin Route: Wrapped in both login validation AND admin permission checks */}
                  <Route path="/admin" element={
                    <ProtectedRoute>
                      <AdminRoute>
                        <AppLayout><AdminDashboard /></AppLayout>
                      </AdminRoute>
                    </ProtectedRoute>
                  } />
                  
                  {/* Catch-all Wildcard Route: Redirects invalid paths back to root landing */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </div>
            </FriendProvider>
          </QuestProvider>
        </ExpenseProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
