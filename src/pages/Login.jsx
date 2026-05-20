import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";

/**
 * Login Page Component
 * 
 * Purpose: Authenticates existing platform users.
 * Key Logic points:
 *  - **Location State Capture**: Checks `useLocation().state` to see if the user was kicked out 
 *    by the `ProtectedRoute` because their account is disabled, showing a custom warning banner.
 *  - **Form Validation**: Simple client-side error checking prior to initiating network queries.
 *  - **Auth Integration**: Delegates login process to the Firebase Auth wrapper in `AuthContext`.
 */
export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation(); // Hook used to inspect router history metadata
  
  // Local States
  const [form, setForm]     = useState({ email: "", password: "" });
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);

  // Captures the 'disabledError' state passed during redirection inside ProtectedRoute.jsx
  const disabledError = location.state?.disabledError;

  // Generic Change Handler: Dynamically sets state key based on input field "name" attribute.
  function handleChange(e) { 
    setForm({ ...form, [e.target.name]: e.target.value }); 
    setError(""); 
  }

  // Form submission handler
  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.email || !form.password) { 
      setError("Please fill in all fields."); 
      return; 
    }
    
    setLoading(true);
    try {
      // Calls the global Firebase Auth login method
      await login(form.email, form.password);
      // On success, redirect to dashboard landing page
      navigate("/dashboard");
    } catch {
      setError("Invalid email or password.");
    } finally { 
      setLoading(false); 
    }
  }

  return (
    <div className="d-flex align-items-end align-items-lg-center justify-content-center" style={{ minHeight: "100vh", background: "linear-gradient(160deg,#0f172a,#1a103d)", padding: "1rem" }}>
      <motion.div className="w-100" style={{ maxWidth: 480 }} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="card rounded-top-4 rounded-bottom-0 border-0 responsive-modal-card">
          <div className="card-body px-4 pt-4 pb-5">
            <div className="text-center mb-3">
              <div style={{ fontSize: "2.5rem" }}>💰</div>
              <h1 className="fw-black fs-4 text-white mb-1">Welcome back</h1>
              <p className="text-secondary small">Sign in to continue your journey</p>
            </div>

            {/* Account Suspended Notice: Shown only if disabledError is present in history state */}
            {disabledError && (
              <div className="alert alert-warning py-2.5 small mb-3 text-center border-warning border-opacity-25" style={{ background: "rgba(245,158,11,.15)", color: "#fbbf24" }}>
                🔒 This account has been disabled/archived by an administrator.
              </div>
            )}

            {error && <div className="alert alert-danger py-2 small">{error}</div>}

            <form onSubmit={handleSubmit} noValidate>
              <div className="mb-3">
                <label htmlFor="login-email" className="form-label text-uppercase small fw-semibold text-secondary">Email</label>
                <input id="login-email" type="email" name="email" value={form.email} onChange={handleChange}
                  placeholder="you@email.com" className="form-control form-control-lg" autoComplete="email" required />
              </div>
              <div className="mb-3">
                <label htmlFor="login-password" className="form-label text-uppercase small fw-semibold text-secondary">Password</label>
                <input id="login-password" type="password" name="password" value={form.password} onChange={handleChange}
                  placeholder="Your password" className="form-control form-control-lg" autoComplete="current-password" required />
              </div>
              <button type="submit" className="btn gradient-btn w-100 fw-bold py-3 rounded-3 mt-1" disabled={loading} id="login-submit-btn" style={{ minHeight: 54 }}>
                {loading ? "Signing in…" : "Sign In"}
              </button>
            </form>

            <p className="text-center text-secondary small mt-3 mb-0">
              Don't have an account?{" "}
              <Link to="/register" className="text-primary fw-semibold" id="login-to-register-link">Create one</Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
