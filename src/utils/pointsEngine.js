import { getTodayString, sumExpenses } from "./formatters";

export function calculateStreak(expenses, dailyBudget) {
  if (!expenses.length) return 0;
  const grouped = {};
  expenses.forEach((e) => {
    if (!grouped[e.date]) grouped[e.date] = 0;
    grouped[e.date] += Number(e.amount);
  });

  let streak = 0;
  let checkDate = new Date();
  checkDate.setDate(checkDate.getDate() - 1); // start from yesterday

  while (true) {
    const dateStr = checkDate.toISOString().split("T")[0];
    const dayTotal = grouped[dateStr] || 0;
    if (dayTotal <= dailyBudget) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
    if (streak > 365) break;
  }
  return streak;
}

export function calculatePoints(streak) {
  // 10 points per streak day, bonus at 7-day milestones
  const base = streak * 10;
  const bonus = Math.floor(streak / 7) * 50;
  return base + bonus;
}

export function isTodayUnderBudget(expenses, dailyBudget) {
  const todayStr = getTodayString();
  const todayExpenses = expenses.filter((e) => e.date === todayStr);
  return sumExpenses(todayExpenses) <= dailyBudget;
}
