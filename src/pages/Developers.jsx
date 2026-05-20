import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Team metadata list.
const DEVELOPERS = [
  {
    name: "Golpe, John Linus",
    role: "Leader",
    contribution: "Spearheaded Firebase authentication, configuration, context hooks, and secure routing structures.",
    image: "LinusGolpe.jpg",
    initials: "JG",
    color: "#95C159"
  },
  {
    name: "Lim, Phoenix Miguel",
    role: "Developer",
    contribution: "Crafted core dashboard widgets, expense CRUD workflows, and the unified mobile-first tactical layout system.",
    image: "PhoenixLim.jpg",
    initials: "PL",
    color: "#EAB308"
  },
  {
    name: "Suarez, Alec Miguel",
    role: "Developer",
    contribution: "Engineered saving quests cycles, retroactive anti-cheat audits, point allocation engines, and streak logic.",
    image: "AlecSuarez.jpg",
    initials: "AS",
    color: "#888C78"
  },
  {
    name: "Talento, Jhobert",
    role: "Developer",
    contribution: "Designed real-time leaderboard ranking systems, charts, social structures, and integrated public advice APIs.",
    image: "JhobertTalento.jpg", // Placeholder visual used
    initials: "JT",
    color: "#E2E2D5"
  },
];

export default function Developers() {
  const [activeIdx, setActiveIdx] = useState(0);
  const activeDev = DEVELOPERS[activeIdx];

  return (
    <div className="page-content" style={{ maxWidth: 840 }}>
      {/* Header Info */}
      <div className="text-center mb-4">
        <h1 className="fw-black text-white mb-1" style={{ fontSize: "2.2rem", letterSpacing: "-0.5px" }}>Meet the Team</h1>
        <p className="text-secondary small mb-3">3ITG — ITELEC2C Final Project</p>
        <span className="badge rounded-pill" style={{ background: "rgba(149,193,89,.1)", color: "var(--pd-primary)", border: "1px solid rgba(149,193,89,.2)", fontSize: ".8rem", padding: ".35rem 1rem" }}>
          PesoDash Team
        </span>
      </div>

      {/* Main Interactive Showcase Grid */}
      <div className="row g-4 mb-4">
        {/* Left Column: Roster Menu */}
        <div className="col-12 col-md-5">
          <p className="text-secondary small fw-bold mb-2 uppercase" style={{ fontSize: ".65rem", letterSpacing: "1px" }}>Team Roster</p>
          <div className="d-flex flex-column gap-3">
            {DEVELOPERS.map((dev, idx) => {
              const isActive = idx === activeIdx;
              return (
                <button
                  key={dev.name}
                  className="btn text-start p-3 rounded-4 transition-all border-0 position-relative overflow-hidden"
                  onClick={() => setActiveIdx(idx)}
                  onMouseEnter={() => setActiveIdx(idx)}
                  style={{
                    background: isActive ? "rgba(255, 255, 255, 0.03)" : "transparent",
                    border: "1px solid transparent",
                    borderColor: isActive ? "rgba(149,193,89, 0.2)" : "rgba(255, 255, 255, 0.02)",
                    boxShadow: isActive ? "0 4px 20px rgba(0,0,0,0.2)" : "none",
                  }}
                >
                  {/* Subtle active neon accent indicator line */}
                  {isActive && (
                    <motion.div
                      layoutId="active-bar"
                      className="position-absolute start-0 top-0 bottom-0"
                      style={{ width: "3px", backgroundColor: "var(--pd-primary)" }}
                    />
                  )}
                  <p className={`mb-0 fw-bold transition-all ${isActive ? "text-white" : "text-secondary"}`} style={{ fontSize: ".9rem" }}>
                    {dev.name}
                  </p>
                  <p className="mb-0 text-secondary" style={{ fontSize: ".7rem", color: isActive ? dev.color : "var(--pd-muted)" }}>
                    {dev.role}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Dynamic Showcase Card */}
        <div className="col-12 col-md-7 d-flex flex-column">

          <div className="card rounded-4 glass-card flex-grow-1 border-0" style={{ minHeight: 280, background: "rgba(25, 27, 22, 0.4)", backdropFilter: "blur(12px)", border: "1px solid rgba(255, 255, 255, 0.03)" }}>
            <div className="card-body p-4 d-flex flex-column justify-content-between">

              <AnimatePresence mode="wait">
                <motion.div
                  key={activeDev.name}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="d-flex flex-column align-items-center text-center flex-grow-1 justify-content-center"
                >
                  {/* Large Showcase Avatar */}
                  <div className="mb-4 position-relative">
                    {activeDev.image ? (
                      <div className="rounded-circle overflow-hidden" style={{ width: 140, height: 140, border: `3px solid ${activeDev.color}`, boxShadow: `0 0 20px ${activeDev.color}22` }}>
                        <img
                          src={`${import.meta.env.BASE_URL}${activeDev.image}`}
                          alt={activeDev.name}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      </div>
                    ) : (
                      // Stylized CSS Placeholder Avatar (No emojis/icons)
                      <div
                        className="rounded-circle d-flex align-items-center justify-content-center fw-black"
                        style={{
                          width: 140,
                          height: 140,
                          background: `linear-gradient(135deg, ${activeDev.color}22, ${activeDev.color}05)`,
                          border: `3px solid ${activeDev.color}`,
                          boxShadow: `0 0 20px ${activeDev.color}22`,
                          fontSize: "2.5rem",
                          color: "white",
                          letterSpacing: "-1px"
                        }}
                      >
                        {activeDev.initials}
                      </div>
                    )}
                  </div>

                  {/* Dev Metadata Info */}
                  <h3 className="fw-black text-white mb-1" style={{ fontSize: "1.2rem" }}>{activeDev.name}</h3>
                  <p className="fw-bold mb-0" style={{ color: activeDev.color, fontSize: ".8rem", letterSpacing: "0.5px", textTransform: "uppercase" }}>
                    {activeDev.role}
                  </p>

                </motion.div>
              </AnimatePresence>

            </div>
          </div>
        </div>
      </div>

      {/* Sustainable Development Goal Alignment Card */}
      <div className="card rounded-4 mb-3 border-0" style={{ background: "rgba(149,193,89,.05)", border: "1px solid rgba(149,193,89,.1)" }}>
        <div className="card-body p-3.5">
          <div>
            <p className="text-secondary small fw-bold mb-1 uppercase" style={{ fontSize: ".65rem", letterSpacing: "1px" }}>SDG Used for the Project</p>
            <h4 className="fw-black mb-2" style={{ color: "var(--pd-primary)", fontSize: "1.05rem", letterSpacing: "-0.2px" }}>Goal 8 — Decent Work &amp; Economic Growth</h4>
            <p className="text-secondary mb-0 small" style={{ fontSize: ".8rem" }}>PesoDash aligns with the UN Sustainable Development Goals by promoting financial literacy, budgeting discipline, and smart saving habits for Filipino students.</p>
          </div>
        </div>
      </div>

      {/* University Course footer details */}
      <div className="text-center pt-2">
        <p className="text-secondary small mb-1">3ITG · ITELEC2C · Front-End Frameworks for Web Application Development</p>
        <p className="text-secondary mb-0" style={{ fontSize: ".7rem" }}>A.Y. 2025–2026 · University of Santo Tomas</p>
      </div>

    </div>
  );
}
