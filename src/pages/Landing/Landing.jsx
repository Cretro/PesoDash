import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const features = [
  { icon: "📝", title: "Expense Logging",   desc: "Log spending in seconds with category tagging." },
  { icon: "🎮", title: "Saving Quests",     desc: "Complete missions, earn points by staying on budget." },
  { icon: "🏆", title: "Social Leaderboard", desc: "Compete with friends based on budget discipline." },
  { icon: "📊", title: "Analytics",         desc: "Visualize spending trends and reach your goals." },
];

export default function Landing() {
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg,#0f172a 0%,#1a103d 50%,#0f172a 100%)", color: "#f8fafc" }}>

      {/* Hero */}
      <section className="px-4 pt-5 pb-3">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <span className="badge rounded-pill mb-3" style={{ background: "rgba(99,102,241,.2)", color: "#818cf8", border: "1px solid rgba(99,102,241,.4)", fontSize: ".75rem" }}>
            SDG 8 · Decent Work &amp; Economic Growth
          </span>
          <h1 className="display-5 fw-black lh-1 mb-3">
            Budget smarter.<br />
            <span className="gradient-text">Level up.</span>
          </h1>
          <p className="text-secondary mb-4" style={{ fontSize: "1rem", lineHeight: 1.6 }}>
            PesoDash turns saving money into a game. Track expenses, complete quests, and climb the leaderboard — all from your phone.
          </p>
          <div className="d-flex gap-3">
            <Link to="/register" className="btn gradient-btn fw-bold py-3 flex-fill rounded-3" id="landing-register-btn">
              Get Started Free
            </Link>
            <Link to="/login" className="btn btn-outline-secondary fw-semibold py-3 flex-fill rounded-3" id="landing-login-btn">
              Sign In
            </Link>
          </div>
        </motion.div>

        {/* Phone mockup */}
        <div className="mt-4">
          <div className="phone-mock">
            <p className="text-uppercase small fw-semibold mb-1" style={{ color: "#64748b", fontSize: ".65rem" }}>Today's Budget</p>
            <p className="fw-bold fs-5 mb-1 text-white">₱175 / ₱300</p>
            <div className="phone-mock-bar mb-2"><div className="phone-mock-bar-fill" style={{ width: "58%" }} /></div>
            <p className="mb-0 fw-semibold" style={{ color: "#f59e0b", fontSize: ".875rem" }}>🔥 5-day streak!</p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-4 pb-4">
        <h2 className="fw-bold mb-3" style={{ fontSize: "1.1rem" }}>Everything you need</h2>
        <div className="d-flex flex-column gap-2">
          {features.map((f, i) => (
            <motion.div key={f.title} className="card rounded-3 glass-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <div className="card-body d-flex align-items-start gap-3 py-3">
                <span style={{ fontSize: "1.4rem", flexShrink: 0 }}>{f.icon}</span>
                <div>
                  <p className="fw-bold mb-1 text-white" style={{ fontSize: ".9rem" }}>{f.title}</p>
                  <p className="text-secondary mb-0 small">{f.desc}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* SDG */}
      <section className="px-4 pb-5">
        <div className="card rounded-3" style={{ background: "rgba(16,185,129,.1)", border: "1px solid rgba(16,185,129,.25)" }}>
          <div className="card-body d-flex align-items-start gap-3 py-3">
            <span style={{ fontSize: "1.4rem" }}>🌏</span>
            <div>
              <p className="fw-bold mb-1" style={{ color: "#6ee7b7", fontSize: ".9rem" }}>Aligned with UN SDG 8</p>
              <p className="text-secondary mb-0 small">Promoting financial literacy for Filipino students and young professionals.</p>
            </div>
          </div>
        </div>
        <Link to="/register" className="btn gradient-btn fw-bold w-100 py-3 rounded-3 mt-3" id="landing-bottom-register-btn">
          Start Your Journey
        </Link>
      </section>

    </div>
  );
}
