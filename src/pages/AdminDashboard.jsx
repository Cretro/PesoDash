import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
  deleteDoc,
  serverTimestamp,
  query,
  limit
} from "firebase/firestore";
import { db } from "../firebase/firebase";
import { useAuth } from "../context/AuthContext";
import { FiUsers, FiAward, FiPieChart } from "react-icons/fi";
import AdminUsersPanel    from "../components/AdminDashboard/AdminUsersPanel";
import AdminQuestsPanel   from "../components/AdminDashboard/AdminQuestsPanel";
import AdminStatsPanel    from "../components/AdminDashboard/AdminStatsPanel";
import EditUserModal      from "../components/AdminDashboard/EditUserModal";
import QuestTemplateModal from "../components/AdminDashboard/QuestTemplateModal";

/**
 * AdminDashboard Page
 *
 * Purpose: Provides administrators with live platform control tools.
 * This file owns all Firestore listeners, state, and action handlers.
 * UI is delegated to focused sub-components:
 *  - AdminUsersPanel    → Users tab
 *  - AdminQuestsPanel   → Quest Templates tab
 *  - AdminStatsPanel    → Platform Stats tab
 *  - EditUserModal      → Edit user slide-up form
 *  - QuestTemplateModal → Add/edit quest template slide-up form
 */
