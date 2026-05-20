import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  LineChart, Line, PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { useExpenses } from "../context/ExpenseContext";
import { useAuth }     from "../context/AuthContext";
import { fetchExchangeRates, CURRENCIES } from "../api/currencyApi";
import { formatCurrency } from "../utils/formatters";

// Themes & Palette settings
const CAT_COLORS = { Food: "#6366f1", Commute: "#ec4899", "School Expenses": "#f59e0b", Others: "#10b981" };
const CATS = ["Food", "Commute", "School Expenses", "Others"];
const TT_STYLE = { background: "#1e293b", border: "1px solid rgba(255,255,255,.1)", borderRadius: ".75rem", color: "#f8fafc", fontSize: ".8rem" };

/**
 * Analytics Page Component
 * 
 * Purpose: Renders statistical spending diagrams using the Recharts library.
 * Key Charts & Widgets:
 *  1. **Line Chart**: Tracks 30-day historical transaction spending trends.
 *  2. **Bar Chart**: Side-by-side comparison of budget vs actual spending per category.
 *  3. **Pie Chart**: Visual distribution of monthly spending.
 *  4. **Exchange Rates Widget**: Fetches real-time PHP conversion rates using Frankfurter public API.
 */
export default function Analytics() {
  const { expenses }    = useExpenses();
  const { userProfile } = useAuth();
  
  // Exchange Rate States
  const [rates, setRates] = useState(null);
  const [ratesDate, setRatesDate] = useState("");
  const [ratesError, setRatesError] = useState(false);
  const dailyBudget = userProfile?.dailyBudget || 300;

  // Effect: Fetches external exchange rate values on mount.
  useEffect(() => {
    fetchExchangeRates()
      .then(({ date, rates }) => { 
        setRates(rates); 
        setRatesDate(date); 
      })
      .catch(() => setRatesError(true));
  }, []);

  // useMemo: Reconstructs a sliding 30-day index of dates (day-by-day).
  // Maps expenses to each day to build coordinates for the Line Chart.
  // Uses PH timezone to match expense date format stored in Firestore.
  const trendData = useMemo(() => {
    const days = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); 
      d.setDate(d.getDate() - i);
      // Use local PH date string to match how expenses store dates
      const ph = new Date(d.toLocaleString("en-US", { timeZone: "Asia/Manila" }));
      const y = ph.getFullYear();
      const m = String(ph.getMonth() + 1).padStart(2, "0");
      const day = String(ph.getDate()).padStart(2, "0");
      const ds = `${y}-${m}-${day}`;
      const total = expenses
        .filter((e) => e.date === ds)
        .reduce((sum, e) => sum + Number(e.amount), 0);
      days.push({ 
        date: ph.toLocaleDateString("en-PH", { month: "short", day: "numeric" }), 
        amount: total 
      });
    }
    return days;
  }, [expenses]);

  // useMemo: Aggregates current month expenses per category for the Pie Chart.
  const pieData = useMemo(() => {
    const now = new Date();
    const currentMonthExpenses = expenses.filter((e) => { 
      const d = new Date(e.date); 
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); 
    });
    return CATS.map((cat) => ({ 
      name: cat, 
      value: currentMonthExpenses.filter((e) => e.category === cat).reduce((sum, e) => sum + Number(e.amount), 0) 
    })).filter((d) => d.value > 0); // Exclude empty categories to hide empty chart slices
  }, [expenses]);

  // useMemo: Formats category actual spending vs daily limit rules for the Bar Chart.
  const barData = useMemo(() => {
    const now = new Date();
    return CATS.map((cat) => {
      const actual = expenses
        .filter((e) => e.category === cat && new Date(e.date).getMonth() === now.getMonth())
        .reduce((sum, e) => sum + Number(e.amount), 0);
      return { 
        category: cat.split(" ")[0], // Truncates labels for mobile layout alignment
        actual, 
        budget: dailyBudget * 7 // Weekly aggregate budget per category
      };
    });
  }, [expenses, dailyBudget]);

  const totalMonth = pieData.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="page-content">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="row g-4">
          
          {/* Left Main Column: Visual Performance Charts */}
          <div className="col-12 col-lg-8 order-2 order-lg-1">
            
            {/* 30-Day Spending Trend Line Chart */}
            <div className="card rounded-3 glass-card mb-3">
              <div className="card-body">
                <p className="fw-bold text-white small mb-3">30-Day Spending Trend</p>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={trendData}>
                    <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 9 }} tickLine={false} axisLine={false} interval={6} />
                    <YAxis tick={{ fill: "#64748b", fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={(v) => `₱${v}`} />
                    <Tooltip contentStyle={TT_STYLE} formatter={(v) => formatCurrency(v)} />
                    <Line type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: "#818cf8" }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Budget vs Actual Side-by-Side Bar Chart */}
            <div className="card rounded-3 glass-card mb-3">
              <div className="card-body">
                <p className="fw-bold text-white small mb-3">Budget vs Actual (Weekly)</p>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={barData} barCategoryGap="30%">
                    <XAxis dataKey="category" tick={{ fill: "#64748b", fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: "#64748b", fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={(v) => `₱${v}`} />
                    <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={TT_STYLE} />
                    <Legend wrapperStyle={{ fontSize: ".75rem", color: "#94a3b8" }} />
                    <Bar dataKey="budget" name="Budget" fill="rgba(99,102,241,.25)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="actual" name="Actual" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Right Sidebar: Key Metrics & Exchange Widgets */}
          <div className="col-12 col-lg-4 order-1 order-lg-2">
            
            {/* Quick Aggregate Indicators */}
            <div className="row g-2 mb-3">
              {[
                { label: "This Month", value: formatCurrency(totalMonth) },
                { label: "Daily Budget", value: formatCurrency(dailyBudget) },
                { label: "Transactions", value: expenses.length },
              ].map((s) => (
                <div className="col-4" key={s.label}>
                  <div className="card rounded-3 h-100 glass-card">
                    <div className="card-body text-center p-2">
                      <p className="text-uppercase small fw-semibold text-secondary mb-1" style={{ fontSize: ".65rem" }}>{s.label}</p>
                      <p className="fw-black text-white mb-0" style={{ fontSize: ".9rem" }}>{s.value}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Categorical Distribution Pie Chart */}
            <div className="card rounded-3 glass-card mb-3">
              <div className="card-body">
                <p className="fw-bold text-white small mb-3">This Month by Category</p>
                {pieData.length === 0 ? (
                  <p className="text-secondary text-center small py-4">No data for this month.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4}>
                        {pieData.map((e) => <Cell key={e.name} fill={CAT_COLORS[e.name] || "#6366f1"} />)}
                      </Pie>
                      <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={TT_STYLE} />
                      <Legend wrapperStyle={{ fontSize: ".75rem", color: "#94a3b8" }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Exchange Rate Converter API Widget */}
            <div className="card rounded-3 mb-3" style={{ background: "rgba(99,102,241,.08)", border: "1px solid rgba(99,102,241,.2)" }}>
              <div className="card-body py-3">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="fw-bold text-white small">🌐 PHP Exchange Rates</span>
                  {ratesDate && <span className="text-secondary" style={{ fontSize: ".7rem" }}>Updated: {ratesDate}</span>}
                </div>
                {ratesError ? (
                  <p className="text-secondary small mb-0">Could not load rates. Check connection.</p>
                ) : !rates ? (
                  <p className="text-secondary small mb-0">Loading rates…</p>
                ) : (
                  <div className="row g-1">
                    {CURRENCIES.map((cur) => (
                      <div className="col-12" key={cur.code}>
                        <div className="d-flex align-items-center justify-content-between py-1" style={{ borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                          <span className="small">{cur.flag} <span className="fw-semibold text-white">{cur.code}</span> <span className="text-secondary" style={{ fontSize: ".75rem" }}>{cur.name}</span></span>
                          <span className="fw-bold" style={{ color: "#818cf8", fontSize: ".875rem" }}>₱{Number(rates[cur.code]).toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
