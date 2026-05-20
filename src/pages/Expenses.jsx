import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useExpenses } from "../context/ExpenseContext";
import { formatCurrency, formatDate, groupExpensesByDate } from "../utils/formatters";
import ExpenseForm from "../components/ExpenseForm";

// Category definitions & Emojis helper
const CATS    = ["All", "Food", "Commute", "School Expenses", "Others"];
const CAT_EMO = { Food: "🍱", Commute: "🚌", "School Expenses": "📚", Others: "🛍️" };

/**
 * BottomSheet Component
 * 
 * Purpose: A modern modal sheet that slides up from the bottom of the viewport on mobile devices.
 * Uses Framer Motion:
 *  - `AnimatePresence`: Allows elements to complete exit animations before they are fully unmounted from the DOM.
 *  - `motion.div`: Animates the slide up (`y: "100%" -> 0`) using spring dynamics for premium tactile feedback.
 */
function BottomSheet({ show, onClose, title, children }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="position-fixed top-0 start-0 end-0 bottom-0 d-flex align-items-end align-items-lg-center justify-content-center px-3 px-lg-0"
          style={{ background: "rgba(0,0,0,.6)", zIndex: 1100 }}
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }}
          onClick={onClose} // Closes the bottom sheet when clicking outside (on the backdrop overlay)
        >
          <motion.div className="w-100" style={{ maxWidth: 480 }}
            initial={{ y: "100%" }} 
            animate={{ y: 0 }} 
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()} // Stop event bubbling so clicks inside the card do not close it
          >
            <div className="card rounded-top-4 rounded-bottom-0 border-0 responsive-modal-card">
              <div className="card-body pb-5">
                <div className="offcanvas-handle d-lg-none" />
                <h2 className="fs-5 fw-bold text-white mb-3">{title}</h2>
                {children}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Expenses Page Component
 * 
 * Purpose: Displays the user's transaction logs chronologically.
 * Key Features:
 *  - **Filter Chips**: Filter items by categories (Food, Commute, etc.) instantly.
 *  - **Chronological Grouping**: Groups single expenses by date headers using helper `groupExpensesByDate`.
 *  - **CRUD Operations**: Handles inline edit triggers and deletion prompts using bottom sheets.
 */
export default function Expenses() {
  const { expenses, deleteExpense } = useExpenses();
  
  // UI and CRUD states
  const [filterCat,    setFilterCat]    = useState("All");
  const [editExpense,  setEditExpense]  = useState(null);
  const [deleteId,     setDeleteId]     = useState(null);

  // useMemo: Filter the full expense array based on selected chip.
  const filtered = useMemo(() =>
    filterCat === "All" ? expenses : expenses.filter((e) => e.category === filterCat),
    [expenses, filterCat]);

  // Transform flat list array: [ {date: "2026-05-20", amount: 50}, ... ]
  // Into key-value object: { "2026-05-20": [expense1, expense2], ... }
  const grouped = groupExpensesByDate(filtered);
  // Sort date keys in descending order (latest dates first)
  const dates   = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div className="page-content" style={{ maxWidth: 720 }}>

      {/* Filter chips category navigation row */}
      <ul className="nav nav-pills gap-2 mb-3 flex-nowrap" style={{ overflowX: "auto", scrollbarWidth: "none" }}>
        {CATS.map((cat) => (
          <li className="nav-item" key={cat}>
            <button
              className={`nav-link px-3 py-2 ${filterCat === cat ? "active" : ""}`}
              style={{ whiteSpace: "nowrap", minHeight: 38, fontSize: ".85rem" }}
              onClick={() => setFilterCat(cat)}
              id={`filter-${cat.toLowerCase().replace(/\s/g, "-")}`}
            >
              {cat}
            </button>
          </li>
        ))}
      </ul>

      {/* Conditional rendering depending on expense list availability */}
      {dates.length === 0
        ? (
          <div className="card rounded-3 glass-card">
            <div className="card-body text-center py-5">
              <div style={{ fontSize: "3rem" }}>🧾</div>
              <p className="text-secondary small mt-2">No expenses yet.<br />Tap + to add your first one!</p>
            </div>
          </div>
        )
        : (
          <div className="d-flex flex-column gap-3">
            {dates.map((date) => (
              <div key={date}>
                {/* Date header with daily subtotal */}
                <div className="d-flex justify-content-between align-items-center mb-2 px-1">
                  <span className="text-uppercase small fw-bold text-secondary" style={{ fontSize: ".72rem" }}>{formatDate(date)}</span>
                  <span className="small fw-bold text-secondary">{formatCurrency(grouped[date].reduce((s, e) => s + Number(e.amount), 0))}</span>
                </div>
                {/* Transaction list cards grouped under this date */}
                <ul className="list-group rounded-3" style={{ overflow: "hidden" }}>
                  {grouped[date].map((expense) => (
                    <motion.li key={expense.id} layout
                      className="list-group-item d-flex align-items-center gap-3 px-3 py-2"
                      initial={{ opacity: 0, x: -12 }} 
                      animate={{ opacity: 1, x: 0 }}
                    >
                      <span style={{ fontSize: "1.25rem" }}>{CAT_EMO[expense.category] || "💸"}</span>
                      <div className="flex-fill">
                        <p className="fw-semibold text-white mb-0 small">{expense.note || expense.category}</p>
                        <span className="badge rounded-pill bg-secondary bg-opacity-25 text-secondary" style={{ fontSize: ".65rem" }}>{expense.category}</span>
                      </div>
                      <div className="d-flex flex-column align-items-end gap-1">
                        <span className="fw-bold text-danger small">{formatCurrency(expense.amount)}</span>
                        {/* Transaction CRUD triggers */}
                        <div className="d-flex gap-1">
                          <button className="btn btn-sm btn-outline-secondary rounded" style={{ padding: "2px 8px", fontSize: ".75rem" }}
                            onClick={() => setEditExpense(expense)} id={`edit-${expense.id}`}>✏️</button>
                          <button className="btn btn-sm btn-outline-danger rounded" style={{ padding: "2px 8px", fontSize: ".75rem" }}
                            onClick={() => setDeleteId(expense.id)} id={`del-${expense.id}`}>🗑️</button>
                        </div>
                      </div>
                    </motion.li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )
      }

      {/* Edit Form Modal Sheet */}
      <BottomSheet show={!!editExpense} onClose={() => setEditExpense(null)} title="Edit Expense">
        <ExpenseForm initialData={editExpense} expenseId={editExpense?.id} onSuccess={() => setEditExpense(null)} />
      </BottomSheet>

      {/* Delete Confirmation Sheet */}
      <BottomSheet show={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Expense">
        <p className="text-secondary small mb-3">Are you sure you want to delete this expense?</p>
        <div className="d-flex gap-3">
          <button className="btn btn-outline-secondary flex-fill py-3 rounded-3 fw-semibold" onClick={() => setDeleteId(null)}>Cancel</button>
          <button className="btn btn-danger flex-fill py-3 rounded-3 fw-bold" onClick={async () => { await deleteExpense(deleteId); setDeleteId(null); }} id="confirm-delete-btn">Delete</button>
        </div>
      </BottomSheet>

    </div>
  );
}