export default function AdminDashboard() {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState("users");

  // --- Real-time Collections Data States ---
  const [users, setUsers]         = useState([]);
  const [templates, setTemplates] = useState([]);
  const [expenses, setExpenses]   = useState([]);

  // --- Loading States ---
  const [loadingUsers, setLoadingUsers]         = useState(true);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [loadingExpenses, setLoadingExpenses]   = useState(true);

  // --- Search & Modal States ---
  const [searchQuery, setSearchQuery]         = useState("");
  const [editingUser, setEditingUser]         = useState(null);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [showAddTemplate, setShowAddTemplate] = useState(false);

  // --- Notification Banner States ---
  const [errorMsg, setErrorMsg]     = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // --- Add/Edit Quest Template Form State ---
  const [templateForm, setTemplateForm] = useState({
    questType: "streak",
    period: "persistent",
    title: "",
    description: "",
    target: "",
    pointsReward: "",
    icon: "🎯",
    category: "",
  });

  // Effect: Real-time listener for the global '/users' collection.
  // SECURITY LIMIT: Capped at 50 to prevent overloading the client and Firebase read quota.
  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, "users"), limit(50)), (snap) => {
      setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoadingUsers(false);
    });
    return unsub;
  }, []);

  // Effect: Real-time listener for the global '/questTemplates' collection.
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "questTemplates"), (snap) => {
      setTemplates(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoadingTemplates(false);
    });
    return unsub;
  }, []);

  // Effect: Real-time listener for the global '/expenses' collection.
  // SECURITY LIMIT: Capped at 500 to prevent overloading the client and Firebase read quota.
  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, "expenses"), limit(500)), (snap) => {
      setExpenses(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoadingExpenses(false);
    });
    return unsub;
  }, []);

  // Helper: Triggers a temporary alert banner that auto-dismisses.
  const triggerStatus = (text, type = "success") => {
    if (type === "success") {
      setSuccessMsg(text);
      setErrorMsg("");
      setTimeout(() => setSuccessMsg(""), 3000);
    } else {
      setErrorMsg(text);
      setSuccessMsg("");
      setTimeout(() => setErrorMsg(""), 4000);
    }
  };

  // Action: Submits updates to a specific user's Firestore document.
  async function handleUpdateUser(e) {
    e.preventDefault();
    if (!editingUser) return;
    try {
      await updateDoc(doc(db, "users", editingUser.id), {
        displayName:   editingUser.displayName.trim(),
        totalPoints:   Number(editingUser.totalPoints),
        currentStreak: Number(editingUser.currentStreak),
        dailyBudget:   Number(editingUser.dailyBudget),
        role:          editingUser.role || null,
        disabled:      editingUser.disabled || false,
        gender:        editingUser.gender || "prefer_not_to_say",
      });
      triggerStatus(`User ${editingUser.displayName} updated successfully!`);
      setEditingUser(null);
    } catch (err) {
      triggerStatus(err.message, "danger");
    }
  }

  // Action: Creates or updates a quest template in '/questTemplates'.
  async function handleSaveTemplate(e) {
    e.preventDefault();
    const { title, description, target, pointsReward, icon, questType, period, category } = templateForm;
    if (!title || !description || !target || !pointsReward || !icon) {
      triggerStatus("Please fill in all template fields.", "danger");
      return;
    }
    try {
      const payload = {
        title:        title.trim(),
        description:  description.trim(),
        questType,
        period:       period || "weekly",
        target:       Number(target),
        pointsReward: Number(pointsReward),
        icon:         icon.trim(),
        // Category constraint is only saved if the selected quest type actually uses it.
        category: ["days_under_category_limit", "total_spend_limit", "zero_splurge_days", "category"].includes(questType)
          ? (category || "Others")
          : null,
      };

      if (editingTemplate) {
        await updateDoc(doc(db, "questTemplates", editingTemplate.id), payload);
        triggerStatus("Quest template updated successfully!");
        setEditingTemplate(null);
        setShowAddTemplate(false);
      } else {
        await addDoc(collection(db, "questTemplates"), { ...payload, createdAt: serverTimestamp() });
        triggerStatus("New quest template created!");
        setShowAddTemplate(false);
      }

      setTemplateForm({ questType: "streak", period: "persistent", title: "", description: "", target: "", pointsReward: "", icon: "🎯", category: "" });
    } catch (err) {
      triggerStatus(err.message, "danger");
    }
  }

  // Action: Deletes a quest template document from Firestore.
  async function handleDeleteTemplate(id) {
    if (!window.confirm("Are you sure you want to delete this quest template? This won't remove active quests user-side but prevents new ones.")) return;
    try {
      await deleteDoc(doc(db, "questTemplates", id));
      triggerStatus("Quest template deleted.");
    } catch (err) {
      triggerStatus(err.message, "danger");
    }
  }

  // Memoized: Filters users by search query without reallocating on every render.
  const filteredUsers = useMemo(() =>
    users.filter((u) =>
      u.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [users, searchQuery]
  );

  // Memoized: Computes platform-wide aggregate statistics.
  const stats = useMemo(() => {
    const totalUsers        = users.length;
    const totalTransactions = expenses.length;
    const totalMoneySpent   = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const averageBudget     = totalUsers ? Math.round(users.reduce((sum, u) => sum + Number(u.dailyBudget || 300), 0) / totalUsers) : 300;
    const totalPoints       = users.reduce((sum, u) => sum + (u.totalPoints || 0), 0);
    const categoryTotals    = expenses.reduce((acc, curr) => {
      const cat = curr.category || "Others";
      acc[cat] = (acc[cat] || 0) + Number(curr.amount);
      return acc;
    }, {});
    return { totalUsers, totalTransactions, totalMoneySpent, averageBudget, totalPoints, categoryTotals };
  }, [users, expenses]);

  // Memoized: Auto-generates a suggested quest description based on form inputs.
  const suggestedDescription = useMemo(() => {
    const target   = templateForm.target || "X";
    const category = templateForm.category || "[Category]";
    const qType    = templateForm.questType || "streak";
    const isDaily  = templateForm.period === "daily";

    if (qType === "streak")       return `Stay under your daily budget for a consecutive streak of ${target} days`;
    if (qType === "total_spend_limit" || qType === "category")
      return isDaily ? `Spend less than ₱${target} on ${category} today` : `Spend less than ₱${target} on ${category} this week`;
    if (qType === "zero_splurge_days" || qType === "zero_splurge")
      return isDaily ? `Spend ₱0 on ${category} today` : `Spend ₱0 on ${category} for ${target} days this week`;
    if (qType === "savings_goal")
      return isDaily ? `Save at least ₱${target} today by staying under budget` : `Save at least ₱${target} this week by staying under budget`;
    return "";
  }, [templateForm.target, templateForm.category, templateForm.questType, templateForm.period]);

  return (
    <div className="page-content" style={{ maxWidth: 960 }}>
      {/* Alert Notification Banners */}
      <AnimatePresence>
        {successMsg && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="alert alert-success py-2.5 small mb-3 text-center">
            {successMsg}
          </motion.div>
        )}
        {errorMsg && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="alert alert-danger py-2.5 small mb-3 text-center">
            {errorMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tab Navigation */}
      <ul className="nav nav-pills nav-fill mb-4 p-1 rounded-3" style={{ background: "rgba(255,255,255,.04)" }}>
        {[
          ["users",  <><FiUsers className="me-2" />Users</>],
          ["quests", <><FiAward className="me-2" />Quest Templates</>],
          ["stats",  <><FiPieChart className="me-2" />Platform Stats</>],
        ].map(([key, label]) => (
          <li className="nav-item" key={key}>
            <button
              className={`nav-link w-100 fw-semibold d-flex align-items-center justify-content-center ${activeTab === key ? "active" : ""}`}
              onClick={() => { setActiveTab(key); setSearchQuery(""); }}
              style={{ fontSize: ".875rem", minHeight: 40 }}
            >
              {label}
            </button>
          </li>
        ))}
      </ul>

      {/* Tab Panels */}
      <div className="tab-content">
        {activeTab === "users"  && <AdminUsersPanel  loadingUsers={loadingUsers}  filteredUsers={filteredUsers} searchQuery={searchQuery} setSearchQuery={setSearchQuery} setEditingUser={setEditingUser} />}
        {activeTab === "quests" && <AdminQuestsPanel loadingTemplates={loadingTemplates} templates={templates} setEditingTemplate={setEditingTemplate} setTemplateForm={setTemplateForm} setShowAddTemplate={setShowAddTemplate} handleDeleteTemplate={handleDeleteTemplate} />}
        {activeTab === "stats"  && <AdminStatsPanel  loadingExpenses={loadingExpenses} loadingUsers={loadingUsers} stats={stats} />}
      </div>

      {/* Modals */}
      <EditUserModal      editingUser={editingUser} setEditingUser={setEditingUser} handleUpdateUser={handleUpdateUser} currentUser={currentUser} />
      <QuestTemplateModal showAddTemplate={showAddTemplate} setShowAddTemplate={setShowAddTemplate} editingTemplate={editingTemplate} setEditingTemplate={setEditingTemplate} templateForm={templateForm} setTemplateForm={setTemplateForm} handleSaveTemplate={handleSaveTemplate} suggestedDescription={suggestedDescription} />
    </div>
  );
}
