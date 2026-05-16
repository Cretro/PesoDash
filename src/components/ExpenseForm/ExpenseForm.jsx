import { useState } from "react";
import { useExpenses } from "../../context/ExpenseContext";
import { getTodayString } from "../../utils/formatters";

const CATEGORIES = ["Food", "Commute", "School Expenses", "Others"];

export default function ExpenseForm({ onSuccess, initialData = null, expenseId = null }) {
  const { addExpense, updateExpense } = useExpenses();
  const [form, setForm] = useState({
    amount:   initialData?.amount   || "",
    category: initialData?.category || "Food",
    note:     initialData?.note     || "",
    date:     initialData?.date     || getTodayString(),
  });
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  }

  function validate() {
    if (!form.amount || isNaN(form.amount) || Number(form.amount) <= 0)
      return "Enter a valid amount.";
    if (!form.date) return "Select a date.";
    if (new Date(form.date) > new Date()) return "Date can't be in the future.";
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setLoading(true);
    try {
      const data = { ...form, amount: Number(form.amount) };
      expenseId ? await updateExpense(expenseId, data) : await addExpense(data);
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

      {/* Amount — large */}
      <div className="input-group mb-3"
        style={{ background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", borderRadius: ".75rem", overflow: "hidden" }}>
        <span className="input-group-text fw-bold fs-4 border-0"
          style={{ background: "transparent", color: "#6366f1" }}>₱</span>
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

      {/* Category chips */}
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

      {/* Note */}
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

      {/* Date */}
      <div className="mb-3">
        <label htmlFor="expense-date" className="form-label text-uppercase small fw-semibold text-secondary">Date</label>
        <input
          id="expense-date"
          type="date"
          name="date"
          value={form.date}
          onChange={handleChange}
          className="form-control"
          max={getTodayString()}
          required
        />
      </div>

      <button
        type="submit"
        className="btn gradient-btn w-100 fw-bold py-3"
        style={{ minHeight: 52, borderRadius: ".875rem" }}
        disabled={loading}
        id="expense-form-submit"
      >
        {loading ? "Saving…" : expenseId ? "Update Expense" : "Log Expense"}
      </button>
    </form>
  );
}
