import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import { useQuests } from "../../context/QuestContext";

export default function Register() {
  const { register } = useAuth();
  const { initializeQuests } = useQuests();
  const navigate = useNavigate();
  const [form, setForm]     = useState({ displayName: "", email: "", password: "", confirm: "" });
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(e) { setForm({ ...form, [e.target.name]: e.target.value }); setError(""); }

  function validate() {
    if (!form.displayName.trim()) return "Please enter your name.";
    if (!form.email) return "Please enter your email.";
    if (form.password.length < 6) return "Password must be at least 6 characters.";
    if (form.password !== form.confirm) return "Passwords do not match.";
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setLoading(true);
    try {
      await register(form.email, form.password, form.displayName.trim());
      await initializeQuests();
      navigate("/dashboard");
    } catch (err) {
      setError(err.code === "auth/email-already-in-use" ? "Email already registered." : "Registration failed. Try again.");
    } finally { setLoading(false); }
  }

  return (
    <div className="d-flex align-items-end justify-content-center" style={{ minHeight: "100vh", background: "linear-gradient(160deg,#0f172a,#1a103d)", padding: "1rem" }}>
      <motion.div className="w-100" style={{ maxWidth: 480 }} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="card rounded-top-4 rounded-bottom-0 border-0">
          <div className="card-body px-4 pt-4 pb-5">
            <div className="text-center mb-3">
              <div style={{ fontSize: "2.5rem" }}>💰</div>
              <h1 className="fw-black fs-4 text-white mb-1">Create account</h1>
              <p className="text-secondary small">Start your budget quest today</p>
            </div>

            {error && <div className="alert alert-danger py-2 small">{error}</div>}

            <form onSubmit={handleSubmit} noValidate>
              {[
                { id: "reg-name",     label: "Display Name", name: "displayName", type: "text",     placeholder: "e.g. John", ac: "name" },
                { id: "reg-email",    label: "Email",         name: "email",       type: "email",    placeholder: "you@email.com", ac: "email" },
                { id: "reg-password", label: "Password",      name: "password",    type: "password", placeholder: "Min. 6 characters", ac: "new-password" },
                { id: "reg-confirm",  label: "Confirm Password", name: "confirm",  type: "password", placeholder: "Repeat password", ac: "new-password" },
              ].map((f) => (
                <div className="mb-3" key={f.id}>
                  <label htmlFor={f.id} className="form-label text-uppercase small fw-semibold text-secondary">{f.label}</label>
                  <input id={f.id} type={f.type} name={f.name} value={form[f.name]} onChange={handleChange}
                    placeholder={f.placeholder} className="form-control form-control-lg" autoComplete={f.ac} required />
                </div>
              ))}
              <button type="submit" className="btn gradient-btn w-100 fw-bold py-3 rounded-3 mt-1" disabled={loading} id="register-submit-btn" style={{ minHeight: 54 }}>
                {loading ? "Creating account…" : "Create Account"}
              </button>
            </form>

            <p className="text-center text-secondary small mt-3 mb-0">
              Already have an account?{" "}
              <Link to="/login" className="text-primary fw-semibold" id="register-to-login-link">Sign in</Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
