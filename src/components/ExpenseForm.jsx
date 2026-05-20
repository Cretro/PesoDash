import { useState } from "react";
import { useExpenses } from "../context/ExpenseContext";
import { getTodayString } from "../utils/formatters";

const CATEGORIES = ["Food", "Commute", "School Expenses", "Others"];

/**
 * ExpenseForm Component
 * 
 * Purpose: Provides a input interface for logging new expenses or editing existing ones.
 * Design Highlights:
 *  - **Create vs Update Reuse**: If `expenseId` and `initialData` are provided, the form 
 *    pre-populates those fields and acts as an "Update" form. Otherwise, it defaults to a clean "Log" form.
 *  - **Input Validation**: Ensures numeric bounds (amount > 0) and prevents users from selecting future dates.
 *  - **Category Select Chips**: Custom capsule buttons that act as tag selectors.
 */
export default function ExpenseForm({ onSuccess, initialData = null, expenseId = null }) {
  const { addExpense, updateExpense } = useExpenses();
  
  // Local state initialized with existing data if editing, or defaults if logging a new transaction
  const [form, setForm] = useState({
    amount:   initialData?.amount   || "",
    category: initialData?.category || "Food",
    note:     initialData?.note     || "",
    date:     initialData?.date     || getTodayString(),
  });
  
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);

  // Sync state values dynamically on keyboard inputs
  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  }

  // Pre-submit validation check
  function validate() {
    if (!form.amount || isNaN(form.amount) || Number(form.amount) <= 0)
      return "Enter a valid amount.";
    if (!form.date) return "Select a date.";
    // Prevents logging expenses in the future using timezone-safe string comparison
    if (form.date > getTodayString()) return "Date can't be in the future.";
    return null;
  }

  // Handle form submission
  async function handleSubmit(e) {
    e.preventDefault();
    const err = validate();
    if (err) { 
      setError(err); 
      return; 
    }
    
    setLoading(true);
    try {
      const data = { ...form, amount: Number(form.amount) };
      
      // Dual Behavior: Calls updateDoc if expenseId exists, or addDoc if logging new
      if (expenseId) {
        await updateExpense(expenseId, data);
      } else {
        await addExpense(data);
      }
      
      // Triggers parent callback (e.g. to close the bottom sheets)
      onSuccess?.();
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {error && <div className="alert alert-danger py-2 small">{error}</div>}

      {/* Currency Amount Display (Custom transparent border input) */}
      <div className="input-group mb-3"
        style={{ background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", borderRadius: ".75rem", overflow: "hidden" }}>
        <span className="input-group-text fw-bold fs-4 border-0"
          style={{ background: "transparent", color: "var(--pd-primary)" }}>₱</span>
        <input
          id="expense-amount"
          type="number"
          name="amount"
          value={form.amount}
          onChange={handleChange}
          placeholder="0.00"
          className="form-control border-0 fw-bold fs-4"
          style={{ background: "transparent" }}
          inputMode="decimal"
          required
        />
      </div>

      {/* Category selector capsules */}
      <div className="mb-3">
        <label className="form-label text-uppercase small fw-semibold text-secondary">Category</label>
        <div className="d-flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`btn btn-sm rounded-pill ${form.category === cat ? "btn-primary" : "btn-outline-secondary"}`}
              onClick={() => setForm({ ...form, category: cat })}
              style={{ minHeight: 38 }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Description note */}
      <div className="mb-3">
        <label htmlFor="expense-note" className="form-label text-uppercase small fw-semibold text-secondary">Note (optional)</label>
        <input
          id="expense-note"
          type="text"
          name="note"
          value={form.note}
          onChange={handleChange}
          placeholder="e.g. Lunch at canteen"
          className="form-control"
          maxLength={80}
        />
      </div>

      {/* Date selector */}
      <div className="mb-3">
        <label htmlFor="expense-date" className="form-label text-uppercase small fw-semibold text-secondary">Date</label>
        <input
          id="expense-date"
          type="date"
          name="date"
          value={form.date}
          onChange={handleChange}
          className="form-control"
          max={getTodayString()} // Prevents select future dates in calendar UI
          required
        />
      </div>

      <button
        type="submit"
        className="btn btn-primary w-100 fw-bold py-3"
        style={{ minHeight: 52, borderRadius: ".875rem" }}
        disabled={loading}
        id="expense-form-submit"
      >
        {loading ? "Saving…" : expenseId ? "Update Expense" : "Log Expense"}
      </button>
    </form>
  );
}
