import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { useQuests } from "../context/QuestContext";

/**
 * Register Page Component
 * 
 * Purpose: Registers new users on the platform.
 * Key Logic points:
 *  - **Input Validation**: Verifies password length (> 6 characters) and matching confirm passwords.
 *  - **User Profile Creation**: Registers the user session with Firebase Auth.
 *  - **Quest Initialization**: Crucial step! After registration, we trigger `initializeQuests()`
 *    from `QuestContext` to seed the database with the user's first active quests.
 */
export default function Register() {
  const { register } = useAuth();
  const { initializeQuests } = useQuests();
  const navigate = useNavigate();

  // Local Form States
  const [form, setForm]     = useState({ displayName: "", email: "", password: "", confirm: "" });
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);

  // Updates form state dynamically on keyboard input
  function handleChange(e) { 
    setForm({ ...form, [e.target.name]: e.target.value }); 
    setError(""); 
  }

  // Pre-submit validations to save unnecessary database request roundtrips
  function validate() {
    if (!form.displayName.trim()) return "Please enter your name.";
    if (!form.email) return "Please enter your email.";
    if (form.password.length < 6) return "Password must be at least 6 characters.";
    if (form.password !== form.confirm) return "Passwords do not match.";
    return null;
  }

  // Registration Submission Handler
  async function handleSubmit(e) {
    e.preventDefault();
    const err = validate();
    if (err) { 
      setError(err); 
      return; 
    }

    setLoading(true);
    try {
      // 1. Register with Firebase Auth (which creates the profile doc in Firestore via AuthContext)
      await register(form.email, form.password, form.displayName.trim());
      
      // 2. Seed default active quests for the newly created user ID
      await initializeQuests();
      
      // 3. Redirect to the main interface dashboard
      navigate("/dashboard");
    } catch (err) {
      setError(err.code === "auth/email-already-in-use" ? "Email already registered." : "Registration failed. Try again.");
    } finally { 
      setLoading(false); 
    }
  }

  return (
    <div className="d-flex align-items-end align-items-lg-center justify-content-center" style={{ minHeight: "100vh", background: "var(--pd-bg)", padding: "1rem" }}>
      <motion.div className="w-100" style={{ maxWidth: 480 }} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="card rounded-4 glass-card responsive-modal-card">
          <div className="card-body px-4 pt-4 pb-5">
            <div className="text-center mb-3">
              <h1 className="fw-bold fs-3 text-white mb-1 tactical-title">Create account</h1>
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
              <button type="submit" className="btn btn-primary w-100 fw-bold py-3 rounded-3 mt-1" disabled={loading} id="register-submit-btn" style={{ minHeight: 54 }}>
                {loading ? "Creating account…" : "Create Account"}
              </button>
            </form>

            <p className="text-center text-secondary small mt-3 mb-0">
              Already have an account?{" "}
              <Link to="/login" className="fw-semibold" style={{ color: "var(--pd-primary)" }} id="register-to-login-link">Sign in</Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
