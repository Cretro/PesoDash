import { useEffect, useState, useMemo } from "react";
import {
  LineChart, Line, PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { useExpenses } from "../../context/ExpenseContext";
import { useAuth }     from "../../context/AuthContext";
import { fetchAdvice } from "../../api/adviceSlip";
import { formatCurrency } from "../../utils/formatters";

const CAT_COLORS = { Food: "#6366f1", Commute: "#ec4899", "School Expenses": "#f59e0b", Others: "#10b981" };
const CATS = ["Food", "Commute", "School Expenses", "Others"];
const TT_STYLE = { background: "#1e293b", border: "1px solid rgba(255,255,255,.1)", borderRadius: ".75rem", color: "#f8fafc", fontSize: ".8rem" };

export default function Analytics() {
  const { expenses }   = useExpenses();
  const { userProfile } = useAuth();
  const [advice, setAdvice] = useState("");
  const dailyBudget = userProfile?.dailyBudget || 300;

  useEffect(() => { fetchAdvice().then(setAdvice); }, []);

  const trendData = useMemo(() => {
    const days = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const ds = d.toISOString().split("T")[0];
      const total = expenses.filter((e) => e.date === ds).reduce((s, e) => s + Number(e.amount), 0);
      days.push({ date: d.toLocaleDateString("en-PH", { month: "short", day: "numeric" }), amount: total });
    }
    return days;
  }, [expenses]);

  const pieData = useMemo(() => {
    const now = new Date();
    const me = expenses.filter((e) => { const d = new Date(e.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
    return CATS.map((cat) => ({ name: cat, value: me.filter((e) => e.category === cat).reduce((s, e) => s + Number(e.amount), 0) })).filter((d) => d.value > 0);
  }, [expenses]);

  const barData = useMemo(() => {
    const now = new Date();
    return CATS.map((cat) => {
      const actual = expenses.filter((e) => e.category === cat && new Date(e.date).getMonth() === now.getMonth()).reduce((s, e) => s + Number(e.amount), 0);
      return { category: cat.split(" ")[0], actual, budget: dailyBudget * 4 };
    });
  }, [expenses, dailyBudget]);

  const totalMonth = pieData.reduce((s, d) => s + d.value, 0);

  return (
    <div className="page-content">

      {/* Tip card */}
      {advice && (
        <div className="card rounded-3 mb-3" style={{ background: "rgba(99,102,241,.08)", border: "1px solid rgba(99,102,241,.2)" }}>
          <div className="card-body d-flex gap-3 align-items-start py-3">
            <span style={{ fontSize: "1.2rem", flexShrink: 0 }}>💡</span>
            <p className="mb-0 small fst-italic" style={{ color: "#c4b5fd" }}>"{advice}"</p>
          </div>
        </div>
      )}

      {/* Summary — Bootstrap grid */}
      <div className="row g-2 mb-3">
        {[
          { label: "This Month", value: formatCurrency(totalMonth) },
          { label: "Daily Budget", value: formatCurrency(dailyBudget) },
          { label: "Transactions", value: expenses.length },
        ].map((s) => (
          <div className="col-4" key={s.label}>
            <div className="card rounded-3 h-100 glass-card">
              <div className="card-body text-center p-2">
                <p className="text-uppercase small fw-semibold text-secondary mb-1" style={{ fontSize: ".6rem" }}>{s.label}</p>
                <p className="fw-black text-white mb-0" style={{ fontSize: ".9rem" }}>{s.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      {[
        {
          title: "30-Day Spending Trend",
          chart: (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={trendData}>
                <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 9 }} tickLine={false} axisLine={false} interval={6} />
                <YAxis tick={{ fill: "#64748b", fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={(v) => `₱${v}`} />
                <Tooltip contentStyle={TT_STYLE} formatter={(v) => formatCurrency(v)} />
                <Line type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: "#818cf8" }} />
              </LineChart>
            </ResponsiveContainer>
          )
        },
        {
          title: "This Month by Category",
          chart: pieData.length === 0
            ? <p className="text-secondary text-center small py-4">No data for this month.</p>
            : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4}>
                    {pieData.map((e) => <Cell key={e.name} fill={CAT_COLORS[e.name] || "#6366f1"} />)}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={TT_STYLE} />
                  <Legend wrapperStyle={{ fontSize: ".75rem", color: "#94a3b8" }} />
                </PieChart>
              </ResponsiveContainer>
            )
        },
        {
          title: "Budget vs Actual (Weekly)",
          chart: (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData} barCategoryGap="30%">
                <XAxis dataKey="category" tick={{ fill: "#64748b", fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: "#64748b", fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={(v) => `₱${v}`} />
                <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={TT_STYLE} />
                <Legend wrapperStyle={{ fontSize: ".75rem", color: "#94a3b8" }} />
                <Bar dataKey="budget" name="Budget" fill="rgba(99,102,241,.25)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="actual" name="Actual" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )
        }
      ].map(({ title, chart }) => (
        <div className="card rounded-3 glass-card mb-3" key={title}>
          <div className="card-body">
            <p className="fw-bold text-white small mb-3">{title}</p>
            {chart}
          </div>
        </div>
      ))}

    </div>
  );
}
