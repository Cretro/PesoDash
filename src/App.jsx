import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider }   from "./context/AuthContext";
import { ExpenseProvider } from "./context/ExpenseContext";
import { QuestProvider }  from "./context/QuestContext";
import { FriendProvider } from "./context/FriendContext";
import ProtectedRoute from "./components/ProtectedRoute";
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

import "./App.css";

const PROTECTED = [
  { path: "/dashboard",   element: <Dashboard /> },
  { path: "/expenses",    element: <Expenses /> },
  { path: "/quests",      element: <Quests /> },
  { path: "/leaderboard", element: <Leaderboard /> },
  { path: "/analytics",   element: <Analytics /> },
  { path: "/profile",     element: <Profile /> },
  { path: "/developers",  element: <Developers /> },
];

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

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ExpenseProvider>
          <QuestProvider>
            <FriendProvider>
              <div className="app-shell">
                <Routes>
                  <Route path="/"         element={<Landing />} />
                  <Route path="/login"    element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  {PROTECTED.map(({ path, element }) => (
                    <Route key={path} path={path} element={
                      <ProtectedRoute>
                        <AppLayout>{element}</AppLayout>
                      </ProtectedRoute>
                    } />
                  ))}
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
