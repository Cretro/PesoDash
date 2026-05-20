export function formatCurrency(amount) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateStr) {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function groupExpensesByDate(expenses) {
  return expenses.reduce((groups, expense) => {
    const date = expense.date;
    if (!groups[date]) groups[date] = [];
    groups[date].push(expense);
    return groups;
  }, {});
}

export function getTodayString() {
  const ph = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }));
  const y = ph.getFullYear();
  const m = String(ph.getMonth() + 1).padStart(2, "0");
  const d = String(ph.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function sumExpenses(expenses) {
  return expenses.reduce((sum, e) => sum + Number(e.amount), 0);
}
