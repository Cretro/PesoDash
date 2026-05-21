import { formatCurrency } from "../../utils/formatters";

const CATEGORIES = ["Food", "Commute", "School Expenses", "Others"];

/**
 * AdminStatsPanel Component
 *
 * Purpose: Renders the Platform Stats tab within the AdminDashboard.
 * Displays aggregated real-time business intelligence across all users and expenses:
 *  - Scorecard KPIs (total users, points, transactions, money tracked)
 *  - Category spending breakdown with progress bars
 *  - Average metrics per user
 *
 * Props:
 *  - loadingExpenses {boolean}  Whether the Firestore expenses snapshot is still loading.
 *  - loadingUsers    {boolean}  Whether the Firestore users snapshot is still loading.
 *  - stats           {Object}   Memoized aggregate object from the parent containing:
 *      - totalUsers, totalTransactions, totalMoneySpent,
 *        averageBudget, totalPoints, categoryTotals
 */
export default function AdminStatsPanel({ loadingExpenses, loadingUsers, stats }) {
  return (
    <div className="panel-container">
      {loadingExpenses || loadingUsers ? (
        <div className="text-center py-5 text-secondary">Analyzing platform aggregates...</div>
      ) : (
        <div className="d-flex flex-column gap-4">
          {/* Statistics Scorecards */}
          <div className="row g-3">
            {[
              { label: "Total Users", value: stats.totalUsers, color: "var(--pd-primary)" },
              { label: "Total Points Awarded", value: stats.totalPoints, color: "var(--pd-reward)" },
              { label: "Total Transactions Logged", value: stats.totalTransactions, color: "var(--pd-muted)" },
              { label: "Total Money Tracked", value: formatCurrency(stats.totalMoneySpent), color: "var(--pd-alert)" },
            ].map((stat, idx) => (
              <div className="col-12 col-md-6 col-lg-3" key={idx}>
                <div className="card rounded-3 glass-card h-100" style={{ borderLeft: `3px solid ${stat.color}` }}>
                  <div className="card-body p-3">
                    <p className="text-secondary small text-uppercase fw-bold mb-1" style={{ fontSize: ".65rem", letterSpacing: ".06em" }}>
                      {stat.label}
                    </p>
                    <p className="fw-bold text-white mb-0 fs-4" style={{ fontWeight: 800 }}>{stat.value}</p>
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
                      const colorMap = { Food: "var(--pd-primary)", Commute: "var(--pd-reward)", "School Expenses": "var(--pd-alert)", Others: "var(--pd-muted)" };
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
                      <span className="fw-bold text-white" style={{ fontWeight: 800 }}>₱{stats.averageBudget}</span>
                    </div>
                    <div className="d-flex align-items-center justify-content-between">
                      <span className="text-secondary small">Average Point Pool</span>
                      <span className="fw-bold" style={{ color: "var(--pd-reward)", fontWeight: 800 }}>
                        {stats.totalUsers ? Math.round(stats.totalPoints / stats.totalUsers) : 0} pts
                      </span>
                    </div>
                    <div className="d-flex align-items-center justify-content-between">
                      <span className="text-secondary small">Transactions per User</span>
                      <span className="fw-bold text-white" style={{ fontWeight: 800 }}>
                        {stats.totalUsers ? (stats.totalTransactions / stats.totalUsers).toFixed(1) : "0.0"}
                      </span>
                    </div>
                    <div className="d-flex align-items-center justify-content-between">
                      <span className="text-secondary small">Average Spent / User</span>
                      <span className="fw-bold" style={{ color: "var(--pd-alert)", fontWeight: 800 }}>
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
  );
}
