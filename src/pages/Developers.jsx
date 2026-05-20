import { motion } from "framer-motion";

const DEVELOPERS = [
  { name: "Golpe, John Linus",   role: "Firebase & Auth Lead",      contribution: "Firebase setup, Auth system, Context API, ProtectedRoute", emoji: "🔐", color: "#6366f1" },
  { name: "Lim, Phoenix Miguel", role: "Core Features & UI Lead",   contribution: "Dashboard, Expense CRUD, mobile-first design system", emoji: "💻", color: "#ec4899" },
  { name: "Suarez, Alec Miguel", role: "Gamification Lead",         contribution: "Saving Quests system, Points engine, Streak logic", emoji: "🎮", color: "#f59e0b" },
  { name: "Talento, Jhobert",    role: "Analytics & Social Lead",   contribution: "Leaderboard, Analytics charts, Advice Slip API, Developers page", emoji: "📊", color: "#10b981" },
];

export default function Developers() {
  return (
    <div className="page-content" style={{ maxWidth: 720 }}>

      {/* Header */}
      <div className="text-center mb-4">
        <h1 className="fw-black text-white mb-1" style={{ fontSize: "1.4rem" }}>Meet the Team</h1>
        <p className="text-secondary small mb-2">3ITG — ITELEC2C Final Project</p>
        <span className="badge rounded-pill" style={{ background: "rgba(99,102,241,.15)", color: "#818cf8", border: "1px solid rgba(99,102,241,.3)", fontSize: ".85rem", padding: ".35rem 1rem" }}>
          💰 PesoDash
        </span>
      </div>

      {/* Developer cards */}
      <div className="d-flex flex-column gap-3 mb-4">
        {DEVELOPERS.map((dev, i) => (
          <motion.div key={dev.name} className="card rounded-4 glass-card"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            id={`dev-card-${i + 1}`}
          >
            <div className="card-body d-flex align-items-start gap-3">
              <div className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
                style={{ width: 60, height: 60, background: `${dev.color}22`, border: `2px solid ${dev.color}55`, fontSize: "1.75rem" }}>
                {dev.emoji}
              </div>
              <div>
                <p className="fw-black text-white mb-1" style={{ fontSize: ".95rem" }}>{dev.name}</p>
                <p className="fw-semibold mb-1" style={{ color: dev.color, fontSize: ".75rem" }}>{dev.role}</p>
                <p className="text-secondary mb-0 small">{dev.contribution}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* SDG */}
      <div className="card rounded-3 mb-3" style={{ background: "rgba(16,185,129,.08)", border: "1px solid rgba(16,185,129,.2)" }}>
        <div className="card-body d-flex align-items-center gap-3 py-3">
          <span style={{ fontSize: "1.4rem" }}>🌏</span>
          <div>
            <p className="fw-bold mb-1" style={{ color: "#6ee7b7", fontSize: ".875rem" }}>SDG 8 — Decent Work &amp; Economic Growth</p>
            <p className="text-secondary mb-0 small">Promoting financial literacy for Filipino students and young professionals.</p>
          </div>
        </div>
      </div>

      {/* Course info */}
      <div className="text-center">
        <p className="text-secondary small mb-1">ITELEC2C · Front-End Frameworks for Web Application Development</p>
        <p className="text-secondary mb-0" style={{ fontSize: ".75rem" }}>A.Y. 2025–2026</p>
      </div>

    </div>
  );
}
