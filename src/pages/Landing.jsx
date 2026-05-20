import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FiEdit3, FiTarget, FiAward, FiPieChart } from "react-icons/fi";

const features = [
  { icon: <FiEdit3 />, title: "Expense Logging",   desc: "Log spending in seconds with intuitive category tagging." },
  { icon: <FiTarget />, title: "Saving Quests",     desc: "Complete missions and earn points by staying on budget." },
  { icon: <FiAward />, title: "Social Leaderboard", desc: "Compete with friends based on your budget discipline." },
  { icon: <FiPieChart />, title: "Analytics",         desc: "Visualize spending trends and reach financial goals." },
];

export default function Landing() {
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--pd-bg)", color: "var(--pd-text)" }}>
      <div className="container py-5" style={{ maxWidth: 1000 }}>
        {/* Hero */}
        <section className="px-3 pt-4 pb-5 mb-4">
          <div className="row g-5 align-items-center">
            <div className="col-12 col-lg-7">
              <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <h1 className="display-4 fw-bold lh-1 mb-4 tactical-title" style={{ letterSpacing: "-0.5px", color: "var(--pd-text)" }}>
                  Budget smarter.<br />
                  <span style={{ color: "var(--pd-primary)" }}>Level up.</span>
                </h1>
                <p className="mb-5" style={{ fontSize: "1.1rem", lineHeight: 1.7, maxWidth: 500, color: "var(--pd-muted)", fontWeight: 400 }}>
                  PesoDash transforms saving money into a seamless experience. Track expenses, conquer financial quests, and visualize your progress — all from a beautiful interface.
                </p>
                <div className="d-flex gap-3" style={{ maxWidth: 400 }}>
                  <Link to="/register" className="btn fw-semibold py-3 px-4 flex-fill rounded-3" id="landing-register-btn" style={{ backgroundColor: "var(--pd-primary)", color: "var(--pd-bg)", border: "none", transition: "transform 0.2s" }}>
                    Get Started Free
                  </Link>
                  <Link to="/login" className="btn fw-medium py-3 px-4 flex-fill rounded-3" id="landing-login-btn" style={{ backgroundColor: "transparent", color: "var(--pd-text)", border: "1px solid var(--pd-border)" }}>
                    Sign In
                  </Link>
                </div>
              </motion.div>
            </div>

            {/* Phone mockup */}
            <div className="col-12 col-lg-5 text-center text-lg-end">
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 0.2 }} className="d-inline-block">
                <div className="phone-mock shadow-lg text-start" style={{ width: 280, padding: "2.5rem 2rem", backgroundColor: "var(--pd-surface)", border: "1px solid var(--pd-border)", borderRadius: "1.5rem" }}>
                  <p className="text-uppercase fw-semibold mb-2" style={{ color: "var(--pd-muted)", fontSize: ".7rem", letterSpacing: "1px" }}>Today's Budget</p>
                  <p className="fw-bold fs-3 mb-3 tactical-title" style={{ color: "var(--pd-text)" }}>₱175 <span className="fs-6" style={{ color: "#58604A", fontFamily: "'Inter', sans-serif" }}>/ ₱300</span></p>
                  
                  <div className="d-flex justify-content-between mb-1" style={{ fontSize: "0.75rem", color: "var(--pd-muted)" }}>
                    <span>Weekly progress</span>
                    <span>58%</span>
                  </div>
                  <div className="phone-mock-bar mb-4 rounded-1" style={{ height: 8, backgroundColor: "var(--pd-border)", overflow: "hidden" }}>
                    <motion.div initial={{ width: 0 }} animate={{ width: "58%" }} transition={{ duration: 1, delay: 0.5 }} className="h-100" style={{ backgroundColor: "var(--pd-primary)" }} />
                  </div>
                  
                  <div className="d-flex align-items-center gap-2 p-2 rounded-2" style={{ backgroundColor: "rgba(149,193,89, 0.05)", border: "1px solid rgba(149,193,89, 0.1)" }}>
                    <span style={{ color: "var(--pd-primary)", fontSize: "1.2rem" }}>🔥</span>
                    <p className="mb-0 fw-medium" style={{ fontSize: ".85rem", color: "var(--pd-primary)" }}>5-day tracking streak</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="px-3 pb-5 mt-3">
          <div className="text-start mb-4">
            <h2 className="fw-bold mb-2 tactical-title" style={{ fontSize: "1.5rem", color: "var(--pd-text)" }}>Everything you need</h2>
            <p style={{ color: "var(--pd-muted)", fontSize: "0.95rem" }}>Powerful tools designed for your financial journey.</p>
          </div>
          <div className="row row-cols-1 row-cols-md-2 g-3">
            {features.map((f, i) => (
              <div className="col" key={f.title}>
                <motion.div className="card h-100 shadow-none" style={{ border: "1px solid var(--pd-border)", backgroundColor: "var(--pd-surface)", borderRadius: "1rem" }} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                  <div className="card-body d-flex align-items-start gap-3 p-4">
                    <div className="d-flex align-items-center justify-content-center" style={{ color: "var(--pd-primary)", fontSize: "1.5rem", flexShrink: 0, marginTop: "2px" }}>
                      {f.icon}
                    </div>
                    <div>
                      <p className="fw-medium mb-1" style={{ fontSize: "1rem", color: "var(--pd-text)" }}>{f.title}</p>
                      <p className="mb-0" style={{ fontSize: "0.9rem", lineHeight: 1.5, color: "var(--pd-muted)" }}>{f.desc}</p>
                    </div>
                  </div>
                </motion.div>
              </div>
            ))}
          </div>
        </section>
        
        {/* Call to Action Footer */}
        <section className="px-3 pb-5 text-center mt-5">
            <h3 className="fw-bold mb-4 tactical-title" style={{ color: "var(--pd-text)" }}>Ready to take control?</h3>
            <Link to="/register" className="btn fw-semibold py-3 px-5 rounded-3" id="landing-bottom-register-btn" style={{ minWidth: 200, backgroundColor: "var(--pd-primary)", color: "var(--pd-bg)", border: "none" }}>
              Start Your Journey
            </Link>
        </section>
      </div>
    </div>
  );
}
