import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useExpenses } from "../../context/ExpenseContext";
import { formatCurrency, formatDate, groupExpensesByDate } from "../../utils/formatters";
import ExpenseForm from "../../components/ExpenseForm/ExpenseForm";

const CATS    = ["All", "Food", "Commute", "School Expenses", "Others"];
const CAT_EMO = { Food: "🍱", Commute: "🚌", "School Expenses": "📚", Others: "🛍️" };

function BottomSheet({ show, onClose, title, children }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="position-fixed top-0 start-0 end-0 bottom-0 d-flex align-items-end justify-content-center"
          style={{ background: "rgba(0,0,0,.6)", zIndex: 1100 }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div className="w-100" style={{ maxWidth: 480 }}
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="card rounded-top-4 rounded-bottom-0 border-0">
              <div className="card-body pb-5">
                <div className="offcanvas-handle" />
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

export default function Expenses() {
  const { expenses, deleteExpense } = useExpenses();
  const [filterCat,    setFilterCat]    = useState("All");
  const [editExpense,  setEditExpense]  = useState(null);
  const [deleteId,     setDeleteId]     = useState(null);

  const filtered = useMemo(() =>
    filterCat === "All" ? expenses : expenses.filter((e) => e.category === filterCat),
    [expenses, filterCat]);

  const grouped = groupExpensesByDate(filtered);
  const dates   = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div className="page-content">

      {/* Filter chips — Bootstrap nav-pills */}
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
                <div className="d-flex justify-content-between align-items-center mb-2 px-1">
                  <span className="text-uppercase small fw-bold text-secondary" style={{ fontSize: ".72rem" }}>{formatDate(date)}</span>
                  <span className="small fw-bold text-secondary">{formatCurrency(grouped[date].reduce((s, e) => s + Number(e.amount), 0))}</span>
                </div>
                <ul className="list-group rounded-3" style={{ overflow: "hidden" }}>
                  {grouped[date].map((expense) => (
                    <motion.li key={expense.id} layout
                      className="list-group-item d-flex align-items-center gap-3 px-3 py-2"
                      initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                    >
                      <span style={{ fontSize: "1.25rem" }}>{CAT_EMO[expense.category] || "💸"}</span>
                      <div className="flex-fill">
                        <p className="fw-semibold text-white mb-0 small">{expense.note || expense.category}</p>
                        <span className="badge rounded-pill bg-secondary bg-opacity-25 text-secondary" style={{ fontSize: ".65rem" }}>{expense.category}</span>
                      </div>
                      <div className="d-flex flex-column align-items-end gap-1">
                        <span className="fw-bold text-danger small">{formatCurrency(expense.amount)}</span>
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

      {/* Edit bottom sheet */}
      <BottomSheet show={!!editExpense} onClose={() => setEditExpense(null)} title="Edit Expense">
        <ExpenseForm initialData={editExpense} expenseId={editExpense?.id} onSuccess={() => setEditExpense(null)} />
      </BottomSheet>

      {/* Delete confirm bottom sheet */}
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
