import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider }   from "./context/AuthContext";
import { ExpenseProvider } from "./context/ExpenseContext";
import { QuestProvider }  from "./context/QuestContext";
import { FriendProvider } from "./context/FriendContext";
import ProtectedRoute from "./components/ProtectedRoute/ProtectedRoute";
import TopBar    from "./components/TopBar/TopBar";
import BottomNav from "./components/BottomNav/BottomNav";
import FAB       from "./components/FAB/FAB";

import Landing    from "./pages/Landing/Landing";
import Login      from "./pages/Auth/Login";
import Register   from "./pages/Auth/Register";
import Dashboard  from "./pages/Dashboard/Dashboard";
import Expenses   from "./pages/Expenses/Expenses";
import Quests     from "./pages/Quests/Quests";
import Leaderboard from "./pages/Leaderboard/Leaderboard";
import Analytics  from "./pages/Analytics/Analytics";
import Profile    from "./pages/Profile/Profile";
import Developers from "./pages/Developers/Developers";

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
      <TopBar />
      <main className="app-main">{children}</main>
      <FAB />
      <BottomNav />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <QuestProvider>
          <ExpenseProvider>
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
          </ExpenseProvider>
        </QuestProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
