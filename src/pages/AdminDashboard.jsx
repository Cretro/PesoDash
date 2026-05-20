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
} from "firebase/firestore";
import { db } from "../firebase/firebase";
import { useAuth } from "../context/AuthContext";
import { formatCurrency } from "../utils/formatters";
import Avatar from "../components/Avatar";
import { FiUsers, FiAward, FiPieChart, FiSearch, FiEdit2, FiTrash2, FiPlus, FiX } from "react-icons/fi";

const CATEGORIES = ["Food", "Commute", "School Expenses", "Others"];

/**
 * AdminDashboard Component
 * 
 * Purpose: Provides administrators with live platform control tools.
 * Key Sections:
 *  1. **Users Management**: View all users, search, and edit records (budgets, point values, disable status).
 *  2. **Quest Templates**: Perform CRUD operations on quest rules that populate standard user dashboards.
 *  3. **Platform Stats**: Real-time business intelligence aggregates (averages, category progress bars, volume sums).
 */
export default function AdminDashboard() {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState("users");

  // --- Real-time Collections Data States ---
  const [users, setUsers] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [expenses, setExpenses] = useState([]);

  // --- Loading States ---
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [loadingExpenses, setLoadingExpenses] = useState(true);

  // --- Search & Modal States ---
  const [searchQuery, setSearchQuery] = useState("");
  const [editingUser, setEditingUser] = useState(null);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [showAddTemplate, setShowAddTemplate] = useState(false);

  // --- Notifications Banner States ---
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // --- Add/Edit Quest Template Form State ---
  const [templateForm, setTemplateForm] = useState({
    questType: "streak",
    period: "weekly",
    title: "",
    description: "",
    target: "",
    pointsReward: "",
    icon: "🎯",
    category: "",
  });

  // Effect: Sets up real-time listener to the global '/users' collection.
  // Triggers state refresh instantly when users sign up or update profiles.
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "users"), (snap) => {
      setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoadingUsers(false);
    });
    return unsub;
  }, []);

  // Effect: Sets up real-time listener to the global '/questTemplates' collection.
  // Keeps the admin list and user active sync templates aligned.
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "questTemplates"), (snap) => {
      setTemplates(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoadingTemplates(false);
    });
    return unsub;
  }, []);

  // Effect: Sets up real-time listener to the global '/expenses' collection.
  // Used to aggregate platform-wide spending stats in the Stats panel.
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "expenses"), (snap) => {
      setExpenses(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoadingExpenses(false);
    });
    return unsub;
  }, []);

  // Helper: Triggers a temporary alert banner that fades out automatically.
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

  // --- User Administration Actions ---
  // Submits updates to a specific user's Firestore document.
  async function handleUpdateUser(e) {
    e.preventDefault();
    if (!editingUser) return;
    try {
      const userRef = doc(db, "users", editingUser.id);
      await updateDoc(userRef, {
        displayName: editingUser.displayName.trim(),
        totalPoints: Number(editingUser.totalPoints),
        currentStreak: Number(editingUser.currentStreak),
        dailyBudget: Number(editingUser.dailyBudget),
        role: editingUser.role || null,
        disabled: editingUser.disabled || false, // Toggling this disables the user's Auth login route
      });
      triggerStatus(`User ${editingUser.displayName} updated successfully!`);
      setEditingUser(null);
    } catch (err) {
      triggerStatus(err.message, "danger");
    }
  }

  // --- Quest Template Actions ---
  // Saves or updates a quest template rule in '/questTemplates' collection.
  async function handleSaveTemplate(e) {
    e.preventDefault();
    const { title, description, target, pointsReward, icon, questType, period, category } = templateForm;
    if (!title || !description || !target || !pointsReward || !icon) {
      triggerStatus("Please fill in all template fields.", "danger");
      return;
    }

    try {
      const qType = questType || "streak";
      const payload = {
        title: title.trim(),
        description: description.trim(),
        questType: qType,
        period: period || "weekly",
        target: Number(target),
        pointsReward: Number(pointsReward),
        icon: icon.trim(),
        // Category constraint is only saved if the selected quest type actually uses it.
        category: ["days_under_category_limit", "total_spend_limit", "zero_splurge_days", "category"].includes(qType) ? (category || "Others") : null,
      };

      if (editingTemplate) {
        // Edit mode: update existing Firestore document
        await updateDoc(doc(db, "questTemplates", editingTemplate.id), payload);
        triggerStatus("Quest template updated successfully!");
        setEditingTemplate(null);
        setShowAddTemplate(false);
      } else {
        // Create mode: add new Firestore document
        await addDoc(collection(db, "questTemplates"), {
          ...payload,
          createdAt: serverTimestamp(),
        });
        triggerStatus("New quest template created!");
        setShowAddTemplate(false);
      }

      // Reset form controls
      setTemplateForm({
        questType: "streak",
        period: "weekly",
        title: "",
        description: "",
        target: "",
        pointsReward: "",
        icon: "🎯",
        category: "",
      });
    } catch (err) {
      triggerStatus(err.message, "danger");
    }
  }

  // Deletes a quest template document from Firestore.
  async function handleDeleteTemplate(id) {
    if (!window.confirm("Are you sure you want to delete this quest template? This won't remove active quests user-side but prevents new ones.")) return;
    try {
      await deleteDoc(doc(db, "questTemplates", id));
      triggerStatus("Quest template deleted.");
    } catch (err) {
      triggerStatus(err.message, "danger");
    }
  }

  // --- Optimization: useMemo Hook ---
  // Memoizes the search/filter results so that typing in the search bar does not trigger 
  // unnecessary array allocations unless the search query or users array changes.
  const filteredUsers = useMemo(() => {
    return users.filter(
      (u) =>
          u.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          u.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [users, searchQuery]);

  // Memoizes Platform aggregates to prevent heavy computations (looping through all users/expenses) 
  // on every render cycle.
  const stats = useMemo(() => {
    const totalUsers = users.length;
    const totalTransactions = expenses.length;
    const totalMoneySpent = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const averageBudget = totalUsers
      ? Math.round(users.reduce((sum, u) => sum + Number(u.dailyBudget || 300), 0) / totalUsers)
      : 300;
    const totalPoints = users.reduce((sum, u) => sum + (u.totalPoints || 0), 0);

    // Sum spending aggregates per category
    const categoryTotals = expenses.reduce((acc, curr) => {
      const cat = curr.category || "Others";
      acc[cat] = (acc[cat] || 0) + Number(curr.amount);
      return acc;
    }, {});

    return { totalUsers, totalTransactions, totalMoneySpent, averageBudget, totalPoints, categoryTotals };
  }, [users, expenses]);

  // Utility: Auto-generates descriptions dynamically based on input targets and types.
  const suggestedDescription = useMemo(() => {
    const target = templateForm.target || "X";
    const category = templateForm.category || "[Category]";
    const qType = templateForm.questType || "streak";

    if (qType === "streak") {
      return `Stay under your daily budget for ${target} days in a row this week`;
    }
    if (qType === "total_spend_limit" || qType === "category") {
      return `Spend less than ₱${target} on ${category || "all expenses"} this week`;
    }
    if (qType === "zero_splurge_days" || qType === "zero_splurge") {
      return `Spend ₱0 on ${category || "Others"} for ${target} days this week`;
    }
    if (qType === "savings_goal") {
      return `Save at least ₱${target} this week by staying under budget`;
    }
    return "";
  }, [templateForm.target, templateForm.category, templateForm.questType]);

  return (
    <div className="page-content" style={{ maxWidth: 960 }}>
      {/* Alert Notifications banner */}
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

      {/* Navigation tabs */}
      <ul className="nav nav-pills nav-fill mb-4 p-1 rounded-3" style={{ background: "rgba(255,255,255,.04)" }}>
        {[
          ["users", <><FiUsers className="me-2" />Users</>],
          ["quests", <><FiAward className="me-2" />Quest Templates</>],
          ["stats", <><FiPieChart className="me-2" />Platform Stats</>],
        ].map(([key, label]) => (
          <li className="nav-item" key={key}>
            <button
              className={`nav-link w-100 fw-semibold d-flex align-items-center justify-content-center ${activeTab === key ? "active" : ""}`}
              onClick={() => {
                setActiveTab(key);
                setSearchQuery("");
              }}
              style={{ fontSize: ".875rem", minHeight: 40 }}
            >
              {label}
            </button>
          </li>
        ))}
      </ul>

      {/* Tab Panels */}
      <div className="tab-content">
        {/* --- USERS PANEL --- */}
        {activeTab === "users" && (
          <div className="panel-container">
            {/* Search Input */}
            <div className="d-flex align-items-center gap-2 mb-3 bg-white bg-opacity-5 border border-white border-opacity-10 rounded-3 px-3 py-2">
              <FiSearch className="text-secondary" />
              <input
                type="text"
                placeholder="Search users by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-control border-0 p-0 text-white bg-transparent"
                style={{ outline: "none", boxShadow: "none" }}
              />
            </div>

            {loadingUsers ? (
              <div className="text-center py-5 text-secondary">Loading users collection...</div>
            ) : filteredUsers.length === 0 ? (
              <div className="card rounded-3 glass-card text-center py-5 text-secondary">No users found matching query.</div>
            ) : (
              <>
                {/* Desktop View Table */}
                <div className="table-responsive d-none d-lg-block rounded-3" style={{ border: "1px solid var(--pd-border)" }}>
                  <table className="table table-dark table-hover mb-0 align-middle">
                    <thead>
                      <tr style={{ background: "rgba(255,255,255,.02)" }}>
                        <th className="px-3 py-2.5 small text-secondary fw-semibold">User</th>
                        <th className="py-2.5 small text-secondary fw-semibold">Email</th>
                        <th className="py-2.5 small text-secondary fw-semibold text-center">Points</th>
                        <th className="py-2.5 small text-secondary fw-semibold text-center">Streak</th>
                        <th className="py-2.5 small text-secondary fw-semibold text-center">Budget</th>
                        <th className="py-2.5 small text-secondary fw-semibold text-center">Role</th>
                        <th className="py-2.5 small text-secondary fw-semibold text-center">Status</th>
                        <th className="px-3 py-2.5 small text-secondary fw-semibold text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((user) => (
                        <tr key={user.id}>
                          <td className="px-3 py-2.5">
                            <div className="d-flex align-items-center gap-2">
                              <Avatar name={user.displayName || "User"} size={32} />
                              <span className="fw-semibold text-white small">{user.displayName || "Unregistered"}</span>
                            </div>
                          </td>
                          <td className="py-2.5 text-secondary small">{user.email}</td>
                          <td className="py-2.5 text-white small text-center fw-bold">{user.totalPoints || 0}</td>
                          <td className="py-2.5 text-warning small text-center">🔥 {user.currentStreak || 0}</td>
                          <td className="py-2.5 text-white small text-center">₱{user.dailyBudget || 300}</td>
                          <td className="py-2.5 text-center">
                            {user.role === "admin" ? (
                              <span className="badge bg-indigo rounded-pill small" style={{ fontSize: ".7rem" }}>Admin</span>
                            ) : (
                              <span className="text-secondary small">—</span>
                            )}
                          </td>
                          <td className="py-2.5 text-center">
                            {user.disabled ? (
                              <span className="badge bg-danger rounded-pill small" style={{ fontSize: ".7rem" }}>Archived</span>
                            ) : (
                              <span className="badge bg-success rounded-pill small" style={{ fontSize: ".7rem" }}>Active</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-end">
                            <button
                              className="btn btn-sm btn-outline-primary rounded-3 border-0 py-1"
                              onClick={() => setEditingUser({ ...user })}
                            >
                              <FiEdit2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View Cards */}
                <div className="d-flex flex-column gap-2.5 d-lg-none">
                  {filteredUsers.map((user) => (
                    <div key={user.id} className="card rounded-3 glass-card">
                      <div className="card-body p-3">
                        <div className="d-flex align-items-center justify-content-between mb-2">
                          <div className="d-flex align-items-center gap-2">
                            <Avatar name={user.displayName || "User"} size={36} />
                            <div>
                              <p className="fw-bold text-white mb-0 small">{user.displayName}</p>
                              <p className="text-secondary mb-0" style={{ fontSize: ".7rem" }}>{user.email}</p>
                            </div>
                          </div>
                          <button
                            className="btn btn-sm btn-outline-primary rounded-3 px-2.5 py-1"
                            onClick={() => setEditingUser({ ...user })}
                          >
                            <FiEdit2 size={13} className="me-1" /> Edit
                          </button>
                        </div>
                        <div className="d-flex flex-wrap gap-2 text-center pt-2 border-top border-white border-opacity-5">
                          <div className="flex-fill p-1 bg-white bg-opacity-5 rounded-2">
                            <p className="text-secondary mb-0" style={{ fontSize: ".6rem", textTransform: "uppercase" }}>Points</p>
                            <p className="fw-bold text-white mb-0 small">{user.totalPoints || 0}</p>
                          </div>
                          <div className="flex-fill p-1 bg-white bg-opacity-5 rounded-2">
                            <p className="text-secondary mb-0" style={{ fontSize: ".6rem", textTransform: "uppercase" }}>Streak</p>
                            <p className="fw-semibold text-warning mb-0 small">🔥 {user.currentStreak || 0}</p>
                          </div>
                          <div className="flex-fill p-1 bg-white bg-opacity-5 rounded-2">
                            <p className="text-secondary mb-0" style={{ fontSize: ".6rem", textTransform: "uppercase" }}>Budget</p>
                            <p className="fw-semibold text-white mb-0 small">₱{user.dailyBudget || 300}</p>
                          </div>
                          <div className="flex-fill p-1 bg-white bg-opacity-5 rounded-2 d-flex align-items-center justify-content-center gap-1 flex-column">
                            {user.role === "admin" && <span className="badge bg-indigo rounded-pill" style={{ fontSize: ".6rem" }}>Admin</span>}
                            {user.disabled ? (
                              <span className="badge bg-danger rounded-pill" style={{ fontSize: ".6rem" }}>Archived</span>
                            ) : (
                              <span className="badge bg-success rounded-pill" style={{ fontSize: ".6rem" }}>Active</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* --- QUEST TEMPLATES PANEL --- */}
        {activeTab === "quests" && (
          <div className="panel-container">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <h2 className="fs-5 fw-bold text-white mb-0">Quest templates ({templates.length})</h2>
              <button
                className="btn btn-primary btn-sm rounded-3 fw-bold d-flex align-items-center gap-1.5 py-2 px-3"
                onClick={() => {
                  setEditingTemplate(null);
                  setTemplateForm({
                    questType: "streak",
                    title: "",
                    description: "",
                    target: "",
                    pointsReward: "",
                    icon: "🎯",
                    category: "",
                  });
                  setShowAddTemplate(true);
                }}
              >
                <FiPlus /> Add Template
              </button>
            </div>

            {loadingTemplates ? (
              <div className="text-center py-5 text-secondary">Loading quest templates...</div>
            ) : templates.length === 0 ? (
              <div className="card rounded-3 glass-card text-center py-5 text-secondary">No templates. Seed templates by loading the quests page.</div>
            ) : (
              <div className="row g-3">
                {templates.map((temp) => (
                  <div className="col-12 col-md-6" key={temp.id}>
                    <div className="card rounded-3 glass-card h-100 position-relative">
                      <div className="card-body p-3">
                        <div className="d-flex align-items-start gap-3">
                          <span style={{ fontSize: "1.75rem" }}>{temp.icon}</span>
                          <div className="flex-fill">
                            <h3 className="fw-bold text-white mb-1 fs-6">{temp.title}</h3>
                            <p className="text-secondary small mb-2">{temp.description}</p>
                            <div className="d-flex flex-wrap gap-2 mb-1">
                              <span className="badge rounded-pill small" style={{ background: "rgba(255, 255, 255, 0.08)", color: "#94a3b8", border: "1px solid rgba(255, 255, 255, 0.12)", fontSize: "0.7rem" }}>
                                {temp.period || "weekly"}
                              </span>
                              <span className="badge rounded-pill small" style={{ background: "rgba(255, 255, 255, 0.08)", color: "#94a3b8", border: "1px solid rgba(255, 255, 255, 0.12)", fontSize: "0.7rem" }}>
                                {temp.questType || "streak"}
                              </span>
                              <span className="badge rounded-pill small" style={{ background: "rgba(99, 102, 241, 0.15)", color: "#818cf8", border: "1px solid rgba(99, 102, 241, 0.3)", fontSize: "0.7rem" }}>
                                Target: {["category", "total_spend_limit", "savings_goal"].includes(temp.questType) ? `₱${temp.target}` : `${temp.target} days`}
                              </span>
                              <span className="badge rounded-pill small" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#34d399", border: "1px solid rgba(16, 185, 129, 0.3)", fontSize: "0.7rem" }}>
                                +{temp.pointsReward}pt
                              </span>
                              {temp.category && (
                                <span className="badge rounded-pill small" style={{ background: "rgba(245, 158, 11, 0.15)", color: "#f59e0b", border: "1px solid rgba(245, 158, 11, 0.3)", fontSize: "0.7rem" }}>
                                  {temp.category}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="d-flex flex-column gap-1.5">
                            <button
                                className="btn btn-sm btn-outline-primary rounded-3 py-1 px-2 border-0"
                                onClick={() => {
                                  setEditingTemplate(temp);
                                  setTemplateForm({
                                    questType: temp.questType || "streak",
                                    period: temp.period || "weekly",
                                    title: temp.title,
                                    description: temp.description,
                                    target: temp.target,
                                    pointsReward: temp.pointsReward,
                                    icon: temp.icon,
                                    category: temp.category || "",
                                  });
                                  setShowAddTemplate(true);
                                }}
                            >
                              <FiEdit2 size={13} />
                            </button>
                            <button
                              className="btn btn-sm btn-outline-danger rounded-3 py-1 px-2 border-0"
                              onClick={() => handleDeleteTemplate(temp.id)}
                            >
                              <FiTrash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* --- STATS PANEL --- */}
        {activeTab === "stats" && (
          <div className="panel-container">
            {loadingExpenses || loadingUsers ? (
              <div className="text-center py-5 text-secondary">Analyzing platform aggregates...</div>
            ) : (
              <div className="d-flex flex-column gap-4">
                {/* Statistics Scorecards */}
                <div className="row g-3">
                  {[
                    { label: "Total Users", value: stats.totalUsers, color: "#818cf8" },
                    { label: "Total Points Awarded", value: stats.totalPoints, color: "#10b981" },
                    { label: "Total Transactions Logged", value: stats.totalTransactions, color: "#ec4899" },
                    { label: "Total Money Tracked", value: formatCurrency(stats.totalMoneySpent), color: "#f59e0b" },
                  ].map((stat, idx) => (
                    <div className="col-12 col-md-6 col-lg-3" key={idx}>
                      <div className="card rounded-3 glass-card h-100" style={{ borderLeft: `3px solid ${stat.color}` }}>
                        <div className="card-body p-3">
                          <p className="text-secondary small text-uppercase fw-bold mb-1" style={{ fontSize: ".65rem", letterSpacing: ".06em" }}>
                            {stat.label}
                          </p>
                          <p className="fw-black text-white mb-0 fs-4">{stat.value}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="row g-3">
                  {/* Category spending distribution */}
                  <div className="col-12 col-lg-7">
                    <div className="card rounded-3 glass-card h-100">
                      <div className="card-body p-3">
                        <h3 className="fw-bold text-white mb-3 small text-uppercase text-secondary" style={{ letterSpacing: ".06em" }}>
                          Platform Spending Breakdown
                        </h3>
                        <div className="d-flex flex-column gap-3">
                          {CATEGORIES.map((cat) => {
                            const catAmt = stats.categoryTotals[cat] || 0;
                            const pct = stats.totalMoneySpent ? Math.round((catAmt / stats.totalMoneySpent) * 100) : 0;
                            const colorMap = { Food: "#818cf8", Commute: "#ec4899", "School Expenses": "#f59e0b", Others: "#10b981" };
                            return (
                              <div key={cat}>
                                <div className="d-flex justify-content-between text-white mb-1 small">
                                  <span className="fw-semibold">{cat}</span>
                                  <span className="text-secondary">{formatCurrency(catAmt)} ({pct}%)</span>
                                </div>
                                <div className="progress" style={{ height: 6, background: "rgba(255,255,255,.05)" }}>
                                  <div
                                    className="progress-bar"
                                    style={{
                                      width: `${pct}%`,
                                      background: colorMap[cat] || "#64748b",
                                      borderRadius: 3,
                                    }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Averages Panel */}
                  <div className="col-12 col-lg-5">
                    <div className="card rounded-3 glass-card h-100">
                      <div className="card-body p-3">
                        <h3 className="fw-bold text-white mb-3 small text-uppercase text-secondary" style={{ letterSpacing: ".06em" }}>
                          Average Metrics
                        </h3>
                        <div className="d-flex flex-column gap-3.5">
                          <div className="d-flex align-items-center justify-content-between">
                            <span className="text-secondary small">Average Daily Budget</span>
                            <span className="fw-bold text-white">₱{stats.averageBudget}</span>
                          </div>
                          <div className="d-flex align-items-center justify-content-between">
                            <span className="text-secondary small">Average Point Pool</span>
                            <span className="fw-bold text-success">
                              {stats.totalUsers ? Math.round(stats.totalPoints / stats.totalUsers) : 0} pts
                            </span>
                          </div>
                          <div className="d-flex align-items-center justify-content-between">
                            <span className="text-secondary small">Transactions per User</span>
                            <span className="fw-bold text-info">
                              {stats.totalUsers ? (stats.totalTransactions / stats.totalUsers).toFixed(1) : "0.0"}
                            </span>
                          </div>
                          <div className="d-flex align-items-center justify-content-between">
                            <span className="text-secondary small">Average Spent / User</span>
                            <span className="fw-bold text-warning">
                              {formatCurrency(stats.totalUsers ? stats.totalMoneySpent / stats.totalUsers : 0)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* --- EDIT USER MODAL --- */}
      <AnimatePresence>
        {editingUser && (
          <div
            className="position-fixed top-0 start-0 end-0 bottom-0 d-flex align-items-end align-items-lg-center justify-content-center px-3"
            style={{ background: "rgba(0,0,0,.7)", zIndex: 1100 }}
            onClick={() => setEditingUser(null)}
          >
            <motion.div
              className="w-100 card rounded-4 border-0 responsive-modal-card"
              style={{ maxWidth: 480 }}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="card-body p-4">
                <div className="d-flex align-items-center justify-content-between mb-3.5">
                  <h3 className="fs-5 fw-bold text-white mb-0">Edit User Profile</h3>
                  <button className="btn btn-outline-secondary border-0 p-1" onClick={() => setEditingUser(null)}>
                     <FiX size={18} />
                  </button>
                </div>

                <form onSubmit={handleUpdateUser} className="d-flex flex-column gap-3">
                  <div>
                    <label className="form-label text-uppercase small fw-semibold text-secondary mb-1">Display Name</label>
                    <input
                      type="text"
                      required
                      value={editingUser.displayName || ""}
                      onChange={(e) => setEditingUser({ ...editingUser, displayName: e.target.value })}
                      className="form-control"
                    />
                  </div>

                  <div className="row g-2">
                    <div className="col-6">
                      <label className="form-label text-uppercase small fw-semibold text-secondary mb-1">Total Points</label>
                      <input
                        type="number"
                        min={0}
                        required
                        value={editingUser.totalPoints || 0}
                        onChange={(e) => setEditingUser({ ...editingUser, totalPoints: e.target.value })}
                        className="form-control"
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label text-uppercase small fw-semibold text-secondary mb-1">Day Streak</label>
                      <input
                        type="number"
                        min={0}
                        required
                        value={editingUser.currentStreak || 0}
                        onChange={(e) => setEditingUser({ ...editingUser, currentStreak: e.target.value })}
                        className="form-control"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="form-label text-uppercase small fw-semibold text-secondary mb-1">Daily Budget (₱)</label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={editingUser.dailyBudget || 300}
                      onChange={(e) => setEditingUser({ ...editingUser, dailyBudget: e.target.value })}
                      className="form-control"
                    />
                  </div>

                  <div className="row g-2">
                    <div className="col-6">
                      <label className="form-label text-uppercase small fw-semibold text-secondary mb-1">System Role</label>
                      <select
                        value={editingUser.role || ""}
                        onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value || null })}
                        className="form-select"
                      >
                        <option value="">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    <div className="col-6">
                      <label className="form-label text-uppercase small fw-semibold text-secondary mb-1">Account Status</label>
                      <select
                        value={editingUser.disabled ? "disabled" : "active"}
                        onChange={(e) => setEditingUser({ ...editingUser, disabled: e.target.value === "disabled" })}
                        className="form-select"
                      >
                        <option value="active">Active</option>
                        <option value="disabled">Archived (Disabled)</option>
                      </select>
                    </div>
                  </div>

                  {editingUser.id === currentUser?.uid && editingUser.role !== "admin" && (
                    <div className="alert alert-warning py-1.5 small mb-0 mt-1">
                      ⚠️ Note: Demoting yourself will lock you out of this dashboard immediately.
                    </div>
                  )}

                  <button type="submit" className="btn gradient-btn fw-bold w-100 py-3 rounded-3 mt-2">
                    Save Changes
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- ADD/EDIT TEMPLATE MODAL --- */}
      <AnimatePresence>
        {showAddTemplate && (
          <div
            className="position-fixed top-0 start-0 end-0 bottom-0 d-flex align-items-end align-items-lg-center justify-content-center px-3"
            style={{ background: "rgba(0,0,0,.7)", zIndex: 1100 }}
            onClick={() => setShowAddTemplate(false)}
          >
            <motion.div
              className="w-100 card rounded-4 border-0 responsive-modal-card"
              style={{ maxWidth: 480 }}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="card-body p-4">
                <div className="d-flex align-items-center justify-content-between mb-3.5">
                  <h3 className="fs-5 fw-bold text-white mb-0">
                    {editingTemplate ? "Edit Quest Template" : "Add Quest Template"}
                  </h3>
                  <button className="btn btn-outline-secondary border-0 p-1" onClick={() => setShowAddTemplate(false)}>
                    <FiX size={18} />
                  </button>
                </div>

                <form onSubmit={handleSaveTemplate} className="d-flex flex-column gap-3">
                  <div className="row g-2">
                    <div className="col-4">
                      <label className="form-label text-uppercase small fw-semibold text-secondary mb-1">Emoji Icon</label>
                      <input
                        type="text"
                        maxLength={4}
                        required
                        value={templateForm.icon}
                        onChange={(e) => setTemplateForm({ ...templateForm, icon: e.target.value })}
                        className="form-control text-center"
                        style={{ fontSize: "1.2rem" }}
                      />
                    </div>
                    <div className="col-8">
                      <label className="form-label text-uppercase small fw-semibold text-secondary mb-1">Quest Type</label>
                      <select
                        value={templateForm.questType}
                        onChange={(e) => {
                          const newType = e.target.value;
                          // Auto-lock target to 1 when daily streak or daily zero_splurge is selected
                          const isLockedTarget = ["streak", "zero_splurge_days"].includes(newType) && (templateForm.period || "weekly") === "daily";
                          setTemplateForm({ ...templateForm, questType: newType, target: isLockedTarget ? 1 : templateForm.target });
                        }}
                        className="form-select text-white bg-dark border-secondary"
                      >
                        <option value="streak">Budget Streak (Days)</option>
                        <option value="total_spend_limit">Category Spend Limit (₱)</option>
                        <option value="zero_splurge_days">No Splurge Days (Days)</option>
                        <option value="savings_goal">Savings Goal (₱)</option>
                      </select>
                    </div>
                  </div>

                  {/* Informational Help Alert describing types & constraints dynamically */}
                  <div className="alert bg-white bg-opacity-5 border border-white border-opacity-10 py-2.5 px-3 small text-secondary mb-0 rounded-3">
                    {templateForm.period === "daily" ? (
                      <>
                        {templateForm.questType === "streak" && (
                          <span>🎯 <strong>Daily streak</strong>: Checks if daily total spending today is within daily budget. Target is always 1 day.</span>
                        )}
                        {templateForm.questType === "total_spend_limit" && (
                          <span>🎯 <strong>Daily spend limit</strong>: Keeps today's spending in category under target limit. Resets daily. Target is cash limit in pesos (e.g. 150).</span>
                        )}
                        {templateForm.questType === "zero_splurge_days" && (
                          <span>🎯 <strong>Daily Zero Splurge</strong>: Checks if you logged expenses today but spent ₱0 on a category. Resets daily. Target should be 1.</span>
                        )}
                        {templateForm.questType === "savings_goal" && (
                          <span>🎯 <strong>Daily Savings</strong>: Checks today's savings (Daily Budget - today's spend). Resets daily. Target is in pesos (e.g. 50).</span>
                        )}
                      </>
                    ) : (
                      <>
                        {templateForm.questType === "streak" && (
                          <span>🎯 <strong>Weekly Streak</strong>: Counts consecutive days from Sunday where daily spending is within daily budget. Target is number of days (e.g. 5).</span>
                        )}
                        {templateForm.questType === "total_spend_limit" && (
                          <span>🎯 <strong>Weekly Spend Limit</strong>: Keeps total spending in a category under target limit for the entire week. Resets Sunday. Target is in pesos (e.g. 1000).</span>
                        )}
                        {templateForm.questType === "zero_splurge_days" && (
                          <span>🎯 <strong>Weekly Zero Splurge Days</strong>: Counts how many days this week have ₱0 expenses logged in a chosen category. Target is number of days (e.g. 3).</span>
                        )}
                        {templateForm.questType === "savings_goal" && (
                          <span>🎯 <strong>Weekly Savings Goal</strong>: Tracks total money saved this week. Resets Sunday. Target is in pesos (e.g. 500).</span>
                        )}
                      </>
                    )}
                  </div>

                  <div className="row g-2">
                    <div className="col-12">
                      <label className="form-label text-uppercase small fw-semibold text-secondary mb-1">Quest Period</label>
                      <select
                        value={templateForm.period || "weekly"}
                        onChange={(e) => {
                          const newPeriod = e.target.value;
                          // Auto-lock target to 1 when switching to daily streak or daily zero_splurge mode
                          const isLockedTarget = ["streak", "zero_splurge_days"].includes(templateForm.questType) && newPeriod === "daily";
                          setTemplateForm({ ...templateForm, period: newPeriod, target: isLockedTarget ? 1 : templateForm.target });
                        }}
                        className="form-select text-white bg-dark border-secondary"
                      >
                        <option value="weekly">Weekly Reset</option>
                        <option value="daily">Daily Reset</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="form-label text-uppercase small fw-semibold text-secondary mb-1">Title</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Budget Warrior"
                      value={templateForm.title}
                      onChange={(e) => setTemplateForm({ ...templateForm, title: e.target.value })}
                      className="form-control text-white bg-dark border-secondary"
                    />
                  </div>

                  <div>
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <label className="form-label text-uppercase small fw-semibold text-secondary mb-0">Description</label>
                      {suggestedDescription && (
                        <button
                          type="button"
                          onClick={() => setTemplateForm((prev) => ({ ...prev, description: suggestedDescription }))}
                          className="btn btn-link p-0 small text-decoration-none"
                          style={{ fontSize: ".72rem", color: "#818cf8" }}
                        >
                          ✨ Auto-fill Suggested
                        </button>
                      )}
                    </div>
                    <textarea
                      required
                      rows={2}
                      placeholder="e.g. Spend less than your budget limit..."
                      value={templateForm.description}
                      onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                      className="form-control text-white bg-dark border-secondary"
                    />
                  </div>

                  <div className="row g-2">
                    <div className="col-6">
                      <label className="form-label text-uppercase small fw-semibold text-secondary mb-1 font-monospace">
                        {["category", "total_spend_limit", "savings_goal"].includes(templateForm.questType)
                          ? "Target (₱)"
                          : "Target (Days)"}
                      </label>
                      <input
                        type="number"
                        min={1}
                        required
                        placeholder={["category", "total_spend_limit", "savings_goal"].includes(templateForm.questType) ? "e.g. 500" : "e.g. 5"}
                        value={templateForm.target}
                        onChange={(e) => setTemplateForm({ ...templateForm, target: e.target.value })}
                        className="form-control text-white bg-dark border-secondary"
                        // Lock to 1 for daily streak/zero_splurge — the engine hardcodes progress as 0 or 1 for these, making any other value impossible to reach
                        readOnly={["streak", "zero_splurge_days"].includes(templateForm.questType) && templateForm.period === "daily"}
                        style={["streak", "zero_splurge_days"].includes(templateForm.questType) && templateForm.period === "daily" ? { opacity: 0.5, cursor: "not-allowed" } : {}}
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label text-uppercase small fw-semibold text-secondary mb-1">Points Reward</label>
                      <input
                        type="number"
                        min={1}
                        required
                        placeholder="e.g. 100"
                        value={templateForm.pointsReward}
                        onChange={(e) => setTemplateForm({ ...templateForm, pointsReward: e.target.value })}
                        className="form-control text-white bg-dark border-secondary"
                      />
                    </div>
                  </div>

                  {["days_under_category_limit", "total_spend_limit", "zero_splurge_days", "category"].includes(templateForm.questType) && (
                    <div>
                      <label className="form-label text-uppercase small fw-semibold text-secondary mb-1">Specific Category</label>
                      <select
                        value={templateForm.category}
                        required
                        onChange={(e) => setTemplateForm({ ...templateForm, category: e.target.value })}
                        className="form-select text-white bg-dark border-secondary"
                      >
                        <option value="" disabled>Select category...</option>
                        {CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <button type="submit" className="btn gradient-btn fw-bold w-100 py-3 rounded-3 mt-2">
                    {editingTemplate ? "Save Changes" : "Create Template"}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
