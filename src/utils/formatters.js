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
  return new Date().toISOString().split("T")[0];
}

export function sumExpenses(expenses) {
  return expenses.reduce((sum, e) => sum + Number(e.amount), 0);
}
